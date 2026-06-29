// Minimal ambient types for pako 1.x (no bundled types, installed transitively).
// Only the inflate helpers used by the 공고문 .hwpx 뷰어 are declared.
declare module "pako" {
  interface Pako {
    inflateRaw(data: Uint8Array, options?: { to?: "string" }): Uint8Array;
    inflate(data: Uint8Array, options?: { to?: "string" }): Uint8Array;
  }
  const pako: Pako;
  export default pako;
}
