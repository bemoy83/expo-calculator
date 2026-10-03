import { NAME_WITH_PROPERTY } from './identifiers';

// A formula read into a tree whose every node knows where it sits in the text, which is what the
// parser behind `mathInstance.parse` doesn't tell. For analysis that points at the formula (see
// unit-analysis), never for evaluating one. A formula using anything this doesn't read (implicit
// multiplication, strings, matrices) comes back as null, and analysis simply says nothing.

interface Span {
  from: number;
  to: number;
}

export type ExprNode =
  | (Span & { type: 'num' })
  | (Span & { type: 'name'; base: string; property?: string })
  | (Span & { type: 'call'; name: string; args: ExprNode[] })
  | (Span & { type: 'bin'; op: string; opFrom: number; opTo: number; left: ExprNode; right: ExprNode })
  | (Span & { type: 'un'; op: string; arg: ExprNode })
  | (Span & { type: 'paren'; inner: ExprNode })
  | (Span & { type: 'cond'; test: ExprNode; yes: ExprNode; no: ExprNode });

type TokenType = 'num' | 'name' | 'op' | 'open' | 'close' | 'comma';
interface Token extends Span {
  type: TokenType;
  text: string;
}

const NUMBER = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const NAME = new RegExp(NAME_WITH_PROPERTY, 'y');
const TWO_CHAR = ['==', '!=', '>=', '<='];
const ONE_CHAR = new Set(['+', '-', '*', '/', '^', '%', '<', '>', '?', ':']);
const WORD_OPERATORS = new Set(['and', 'or', 'not']);

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    const sticky = (regex: RegExp) => {
      regex.lastIndex = i;
      return regex.exec(text)?.[0];
    };
    const number = /[\d.]/.test(char) ? sticky(NUMBER) : undefined;
    const name = number ? undefined : sticky(NAME);
    let token: Token;
    if (number) token = { type: 'num', text: number, from: i, to: i + number.length };
    else if (name) token = { type: WORD_OPERATORS.has(name) ? 'op' : 'name', text: name, from: i, to: i + name.length };
    else if (TWO_CHAR.includes(text.slice(i, i + 2))) token = { type: 'op', text: text.slice(i, i + 2), from: i, to: i + 2 };
    else if (ONE_CHAR.has(char)) token = { type: 'op', text: char, from: i, to: i + 1 };
    else if (char === '(') token = { type: 'open', text: char, from: i, to: i + 1 };
    else if (char === ')') token = { type: 'close', text: char, from: i, to: i + 1 };
    else if (char === ',') token = { type: 'comma', text: char, from: i, to: i + 1 };
    else return null;
    tokens.push(token);
    i = token.to;
  }
  return tokens;
}

class Unreadable extends Error {}

class Reader {
  private at = 0;
  constructor(private tokens: Token[]) {}

  done() {
    return this.at >= this.tokens.length;
  }
  private peek(): Token | undefined {
    return this.tokens[this.at];
  }
  private isOp(...ops: string[]) {
    const token = this.peek();
    return token?.type === 'op' && ops.includes(token.text) ? token : undefined;
  }
  private take(): Token {
    const token = this.tokens[this.at];
    if (!token) throw new Unreadable();
    this.at += 1;
    return token;
  }
  private expect(type: TokenType, text?: string): Token {
    const token = this.take();
    if (token.type !== type || (text !== undefined && token.text !== text)) throw new Unreadable();
    return token;
  }

  expression(): ExprNode {
    const test = this.or();
    if (this.isOp('?')) {
      this.take();
      const yes = this.expression();
      this.expect('op', ':');
      const no = this.expression();
      return { type: 'cond', test, yes, no, from: test.from, to: no.to };
    }
    return test;
  }

  private binary(next: () => ExprNode, ...ops: string[]): ExprNode {
    let left = next();
    for (let op = this.isOp(...ops); op; op = this.isOp(...ops)) {
      this.take();
      const right = next();
      left = { type: 'bin', op: op.text, opFrom: op.from, opTo: op.to, left, right, from: left.from, to: right.to };
    }
    return left;
  }

  private or = (): ExprNode => this.binary(this.and, 'or');
  private and = (): ExprNode => this.binary(this.comparison, 'and');
  private comparison = (): ExprNode => this.binary(this.additive, '==', '!=', '<', '>', '<=', '>=');
  private additive = (): ExprNode => this.binary(this.multiplicative, '+', '-');
  private multiplicative = (): ExprNode => this.binary(this.unary, '*', '/', '%');

  private unary = (): ExprNode => {
    const op = this.isOp('-', '+', 'not');
    if (op) {
      this.take();
      const arg = this.unary();
      return { type: 'un', op: op.text, arg, from: op.from, to: arg.to };
    }
    return this.power();
  };

  // Right-associative, and what follows the ^ may carry a sign (2^-1).
  private power(): ExprNode {
    const base = this.primary();
    const op = this.isOp('^');
    if (!op) return base;
    this.take();
    const exponent = this.unary();
    return { type: 'bin', op: '^', opFrom: op.from, opTo: op.to, left: base, right: exponent, from: base.from, to: exponent.to };
  }

  private primary(): ExprNode {
    const token = this.take();
    if (token.type === 'num') return { type: 'num', from: token.from, to: token.to };
    if (token.type === 'open') {
      const inner = this.expression();
      const close = this.expect('close');
      return { type: 'paren', inner, from: token.from, to: close.to };
    }
    if (token.type === 'name') {
      const next = this.peek();
      if (next?.type === 'open' && !token.text.includes('.')) {
        this.take();
        const args: ExprNode[] = [];
        if (this.peek()?.type === 'close') {
          const close = this.take();
          return { type: 'call', name: token.text, args, from: token.from, to: close.to };
        }
        for (;;) {
          args.push(this.expression());
          const separator = this.take();
          if (separator.type === 'close') return { type: 'call', name: token.text, args, from: token.from, to: separator.to };
          if (separator.type !== 'comma') throw new Unreadable();
        }
      }
      const [base, property] = token.text.split('.');
      return { type: 'name', base, property, from: token.from, to: token.to };
    }
    throw new Unreadable();
  }
}

/** The formula as a tree with positions, or null if it isn't one this reads. */
export function parseExpression(text: string): ExprNode | null {
  const tokens = tokenize(text);
  if (!tokens || tokens.length === 0) return null;
  const reader = new Reader(tokens);
  try {
    const tree = reader.expression();
    return reader.done() ? tree : null;
  } catch (error) {
    if (error instanceof Unreadable) return null;
    throw error;
  }
}
