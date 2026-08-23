import assert from "node:assert/strict";
import test from "node:test";
import { messageSide } from "../src/shared/chat.ts";
import { parseRoute } from "../src/shared/navigation.ts";

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
