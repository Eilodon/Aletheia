// Polyfill global crypto for React Native / Hermes environments.
// Must be imported before any library that calls crypto.getRandomValues() or crypto.randomUUID().
// Uses Math.random() as entropy source — sufficient for device IDs and SDK session nonces.

if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.getRandomValues === "undefined") {
  const getRandomValues = <T extends ArrayBufferView>(array: T): T => {
    const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < u8.length; i++) {
      u8[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };

  const randomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
    const b = new Uint8Array(16);
    getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`;
  };

  (globalThis as unknown as { crypto: Crypto }).crypto = {
    getRandomValues,
    randomUUID,
    subtle: {} as SubtleCrypto,
  } as Crypto;
}
