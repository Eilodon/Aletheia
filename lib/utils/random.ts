export function secureRandomIndex(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return Math.floor(buf[0] / 4294967296 * n);
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  const buf = new Uint32Array(1);
  for (let i = result.length - 1; i > 0; i--) {
    crypto.getRandomValues(buf);
    const j = Math.floor(buf[0] / 4294967296 * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
