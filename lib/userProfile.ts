const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_REQUIREMENTS = `Use ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} lowercase letters, numbers, or underscores.`;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return (
    value.length >= USERNAME_MIN_LENGTH &&
    value.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(value)
  );
}

export function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearString, monthString, dayString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(candidate.getTime())) {
    return false;
  }

  const isSameDate =
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day;

  if (!isSameDate) {
    return false;
  }

  const earliestAllowed = "1900-01-01";
  const today = new Date();
  const todayValue = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, "0"),
    String(today.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return value >= earliestAllowed && value <= todayValue;
}

export function hasCompletedStudentProfile(profile: {
  role?: string | null;
  username?: string | null;
  birthDate?: string | null;
}) {
  if (profile.role !== "STUDENT") {
    return true;
  }

  return Boolean(profile.username && profile.birthDate);
}

export function isStudentProfileIncomplete(profile: {
  role?: string | null;
  hasCompletedProfile?: boolean | null;
}) {
  return profile.role === "STUDENT" && !profile.hasCompletedProfile;
}
