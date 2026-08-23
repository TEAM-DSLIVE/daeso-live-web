export type Page =
  | "home"
  | "waiting"
  | "matching"
  | "chat"
  | "ended"
  | "connection-error"
  | "send-failed"
  | "settings"
  | "privacy"
  | "support"
  | "admin"
  | "admin-chat";

export type Route = { page: Page; userId?: string };
export type Navigate = (path: string) => void;

const PAGES: Page[] = [
  "home",
  "waiting",
  "matching",
  "chat",
  "ended",
  "connection-error",
  "send-failed",
  "settings",
  "privacy",
  "support",
  "admin",
];

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  if (path.startsWith("admin/")) {
    return { page: "admin-chat", userId: path.slice("admin/".length) || "A17" };
  }
  if (path === "error") return { page: "connection-error" };
  const page = path as Page;
  return PAGES.includes(page) ? { page } : { page: "home" };
}
