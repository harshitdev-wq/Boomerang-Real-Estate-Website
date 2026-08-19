import { useEffect, useState } from "react";

export interface Route {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

export function parseHash(hash: string): Route {
  const raw = (hash || "#").replace(/^#/, "") || "/";
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const path = "/" + (segments[0] ?? "");
  const params: Record<string, string> = {};
  if (segments.length > 1) params.id = decodeURIComponent(segments[1]);
  return { path, params, query: new URLSearchParams(queryPart ?? "") };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export function navigate(path: string): void {
  if (window.location.hash === `#${path}`) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = path;
}

let pendingScroll: string | null = null;

export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  pendingScroll = id;
  navigate("/");
}

export function consumePendingScroll(): string | null {
  const s = pendingScroll;
  pendingScroll = null;
  return s;
}
