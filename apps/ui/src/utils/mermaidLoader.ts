let mermaidInstance: typeof import('mermaid')['default'] | null = null;
let currentMermaidIsDark: boolean | null = null;

const NOTO_FONT_STACK =
  'var(--font-preview-body, "Noto Sans SC", "Noto Sans TC", "Noto Sans JP", "Noto Sans KR", "Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)';

/**
 * Asynchronously loads Mermaid on demand configured with unified Noto Sans prose typography
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
      fontFamily: NOTO_FONT_STACK,
      themeVariables: isDark
        ? {
            fontFamily: NOTO_FONT_STACK,
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
            actorFontFamily: NOTO_FONT_STACK,
            noteFontFamily: NOTO_FONT_STACK,
            messageFontFamily: NOTO_FONT_STACK,
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
            fontFamily: NOTO_FONT_STACK,
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
            actorFontFamily: NOTO_FONT_STACK,
            noteFontFamily: NOTO_FONT_STACK,
            messageFontFamily: NOTO_FONT_STACK,
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
          font-family: ${NOTO_FONT_STACK} !important;
        }
      `,
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        actorFontFamily: NOTO_FONT_STACK,
        noteFontFamily: NOTO_FONT_STACK,
        messageFontFamily: NOTO_FONT_STACK,
        useMaxWidth: true,
      },
      suppressErrorRendering: true,
    });
  }

  return mermaidInstance;
}
