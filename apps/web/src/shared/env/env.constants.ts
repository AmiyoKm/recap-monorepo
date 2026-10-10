import { readRequiredEnv } from "@/shared/env/env.helpers";

export const API_URL = readRequiredEnv("VITE_API_URL", import.meta.env.VITE_API_URL);
