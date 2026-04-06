export function createClientId() {
  if (typeof window !== "undefined") {
    const maybeCrypto = window.crypto;
    if (typeof maybeCrypto?.randomUUID === "function") {
      return maybeCrypto.randomUUID();
    }

    if (typeof maybeCrypto?.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      maybeCrypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }

  return `ll8-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
