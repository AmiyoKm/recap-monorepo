import { focusManager, QueryClient } from "@tanstack/react-query";

function listenToWindowFocus(): void {
  focusManager.setEventListener((setFocused) => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    const onVisibilityChange = () => setFocused(document.visibilityState === "visible");
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  });
}

export function createQueryClient(): QueryClient {
  listenToWindowFocus();
  return new QueryClient();
}
