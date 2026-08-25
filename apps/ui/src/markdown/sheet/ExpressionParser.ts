import { FormulaTokenizer } from './FormulaTokenizer';
import { CoordinateResolver } from './CoordinateResolver';
import { BuiltinFunctions } from './BuiltinFunctions';
import { ExpressionValue, FormulaPrimitive, Token, TokenType } from './types';

/**
 * ExpressionParser
 * 
 * Recursive-descent AST parser and evaluator for spreadsheet mathematical,
 * logical, and functional expressions.
 */
export class ExpressionParser {
  /**
   * Evaluates a mathematical/logical expression string within the context of a table grid.
   * 
   * @param expr Formula expression string (without leading '=')
   * @param grid 2D array of table cells for resolving cell & range references
   * @returns Primitive result or numeric array (for ranges)
   */
  public static evaluate(expr: string, grid: string[][]): ExpressionValue {
    const tokens = FormulaTokenizer.tokenize(expr);
    let pos = 0;

    const peek = (): Token | null => (pos < tokens.length ? tokens[pos] : null);
    const next = (): Token => tokens[pos++];

    const match = (type: TokenType, val?: string): boolean => {
      const tok = peek();
      if (!tok) return false;
      if (tok.type !== type) return false;
      if (val !== undefined && tok.value.toUpperCase() !== val.toUpperCase()) return false;
      return true;
    };

    const consume = (type: TokenType, val?: string): Token => {
      const tok = peek();
      if (!tok || tok.type !== type || (val !== undefined && tok.value.toUpperCase() !== val.toUpperCase())) {
        throw new Error(`Unexpected token: ${tok ? tok.value : 'EOF'}`);
      }
      return next();
    };

    const parseExpr = (): ExpressionValue => parseComparison();

    const parseComparison = (): ExpressionValue => {
      let left = parseAdditive();
      while (match('COMP_OP')) {
        const op = next().value;
        const right = parseAdditive();
        if (op === '=' || op === '==') left = (left as any) == (right as any);
        else if (op === '!=' || op === '<>') left = (left as any) != (right as any);
        else if (op === '<') left = Number(left) < Number(right);
        else if (op === '<=') left = Number(left) <= Number(right);
        else if (op === '>') left = Number(left) > Number(right);
        else if (op === '>=') left = Number(left) >= Number(right);
      }
      return left;
    };

    const parseAdditive = (): ExpressionValue => {
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

    const parseMultiplicative = (): ExpressionValue => {
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

    const parsePower = (): ExpressionValue => {
      let left = parseUnary();
      while (match('POW_OP')) {
        next();
        const right = parseUnary();
        left = Math.pow(Number(left), Number(right));
      }
      return left;
    };

    const parseUnary = (): ExpressionValue => {
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

    const parsePrimary = (): ExpressionValue => {
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

      // Range reference (e.g. A1:B3)
      if (tok.type === 'RANGE') {
        const rangeStr = next().value;
        return CoordinateResolver.getRangeValues(rangeStr, grid);
      }

      // Function Call or Identifier (e.g. SUM, AVG, IF, or Cell Ref like A1)
      if (tok.type === 'IDENT') {
        const name = next().value.toUpperCase();

        // Function call: followed by '('
        if (match('LPAREN')) {
          consume('LPAREN');
          const args: ExpressionValue[] = [];
          if (!match('RPAREN')) {
            args.push(parseExpr());
            while (match('COMMA')) {
              consume('COMMA');
              args.push(parseExpr());
            }
          }
          consume('RPAREN');
          return BuiltinFunctions.execute(name, args);
        }

        // Cell reference: e.g. A1, B2, AA5
        if (/^[A-Z]+[0-9]+$/i.test(name)) {
          return CoordinateResolver.getSingleCellValue(name, grid);
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

  /**
   * Formats a raw evaluated primitive value into standard spreadsheet display text.
   * 
   * @param val Primitive evaluated value (number, string, boolean)
   * @returns Clean formatted string
   */
  public static formatResult(val: FormulaPrimitive): string {
    if (typeof val === 'number') {
      if (isNaN(val) || !isFinite(val)) {
        throw new Error('Invalid numeric calculation');
      }
      if (Number.isInteger(val)) {
        return val.toString();
      }
      return parseFloat(val.toFixed(4)).toString();
    }

    if (typeof val === 'boolean') {
      return val ? 'TRUE' : 'FALSE';
    }

    return String(val);
  }
}
