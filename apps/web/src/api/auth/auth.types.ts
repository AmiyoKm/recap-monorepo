import type { authClient } from "@/api/client";

export type TSession = typeof authClient.$Infer.Session;
export type TSessionUser = TSession["user"];
