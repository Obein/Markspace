import { Token } from './types';

/**
 * FormulaTokenizer
 * 
 * Performs lexical analysis on raw spreadsheet formula expressions,
 * transforming a formula string into a stream of typed Tokens.
 */
export class FormulaTokenizer {
  /**
   * Tokenizes a raw formula expression (without leading '=') into an array of Tokens.
   * 
   * @param expr Raw formula expression string (e.g. "SUM(A1:B5) + 10 * 2")
   * @returns Array of structured tokens
   */
  public static tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      // Skip whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (integers or decimals)
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
        let numStr = '';
        while (i < expr.length && /[0-9\.]/.test(expr[i])) {
          numStr += expr[i++];
        }
        tokens.push({ type: 'NUMBER', value: numStr });
        continue;
      }

      // Strings enclosed in double or single quotes ("text" or 'text')
      if (ch === '"' || ch === "'") {
        const quote = ch;
        i++;
        let strVal = '';
        while (i < expr.length && expr[i] !== quote) {
          if (expr[i] === '\\' && i + 1 < expr.length) {
            i++;
            strVal += expr[i++];
          } else {
            strVal += expr[i++];
          }
        }
        if (i < expr.length && expr[i] === quote) {
          i++;
        }
        tokens.push({ type: 'STRING', value: strVal });
        continue;
      }

      // Identifiers, Function Names, Cell References, or Range Patterns (e.g. A1:B3, SUM, AVG)
      if (/[A-Za-z_]/.test(ch)) {
        let ident = '';
        while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) {
          ident += expr[i++];
        }

        // Check if range: IDENT : IDENT (e.g. A1:B3)
        if (i < expr.length && expr[i] === ':') {
          i++; // skip ':'
          let endIdent = '';
          while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) {
            endIdent += expr[i++];
          }
          if (/^[A-Za-z]+[0-9]+$/i.test(ident) && /^[A-Za-z]+[0-9]+$/i.test(endIdent)) {
            tokens.push({ type: 'RANGE', value: `${ident}:${endIdent}` });
            continue;
          } else {
            tokens.push({ type: 'IDENT', value: ident });
            tokens.push({ type: 'COLON', value: ':' });
            if (endIdent) {
              tokens.push({ type: 'IDENT', value: endIdent });
            }
            continue;
          }
        }

        tokens.push({ type: 'IDENT', value: ident });
        continue;
      }

      // Comparison operators (<=, >=, !=, <>, ==, =, <, >)
      if (ch === '<' || ch === '>' || ch === '!' || ch === '=') {
        const nextChar = expr[i + 1];
        if (
          (ch === '<' && (nextChar === '=' || nextChar === '>')) ||
          (ch === '>' && nextChar === '=') ||
          (ch === '!' && nextChar === '=') ||
          (ch === '=' && nextChar === '=')
        ) {
          tokens.push({ type: 'COMP_OP', value: ch + nextChar });
          i += 2;
          continue;
        }
        if (ch === '<' || ch === '>') {
          tokens.push({ type: 'COMP_OP', value: ch });
          i++;
          continue;
        }
        if (ch === '=') {
          tokens.push({ type: 'COMP_OP', value: '=' });
          i++;
          continue;
        }
      }

      // Arithmetic operators
      if (ch === '+' || ch === '-') {
        tokens.push({ type: 'ADD_OP', value: ch });
        i++;
        continue;
      }
      if (ch === '*' || ch === '/' || ch === '%') {
        tokens.push({ type: 'MUL_OP', value: ch });
        i++;
        continue;
      }
      if (ch === '^') {
        tokens.push({ type: 'POW_OP', value: ch });
        i++;
        continue;
      }

      // Punctuators and delimiters
      if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
        continue;
      }
      if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
        continue;
      }
      if (ch === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
        i++;
        continue;
      }

      // Any unrecognized character
      tokens.push({ type: 'UNKNOWN', value: ch });
      i++;
    }

    return tokens;
  }
}
