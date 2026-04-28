import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { readThroughClientCache, setClientCache } from "@/lib/clientCache";
import type { GroupAccessTokenStatus } from "@/types/group";
import type { TestingRoomTheme } from "@/lib/testingRoomTheme";

export type UserSettingsPayload = {
  user?: {
    testingRoomTheme?: TestingRoomTheme;
    [key: string]: unknown;
  };
};

export const SETTINGS_CACHE_KEYS = {
  userSettings: "settings:user",
  groupAccessToken: "settings:group-access-token",
} as const;

export async function fetchUserSettings() {
  return readThroughClientCache(
    SETTINGS_CACHE_KEYS.userSettings,
    async () => {
      const response = await api.get<UserSettingsPayload>(API_PATHS.USER_SETTINGS);
      return response.data;
    },
    { persistForSession: true },
  );
}

export async function updateTestingRoomTheme(nextTheme: TestingRoomTheme) {
  await api.put(API_PATHS.USER_SETTINGS, { testingRoomTheme: nextTheme });
  const currentSettings = await fetchUserSettings().catch(() => undefined);
  setClientCache(
    SETTINGS_CACHE_KEYS.userSettings,
    {
      ...currentSettings,
      user: {
        ...currentSettings?.user,
        testingRoomTheme: nextTheme,
      },
    },
    { persistForSession: true },
  );
}

export async function fetchGroupAccessTokenStatus() {
  return readThroughClientCache(
    SETTINGS_CACHE_KEYS.groupAccessToken,
    async () => {
      const response = await api.get<GroupAccessTokenStatus>(API_PATHS.USER_GROUP_ACCESS_TOKEN);
      return response.data;
    },
    { persistForSession: true },
  );
}
