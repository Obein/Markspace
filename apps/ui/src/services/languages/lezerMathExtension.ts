import { MarkdownConfig, InlineContext, BlockContext, Line, Element } from '@lezer/markdown';
import { tags, styleTags } from '@lezer/highlight';

/**
 * Parses LaTeX tokens inside an inline or block math expression.
 */
function parseLatexTokens(
  cx: { elt: (type: string, from: number, to: number, children?: readonly Element[]) => Element },
  text: string,
  offset: number
): Element[] {
  const elements: Element[] = [];
  const regex = /(\\[a-zA-Z@]+|\\begin\{[a-zA-Z0-9_*]+\}|\\end\{[a-zA-Z0-9_*]+\}|\\[^a-zA-Z0-9\s]|%[^\n]*|\b\d+(\.\d+)?\b|[&^_+*/=<>|~:,\-\{\}\(\)\[\]])/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    const from = offset + m.index;
    const to = from + m[0].length;
    const match = m[0];

    if (match.startsWith('%')) {
      elements.push(cx.elt('MathComment', from, to));
    } else if (match.startsWith('\\begin') || match.startsWith('\\end')) {
      elements.push(cx.elt('MathMeta', from, to));
    } else if (match.startsWith('\\')) {
      elements.push(cx.elt('MathKeyword', from, to));
    } else if (/^\d/.test(match)) {
      elements.push(cx.elt('MathNumber', from, to));
    } else {
      elements.push(cx.elt('MathOperator', from, to));
    }
  }

  return elements;
}

/**
 * Lezer Markdown Extension for Inline Math ($...$) and Display Block Math ($$...$$).
 */
export const MathMarkdownExtension: MarkdownConfig = {
  defineNodes: [
    { name: 'InlineMath' },
    { name: 'BlockMath', block: true },
    { name: 'MathMark' },
    { name: 'MathKeyword' },
    { name: 'MathMeta' },
    { name: 'MathOperator' },
    { name: 'MathNumber' },
    { name: 'MathComment' },
  ],
  props: [
    styleTags({
      InlineMath: tags.special(tags.monospace),
      BlockMath: tags.special(tags.monospace),
      MathMark: tags.processingInstruction,
      MathKeyword: tags.keyword,
      MathMeta: tags.meta,
      MathOperator: tags.operator,
      MathNumber: tags.number,
      MathComment: tags.comment,
    }),
  ],
  parseInline: [
    {
      name: 'InlineMath',
      parse(cx: InlineContext, next: number, pos: number) {
        if (next !== 36 /* '$' */) return -1;
        if (pos > 0 && cx.char(pos - 1) === 92) return -1; // Escaped \$

        // Check if double $$ on single line
        if (cx.char(pos + 1) === 36) {
          let end = pos + 2;
          while (end < cx.end) {
            if (cx.char(end) === 36 && cx.char(end + 1) === 36 && cx.char(end - 1) !== 92) {
              const innerText = cx.slice(pos + 2, end);
              const innerElts = parseLatexTokens(cx, innerText, pos + 2);
              const el = cx.elt('BlockMath', pos, end + 2, [
                cx.elt('MathMark', pos, pos + 2),
                ...innerElts,
                cx.elt('MathMark', end, end + 2),
              ]);
              return cx.addElement(el);
            }
            end++;
          }
          return -1;
        }

        // Single $ inline
        let end = pos + 1;
        while (end < cx.end) {
          if (cx.char(end) === 36 && cx.char(end - 1) !== 92) {
            const innerText = cx.slice(pos + 1, end);
            const innerElts = parseLatexTokens(cx, innerText, pos + 1);
            const el = cx.elt('InlineMath', pos, end + 1, [
              cx.elt('MathMark', pos, pos + 1),
              ...innerElts,
              cx.elt('MathMark', end, end + 1),
            ]);
            return cx.addElement(el);
          }
          end++;
        }
        return -1;
      },
      before: 'Emphasis',
    },
  ],
  parseBlock: [
    {
      name: 'BlockMath',
      parse(cx: BlockContext, line: Line) {
        const trimmed = line.text.slice(line.pos).trim();
        if (!trimmed.startsWith('$$')) return false;

        const from = cx.lineStart + line.pos;

        // Check if single line $$...$$ block
        if (trimmed.startsWith('$$') && trimmed.length > 2 && trimmed.endsWith('$$')) {
          const to = cx.lineStart + line.text.length;
          const innerText = line.text.slice(line.pos + 2, line.text.length - 2);
          const innerElts = parseLatexTokens(cx, innerText, from + 2);
          cx.addElement(
            cx.elt('BlockMath', from, to, [
              cx.elt('MathMark', from, from + 2),
              ...innerElts,
              cx.elt('MathMark', to - 2, to),
            ])
          );
          cx.nextLine();
          return true;
        }

        // Multiline $$ block
        const marks: Element[] = [cx.elt('MathMark', from, from + 2)];
        const firstLineTrailing = line.text.slice(line.pos + 2);
        if (firstLineTrailing.trim()) {
          marks.push(...parseLatexTokens(cx, firstLineTrailing, from + 2));
        }

        let closed = false;

        while (cx.nextLine()) {
          const currentLine = line.text.slice(line.pos);
          const currentTrimmed = currentLine.trim();
          if (currentTrimmed === '$$' || currentTrimmed.endsWith('$$')) {
            const markOffset = currentLine.indexOf('$$');
            const markFrom = cx.lineStart + line.pos + markOffset;
            const markTo = markFrom + 2;
            const leadingText = currentLine.slice(0, markOffset);
            if (leadingText.trim()) {
              marks.push(...parseLatexTokens(cx, leadingText, cx.lineStart + line.pos));
            }
            marks.push(cx.elt('MathMark', markFrom, markTo));
            cx.addElement(cx.elt('BlockMath', from, markTo, marks));
            cx.nextLine();
            closed = true;
            return true;
          } else {
            marks.push(...parseLatexTokens(cx, currentLine, cx.lineStart + line.pos));
          }
        }

        if (!closed) {
          const endPos = cx.lineStart + line.text.length;
          cx.addElement(cx.elt('BlockMath', from, endPos, marks));
          return true;
        }

        return false;
      },
      before: 'FencedCode',
    },
  ],
};
