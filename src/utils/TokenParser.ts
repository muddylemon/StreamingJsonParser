import { JsonValue } from "../types";

class TokenParser {
  constructor(private buffer: string) {}

  isCompleteToken(index: number): boolean {
    // Move isCompleteToken and related methods here
    // (isBalancedBracket, isCompleteString, isCompleteKeyword, isCompleteNumber, isDigit)
    return true;
  }

  parseValue(str: string): { value: JsonValue; length: number } {
    // Move parseValue method here
    return { value: null, length: 0 };
  }

  isStartOfValue(char: string): boolean {
    // Move isStartOfValue method here
    return true;
  }
}

export { TokenParser };
