import "server-only";
import { google } from "googleapis";

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google OAuth env vars (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN)"
    );
  }

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

let sheets: ReturnType<typeof google.sheets> | undefined;
let drive: ReturnType<typeof google.drive> | undefined;

export function getSheetsClient() {
  if (!sheets) {
    sheets = google.sheets({ version: "v4", auth: getOAuth2Client() });
  }
  return sheets;
}

export function getDriveClient() {
  if (!drive) {
    drive = google.drive({ version: "v3", auth: getOAuth2Client() });
  }
  return drive;
}
