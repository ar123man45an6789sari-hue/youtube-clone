// Helper functions to manage id lists in localStorage

export const getStoredIds = (key: string): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

export const addStoredId = (key: string, id: string) => {
  const ids = getStoredIds(key).filter((x) => x !== id);
  ids.unshift(id); // newest first
  localStorage.setItem(key, JSON.stringify(ids));
};

export const removeStoredId = (key: string, id: string) => {
  const ids = getStoredIds(key).filter((x) => x !== id);
  localStorage.setItem(key, JSON.stringify(ids));
};

export const toggleStoredId = (key: string, id: string): boolean => {
  const ids = getStoredIds(key);
  if (ids.includes(id)) {
    removeStoredId(key, id);
    return false;
  }
  addStoredId(key, id);
  return true;
};