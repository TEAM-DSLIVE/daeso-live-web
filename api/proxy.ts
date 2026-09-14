type FunctionRequest = {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type FunctionResponse = {
  status: (code: number) => FunctionResponse;
  json: (body: unknown) => FunctionResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => FunctionResponse;
};

function readHeader(request: FunctionRequest, name: string) {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(request: FunctionRequest, response: FunctionResponse) {
  const requestUrl = new URL(request.url ?? "/", "https://daeso-live-proxy.invalid");
  const path = requestUrl.searchParams.get("path")?.replace(/^\/+|\/+$/g, "");
  if (!path) return response.status(400).json({ message: "API 경로가 필요해요." });
  if (request.method === "OPTIONS") return response.status(204).send("");

  const configuredServerUrl = process.env.VITE_SERVER_URL || process.env.VITE_API_BASE_URL;
  if (!configuredServerUrl) return response.status(500).json({ message: "서버 주소가 설정되지 않았어요." });

  const serverUrl = /^https?:\/\//i.test(configuredServerUrl.trim())
    ? configuredServerUrl.trim()
    : `https://${configuredServerUrl.trim()}`;
  const method = request.method ?? "GET";
  const body = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
  const headers = Object.fromEntries(
    ["authorization", "content-type", "accept"]
      .map((name) => [name, readHeader(request, name)])
      .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  requestUrl.searchParams.delete("path");

  try {
    const upstream = await fetch(`${serverUrl.replace(/\/+$/, "")}/api/v1/${path}${requestUrl.search}`, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : body,
    });
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    return response.status(upstream.status).send(await upstream.text());
  } catch {
    return response.status(502).json({ message: "서버에 연결할 수 없어요." });
  }
}
