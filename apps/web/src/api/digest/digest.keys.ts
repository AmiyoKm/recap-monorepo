export const digestKeys = {
  all: ["digest"] as const,
  settings: () => [...digestKeys.all, "settings"] as const,
};
