import { ParserStats } from "../types";

export class ParserStatistics implements ParserStats {
  depth: number = 0;
  objectCount: number = 0;
  arrayCount: number = 0;
  stringCount: number = 0;
  numberCount: number = 0;
  booleanCount: number = 0;
  nullCount: number = 0;

  private currentDepth: number = 0;

  reset(): void {
    this.depth = 0;
    this.objectCount = 0;
    this.arrayCount = 0;
    this.stringCount = 0;
    this.numberCount = 0;
    this.booleanCount = 0;
    this.nullCount = 0;
    this.currentDepth = 0;
  }

  incrementDepth(): void {
    this.currentDepth++;
    this.depth = Math.max(this.depth, this.currentDepth);
  }

  decrementDepth(): void {
    this.currentDepth--;
  }

  incrementObject(): void {
    this.objectCount++;
  }

  incrementArray(): void {
    this.arrayCount++;
  }

  incrementString(): void {
    this.stringCount++;
  }

  decrementString(): void {
    this.stringCount--;
  }

  incrementNumber(): void {
    this.numberCount++;
  }

  incrementBoolean(): void {
    this.booleanCount++;
  }

  incrementNull(): void {
    this.nullCount++;
  }

  getStats(): ParserStats {
    return {
      depth: this.depth,
      objectCount: this.objectCount,
      arrayCount: this.arrayCount,
      stringCount: this.stringCount,
      numberCount: this.numberCount,
      booleanCount: this.booleanCount,
      nullCount: this.nullCount,
    };
  }

  getCurrentDepth(): number {
    return this.currentDepth;
  }
}
