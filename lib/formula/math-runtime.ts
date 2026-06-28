import { create, all } from 'mathjs';

/**
 * Custom rounding functions with proper error handling
 */
const customRoundingFunctions = {
  /**
   * Round to nearest integer
   * round(x) → rounds x to nearest integer
   */
  round: (x: number): number => {
    if (typeof x !== 'number' || isNaN(x)) {
      throw new Error('round() expects a numeric argument');
    }
    return Math.round(x);
  },

  /**
   * Round to specified decimal places
   * round(x, decimals) → rounds x to 'decimals' decimal places
   */
  roundDecimals: (x: number, decimals: number): number => {
    if (typeof x !== 'number' || isNaN(x)) {
      throw new Error('round() expects a numeric first argument');
    }
    if (typeof decimals !== 'number' || isNaN(decimals)) {
      throw new Error('round() with 2 arguments expects a numeric decimals value');
    }
    const factor = Math.pow(10, Math.round(decimals));
    return Math.round(x * factor) / factor;
  },

  /**
   * Round up to next integer
   * ceil(x) → rounds x up
   */
  ceil: (x: number): number => {
    if (typeof x !== 'number' || isNaN(x)) {
      throw new Error('ceil() expects a numeric argument');
    }
    return Math.ceil(x);
  },

  /**
   * Round down to previous integer
   * floor(x) → rounds x down
   */
  floor: (x: number): number => {
    if (typeof x !== 'number' || isNaN(x)) {
      throw new Error('floor() expects a numeric argument');
    }
    return Math.floor(x);
  },
};

/**
 * Creates a mathjs instance with custom rounding functions
 * Handles round() with 1 or 2 arguments and provides better error messages
 */
function createMathInstance() {
  const math = create(all);

  // Override round to handle both 1 and 2 argument cases with better error handling
  math.import({
    round: function (...args: any[]) {
      if (args.length === 0) {
        throw new Error('round() requires at least 1 argument');
      }
      if (args.length > 2) {
        throw new Error('round() accepts at most 2 arguments');
      }
      // Validate first argument
      const x = args[0];
      if (typeof x !== 'number' || isNaN(x)) {
        throw new Error('round() expects a numeric first argument');
      }
      // If only one argument, round to nearest integer
      if (args.length === 1) {
        return customRoundingFunctions.round(x);
      }
      // If two arguments, round to specified decimals
      const decimals = args[1];
      if (typeof decimals !== 'number' || isNaN(decimals)) {
        throw new Error('round() with 2 arguments expects a numeric decimals value');
      }
      return customRoundingFunctions.roundDecimals(x, decimals);
    },
    ceil: function (x: any) {
      if (arguments.length !== 1) {
        throw new Error('ceil() expects exactly 1 argument');
      }
      if (typeof x !== 'number' || isNaN(x)) {
        throw new Error('ceil() expects a numeric argument');
      }
      return customRoundingFunctions.ceil(x);
    },
    floor: function (x: any) {
      if (arguments.length !== 1) {
        throw new Error('floor() expects exactly 1 argument');
      }
      if (typeof x !== 'number' || isNaN(x)) {
        throw new Error('floor() expects a numeric argument');
      }
      return customRoundingFunctions.floor(x);
    },
  }, { override: true });

  return math;
}

export const mathInstance = createMathInstance();
