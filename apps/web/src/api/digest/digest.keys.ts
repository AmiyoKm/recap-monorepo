export const digestKeys = {
  all: ["digest"] as const,
  settings: () => [...digestKeys.all, "settings"] as const,
  list: () => [...digestKeys.all, "list"] as const,
  detail: (date: string) => [...digestKeys.all, "detail", date] as const,
};
