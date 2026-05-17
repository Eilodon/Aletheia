function randomHex(length: number): string {
  let output = "";
  while (output.length < length) {
    output += Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  }
  return output.slice(0, length);
}

export function generateId(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  return `${timestamp}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
}

