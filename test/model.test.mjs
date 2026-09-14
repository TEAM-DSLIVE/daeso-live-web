import assert from "node:assert/strict";
import test from "node:test";
import { createRoomKeyState, decryptText, deriveRoomKey, encryptText } from "../src/features/random-chat/crypto.ts";
import { messageSide } from "../src/shared/chat.ts";
import { parseRoute } from "../src/shared/navigation.ts";
import { normalizeApiBaseUrl } from "../src/shared/api-base.ts";

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
