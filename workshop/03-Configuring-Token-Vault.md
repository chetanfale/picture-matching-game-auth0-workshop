# Part 3: Configuring Token Vault

Time to get hands-on! In this module, you'll set up the Auth0 side of Token Vault using the CLI, then make two configuration changes in your app code to enable the connect endpoint and request the right scopes.

---

## 💡 Learning Objectives

- Create a Google social connection in Auth0 via the CLI
- Understand OAuth scopes and refresh tokens
- Enable the connect endpoint in your Auth0 SDK configuration
- Add the required scopes for Token Vault and Google Drive

---

## Part A: Create the Google Social Connection

Right now, Auth0 knows about your app, but it doesn't know anything about Google. We need to create a **social connection** that tells Auth0:

1. How to talk to Google's OAuth servers
2. What permissions (scopes) to request
3. To store the resulting tokens in Token Vault

### 🧑‍💻 Exercise: Create the Connection via CLI

Run this command in your terminal:

```bash
auth0 api POST /api/v2/connections \
  --data '{
    "name": "google-oauth2",
    "strategy": "google-oauth2",
    "enabled_clients": ["'"$(grep AUTH0_CLIENT_ID app/.env.local | cut -d'=' -f2 | tr -d "'")"'"],
    "options": {
      "client_id": "'"$GOOGLE_CLIENT_ID"'",
      "client_secret": "'"$GOOGLE_CLIENT_SECRET"'",
      "scope": ["profile", "email", "https://www.googleapis.com/auth/drive.readonly"],
      "access_type": "offline",
      "prompt": "consent"
    }
  }'
```

You should see a JSON response with the connection details, including a `"name": "google-oauth2"` field.

> **Note**
> If you get an error like `"Connection with name google-oauth2 already exists"`, you can skip this step — the connection is already configured.

### ℹ️ What Each Field Does

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | `"google-oauth2"` | Identifier for this connection — used later in code |
| `strategy` | `"google-oauth2"` | Tells Auth0 this is a Google OAuth connection |
| `enabled_clients` | Your app's Client ID | Links this connection to your Auth0 app |
| `options.client_id` | Your Google Client ID | Google's identifier for your OAuth app |
| `options.client_secret` | Your Google Client Secret | Google's secret for your OAuth app |
| `options.scope` | profile, email, drive.readonly | Permissions requested from Google |
| `options.access_type` | `"offline"` | Requests a refresh token for long-lived access |
| `options.prompt` | `"consent"` | Always show consent screen (useful for testing) |

### ✅ Verify the Connection

```bash
auth0 api GET /api/v2/connections --query "name=google-oauth2"
```

You should see your connection in the output with the correct scopes.

---

### ℹ️ Optional: Verify in the Auth0 Dashboard

You can also see the connection visually:

1. Go to [manage.auth0.com](https://manage.auth0.com/dashboard)
2. Navigate to **Authentication > Social**
3. You should see **Google / Gmail** in the list
4. Click on it and verify:
   - Client ID is set
   - Scopes include `https://www.googleapis.com/auth/drive.readonly`
   - The connection is enabled for your app

---

### ℹ️ Understanding the Scopes

We request three scopes from Google:

| Scope | What It Grants |
|-------|---------------|
| `profile` | User's name and profile picture |
| `email` | User's email address |
| `https://www.googleapis.com/auth/drive.readonly` | **Read-only** access to Google Drive files |

We intentionally use `drive.readonly` instead of the full `drive` scope. This follows the **principle of least privilege** — our game only needs to *read* images, not create, edit, or delete files.

### ℹ️ Why `access_type: "offline"`?

Google access tokens expire after about 1 hour. Setting `access_type` to `"offline"` tells Google to also issue a **refresh token**. Auth0 stores both in Token Vault and automatically uses the refresh token to get new access tokens when they expire — so users don't need to re-authorize.

---

## Part B: Enable the Connect Endpoint

Now let's make two code changes to your Auth0 SDK configuration. These changes prepare your app to use Token Vault.

### 🧑‍💻 Exercise: Change 1 — Enable Connect Endpoint

Open `app/lib/auth0.ts` in your editor. You'll see:

```typescript
export const auth0 = new Auth0Client({
  // TODO (Part 3, Step 1): Enable the connect endpoint for Token Vault
  authorizationParameters: {
```

The Auth0 SDK has a special endpoint at `/auth/connect` that handles linking external identity providers to a user's account. By default, this endpoint is disabled. We need to turn it on.

**Your task:** Replace the TODO comment with the configuration property that enables the connect endpoint.

> *Hint:* The property is called `enableConnectAccountEndpoint` and it takes a boolean value.

<details>
<br>
<summary>✅ Solution</summary>

```typescript
export const auth0 = new Auth0Client({
  enableConnectAccountEndpoint: true,
  authorizationParameters: {
```

This tells the Auth0 SDK to expose the `/auth/connect` endpoint, which we'll use later when the user clicks "Connect Google Drive."

</details>

---

## Part C: Add Token Vault Scopes

### 🧑‍💻 Exercise: Change 2 — Update Authorization Scopes

Still in `app/lib/auth0.ts`, find the scope configuration:

```typescript
  authorizationParameters: {
    // TODO (Part 3, Step 2): Add the offline_access and Google Drive scopes
    scope: "openid profile email",
  },
```

Currently, the app only requests basic identity scopes. For Token Vault to work, we need to add:

- `offline_access` — tells Auth0 to issue a refresh token
- `https://www.googleapis.com/auth/drive.readonly` — the Google Drive scope

**Your task:** Update the `scope` string to include all five scopes, separated by spaces.

> *Hint:* The final scope string should contain: `openid profile email offline_access https://www.googleapis.com/auth/drive.readonly`

<details>
<br>
<summary>✅ Solution</summary>

```typescript
  authorizationParameters: {
    scope: "openid profile email offline_access https://www.googleapis.com/auth/drive.readonly",
  },
```

**Scope breakdown:**

| Scope | Purpose |
|-------|---------|
| `openid` | Required for OpenID Connect (Auth0 needs this) |
| `profile` | Access to user's name and picture |
| `email` | Access to user's email address |
| `offline_access` | Request a refresh token for automatic renewal |
| `https://www.googleapis.com/auth/drive.readonly` | Read-only access to Google Drive |

> **Note**
> All scopes are in a single space-separated string. This is the OAuth 2.0 standard format.

</details>

---

## ✅ Verification

After making both changes, your `app/lib/auth0.ts` should look like this:

```typescript
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = new Auth0Client({
  enableConnectAccountEndpoint: true,
  authorizationParameters: {
    scope: "openid profile email offline_access https://www.googleapis.com/auth/drive.readonly",
  },
  async onCallback(err, ctx, session) {
    const appBaseUrl = ctx.appBaseUrl ?? process.env.APP_BASE_URL;
    return NextResponse.redirect(new URL(ctx.returnTo ?? "/", appBaseUrl));
  },
});
```

Save the file and restart your dev server:

```bash
# Press Ctrl+C to stop the server, then:
pnpm dev:app
```

The app should still work exactly the same — these configuration changes don't affect the UI yet. The real changes happen in the next module when we implement token retrieval.

---

## ✅ Checkpoint

- [ ] Google social connection created in Auth0 (verified via CLI or Dashboard)
- [ ] `enableConnectAccountEndpoint: true` added to Auth0 client config
- [ ] Scopes updated to include `offline_access` and Google Drive scope
- [ ] App still starts and runs without errors

---

| Back | Next |
|------|------|
| [&larr; The Challenge of AI Access](02-The-Challenge-of-AI-Access.md) | [Connecting Google Drive &rarr;](04-Connecting-Google-Drive.md) |
