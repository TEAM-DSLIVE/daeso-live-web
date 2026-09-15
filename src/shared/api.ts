import { normalizeApiBaseUrl } from "./api-base";

export type Role = "USER" | "ADMIN";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: Role;
};

export type ChatState = {
  state: "IDLE" | "WAITING" | "IN_ROOM";
  roomId: string | null;
  myNickname: string | null;
  peerNickname: string | null;
  initiator: boolean | null;
  roomCreatedAt: string | null;
  waitingCount: number;
};

export type SupportMessage = {
  id: number;
  sender: "USER" | "ADMIN";
  content: string;
  createdAt: string;
};

export type SupportMessagesPage = {
  threadId: number | null;
  messages: SupportMessage[];
  nextCursor: string | null;
};

export type AdminThread = {
  threadId: number;
  anonymousUserCode: string;
  lastMessageAt: string;
};

export type AdminThreadsPage = {
  threads: AdminThread[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

export type ApiFieldError = {
  field: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly fieldErrors: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type JsonObject = Record<string, unknown>;
type SessionListener = (session: AuthSession | null) => void;

const configuredApiBaseUrl =
  import.meta.env?.VITE_SERVER_URL?.trim() || import.meta.env?.VITE_API_BASE_URL?.trim() || "http://localhost:8080";
const API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl);
const configuredHttpApiBaseUrl = import.meta.env.VITE_HTTP_API_BASE_URL?.trim();
const HTTP_API_BASE_URL =
  import.meta.env.VITE_USE_API_PROXY === "true"
    ? ""
    : configuredHttpApiBaseUrl
      ? normalizeApiBaseUrl(configuredHttpApiBaseUrl)
      : API_BASE_URL;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function isRole(value: unknown): value is Role {
  return value === "USER" || value === "ADMIN";
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new ApiError(`응답의 ${field} 값이 올바르지 않아요.`, 502);
  return value;
}

function readNullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return readString(value, field);
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(`응답의 ${field} 값이 올바르지 않아요.`, 502);
  }
  return value;
}

function readInteger(value: unknown, field: string): number {
  const number = readNumber(value, field);
  if (!Number.isInteger(number)) throw new ApiError(`응답의 ${field} 값이 올바르지 않아요.`, 502);
  return number;
}

function parseSession(value: unknown): AuthSession {
  if (!isObject(value)) throw new ApiError("인증 응답 형식이 올바르지 않아요.", 502);
  if (!isRole(value.role)) throw new ApiError("응답의 role 값이 올바르지 않아요.", 502);
  return {
    accessToken: readString(value.accessToken, "accessToken"),
    refreshToken: readString(value.refreshToken, "refreshToken"),
    expiresIn: readInteger(value.expiresIn, "expiresIn"),
    role: value.role,
  };
}

function parseChatState(value: unknown): ChatState {
  if (!isObject(value) || !["IDLE", "WAITING", "IN_ROOM"].includes(String(value.state))) {
    throw new ApiError("채팅 상태 응답 형식이 올바르지 않아요.", 502);
  }
  const state = value.state as ChatState["state"];
  const initiator = value.initiator;
  if (initiator !== null && initiator !== undefined && typeof initiator !== "boolean") {
    throw new ApiError("응답의 initiator 값이 올바르지 않아요.", 502);
  }
  return {
    state,
    roomId: readNullableString(value.roomId, "roomId"),
    myNickname: readNullableString(value.myNickname, "myNickname"),
    peerNickname: readNullableString(value.peerNickname, "peerNickname"),
    initiator: initiator === null || initiator === undefined ? null : initiator,
    roomCreatedAt: readNullableString(value.roomCreatedAt, "roomCreatedAt"),
    waitingCount: readInteger(value.waitingCount ?? 0, "waitingCount"),
  };
}

function parseSupportMessage(value: unknown): SupportMessage {
  if (!isObject(value)) throw new ApiError("문의 메시지 응답 형식이 올바르지 않아요.", 502);
  const sender = value.sender === "USER" || value.sender === "ADMIN" ? value.sender : null;
  if (!sender) throw new ApiError("문의 메시지 발신자 값이 올바르지 않아요.", 502);
  return {
    id: readInteger(value.id, "id"),
    sender,
    content: readString(value.content, "content"),
    createdAt: readString(value.createdAt, "createdAt"),
  };
}

function parseSupportMessages(value: unknown): SupportMessagesPage {
  if (!isObject(value) || !Array.isArray(value.messages)) {
    throw new ApiError("문의 목록 응답 형식이 올바르지 않아요.", 502);
  }
  const nextCursor = value.nextCursor;
  if (nextCursor !== null && nextCursor !== undefined && typeof nextCursor !== "string" && typeof nextCursor !== "number") {
    throw new ApiError("문의 목록의 nextCursor 값이 올바르지 않아요.", 502);
  }
  return {
    threadId: value.threadId === null || value.threadId === undefined ? null : readInteger(value.threadId, "threadId"),
    messages: value.messages.map(parseSupportMessage),
    nextCursor: nextCursor === null || nextCursor === undefined ? null : String(nextCursor),
  };
}

function parseAdminThreads(value: unknown): AdminThreadsPage {
  if (!isObject(value) || !Array.isArray(value.threads)) {
    throw new ApiError("문의 목록 응답 형식이 올바르지 않아요.", 502);
  }
  if (typeof value.hasNext !== "boolean") throw new ApiError("응답의 hasNext 값이 올바르지 않아요.", 502);
  return {
    threads: value.threads.map((thread) => {
      if (!isObject(thread)) throw new ApiError("문의방 응답 형식이 올바르지 않아요.", 502);
      return {
        threadId: readInteger(thread.threadId, "threadId"),
        anonymousUserCode: readString(thread.anonymousUserCode, "anonymousUserCode"),
        lastMessageAt: readString(thread.lastMessageAt, "lastMessageAt"),
      };
    }),
    page: readInteger(value.page, "page"),
    size: readInteger(value.size, "size"),
    totalElements: readInteger(value.totalElements, "totalElements"),
    hasNext: value.hasNext,
  };
}

function parseError(status: number, value: unknown): ApiError {
  if (!isObject(value)) return new ApiError("요청을 처리하지 못했어요.", status);
  const fieldErrors = Array.isArray(value.fieldErrors)
    ? value.fieldErrors.flatMap((fieldError) => {
        if (!isObject(fieldError) || typeof fieldError.field !== "string") return [];
        const message = typeof fieldError.message === "string" ? fieldError.message : fieldError.reason;
        if (typeof message !== "string") return [];
        return [{ field: fieldError.field, message }];
      })
    : [];
  return new ApiError(
    typeof value.message === "string" && value.message ? value.message : "요청을 처리하지 못했어요.",
    status,
    typeof value.code === "string" ? value.code : undefined,
    fieldErrors,
  );
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("서버 응답 형식이 올바르지 않아요.", 502);
  }
}

export class ApiClient {
  private session: AuthSession | null = null;
  private refreshPromise: Promise<AuthSession> | null = null;
  private sessionListener: SessionListener | null = null;

  getAccessToken() {
    return this.session?.accessToken ?? null;
  }

  setSessionListener(listener: SessionListener) {
    this.sessionListener = listener;
    return () => {
      if (this.sessionListener === listener) this.sessionListener = null;
    };
  }

  clearSession() {
    this.session = null;
    this.sessionListener?.(null);
  }

  async login(aidToken: string) {
    const value = await this.requestRaw<unknown>("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aidToken }),
    });
    const session = parseSession(value);
    this.setSession(session);
    return session;
  }

  async refreshSession() {
    if (!this.session?.refreshToken) throw new ApiError("인증이 만료됐어요.", 401, "AUTH_401_3");
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.requestRaw<unknown>("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: this.session.refreshToken }),
    })
      .then((value) => {
        const session = parseSession(value);
        this.setSession(session);
        return session;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  async getChatState() {
    const value = await this.request<unknown>("/api/v1/chat/state");
    return parseChatState(value);
  }

  async getSupportMessages(beforeId?: string | null) {
    const params = new URLSearchParams({ size: "50" });
    if (beforeId !== undefined && beforeId !== null) params.set("beforeId", beforeId);
    const value = await this.request<unknown>(`/api/v1/support/messages?${params}`);
    return parseSupportMessages(value);
  }

  async sendSupportMessage(content: string) {
    const value = await this.request<unknown>("/api/v1/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return parseSupportMessage(value);
  }

  async getAdminThreads(page = 0, size = 30) {
    const value = await this.request<unknown>(`/api/v1/admin/support/threads?page=${page}&size=${size}`);
    return parseAdminThreads(value);
  }

  async getAdminMessages(threadId: number, beforeId?: string | null) {
    const params = new URLSearchParams({ size: "50" });
    if (beforeId !== undefined && beforeId !== null) params.set("beforeId", beforeId);
    const query = params.toString();
    const value = await this.request<unknown>(`/api/v1/admin/support/threads/${threadId}/messages${query ? `?${query}` : ""}`);
    return parseSupportMessages(value);
  }

  async sendAdminMessage(threadId: number, content: string) {
    const value = await this.request<unknown>(`/api/v1/admin/support/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return parseSupportMessage(value);
  }

  createChatSocket() {
    const accessToken = this.getAccessToken();
    if (!accessToken) throw new ApiError("인증이 필요해요.", 401, "AUTH_401_1");
    const url = new URL("/ws/chat", API_BASE_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", accessToken);
    return new WebSocket(url);
  }

  private async request<T>(path: string, init: RequestInit = {}, allowRefresh = true): Promise<T> {
    const response = await this.fetch(path, init, this.getAccessToken());
    if (response.status === 401 && allowRefresh && this.session?.refreshToken) {
      try {
        await this.refreshSession();
        return this.request<T>(path, init, false);
      } catch {
        this.clearSession();
        throw new ApiError("인증이 만료됐어요.", 401, "AUTH_401_3");
      }
    }
    return this.parseResponse<T>(response);
  }

  private async requestRaw<T>(path: string, init: RequestInit = {}) {
    const response = await this.fetch(path, init, null);
    return this.parseResponse<T>(response);
  }

  private async fetch(path: string, init: RequestInit, accessToken: string | null) {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    try {
      return await window.fetch(`${HTTP_API_BASE_URL}${path}`, { ...init, headers });
    } catch {
      throw new ApiError("서버에 연결할 수 없어요.", 0);
    }
  }

  private async parseResponse<T>(response: Response) {
    const value = await readBody(response);
    if (!response.ok) throw parseError(response.status, value);
    return value as T;
  }

  private setSession(session: AuthSession) {
    this.session = session;
    this.sessionListener?.(session);
  }
}
