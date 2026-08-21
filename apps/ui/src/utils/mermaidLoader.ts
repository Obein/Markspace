let mermaidInstance: typeof import('mermaid')['default'] | null = null;
let currentMermaidIsDark: boolean | null = null;

const SAFE_FONT_STACK =
  '"Noto Sans SC", "Noto Sans TC", "Noto Sans JP", "Noto Sans KR", "Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// In-memory LRU SVG cache for rendered Mermaid diagrams
const svgCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

// Mutex queue to prevent parallel Mermaid re-entrancy collisions
let renderMutexQueue = Promise.resolve();

/**
 * Asynchronously loads and initializes Mermaid on demand configured with unified typography
 * and light/dark theme adaptation across all diagram types (sequenceDiagram, graph TD, flowchart, etc.).
 */
export async function getMermaid(isDark: boolean = true) {
  if (!mermaidInstance) {
    const m = await import('mermaid');
    mermaidInstance = m.default;
  }

  if (currentMermaidIsDark !== isDark) {
    currentMermaidIsDark = isDark;
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: SAFE_FONT_STACK,
      themeVariables: isDark
        ? {
            fontFamily: SAFE_FONT_STACK,
            fontSize: '13px',
            darkMode: true,
            background: '#09090b',
            primaryColor: '#1e3a8a',
            primaryTextColor: '#f4f4f5',
            primaryBorderColor: '#3b82f6',
            lineColor: '#60a5fa',
            secondaryColor: '#18181b',
            tertiaryColor: '#09090b',
            nodeTextColor: '#f4f4f5',
            actorFontFamily: SAFE_FONT_STACK,
            noteFontFamily: SAFE_FONT_STACK,
            messageFontFamily: SAFE_FONT_STACK,
            actorTextColor: '#f4f4f5',
            noteTextColor: '#f4f4f5',
            messageTextColor: '#f4f4f5',
            noteBkgColor: '#1e293b',
            noteBorderColor: '#3b82f6',
            actorBkg: '#1e293b',
            actorBorder: '#3b82f6',
            signalColor: '#60a5fa',
            signalTextColor: '#f4f4f5',
          }
        : {
            fontFamily: SAFE_FONT_STACK,
            fontSize: '13px',
            darkMode: false,
            background: '#ffffff',
            primaryColor: '#e0f2fe',
            primaryTextColor: '#0f172a',
            primaryBorderColor: '#38bdf8',
            lineColor: '#2563eb',
            secondaryColor: '#f1f5f9',
            tertiaryColor: '#ffffff',
            nodeTextColor: '#0f172a',
            actorFontFamily: SAFE_FONT_STACK,
            noteFontFamily: SAFE_FONT_STACK,
            messageFontFamily: SAFE_FONT_STACK,
            actorTextColor: '#0f172a',
            noteTextColor: '#0f172a',
            messageTextColor: '#0f172a',
            noteBkgColor: '#f8fafc',
            noteBorderColor: '#93c5fd',
            actorBkg: '#f8fafc',
            actorBorder: '#93c5fd',
            signalColor: '#2563eb',
            signalTextColor: '#0f172a',
          },
      themeCSS: `
        svg, text, tspan, foreignObject, foreignObject div, foreignObject span,
        .actor, text.actor, .actor-top text, .actor-bottom text,
        .messageText, text.messageText,
        .noteText, text.noteText,
        .labelText, text.labelText,
        .loopText, text.loopText,
        .nodeLabel, .node text, .label text, .edgeLabel, .edgeLabel text, .cluster-label text {
          font-family: var(--font-preview-body, ${SAFE_FONT_STACK}) !important;
        }
      `,
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        actorFontFamily: SAFE_FONT_STACK,
        noteFontFamily: SAFE_FONT_STACK,
        messageFontFamily: SAFE_FONT_STACK,
        useMaxWidth: true,
      },
    });
  }

  return mermaidInstance;
}

/**
 * Thread-safe, cached Mermaid diagram renderer.
 * Automatically serializes render operations through a mutex queue and caches rendered SVGs,
 * ensuring instant zero-latency updates during split-view editing.
 */
export async function renderMermaid(
  code: string,
  isDark: boolean
): Promise<{ svg: string; bindFunctions?: (element: Element) => void }> {
  const clean = code.trim();
  const cacheKey = `${isDark ? 'dark' : 'light'}:${clean}`;

  // 1. Fast path: return cached SVG immediately
  const cached = svgCache.get(cacheKey);
  if (cached) {
    return { svg: cached };
  }

  // 2. Slow path: enqueue to mutex queue to prevent parallel Mermaid state corruption
  return new Promise((resolve, reject) => {
    renderMutexQueue = renderMutexQueue
      .then(async () => {
        // Double check cache after waiting in queue
        const cachedAfterWait = svgCache.get(cacheKey);
        if (cachedAfterWait) {
          resolve({ svg: cachedAfterWait });
          return;
        }

        const mermaid = await getMermaid(isDark);
        // Valid CSS identifier starting with letter prefix
        const id = `mm${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

        try {
          const result = await mermaid.render(id, clean);
          const svg = result.svg || '';

          if (svgCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = svgCache.keys().next().value;
            if (oldestKey) svgCache.delete(oldestKey);
          }
          svgCache.set(cacheKey, svg);

          resolve({ svg, bindFunctions: result.bindFunctions });
        } catch (err) {
          const stray = document.getElementById(id) || document.getElementById(`d${id}`);
          if (stray) stray.remove();
          reject(err);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}
