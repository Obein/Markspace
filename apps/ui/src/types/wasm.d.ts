/**
 * Ambient type definitions for Vite WebAssembly imports (?init and ?url).
 */
declare module '*.wasm?init' {
  const init: (imports?: WebAssembly.Imports) => Promise<WebAssembly.Instance>;
  export default init;
}

declare module '*.wasm?url' {
  const url: string;
  export default url;
}

declare module '*.wasm' {
  const init: (imports?: WebAssembly.Imports) => Promise<WebAssembly.Instance>;
  export default init;
}
