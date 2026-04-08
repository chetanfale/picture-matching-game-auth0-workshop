import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env } from "./index";

// Simple base64url encoding/decoding for Workers environment
function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Encrypt/decrypt session data using AES-GCM with COOKIE_SECRET
async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.slice(0, 32).padEnd(32, "0")),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}

async function encrypt(data: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(data)
  );
  // Combine iv + ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return base64urlEncode(combined.buffer);
}

async function decrypt(token: string, secret: string): Promise<string | null> {
  try {
    const key = await deriveKey(secret);
    const combined = base64urlDecode(token);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

// Generate PKCE code verifier and challenge
async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = base64urlEncode(buffer.buffer);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  const codeChallenge = base64urlEncode(digest);
  return { codeVerifier, codeChallenge };
}

function getBaseUrl(c: Context<{ Bindings: Env }>): string {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

// Auth middleware — checks for session cookie, redirects to Auth0 if missing
export function authMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const sessionCookie = getCookie(c, "session");
    if (!sessionCookie) {
      return redirectToLogin(c);
    }

    const session = await decrypt(sessionCookie, c.env.COOKIE_SECRET);
    if (!session) {
      deleteCookie(c, "session");
      return redirectToLogin(c);
    }

    try {
      const sessionData = JSON.parse(session);
      // Check expiry
      if (sessionData.exp && Date.now() > sessionData.exp) {
        deleteCookie(c, "session");
        return redirectToLogin(c);
      }
      // Store user info in context for downstream handlers
      c.set("user" as never, sessionData.user as never);
    } catch {
      deleteCookie(c, "session");
      return redirectToLogin(c);
    }

    await next();
  };
}

async function redirectToLogin(c: Context<{ Bindings: Env }>): Promise<Response> {
  const baseUrl = getBaseUrl(c);
  const { codeVerifier, codeChallenge } = await generatePKCE();

  // Store PKCE verifier in an encrypted cookie
  const pkceEncrypted = await encrypt(codeVerifier, c.env.COOKIE_SECRET);
  setCookie(c, "pkce", pkceEncrypted, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: c.env.AUTH0_CLIENT_ID,
    redirect_uri: `${baseUrl}/callback`,
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return c.redirect(
    `https://${c.env.AUTH0_DOMAIN}/authorize?${params.toString()}`
  );
}

// Handle Auth0 callback — exchange code for tokens
export async function handleCallback(
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  const baseUrl = getBaseUrl(c);
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return c.text(`Auth error: ${error}`, 400);
  }

  if (!code) {
    return c.text("Missing authorization code", 400);
  }

  // Retrieve PKCE verifier
  const pkceCookie = getCookie(c, "pkce");
  if (!pkceCookie) {
    return c.text("Missing PKCE state. Please try logging in again.", 400);
  }
  const codeVerifier = await decrypt(pkceCookie, c.env.COOKIE_SECRET);
  if (!codeVerifier) {
    return c.text("Invalid PKCE state. Please try logging in again.", 400);
  }
  deleteCookie(c, "pkce");

  // Exchange code for tokens
  const tokenResponse = await fetch(
    `https://${c.env.AUTH0_DOMAIN}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: c.env.AUTH0_CLIENT_ID,
        client_secret: c.env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: `${baseUrl}/callback`,
        code_verifier: codeVerifier,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    return c.text(`Token exchange failed: ${errorBody}`, 500);
  }

  const tokens: { id_token?: string; access_token: string; expires_in: number } =
    await tokenResponse.json();

  // Get user info
  const userInfoResponse = await fetch(
    `https://${c.env.AUTH0_DOMAIN}/userinfo`,
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }
  );

  let user = { email: "unknown" };
  if (userInfoResponse.ok) {
    user = await userInfoResponse.json();
  }

  // Create encrypted session cookie
  const sessionData = JSON.stringify({
    user,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  const encryptedSession = await encrypt(sessionData, c.env.COOKIE_SECRET);

  setCookie(c, "session", encryptedSession, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: 86400, // 24 hours
  });

  return c.redirect("/admin");
}

// Handle logout
export function handleLogout(c: Context<{ Bindings: Env }>): Response {
  const baseUrl = getBaseUrl(c);
  deleteCookie(c, "session");

  const params = new URLSearchParams({
    client_id: c.env.AUTH0_CLIENT_ID,
    returnTo: baseUrl,
  });

  return c.redirect(
    `https://${c.env.AUTH0_DOMAIN}/v2/logout?${params.toString()}`
  );
}
