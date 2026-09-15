export function readAidTokenFromSearch(search: string) {
  const token = new URLSearchParams(search).get("token");
  return token?.trim() || null;
}
