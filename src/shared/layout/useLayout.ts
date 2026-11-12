import { useSyncExternalStore } from "react";

export type LayoutSize = "mobile" | "tablet" | "desktop";

const subscribe = (listener: () => void) => {
  const queries = ["(min-width: 640px)", "(min-width: 1024px)"].map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", listener));
  return () => queries.forEach((query) => query.removeEventListener("change", listener));
};

function getLayout(): LayoutSize {
  if (window.matchMedia("(min-width: 1024px)").matches) return "desktop";
  if (window.matchMedia("(min-width: 640px)").matches) return "tablet";
  return "mobile";
}

export function useLayout(): LayoutSize {
  return useSyncExternalStore(subscribe, getLayout, () => "mobile");
}
