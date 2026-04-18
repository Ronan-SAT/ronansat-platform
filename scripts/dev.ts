import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";
import { MongoClient } from "mongodb";

const require = createRequire(import.meta.url);

const DEFAULT_LOCAL_MONGODB_URI = "mongodb://127.0.0.1:27017/ronansat-local";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function isHelpInvocation(nextArgs: string[]) {
  return nextArgs.includes("--help") || nextArgs.includes("-h");
}

function parseMongoUri(uri: string) {
  const parsed = new URL(uri);

  return {
    raw: uri,
    host: parsed.hostname,
    databaseName: parsed.pathname.replace(/^\//, "") || "default",
  };
}

function getLocalMongoUri() {
  return process.env.LOCAL_MONGODB_URI?.trim() || DEFAULT_LOCAL_MONGODB_URI;
}

function assertLocalTarget(localUri: string) {
  const local = parseMongoUri(localUri);

  if (!LOCAL_HOSTS.has(local.host)) {
    throw new Error(
      `Refusing to use non-local LOCAL_MONGODB_URI target (${local.host}). Use localhost or 127.0.0.1 only.`,
    );
  }
}
async function assertLocalMongoIsReachable(localUri: string) {
  const localClient = new MongoClient(localUri, { serverSelectionTimeoutMS: 3000 });

  try {
    await localClient.connect();
    await localClient.db().command({ ping: 1 });
  } catch (error) {
    throw new Error(
      `Could not connect to local MongoDB at ${parseMongoUri(localUri).host}. Run \`bun run db\` before running dev.`,
      { cause: error },
    );
  } finally {
    await localClient.close().catch(() => undefined);
  }
}

function startNextDev(localMongoUri: string, nextArgs: string[]) {
  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "dev", ...nextArgs], {
    stdio: "inherit",
    env: {
      ...process.env,
      MONGODB_URI: localMongoUri,
    },
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

async function main() {
  const nextArgs = process.argv.slice(2);
  const localMongoUri = getLocalMongoUri();

  assertLocalTarget(localMongoUri);

  if (isHelpInvocation(nextArgs)) {
    startNextDev(localMongoUri, nextArgs);
    return;
  }

  await assertLocalMongoIsReachable(localMongoUri);

  const localMeta = parseMongoUri(localMongoUri);
  console.log(`Starting dev server with local MongoDB at ${localMeta.host}/${localMeta.databaseName}.`);
  startNextDev(localMongoUri, nextArgs);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
