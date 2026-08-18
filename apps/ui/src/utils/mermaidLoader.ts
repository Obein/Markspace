let mermaidInstancePromise: Promise<typeof import('mermaid')['default']> | null = null;

const NOTO_FONT_STACK =
  'var(--font-preview-body, "Noto Sans SC", "Noto Sans TC", "Noto Sans JP", "Noto Sans KR", "Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)';

/**
 * Asynchronously loads Mermaid on demand configured with unified Noto Sans prose typography
 * across all diagram types (sequenceDiagram, graph TD, flowchart, state, class, etc.).
 */
export async function getMermaid() {
  if (!mermaidInstancePromise) {
    mermaidInstancePromise = import('mermaid').then((m) => {
      const instance = m.default;
      instance.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: NOTO_FONT_STACK,
        themeVariables: {
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
          // Flowchart / Graph TD typography
          nodeTextColor: '#f4f4f5',
          // Sequence Diagram typography
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
      return instance;
    });
  }
  return mermaidInstancePromise;
}
