import { ISheetEngine } from '../interfaces/ISheetEngine';

export class SheetEvaluator implements ISheetEngine {
  /**
   * Parse Markdown tables and evaluate cell formulas.
   * In preview/evaluated mode: displays computed results; if calculation errors, displays source code.
   */
  evaluateMarkdownFormulas(markdown: string): string {
    if (!markdown || !markdown.includes('|')) {
      return markdown;
    }

    const lines = markdown.split('\n');
    let inTable = false;
    let tableLines: string[] = [];
    const resultLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1;

      if (isTableRow) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable) {
          resultLines.push(...this.processTable(tableLines));
          tableLines = [];
          inTable = false;
        }
        resultLines.push(line);
      }
    }

    if (inTable && tableLines.length > 0) {
      resultLines.push(...this.processTable(tableLines));
    }

    return resultLines.join('\n');
  }

  private processTable(rows: string[]): string[] {
    if (rows.length < 2) return rows; // Need at least header + separator

    // Split rows into grid cells (trimming outer empty splits from leading/trailing pipes)
    const grid: string[][] = rows.map((row) =>
      row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    );

    const evaluatedGrid: string[][] = grid.map((row) => [...row]);

    // Multi-pass evaluation to resolve chained dependencies (e.g. C1 depends on B1, which depends on A1)
    const maxPasses = 8;
    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = false;

      // Data rows start at index 2 (Row 0 is header, Row 1 is separator)
      for (let r = 2; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const rawCell = grid[r][c];
          if (rawCell.startsWith('=')) {
            const evaluated = this.evaluateCellFormula(rawCell, evaluatedGrid);
            if (evaluated !== evaluatedGrid[r][c]) {
              evaluatedGrid[r][c] = evaluated;
              changed = true;
            }
          }
        }
      }

      if (!changed) break;
    }

    // Reconstruct Markdown table rows preserving pipe structure
    return rows.map((_, rowIndex) => {
      const cells = evaluatedGrid[rowIndex];
      return `| ${cells.join(' | ')} |`;
    });
  }

  /**
   * Evaluates a single formula string (e.g. "=SUM(A1:A5)", "=A1+B1*2").
   * If evaluation succeeds, returns formatted string result.
   * If evaluation fails/errors, returns the original raw formula source code.
   */
  public evaluateCellFormula(rawFormula: string, currentGrid: string[][]): string {
    if (!rawFormula.startsWith('=')) {
      return rawFormula;
    }

    const expression = rawFormula.slice(1).trim();
    if (!expression) {
      return rawFormula;
    }

    try {
      const result = this.evaluateExpression(expression, currentGrid);

      if (typeof result === 'number') {
        if (isNaN(result) || !isFinite(result)) {
          // Calculation error (e.g. division by zero, invalid math) -> fallback to source code
          return rawFormula;
        }
        // Clean formatting: if integer output integer, otherwise max 4 decimals without trailing zeros
        if (Number.isInteger(result)) {
          return result.toString();
        }
        return parseFloat(result.toFixed(4)).toString();
      }

      if (typeof result === 'string') {
        return result;
      }

      if (typeof result === 'boolean') {
        return result ? 'TRUE' : 'FALSE';
      }

      return rawFormula;
    } catch {
      // On any syntax error, circular reference, or unhandled evaluation error: return source code
      return rawFormula;
    }
  }

  // --- Core Expression Evaluator (Recursive Descent + Formula Engine) ---

  private evaluateExpression(expr: string, grid: string[][]): any {
    const tokens = this.tokenize(expr);
    let pos = 0;

    const peek = (): Token | null => (pos < tokens.length ? tokens[pos] : null);
    const next = (): Token => tokens[pos++];
    const match = (type: string, val?: string): boolean => {
      const tok = peek();
      if (!tok) return false;
      if (tok.type !== type) return false;
      if (val !== undefined && tok.value.toUpperCase() !== val.toUpperCase()) return false;
      return true;
    };
    const consume = (type: string, val?: string): Token => {
      const tok = peek();
      if (!tok || tok.type !== type || (val !== undefined && tok.value.toUpperCase() !== val.toUpperCase())) {
        throw new Error(`Unexpected token: ${tok ? tok.value : 'EOF'}`);
      }
      return next();
    };

    const parseExpr = (): any => parseComparison();

    const parseComparison = (): any => {
      let left = parseAdditive();
      while (match('COMP_OP')) {
        const op = next().value;
        const right = parseAdditive();
        if (op === '=' || op === '==') left = left == right;
        else if (op === '!=' || op === '<>') left = left != right;
        else if (op === '<') left = left < right;
        else if (op === '<=') left = left <= right;
        else if (op === '>') left = left > right;
        else if (op === '>=') left = left >= right;
      }
      return left;
    };

    const parseAdditive = (): any => {
      let left = parseMultiplicative();
      while (match('ADD_OP')) {
        const op = next().value;
        const right = parseMultiplicative();
        if (op === '+') {
          if (typeof left === 'string' || typeof right === 'string') {
            left = String(left) + String(right);
          } else {
            left = Number(left) + Number(right);
          }
        } else if (op === '-') {
          left = Number(left) - Number(right);
        }
      }
      return left;
    };

    const parseMultiplicative = (): any => {
      let left = parsePower();
      while (match('MUL_OP')) {
        const op = next().value;
        const right = parsePower();
        if (op === '*') {
          left = Number(left) * Number(right);
        } else if (op === '/') {
          const numRight = Number(right);
          if (numRight === 0) {
            throw new Error('Division by zero');
          }
          left = Number(left) / numRight;
        } else if (op === '%') {
          left = Number(left) % Number(right);
        }
      }
      return left;
    };

    const parsePower = (): any => {
      let left = parseUnary();
      while (match('POW_OP')) {
        next();
        const right = parseUnary();
        left = Math.pow(Number(left), Number(right));
      }
      return left;
    };

    const parseUnary = (): any => {
      if (match('ADD_OP', '-')) {
        next();
        return -Number(parseUnary());
      }
      if (match('ADD_OP', '+')) {
        next();
        return Number(parseUnary());
      }
      return parsePrimary();
    };

    const parsePrimary = (): any => {
      const tok = peek();
      if (!tok) {
        throw new Error('Unexpected end of expression');
      }

      // Number literal
      if (tok.type === 'NUMBER') {
        return parseFloat(next().value);
      }

      // String literal
      if (tok.type === 'STRING') {
        return next().value;
      }

      // Parentheses ( ... )
      if (tok.type === 'LPAREN') {
        consume('LPAREN');
        const val = parseExpr();
        consume('RPAREN');
        return val;
      }

      // Range (e.g. A1:B3)
      if (tok.type === 'RANGE') {
        const rangeStr = next().value;
        return this.getRangeValues(rangeStr, grid);
      }

      // Function Call or Identifier (e.g. SUM, AVG, IF, or Cell Ref like A1)
      if (tok.type === 'IDENT') {
        const name = next().value.toUpperCase();

        // Check if function call: followed by '('
        if (match('LPAREN')) {
          consume('LPAREN');
          const args: any[] = [];
          if (!match('RPAREN')) {
            args.push(parseExpr());
            while (match('COMMA')) {
              consume('COMMA');
              args.push(parseExpr());
            }
          }
          consume('RPAREN');
          return this.evaluateFunction(name, args);
        }

        // Otherwise check if it's a cell reference like A1, B2, AA5
        if (/^[A-Z]+[0-9]+$/i.test(name)) {
          return this.getSingleCellValue(name, grid);
        }

        throw new Error(`Unknown identifier: ${name}`);
      }

      throw new Error(`Unexpected token: ${tok.value}`);
    };

    const parsed = parseExpr();
    if (pos < tokens.length) {
      throw new Error(`Trailing token after expression: ${tokens[pos].value}`);
    }
    return parsed;
  }

  private evaluateFunction(name: string, args: any[]): any {
    const flattenNumbers = (rawArgs: any[]): number[] => {
      const nums: number[] = [];
      for (const arg of rawArgs) {
        if (Array.isArray(arg)) {
          for (const item of arg) {
            const n = typeof item === 'number' ? item : parseFloat(String(item));
            if (!isNaN(n)) nums.push(n);
          }
        } else {
          const n = typeof arg === 'number' ? arg : parseFloat(String(arg));
          if (!isNaN(n)) nums.push(n);
        }
      }
      return nums;
    };

    switch (name) {
      case 'SUM': {
        const nums = flattenNumbers(args);
        return nums.reduce((a, b) => a + b, 0);
      }
      case 'AVG':
      case 'AVERAGE': {
        const nums = flattenNumbers(args);
        if (nums.length === 0) return 0;
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      }
      case 'COUNT': {
        const nums = flattenNumbers(args);
        return nums.length;
      }
      case 'MIN': {
        const nums = flattenNumbers(args);
        if (nums.length === 0) return 0;
        return Math.min(...nums);
      }
      case 'MAX': {
        const nums = flattenNumbers(args);
        if (nums.length === 0) return 0;
        return Math.max(...nums);
      }
      case 'PRODUCT': {
        const nums = flattenNumbers(args);
        if (nums.length === 0) return 0;
        return nums.reduce((a, b) => a * b, 1);
      }
      case 'ROUND': {
        const val = Number(args[0] ?? 0);
        const decimals = Number(args[1] ?? 0);
        if (isNaN(val) || isNaN(decimals)) throw new Error('Invalid ROUND args');
        return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
      }
      case 'ABS': {
        const val = Number(args[0] ?? 0);
        if (isNaN(val)) throw new Error('Invalid ABS arg');
        return Math.abs(val);
      }
      case 'SQRT': {
        const val = Number(args[0] ?? 0);
        if (isNaN(val) || val < 0) throw new Error('Invalid SQRT arg');
        return Math.sqrt(val);
      }
      case 'POWER': {
        const base = Number(args[0] ?? 0);
        const exp = Number(args[1] ?? 0);
        if (isNaN(base) || isNaN(exp)) throw new Error('Invalid POWER args');
        return Math.pow(base, exp);
      }
      case 'MEDIAN': {
        const nums = flattenNumbers(args).sort((a, b) => a - b);
        if (nums.length === 0) return 0;
        const mid = Math.floor(nums.length / 2);
        return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
      }
      case 'IF': {
        const condition = args[0];
        const isTruthy =
          typeof condition === 'boolean'
            ? condition
            : typeof condition === 'number'
            ? condition !== 0 && !isNaN(condition)
            : Boolean(condition);
        return isTruthy ? args[1] : (args[2] ?? '');
      }
      default:
        throw new Error(`Unsupported spreadsheet function: ${name}`);
    }
  }

  private getSingleCellValue(cellRef: string, grid: string[][]): number {
    const match = cellRef.match(/^([A-Z]+)([0-9]+)$/i);
    if (!match) return 0;

    const colIndex = this.colLetterToIndex(match[1]);
    const rowIndex = parseInt(match[2], 10) + 1; // 1-indexed data row mapped to grid index (offset by header & sep)

    if (rowIndex >= 2 && rowIndex < grid.length && colIndex >= 0 && colIndex < grid[rowIndex].length) {
      const raw = grid[rowIndex][colIndex];
      // If cell still contains an unevaluated formula, don't parse as number
      if (raw.startsWith('=')) {
        return 0;
      }
      const sanitized = raw.replace(/[\$,¥,€,£]/g, '').replace(/,/g, '').trim();
      const val = parseFloat(sanitized);
      return isNaN(val) ? 0 : val;
    }
    return 0;
  }

  private getRangeValues(rangeStr: string, grid: string[][]): number[] {
    const parts = rangeStr.split(':');
    if (parts.length !== 2) return [];

    const startMatch = parts[0].match(/([A-Z]+)([0-9]+)/i);
    const endMatch = parts[1].match(/([A-Z]+)([0-9]+)/i);
    if (!startMatch || !endMatch) return [];

    const startCol = this.colLetterToIndex(startMatch[1]);
    const startRow = parseInt(startMatch[2], 10);
    const endCol = this.colLetterToIndex(endMatch[1]);
    const endRow = parseInt(endMatch[2], 10);

    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    const values: number[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const colChar = this.indexToColLetter(c);
        values.push(this.getSingleCellValue(`${colChar}${r}`, grid));
      }
    }
    return values;
  }

  private colLetterToIndex(colStr: string): number {
    let index = 0;
    const upper = colStr.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      index = index * 26 + (upper.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  private indexToColLetter(index: number): string {
    let col = '';
    let temp = index + 1;
    while (temp > 0) {
      const rem = (temp - 1) % 26;
      col = String.fromCharCode(65 + rem) + col;
      temp = Math.floor((temp - 1) / 26);
    }
    return col;
  }

  private tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      // Skip whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
        let numStr = '';
        while (i < expr.length && /[0-9\.]/.test(expr[i])) {
          numStr += expr[i++];
        }
        tokens.push({ type: 'NUMBER', value: numStr });
        continue;
      }

      // Strings ("hello" or 'hello')
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

      // Range or Cell Reference or Identifier
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

      // Punctuators
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

interface Token {
  type:
    | 'NUMBER'
    | 'STRING'
    | 'IDENT'
    | 'RANGE'
    | 'ADD_OP'
    | 'MUL_OP'
    | 'POW_OP'
    | 'COMP_OP'
    | 'LPAREN'
    | 'RPAREN'
    | 'COMMA'
    | 'COLON'
    | 'UNKNOWN';
  value: string;
}
