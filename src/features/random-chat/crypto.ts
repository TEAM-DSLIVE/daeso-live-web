export type RoomKeyState = {
  privateKey: CryptoKey;
  publicMaterial: string;
  sharedKey: CryptoKey | null;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function createRoomKeyState(): Promise<RoomKeyState> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const publicMaterial = bytesToBase64(new TextEncoder().encode(JSON.stringify(publicJwk)));
  return { privateKey: keyPair.privateKey, publicMaterial, sharedKey: null };
}

export async function deriveRoomKey(state: RoomKeyState, material: string) {
  const decoded = JSON.parse(new TextDecoder().decode(base64ToBytes(material))) as unknown;
  if (!isObject(decoded) || decoded.kty !== "EC" || decoded.crv !== "P-256") throw new Error("지원하지 않는 공개키예요.");
  state.sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: await crypto.subtle.importKey("jwk", decoded as JsonWebKey, { name: "ECDH", namedCurve: "P-256" }, true, []) },
    state.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return state.sharedKey;
}

export async function encryptText(key: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) };
}

export async function decryptText(key: CryptoKey, ciphertext: string, iv: string) {
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, key, base64ToBytes(ciphertext));
  return new TextDecoder().decode(plaintext);
}
