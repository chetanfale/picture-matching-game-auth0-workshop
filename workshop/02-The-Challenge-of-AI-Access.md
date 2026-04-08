# Module 02: The Challenge of AI Access

Before we start writing code, let's understand the problem we're solving. Why can't we just pass a Google API key to our app and call it a day?

---

## 💡 Learning Objectives

- Understand the risks of sharing API credentials with third-party code
- Learn why traditional token storage approaches fail
- Discover how Auth0 Token Vault provides secure, scoped access
- Distinguish between Auth0 tokens and connection tokens

---

## ℹ️ The Scenario

Imagine this: you want your picture-matching game to use photos from a player's Google Drive. Maybe in the future, an AI agent could even pick the best photos automatically.

The question is: **how does your app (or an AI agent) get access to a user's Google Drive without getting the keys to their entire digital life?**

---

## ❌ Wrong Approach 1: Hardcoded Credentials

```typescript
// NEVER DO THIS
const googleToken = "ya29.a0AfH6SMBx...";
const response = await fetch("https://www.googleapis.com/drive/v3/files", {
  headers: { Authorization: `Bearer ${googleToken}` },
});
```

**Problems:**
- Token visible in source code and version control
- Anyone who sees the code has access to that user's Google Drive
- No way to revoke without changing the code
- Token doesn't expire until manually rotated

---

## ❌ Wrong Approach 2: Passing Tokens to the Frontend

```typescript
// NEVER DO THIS
export async function GET() {
  const token = await getUserGoogleToken();
  return Response.json({ token, images }); // Token exposed to browser!
}
```

**Problems:**
- Token visible in browser DevTools (Network tab)
- Exposed in browser memory — any script on the page can read it
- Network sniffers can intercept the token
- Client-side code could send the token anywhere

---

## ❌ Wrong Approach 3: Sharing Credentials with Third-Party Code

```typescript
// NEVER DO THIS
const agent = new AIAgent({
  googleCredentials: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
});
```

**Problems:**
- The AI agent now has your raw credentials
- No visibility into what the agent does with them
- No way to limit scope — the agent has full access
- If the agent is compromised, all user data is at risk

---

## ✅ The Right Approach: Auth0 Token Vault

Token Vault solves all of these problems by acting as a **secure intermediary** between your app and external APIs:

1. **User initiates the connection** — clicks "Connect Google Drive" with explicit consent
2. **OAuth consent** — user is redirected to Google and sees exactly what permissions are requested
3. **Token stored securely** — Auth0 encrypts and stores the token in Token Vault (not in your code or database)
4. **Server-side retrieval** — your backend calls `auth0.getAccessTokenForConnection()` to get the token when needed
5. **Scoped access** — the token only has the permissions the user consented to (e.g., read-only Google Drive)
6. **Automatic refresh** — Token Vault uses refresh tokens to renew access without bothering the user

---

## 📊 How Token Vault Works

### Connecting a User's Google Account

```
┌──────────────────┐
│     Browser      │
│   (Your App)     │
└────────┬─────────┘
         │  1. User clicks "Connect Google Drive"
         │  2. Browser navigates to /auth/connect?connection=google-oauth2
         ▼
┌──────────────────┐
│      Auth0       │
│  Connect Endpoint│
└────────┬─────────┘
         │  3. Redirects to Google's OAuth consent screen
         ▼
┌──────────────────┐
│      Google      │
│  Consent Screen  │  "This app wants to view your Google Drive files"
└────────┬─────────┘
         │  4. User clicks "Allow"
         │  5. Google sends authorization code back to Auth0
         ▼
┌──────────────────┐
│      Auth0       │
│   Token Vault    │  6. Exchanges code for access + refresh tokens
└──────────────────┘  7. Stores tokens encrypted
```

### Using the Stored Token

```
┌──────────────────┐
│     Browser      │  1. Requests /api/google-drive?folder=Photos
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Your API Route  │  2. auth0.getAccessTokenForConnection('google-oauth2')
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Token Vault     │  3. Returns the stored Google token
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Your API Route  │  4. Uses token in Authorization header
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Google Drive API │  5. Returns images from user's Drive
└──────────────────┘
```

The key insight: **your frontend never sees the Google token.** It flows entirely through the backend.

---

## 📋 Traditional vs. Token Vault

| | Traditional Approach | Token Vault |
|---|---|---|
| **Where tokens live** | In your code or database | Encrypted in Auth0 |
| **Who can see them** | Anyone with code/DB access | Only your backend, via SDK |
| **Revocation** | Redeploy code or update DB | Instant, via Auth0 Dashboard |
| **Expiration** | Manual rotation | Automatic refresh tokens |
| **Scope control** | All-or-nothing | Granular OAuth scopes |
| **User consent** | Often implicit | Explicit OAuth consent screen |
| **Audit trail** | You build it yourself | Built into Auth0 |

---

## 🔑 Two Kinds of Tokens

It's important to distinguish between two different types of tokens in this architecture:

### Auth0 Session Tokens
- Prove: *"I am logged in to this game"*
- Created when the user logs in to your app
- Used by Auth0 SDK to manage sessions
- You don't need to manage these directly

### Connection Tokens (Token Vault)
- Prove: *"I have access to Google Drive on behalf of this user"*
- Created when the user clicks "Connect Google Drive"
- Stored encrypted in Token Vault
- Retrieved server-side via `getAccessTokenForConnection()`
- Used to call the Google Drive API

The first lets users into your app. The second lets your app access their external services — securely.

---

## ✅ Checkpoint

You should now understand:

- [ ] Why hardcoding or exposing tokens is dangerous
- [ ] How Token Vault acts as a secure intermediary
- [ ] The flow: user consent → Auth0 stores token → backend retrieves token → calls Google API
- [ ] The difference between Auth0 session tokens and connection tokens

---

Now let's configure Token Vault and start writing code!

| Back | Next |
|------|------|
| [&larr; Setup and First Run](01-Setup-and-First-Run.md) | [Configuring Token Vault &rarr;](03-Configuring-Token-Vault.md) |
