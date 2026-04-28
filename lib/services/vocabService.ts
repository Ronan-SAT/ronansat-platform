import { API_PATHS } from "@/lib/apiPaths";
import { readThroughClientCache, setClientCache } from "@/lib/clientCache";
import { normalizeVocabBoard, type VocabBoardState } from "@/lib/vocabBoard";

export const VOCAB_BOARD_CACHE_KEY = "vocab:board";

export async function fetchVocabBoard() {
  return readThroughClientCache(
    VOCAB_BOARD_CACHE_KEY,
    async () => {
      const response = await fetch(API_PATHS.USER_VOCAB_BOARD, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { board?: unknown };
      return normalizeVocabBoard(payload.board);
    },
    { persistForSession: true },
  );
}

export async function persistVocabBoard(nextBoard: VocabBoardState) {
  const response = await fetch(API_PATHS.USER_VOCAB_BOARD, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ board: nextBoard }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { board?: unknown };
  const savedBoard = normalizeVocabBoard(payload.board ?? nextBoard);
  setClientCache(VOCAB_BOARD_CACHE_KEY, savedBoard, { persistForSession: true });
  return savedBoard;
}
