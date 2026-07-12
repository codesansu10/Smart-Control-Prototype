import { useEffect } from "react";

export function useEscapeKey(enabled: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onEscape]);
}
