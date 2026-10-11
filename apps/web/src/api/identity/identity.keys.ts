export const identityKeys = {
  all: ["identity"] as const,
  list: () => [...identityKeys.all, "list"] as const,
};
