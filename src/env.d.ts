/**
 * Types for the things that ship none.
 *
 * libheif publishes a declaration file for its main entry point but no
 * exports map, so TypeScript cannot find types for the `wasm-bundle` subpath
 * that this project imports. The subpath is the one that carries its
 * WebAssembly inside the JavaScript, which is what lets the same import work
 * in Node and in a browser without a separate file to copy and serve.
 *
 * The value is declared as `unknown` on purpose rather than `any`. The shape
 * this project relies on is written out as narrow interfaces beside the call
 * in `src/lib/image/codecs.ts`, so the compiler still checks every use, and
 * a wrong assumption about the library shows up there rather than spreading
 * silently through an `any`.
 */
declare module "libheif-js/wasm-bundle.js" {
  const libheif: unknown;
  export default libheif;
}
