import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.get("/auth/google", async (c) => {
  const id = c.env?.GOOGLE_ID;
  const secret = c.env?.GOOGLE_SECRET;
  const code = c.req.query("code");
  let token: string;

  if (!id || !secret) {
    throw new HTTPException(401, { message: "Google credentials missing." });
  }

  // Exchange Code for Access Token
  if (code) {
    const tokenResponse = (await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        clientId: id,
        clientSecret: secret,
        redirect_uri: "http://localhost:8787/auth/google",
        grant_type: "authorization_code",
        code,
      }),
    }).then((res) => res.json())) as
      | { access_token: string }
      | { error: string; error_description: string };

    if ("error" in tokenResponse)
      throw new HTTPException(400, {
        message: tokenResponse.error_description,
      });

    token = tokenResponse.access_token;

    // Get user info with access token
    const response = (await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    ).then((res) => res.json())) as {} | { error: { message: string } };

    if ("error" in response)
      throw new HTTPException(400, { message: response.error?.message });

    return c.json(response);
  }

  // Redirect to Google Login Screen
  const parsedOptions = new URLSearchParams({
    response_type: "code",
    redirect_uri: "http://localhost:8787/auth/google",
    client_id: id as string,
    include_granted_scopes: "true",
    scope: "openid email profile",
  }).toString();
  return c.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${parsedOptions}`
  );
});

export default app;
