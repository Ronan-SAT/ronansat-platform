export const INITIAL_TAB_LOAD_SEEN_KEY = "ronan_app_initial_tab_load_seen";
export const INITIAL_TAB_BOOT_PENDING_KEY = "ronan_app_initial_tab_boot_pending";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function hasSeenInitialTabLoad() {
  return getSessionStorage()?.getItem(INITIAL_TAB_LOAD_SEEN_KEY) === "1";
}

export function isInitialTabBootPending() {
  return getSessionStorage()?.getItem(INITIAL_TAB_BOOT_PENDING_KEY) === "1";
}

export function clearInitialTabBootPending() {
  getSessionStorage()?.removeItem(INITIAL_TAB_BOOT_PENDING_KEY);
}
