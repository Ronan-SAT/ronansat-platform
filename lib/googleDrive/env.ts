function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getGoogleDrivePdfRootFolderId() {
  return getRequiredEnv("GOOGLE_DRIVE_PDF_ROOT_FOLDER_ID");
}

export function getGoogleDriveOAuthClientId() {
  return getRequiredEnv("GOOGLE_DRIVE_OAUTH_CLIENT_ID");
}

export function getGoogleDriveOAuthClientSecret() {
  return getRequiredEnv("GOOGLE_DRIVE_OAUTH_CLIENT_SECRET");
}

export function getGoogleDriveOAuthRefreshToken() {
  return getRequiredEnv("GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN");
}
