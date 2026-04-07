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
