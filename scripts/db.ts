import { spawn } from "node:child_process";
import process from "node:process";
import { Collection, Document, MongoClient } from "mongodb";

const DEFAULT_LOCAL_MONGODB_URI = "mongodb://127.0.0.1:27017/ronansat-local";
const FETCH_FLAG = "--fetch";
const STOP_FLAG = "--stop";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const WAIT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 500;
const COPY_BATCH_SIZE = 500;

function shouldFetchDb(argv: string[]) {
  return argv.includes(FETCH_FLAG);
}

function shouldStopDb(argv: string[]) {
  return argv.includes(STOP_FLAG);
}

function getLocalMongoUri() {
  return process.env.LOCAL_MONGODB_URI?.trim() || DEFAULT_LOCAL_MONGODB_URI;
}

function parseMongoUri(uri: string) {
  const parsed = new URL(uri);

  return {
    raw: uri,
    host: parsed.hostname,
    databaseName: parsed.pathname.replace(/^\//, "") || "default",
  };
}

function getRemoteMongoUri() {
  return process.env.REMOTE_MONGODB_URI?.trim() || process.env.MONGODB_URI?.trim() || "";
}

function assertLocalTarget(localUri: string) {
  const local = parseMongoUri(localUri);

  if (!LOCAL_HOSTS.has(local.host)) {
    throw new Error(
      `Refusing to manage non-local LOCAL_MONGODB_URI target (${local.host}). Use localhost or 127.0.0.1 only.`,
    );
  }
}

function assertDifferentTargets(remoteUri: string, localUri: string) {
  const remote = parseMongoUri(remoteUri);
  const local = parseMongoUri(localUri);

  if (remote.raw === local.raw) {
    throw new Error("Refusing to sync because the remote and local MongoDB URIs are identical.");
  }
}

async function canConnect(localUri: string) {
  const client = new MongoClient(localUri, { serverSelectionTimeoutMS: 2000 });

  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    return true;
  } catch {
    return false;
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function isLocalDbEmpty(localUri: string) {
  const client = new MongoClient(localUri, { serverSelectionTimeoutMS: 2000 });

  try {
    await client.connect();
    const collections = await client.db().listCollections({}, { nameOnly: true }).toArray();
    return collections.filter((collection) => !collection.name.startsWith("system.")).length === 0;
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function recreateIndexes(sourceCollection: Collection<Document>, targetCollection: Collection<Document>) {
  const indexes = await sourceCollection.indexes();

  for (const index of indexes) {
    if (index.name === "_id_") {
      continue;
    }

    const { key, name, ...options } = index;
    await targetCollection.createIndex(key, { ...options, name });
  }
}

async function copyCollection(sourceCollection: Collection<Document>, targetCollection: Collection<Document>) {
  const cursor = sourceCollection.find({});
  let buffer: Document[] = [];

  for await (const document of cursor) {
    buffer.push(document);

    if (buffer.length >= COPY_BATCH_SIZE) {
      await targetCollection.insertMany(buffer);
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    await targetCollection.insertMany(buffer);
  }
}

async function syncRemoteDbToLocal(localUri: string) {
  const remoteUri = getRemoteMongoUri();

  if (!remoteUri) {
    throw new Error("Missing remote MongoDB URI. Set MONGODB_URI or REMOTE_MONGODB_URI before using --fetch-db.");
  }

  assertDifferentTargets(remoteUri, localUri);

  const remoteMeta = parseMongoUri(remoteUri);
  const localMeta = parseMongoUri(localUri);

  console.log(`Syncing MongoDB from ${remoteMeta.host}/${remoteMeta.databaseName} to ${localMeta.host}/${localMeta.databaseName}...`);

  const sourceClient = new MongoClient(remoteUri);
  const targetClient = new MongoClient(localUri);

  try {
    await Promise.all([sourceClient.connect(), targetClient.connect()]);

    const sourceDb = sourceClient.db();
    const targetDb = targetClient.db();
    const collections = (await sourceDb.listCollections({}, { nameOnly: true }).toArray())
      .map((collection) => collection.name)
      .filter((name) => !name.startsWith("system."));

    await targetDb.dropDatabase();

    for (const collectionName of collections) {
      const sourceCollection = sourceDb.collection(collectionName);
      const targetCollection = targetDb.collection(collectionName);

      await copyCollection(sourceCollection, targetCollection);
      await recreateIndexes(sourceCollection, targetCollection);

      console.log(`Synced ${collectionName}`);
    }

    console.log("Local MongoDB is ready.");
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function startMongoService() {
  switch (process.platform) {
    case "darwin":
      await runCommand("brew", ["services", "start", "mongodb/brew/mongodb-community"]);
      return;
    case "win32":
      await runCommand("powershell.exe", [
        "-NoProfile",
        "-Command",
        "Start-Service -Name MongoDB",
      ]);
      return;
    case "linux":
      await runCommand("systemctl", ["--user", "start", "mongod"]);
      return;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

async function stopMongoService() {
  switch (process.platform) {
    case "darwin":
      await runCommand("brew", ["services", "stop", "mongodb/brew/mongodb-community"]);
      return;
    case "win32":
      await runCommand("powershell.exe", [
        "-NoProfile",
        "-Command",
        "Stop-Service -Name MongoDB",
      ]);
      return;
    case "linux":
      await runCommand("systemctl", ["--user", "stop", "mongod"]);
      return;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

async function waitForMongo(localUri: string) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await canConnect(localUri)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("MongoDB did not become reachable in time.");
}

async function main() {
  const args = process.argv.slice(2);
  const fetchDb = shouldFetchDb(args);
  const stopDb = shouldStopDb(args);
  const localUri = getLocalMongoUri();
  const localMeta = parseMongoUri(localUri);

  assertLocalTarget(localUri);

  if (stopDb) {
    console.log(`Stopping local MongoDB at ${localMeta.host}/${localMeta.databaseName}...`);
    await stopMongoService();
    console.log("Local MongoDB stop command completed.");
    return;
  }

  if (await canConnect(localUri)) {
    console.log(`Local MongoDB is already running at ${localMeta.host}/${localMeta.databaseName}.`);
  } else {
    console.log(`Starting local MongoDB at ${localMeta.host}/${localMeta.databaseName}...`);
    await startMongoService();
    await waitForMongo(localUri);
  }

  if (fetchDb) {
    await syncRemoteDbToLocal(localUri);
    return;
  }

  if (await isLocalDbEmpty(localUri)) {
    console.log("Local MongoDB is empty. Running first-time sync from the remote source...");
    await syncRemoteDbToLocal(localUri);
  }

  console.log("Local MongoDB is ready.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  if (process.platform === "darwin") {
    console.error("Install MongoDB Community Edition first: `brew tap mongodb/brew && brew install mongodb/brew/mongodb-community`.");
  }

  if (process.platform === "win32") {
    console.error("Install MongoDB Community Server with the Windows Service option enabled, then rerun `bun run db`.");
  }

  process.exit(1);
});
