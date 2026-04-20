import { createHash, randomBytes, timingSafeEqual } from "crypto";

const TOKEN_PREFIX = "ronan_";
const TOKEN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const TOKEN_LENGTH = 32;
const TOKEN_MAX_RANDOM_BYTE = Math.floor(256 / TOKEN_ALPHABET.length) * TOKEN_ALPHABET.length;

export function generateGroupAccessToken() {
  let randomPart = "";

  while (randomPart.length < TOKEN_LENGTH) {
    const buffer = randomBytes(TOKEN_LENGTH * 2);

    for (const value of buffer) {
      if (value >= TOKEN_MAX_RANDOM_BYTE) {
        continue;
      }

      randomPart += TOKEN_ALPHABET[value % TOKEN_ALPHABET.length];

      if (randomPart.length === TOKEN_LENGTH) {
        break;
      }
    }
  }

  return `${TOKEN_PREFIX}${randomPart}`;
}

export function getGroupAccessTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getGroupAccessTokenPreview(token: string) {
  return token.slice(0, TOKEN_PREFIX.length + 6);
}

export function isGroupAccessTokenFormat(token: string) {
  return new RegExp(`^${TOKEN_PREFIX}[${TOKEN_ALPHABET.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&")}]{${TOKEN_LENGTH}}$`).test(token);
}

export function verifyGroupAccessToken(token: string, expectedHash: string | null | undefined) {
  if (!expectedHash || !isGroupAccessTokenFormat(token)) {
    return false;
  }

  const incomingHash = Buffer.from(getGroupAccessTokenHash(token), "utf8");
  const storedHash = Buffer.from(expectedHash, "utf8");

  if (incomingHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(incomingHash, storedHash);
}

export { TOKEN_LENGTH as GROUP_ACCESS_TOKEN_LENGTH, TOKEN_PREFIX as GROUP_ACCESS_TOKEN_PREFIX };
