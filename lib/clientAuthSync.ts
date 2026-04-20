let pendingSyncCount = 1;
let waitingResolvers: Array<() => void> = [];

function flushWaitingResolvers() {
  const resolvers = waitingResolvers;
  waitingResolvers = [];
  resolvers.forEach((resolve) => resolve());
}

export function beginClientAuthSync() {
  pendingSyncCount += 1;
}

export function endClientAuthSync() {
  pendingSyncCount = Math.max(0, pendingSyncCount - 1);

  if (pendingSyncCount === 0) {
    flushWaitingResolvers();
  }
}

export async function waitForClientAuthSync(timeoutMs = 1500) {
  if (typeof window === "undefined" || pendingSyncCount === 0) {
    return;
  }

  await Promise.race([
    new Promise<void>((resolve) => {
      waitingResolvers.push(resolve);
    }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}
