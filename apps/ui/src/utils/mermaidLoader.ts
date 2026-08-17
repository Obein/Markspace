let mermaidInstancePromise: Promise<typeof import('mermaid')['default']> | null = null;

/**
 * Asynchronously loads Mermaid on demand so that the main application bundle remains lightweight.
 */
export async function getMermaid() {
  if (!mermaidInstancePromise) {
    mermaidInstancePromise = import('mermaid').then((m) => {
      const instance = m.default;
      instance.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        suppressErrorRendering: true,
      });
      return instance;
    });
  }
  return mermaidInstancePromise;
}
