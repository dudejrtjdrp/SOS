/**
 * Type shim for the "@ssabrojs/hwpxjs/browser" subpath import.
 *
 * package.json maps the "./browser" export to the inlined browser bundle but
 * declares no `types` condition for it, so (with moduleResolution: "bundler") TS
 * can't find declarations for that specifier. Re-export the package's root types
 * — the browser bundle is built from the same source, so the surface matches.
 */
declare module "@ssabrojs/hwpxjs/browser" {
  export * from "@ssabrojs/hwpxjs";
}
