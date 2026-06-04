// Polyfill global crypto for React Native / Hermes environments.
// Must be imported before any library that calls crypto.getRandomValues() or crypto.randomUUID().
// Uses expo-crypto as entropy source on platforms where globalThis.crypto is unavailable.
import * as ExpoCrypto from "expo-crypto";

if (
  typeof globalThis.crypto === "undefined" ||
  typeof globalThis.crypto.getRandomValues === "undefined"
) {
  (globalThis as unknown as { crypto: Crypto }).crypto = {
    // expo-crypto accepts IntBasedTypedArray | UintBasedTypedArray — a valid subset of
    // ArrayBufferView (Float typed arrays are not valid for randomness per the Web Crypto spec).
    getRandomValues: <T extends ArrayBufferView>(array: T): T =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ExpoCrypto.getRandomValues(array as any) as T,
    randomUUID: (): `${string}-${string}-${string}-${string}-${string}` =>
      ExpoCrypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
    subtle: {} as SubtleCrypto,
  } as Crypto;
}
