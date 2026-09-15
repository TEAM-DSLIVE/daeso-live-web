import assert from "node:assert/strict";
import test from "node:test";
import { createRoomKeyState, decryptText, deriveRoomKey, encryptText } from "../src/features/random-chat/crypto.ts";
import { messageSide } from "../src/shared/chat.ts";
import { parseRoute } from "../src/shared/navigation.ts";
import { normalizeApiBaseUrl } from "../src/shared/api-base.ts";
import { readAidTokenFromSearch } from "../src/app/aid-auth.ts";
import { ApiClient, ApiError } from "../src/shared/api.ts";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authEnvelope(accessToken = "access-1", refreshToken = "refresh-1") {
  return {
    status: 200,
    message: "OK",
    data: { accessToken, refreshToken, expiresIn: 3600, role: "USER" },
  };
}

function withFetch(responses) {
  const previousWindow = globalThis.window;
  const requests = [];
  globalThis.window = {
    fetch: async (input, init = {}) => {
      requests.push({ input: String(input), init });
      return responses.shift();
    },
  };
  return {
    requests,
    restore() {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    },
  };
}

test("AID token can be read from the WebView URL without storing it", () => {
  assert.equal(readAidTokenFromSearch("?token=aid-token-123"), "aid-token-123");
  assert.equal(readAidTokenFromSearch("?top=12"), null);
});

test("AUTH_401_6 from login is not retried with a refresh token", async () => {
  const harness = withFetch([
    jsonResponse(
      {
        status: 401,
        message: "도담도담 동의 처리에 실패했습니다.",
        error: { code: "AUTH_401_6", message: "도담도담 동의 처리에 실패했습니다.", fieldErrors: [] },
      },
      401,
    ),
  ]);
  try {
    const api = new ApiClient();
    await assert.rejects(
      () => api.login("stale-aid-token"),
      (error) => error instanceof ApiError && error.code === "AUTH_401_6",
    );
    assert.equal(harness.requests.length, 1);
    assert.deepEqual(JSON.parse(harness.requests[0].init.body), { aidToken: "stale-aid-token" });
  } finally {
    harness.restore();
  }
});

test("a REST 401 refreshes once and retries with the new access token", async () => {
  const harness = withFetch([
    jsonResponse(authEnvelope()),
    jsonResponse(
      {
        status: 401,
        message: "만료된 토큰입니다.",
        error: { code: "AUTH_401_3", message: "만료된 토큰입니다.", fieldErrors: [] },
      },
      401,
    ),
    jsonResponse(authEnvelope("access-2", "refresh-2")),
    jsonResponse({ status: 200, message: "OK", data: { state: "IDLE", waitingCount: 0 } }),
  ]);
  try {
    const api = new ApiClient();
    await api.login("valid-aid-token");
    assert.deepEqual(await api.getChatState(), {
      state: "IDLE",
      roomId: null,
      myNickname: null,
      peerNickname: null,
      initiator: null,
      roomCreatedAt: null,
      waitingCount: 0,
    });
    assert.equal(harness.requests.length, 4);
    assert.equal(harness.requests[1].init.headers.get("Authorization"), "Bearer access-1");
    assert.deepEqual(JSON.parse(harness.requests[2].init.body), { refreshToken: "refresh-1" });
    assert.equal(harness.requests[3].init.headers.get("Authorization"), "Bearer access-2");
  } finally {
    harness.restore();
  }
});

test("refresh failure clears the session without another retry", async () => {
  const harness = withFetch([
    jsonResponse(authEnvelope()),
    jsonResponse({ status: 401, message: "만료된 토큰입니다.", error: { code: "AUTH_401_3", message: "만료된 토큰입니다." } }, 401),
    jsonResponse({ status: 401, message: "유효하지 않은 토큰입니다.", error: { code: "AUTH_401_2", message: "유효하지 않은 토큰입니다." } }, 401),
  ]);
  try {
    const api = new ApiClient();
    const sessionEvents = [];
    api.setSessionListener((session, error) => sessionEvents.push({ session, error }));
    await api.login("valid-aid-token");
    await assert.rejects(() => api.getChatState(), (error) => error instanceof ApiError && error.code === "AUTH_401_3");
    assert.equal(api.getAccessToken(), null);
    assert.equal(harness.requests.length, 3);
    assert.equal(sessionEvents.at(-1).session, null);
    assert.equal(sessionEvents.at(-1).error.code, "AUTH_401_3");
  } finally {
    harness.restore();
  }
});

test("API base URL accepts a host-only deployment variable", () => {
  assert.equal(normalizeApiBaseUrl("dslive.xn--h32bi4v.xn--3e0b707e/"), "https://dslive.xn--h32bi4v.xn--3e0b707e");
  assert.equal(normalizeApiBaseUrl("https://api.example.com/"), "https://api.example.com");
});

test("hash routes user and admin screens", () => {
  assert.deepEqual(parseRoute("#settings"), { page: "settings" });
  assert.deepEqual(parseRoute("#admin/A17"), { page: "admin-chat", userId: "A17" });
  assert.deepEqual(parseRoute("#send-failed"), { page: "send-failed" });
  assert.deepEqual(parseRoute("#error"), { page: "connection-error" });
  assert.deepEqual(parseRoute("#unknown"), { page: "home" });
});

test("support messages flip sides for user and admin", () => {
  assert.equal(messageSide("user", "user"), "me");
  assert.equal(messageSide("user", "admin"), "them");
  assert.equal(messageSide("admin", "admin"), "me");
  assert.equal(messageSide("admin", "user"), "them");
});

test("random chat key exchange encrypts and decrypts in memory", async () => {
  const first = await createRoomKeyState();
  const second = await createRoomKeyState();
  await deriveRoomKey(first, second.publicMaterial);
  await deriveRoomKey(second, first.publicMaterial);

  const encrypted = await encryptText(first.sharedKey, "비밀 메시지");
  assert.equal(await decryptText(second.sharedKey, encrypted.ciphertext, encrypted.iv), "비밀 메시지");
});
