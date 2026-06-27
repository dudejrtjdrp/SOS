/**
 * Browser stub for Node's `fs`, aliased in next.config for the client bundle.
 *
 * The 공고문 한글(.hwp) 뷰어 uses `hwp.js`, which bundles `cfb`. `cfb` statically
 * imports `fs` for its disk read/write helpers. In the browser we only ever feed
 * cfb an in-memory Uint8Array (fetched via the same-origin file proxy), so those
 * disk code paths never execute — an empty module satisfies the static import.
 */
const empty = {} as Record<string, never>;
export default empty;
