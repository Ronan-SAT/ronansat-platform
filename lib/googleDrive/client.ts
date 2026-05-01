import { google } from "googleapis";

import {
  getGoogleDriveOAuthClientId,
  getGoogleDriveOAuthClientSecret,
  getGoogleDriveOAuthRefreshToken,
} from "@/lib/googleDrive/env";

export function getGoogleDriveClient() {
  const auth = new google.auth.OAuth2(
    getGoogleDriveOAuthClientId(),
    getGoogleDriveOAuthClientSecret(),
  );

  auth.setCredentials({
    refresh_token: getGoogleDriveOAuthRefreshToken(),
  });

  return google.drive({ version: "v3", auth });
}
