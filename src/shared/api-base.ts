export function normalizeApiBaseUrl(value: string) {
  const url = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  return url.replace(/\/+$/, "");
}
