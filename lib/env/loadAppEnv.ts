import { config } from "@dotenvx/dotenvx";

export type AppEnvMode = "development" | "production";

const loadedModes = new Set<AppEnvMode>();

function resolveAppEnvMode(): AppEnvMode {
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function getEnvFiles(mode: AppEnvMode) {
  if (mode === "production") {
    return [".env.production"];
  }

  return [".env.development", ".env.local"];
}

export function loadAppEnv(mode: AppEnvMode = resolveAppEnvMode()) {
  if (loadedModes.has(mode)) {
    return;
  }

  if (mode === "production" && !process.env.DOTENV_PRIVATE_KEY_PRODUCTION) {
    loadedModes.add(mode);
    return;
  }

  const result = config({
    path: getEnvFiles(mode),
    ignore: ["MISSING_ENV_FILE"],
    override: true,
    quiet: true,
  });

  if (result.error) {
    const errorWithCode = result.error as Error & { code?: string };
    if (errorWithCode.code !== "MISSING_PRIVATE_KEY") {
      throw result.error;
    }
  }

  loadedModes.add(mode);
}
