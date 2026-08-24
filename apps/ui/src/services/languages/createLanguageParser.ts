import { Input, NodeType, NodeSet, Parser, Tree } from '@lezer/common';
import { tags, styleTags } from '@lezer/highlight';
import { TokenizerFn } from './customTokenizers';

const nodeTypes = [
  NodeType.none,
  NodeType.define({ id: 1, name: 'Program', top: true }),
  NodeType.define({ id: 2, name: 'Keyword', props: [styleTags({ Keyword: tags.keyword })] }),
  NodeType.define({ id: 3, name: 'String', props: [styleTags({ String: tags.string })] }),
  NodeType.define({ id: 4, name: 'Number', props: [styleTags({ Number: tags.number })] }),
  NodeType.define({ id: 5, name: 'Comment', props: [styleTags({ Comment: tags.comment })] }),
  NodeType.define({ id: 6, name: 'TypeName', props: [styleTags({ TypeName: tags.typeName })] }),
  NodeType.define({ id: 7, name: 'Operator', props: [styleTags({ Operator: tags.operator })] }),
  NodeType.define({ id: 8, name: 'Meta', props: [styleTags({ Meta: tags.meta })] }),
  NodeType.define({ id: 9, name: 'PropertyName', props: [styleTags({ PropertyName: tags.propertyName })] }),
  NodeType.define({ id: 10, name: 'Atom', props: [styleTags({ Atom: tags.atom })] }),
];

export const customNodeSet = new NodeSet(nodeTypes);

/**
 * Creates a Lezer Parser from a lexical tokenizer function.
 */
export function createCustomLanguageParser(tokenizer: TokenizerFn): Parser {
  class CustomLanguageParser extends Parser {
    createParse(
      input: Input | string,
      _fragments?: readonly any[],
      ranges?: readonly { from: number; to: number }[]
    ) {
      let done = false;
      const rFrom = ranges && ranges[0] ? ranges[0].from : 0;
      const rTo = ranges && ranges[0] ? ranges[0].to : typeof input === 'string' ? input.length : input.length;

      return {
        advance: () => {
          if (done) return null;
          const text =
            typeof input === 'string'
              ? input.slice(rFrom, rTo)
              : typeof input.read === 'function'
              ? input.read(rFrom, rTo)
              : '';

          const tokens = tokenizer(text);
          const buffer: number[] = [];

          // Lezer Tree.build with flat leaf nodes expects buffer in forward ascending order
          for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            buffer.push(tok.id, tok.from, tok.to, 4);
          }

          const tree = Tree.build({
            buffer,
            nodeSet: customNodeSet,
            topID: 1,
            length: text.length,
          });

          done = true;
          return tree;
        },
        get parsedPos() {
          return rTo;
        },
        stopAt: () => {},
        stoppedAt: null,
      };
    }
  }

  return new CustomLanguageParser();
}

const TOKEN_CLASS_MAP: Record<number, string> = {
  2: 'tok-keyword',
  3: 'tok-string',
  4: 'tok-number',
  5: 'tok-comment',
  6: 'tok-typeName',
  7: 'tok-operator',
  8: 'tok-meta',
  9: 'tok-propertyName',
  10: 'tok-atom',
};

/**
 * Directly formats raw code to HTML with syntax highlighting classes without extra tree overhead.
 */
export function highlightWithTokenizer(code: string, tokenizer: TokenizerFn): string {
  const tokens = tokenizer(code);
  let html = '';
  let pos = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.from > pos) {
      html += escapeHtml(code.slice(pos, tok.from));
    }
    const cls = TOKEN_CLASS_MAP[tok.id] || 'tok-variableName';
    const text = escapeHtml(code.slice(tok.from, tok.to));
    html += `<span class="${cls}">${text}</span>`;
    pos = tok.to;
  }

  if (pos < code.length) {
    html += escapeHtml(code.slice(pos));
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
