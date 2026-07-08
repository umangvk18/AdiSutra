// One-time local script: mints a Google OAuth refresh token for the
// adisutra507@gmail.com account and writes it into .env.local.
//
// Usage: node scripts/get-refresh-token.mjs
// Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to already be in .env.local
// (from an OAuth client of type "Desktop app" in Google Cloud Console).

import "dotenv/config";
import { config as loadEnvLocal } from "dotenv";
loadEnvLocal({ path: ".env.local" });

import http from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local. Add those first."
  );
  process.exit(1);
}

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404);
    res.end();
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("Missing code param");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    "<h2>Signed in. You can close this tab and return to the terminal.</h2>"
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh_token was returned. This usually means this Google account already " +
          "granted consent before. Revoke access at https://myaccount.google.com/permissions " +
          "for this app, then re-run this script.\n"
      );
      process.exit(1);
    }

    console.log("\nGot refresh token.");
    updateEnvLocal("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);
    console.log("Wrote GOOGLE_REFRESH_TOKEN into .env.local.\n");
  } catch (err) {
    console.error("Failed to exchange code for tokens:", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

function updateEnvLocal(key, value) {
  const path = ".env.local";
  const line = `${key}=${value}`;
  if (!existsSync(path)) {
    writeFileSync(path, line + "\n");
    return;
  }
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (idx >= 0) {
    lines[idx] = line;
  } else {
    lines.push(line);
  }
  writeFileSync(path, lines.filter((l) => l !== "").join("\n") + "\n");
}

let oauth2Client;

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("\nOpen this URL in a browser, and sign in as adisutra507@gmail.com:\n");
  console.log(authUrl);
  console.log("\nWaiting for you to approve access...\n");
});
