const STORAGE_KEY = "eventpass.creation-limits";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type CreationLimitRecord = Record<string, number>;

const readStorage = (): CreationLimitRecord => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as CreationLimitRecord;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch (error) {
    console.warn("Unable to read event creation limits from storage", error);
    return {};
  }
};

const writeStorage = (data: CreationLimitRecord) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Unable to persist event creation limits", error);
  }
};

export const getLastCreationTimestamp = (address: string | null | undefined): number | null => {
  if (!address) {
    return null;
  }
  const store = readStorage();
  const value = store[address];
  return typeof value === "number" ? value : null;
};

export const canCreateEventToday = (address: string | null | undefined): boolean => {
  if (!address) {
    return false;
  }
  const lastCreation = getLastCreationTimestamp(address);
  if (!lastCreation) {
    return true;
  }
  return Date.now() - lastCreation >= ONE_DAY_MS;
};

export const recordEventCreation = (address: string | null | undefined) => {
  if (!address) {
    return;
  }
  const store = readStorage();
  store[address] = Date.now();
  writeStorage(store);
};

export const millisUntilNextCreation = (address: string | null | undefined): number => {
  if (!address) {
    return ONE_DAY_MS;
  }
  const lastCreation = getLastCreationTimestamp(address);
  if (!lastCreation) {
    return 0;
  }
  const elapsed = Date.now() - lastCreation;
  return Math.max(ONE_DAY_MS - elapsed, 0);
};
