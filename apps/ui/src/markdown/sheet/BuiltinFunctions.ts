import { FormulaPrimitive } from './types';

/**
 * Type signature for spreadsheet formula functions.
 */
export type SpreadsheetFunction = (args: unknown[]) => FormulaPrimitive;

/**
 * BuiltinFunctions
 * 
 * Central registry of standard spreadsheet functions including mathematical,
 * statistical, and logical operators (e.g. SUM, AVG, IF, ROUND, MEDIAN).
 */
export class BuiltinFunctions {
  /**
   * Flattens mixed argument structures (numbers, strings, nested arrays from ranges)
   * into a single numeric array, discarding non-numeric values.
   * 
   * @param rawArgs Array of arguments, possibly containing nested number arrays
   * @returns Flat array of valid numbers
   */
  public static flattenNumbers(rawArgs: unknown[]): number[] {
    const nums: number[] = [];
    for (const arg of rawArgs) {
      if (Array.isArray(arg)) {
        for (const item of arg) {
          const n = typeof item === 'number' ? item : parseFloat(String(item));
          if (!isNaN(n) && isFinite(n)) nums.push(n);
        }
      } else {
        const n = typeof arg === 'number' ? arg : parseFloat(String(arg));
        if (!isNaN(n) && isFinite(n)) nums.push(n);
      }
    }
    return nums;
  }

  /**
   * Executes a spreadsheet function by name.
   * 
   * @param functionName Name of the function (case-insensitive, e.g. "SUM", "AVG")
   * @param args Evaluated function arguments
   * @returns Primitive calculated result
   * @throws Error if function is unknown or invalid arguments are supplied
   */
  public static execute(functionName: string, args: unknown[]): FormulaPrimitive {
    const name = functionName.toUpperCase();

    switch (name) {
      case 'SUM': {
        const nums = this.flattenNumbers(args);
        return nums.reduce((a, b) => a + b, 0);
      }
      case 'AVG':
      case 'AVERAGE': {
        const nums = this.flattenNumbers(args);
        if (nums.length === 0) return 0;
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      }
      case 'COUNT': {
        const nums = this.flattenNumbers(args);
        return nums.length;
      }
      case 'MIN': {
        const nums = this.flattenNumbers(args);
        if (nums.length === 0) return 0;
        return Math.min(...nums);
      }
      case 'MAX': {
        const nums = this.flattenNumbers(args);
        if (nums.length === 0) return 0;
        return Math.max(...nums);
      }
      case 'PRODUCT': {
        const nums = this.flattenNumbers(args);
        if (nums.length === 0) return 0;
        return nums.reduce((a, b) => a * b, 1);
      }
      case 'ROUND': {
        const val = Number(args[0] ?? 0);
        const decimals = Number(args[1] ?? 0);
        if (isNaN(val) || isNaN(decimals)) throw new Error('Invalid ROUND arguments');
        return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
      }
      case 'ABS': {
        const val = Number(args[0] ?? 0);
        if (isNaN(val)) throw new Error('Invalid ABS argument');
        return Math.abs(val);
      }
      case 'SQRT': {
        const val = Number(args[0] ?? 0);
        if (isNaN(val) || val < 0) throw new Error('Invalid SQRT argument');
        return Math.sqrt(val);
      }
      case 'POWER': {
        const base = Number(args[0] ?? 0);
        const exp = Number(args[1] ?? 0);
        if (isNaN(base) || isNaN(exp)) throw new Error('Invalid POWER arguments');
        return Math.pow(base, exp);
      }
      case 'MEDIAN': {
        const nums = this.flattenNumbers(args).sort((a, b) => a - b);
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
        const trueVal = args[1] as FormulaPrimitive;
        const falseVal = (args[2] ?? '') as FormulaPrimitive;
        return isTruthy ? trueVal : falseVal;
      }
      default:
        throw new Error(`Unsupported spreadsheet function: ${name}`);
    }
  }
}
