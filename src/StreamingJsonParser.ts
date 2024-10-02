import {
  Aggregation,
  AggregationResult,
  AggregationType,
  ChunkSizeMetrics,
  JsonArray,
  JsonObject,
  JsonValue,
  ParserEvents,
  ParserOptions,
  ParserStats,
  SchemaNode,
  Transform,
  TransformFunction,
} from "./types";

import { AdaptiveChunkSizer } from "./utils/AdaptiveChunkSizer";
import { EventEmitter } from "events";
import { ParserStatistics } from "./utils/statistics";
import { PathTrie } from "./utils/PathTrie";
import { Writable } from "stream";
import { validateAgainstSchema } from "./utils/schemaValidator";
import { AggregationManager } from "./utils/AggregationManager";
import { BufferManager } from "./utils/BufferManager";
import { ChunkSizeManager } from "./utils/ChunkSizeManager";
import { PathManager } from "./utils/PathManager";
import { TokenParser } from "./utils/TokenParser";
import { TransformManager } from "./utils/TransformManager";

export class StreamingJsonParser extends EventEmitter {
  private bufferManager: BufferManager;
  private tokenParser: TokenParser;
  private transformManager: TransformManager;
  private aggregationManager: AggregationManager;
  private pathManager: PathManager;
  private chunkSizeManager: ChunkSizeManager;

  constructor(options: ParserOptions = {}) {
    super();
    this.bufferManager = new BufferManager();
    this.transformManager = new TransformManager();
    this.aggregationManager = new AggregationManager();
    this.pathManager = new PathManager();
    this.chunkSizeManager = new ChunkSizeManager(options.adaptiveChunkSizing);

    this.options = {
      maxDepth: options.maxDepth || Infinity,
      allowComments: options.allowComments || false,
      reviver: options.reviver,
      outputStream: options.outputStream,
      transforms: options.transforms || [],
      adaptiveChunkSizing: options.adaptiveChunkSizing,
      aggregations: options.aggregations || {},
    };
    if (this.options.outputStream) {
      this.setOutputStream(this.options.outputStream);
    }
    this.statistics = new ParserStatistics();
    this.transforms = this.options.transforms || [];

    if (this.options.adaptiveChunkSizing) {
      this.adaptiveChunkSizer = new AdaptiveChunkSizer(
        this.options.adaptiveChunkSizing
      );
    }
    if (this.options.aggregations) {
      for (const [path, type] of Object.entries(this.options.aggregations)) {
        this.addAggregation(path, type);
      }
    }
  }

  setOutputStream(outputStream: Writable) {
    this.outputStream = outputStream;
    this.isFirstWrite = true;
  }

  process(chunk: string): void {
    try {
      if (this.options.allowComments) {
        chunk = this.removeComments(chunk);
      }

      this.chunkStartTime = Date.now();

      if (this.adaptiveChunkSizer) {
        const chunkSize = this.adaptiveChunkSizer.getChunkSize();
        for (let i = 0; i < chunk.length; i += chunkSize) {
          const subChunk = chunk.slice(i, i + chunkSize);
          this.buffer += subChunk;
          this.parseBuffer();
        }
      } else {
        this.buffer += chunk;
        this.parseBuffer();
      }

      this.updateChunkSizeMetrics();
    } catch (error: any) {
      this.emit("error", error);
    }
  }

  protected parseBuffer() {
    try {
      let i = 0;
      for (i = 0; i < this.buffer.length; i++) {
        const char = this.buffer[i];

        if (this.isInString) {
          if (char === '"' && !this.isEscaped) {
            this.isInString = false;
            this.addValue(this.stringBuffer);
            this.stringBuffer = "";
          } else {
            this.stringBuffer += char;
          }
          this.isEscaped = char === "\\" && !this.isEscaped;
        } else {
          switch (char) {
            case "{":
              this.startObject();
              break;
            case "[":
              this.startArray();
              break;
            case "}":
            case "]":
              this.endContainer();
              break;
            case ":":
              // Do nothing, we've already captured the key
              break;
            case ",":
              this.currentKey = null;
              break;
            case '"':
              this.isInString = true;
              break;
            case " ":
            case "\n":
            case "\r":
            case "\t":
              // Ignore whitespace
              break;
            default:
              if (this.isStartOfValue(char)) {
                const value = this.parseValue(this.buffer.slice(i));
                this.addValue(value.value);
                i += value.length - 1;
              }
          }
        }
        if (this.isCompleteToken(i)) {
          this.lastCompleteToken = i + 1;
        }
      }

      this.buffer = this.buffer.slice(this.lastCompleteToken);
      this.lastCompleteToken = 0;

      // Emit data event if parsing is complete
      if (this.isComplete) {
        this.emit("data", this.rootObject);
        this.isComplete = false;
        this.rootObject = {};
      }
    } catch (error: any) {
      this.emit("error", error);
    }
  }

  private isCompleteToken(index: number): boolean {
    if (index >= this.buffer.length) return false;

    const char = this.buffer[index];
    switch (char) {
      case "{":
      case "[":
        // Opening brackets are always complete tokens
        return true;
      case "}":
      case "]":
        // Closing brackets are complete if they match an opening bracket
        return this.isBalancedBracket(index);
      case '"':
        // For strings, we need to find the closing quote
        return this.isCompleteString(index);
      case "t":
      case "f":
        // true or false
        return this.isCompleteKeyword(index, char === "t" ? "true" : "false");
      case "n":
        // null
        return this.isCompleteKeyword(index, "null");
      default:
        // Check for numbers
        if (this.isDigit(char) || char === "-") {
          return this.isCompleteNumber(index);
        }
        // For other characters (like whitespace or commas), consider them complete
        return true;
    }
  }

  private isBalancedBracket(index: number): boolean {
    const stack: string[] = [];
    for (let i = 0; i <= index; i++) {
      const char = this.buffer[i];
      if (char === "{" || char === "[") {
        stack.push(char);
      } else if (char === "}" || char === "]") {
        if (stack.length === 0) return false;
        const last = stack.pop()!;
        if ((char === "}" && last !== "{") || (char === "]" && last !== "[")) {
          return false;
        }
      }
    }
    return stack.length === 0;
  }

  private isCompleteString(index: number): boolean {
    let i = index + 1;
    while (i < this.buffer.length) {
      if (this.buffer[i] === '"' && this.buffer[i - 1] !== "\\") {
        return true;
      }
      i++;
    }
    return false;
  }

  private isCompleteKeyword(index: number, keyword: string): boolean {
    return this.buffer.slice(index, index + keyword.length) === keyword;
  }

  private isCompleteNumber(index: number): boolean {
    let i = index;
    let hasDecimal = false;
    let hasExponent = false;

    // Optional minus sign
    if (this.buffer[i] === "-") i++;

    // Integer part
    while (i < this.buffer.length && this.isDigit(this.buffer[i])) i++;

    // Fractional part
    if (i < this.buffer.length && this.buffer[i] === ".") {
      hasDecimal = true;
      i++;
      if (!this.isDigit(this.buffer[i])) return false; // Must have at least one digit after decimal
      while (i < this.buffer.length && this.isDigit(this.buffer[i])) i++;
    }

    // Exponent part
    if (
      i < this.buffer.length &&
      (this.buffer[i] === "e" || this.buffer[i] === "E")
    ) {
      hasExponent = true;
      i++;
      if (this.buffer[i] === "+" || this.buffer[i] === "-") i++;
      if (!this.isDigit(this.buffer[i])) return false; // Must have at least one digit in exponent
      while (i < this.buffer.length && this.isDigit(this.buffer[i])) i++;
    }

    // Check if we've reached the end of the number
    return (
      i > index &&
      !this.isDigit(this.buffer[i]) &&
      this.buffer[i] !== "." &&
      this.buffer[i] !== "e" &&
      this.buffer[i] !== "E"
    );
  }

  private isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  protected addValue(value: JsonValue) {
    if (!this.shouldParseCurrentPath()) return;

    value = this.applyTransforms(value, this.currentPath);
    this.updateAggregations(this.currentPath, value);

    if (typeof value === "string") {
      this.statistics.incrementString();
    } else if (typeof value === "number") {
      this.statistics.incrementNumber();
    } else if (typeof value === "boolean") {
      this.statistics.incrementBoolean();
    } else if (value === null) {
      this.statistics.incrementNull();
    }

    if (this.options.reviver) {
      value = this.options.reviver(this.currentKey || "", value);
    }

    if (this.stack.length === 0) {
      if (this.currentKey !== null) {
        this.rootObject[this.currentKey] = value;
        this.currentKey = null;
      } else {
        // If there's no current key, this value is the entire JSON
        this.rootObject = value as JsonObject;
      }
      this.isComplete = true;
    } else {
      const current = this.stack[this.stack.length - 1];
      if (Array.isArray(current)) {
        if (current.length > 0) {
          this.writeToStream(",");
        }
        this.writeToStream(JSON.stringify(value));
        current.push(value);
      } else {
        if (this.currentKey !== null) {
          if (Object.keys(current).length > 0) {
            this.writeToStream(",");
          }
          this.writeToStream(
            `${JSON.stringify(this.currentKey)}:${JSON.stringify(value)}`
          );
          current[this.currentKey] = value;
          this.currentKey = null;
        } else if (typeof value === "string") {
          this.currentKey = value;
          // Don't decrement string count for object keys
        }
      }
    }
  }

  private shouldParseCurrentPath(): boolean {
    if (!this.selectivePaths) return true;
    return this.selectivePaths.hasPath(this.currentPath);
  }

  private createPartialObject(fullObject: JsonValue): JsonValue {
    if (
      !this.selectivePaths ||
      typeof fullObject !== "object" ||
      fullObject === null
    ) {
      return fullObject;
    }

    if (Array.isArray(fullObject)) {
      return fullObject.map((item) => this.createPartialObject(item));
    }

    const partialObject: JsonObject = {};
    for (const path of this.selectivePaths.getAllPaths()) {
      let current: any = fullObject;
      let partial: any = partialObject;
      for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (key === "*" && Array.isArray(current)) {
          partial = partial.map((item: any) => this.createPartialObject(item));
          break;
        }
        if (i === path.length - 1) {
          partial[key] = current[key];
        } else {
          if (!(key in current)) break; // Handle case where path doesn't exist
          current = current[key];
          partial[key] = partial[key] || (Array.isArray(current) ? [] : {});
          partial = partial[key];
        }
      }
    }
    return partialObject;
  }

  protected startObject() {
    if (!this.shouldParseCurrentPath()) return;

    this.checkDepth();
    this.writeToStream("{");
    const newObject = {};
    this.addValue(newObject);
    this.stack.push(newObject);
    this.statistics.incrementDepth();
    this.statistics.incrementObject();

    this.currentPath.push(this.currentKey || "");
  }

  protected startArray() {
    this.checkDepth();
    this.writeToStream("[");
    const newArray: JsonArray = [];
    this.addValue(newArray);
    this.stack.push(newArray);
    this.statistics.incrementDepth();
    this.statistics.incrementArray();
  }

  protected endContainer() {
    if (!this.shouldParseCurrentPath()) return;

    const completedContainer = this.stack.pop();
    if (this.stack.length === 0) {
      this.isComplete = true;
      this.rootObject = completedContainer as JsonObject;
    }
    this.writeToStream(completedContainer instanceof Array ? "]" : "}");
    this.statistics.decrementDepth();
    this.currentPath.pop();
  }

  protected isStartOfValue(char: string): boolean {
    return /[tfn0-9-]/.test(char);
  }

  protected parseValue(str: string): { value: JsonValue; length: number } {
    if (str.startsWith("true")) return { value: true, length: 4 };
    if (str.startsWith("false")) return { value: false, length: 5 };
    if (str.startsWith("null")) return { value: null, length: 4 };

    // Parse number
    const numberMatch = str.match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
    if (numberMatch) {
      return {
        value: parseFloat(numberMatch[0]),
        length: numberMatch[0].length,
      };
    }

    return { value: null, length: 1 }; // Invalid value, skip character
  }

  protected writeToStream(data: string) {
    if (this.outputStream) {
      if (this.selectivePaths) {
        const parsedData = JSON.parse(data);
        const partialData = this.createPartialObject(parsedData);
        this.outputStream.write(JSON.stringify(partialData));
      } else {
        this.outputStream.write(data);
      }
    }
  }

  protected removeComments(input: string): string {
    return input.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
  }

  protected checkDepth() {
    if (this.statistics.getCurrentDepth() >= this.options.maxDepth!) {
      throw new Error(`Maximum depth of ${this.options.maxDepth} exceeded`);
    }
  }

  getStats(): ParserStats {
    return this.statistics.getStats();
  }

  getCurrentJson(): JsonValue {
    return this.rootObject;
  }

  validateAgainstSchema(schema: SchemaNode): boolean {
    return validateAgainstSchema(this.getCurrentJson(), schema);
  }

  private updateChunkSizeMetrics() {
    if (this.adaptiveChunkSizer) {
      const processingTime = Date.now() - this.chunkStartTime;
      const complexity = this.calculateComplexity();
      const metrics: ChunkSizeMetrics = {
        processingTime,
        complexity,
        size: this.buffer.length,
      };
      this.adaptiveChunkSizer.addMetrics(metrics);
    }
  }

  private calculateComplexity(): number {
    const stats = this.getStats();
    const totalElements =
      stats.objectCount +
      stats.arrayCount +
      stats.stringCount +
      stats.numberCount +
      stats.booleanCount +
      stats.nullCount;
    const complexityScore =
      stats.depth * 0.2 +
      stats.objectCount * 0.3 +
      stats.arrayCount * 0.3 +
      totalElements * 0.2;
    return Math.min(complexityScore / 100, 1); // Normalize to 0-1 range
  }

  setSelectivePaths(paths: string[]): void {
    for (const path of paths) {
      if (!/^[a-zA-Z0-9.]+$/.test(path)) {
        throw new Error(`Invalid path: ${path}`);
      }
    }
    this.selectivePaths = new PathTrie();
    for (const path of paths) {
      this.selectivePaths.addPath(path.split("."));
    }
  }

  resetSelectivePaths(): void {
    this.selectivePaths = null;
    this.currentPath = [];
  }

  // Transform functions

  addTransform(path: string, transform: TransformFunction): void {
    this.transforms.push({ path, transform });
  }

  private applyTransforms(value: JsonValue, path: string[]): JsonValue {
    let transformedValue = value;
    for (const { path: transformPath, transform } of this.transforms) {
      if (this.pathMatches(path, transformPath)) {
        transformedValue = transform(
          transformedValue,
          path[path.length - 1],
          path
        );
      }
    }
    return transformedValue;
  }

  addAggregation(path: string, type: AggregationType): void {
    this.aggregations.set(path, { path, type, value: 0 });
  }

  private updateAggregations(path: string[], value: JsonValue): void {
    for (const [aggPath, aggregation] of this.aggregations) {
      if (this.pathMatches(path, aggPath)) {
        this.updateAggregation(aggregation, value);
      }
    }
    this.emitAggregationUpdate();
  }

  private updateAggregation(aggregation: Aggregation, value: JsonValue): void {
    if (typeof value !== "number") return;

    switch (aggregation.type) {
      case "count":
        aggregation.value++;
        break;
      case "sum":
        aggregation.value += value;
        break;
      case "average":
        if (aggregation.count === undefined) aggregation.count = 0;
        aggregation.value =
          (aggregation.value * aggregation.count + value) /
          (aggregation.count + 1);
        aggregation.count++;
        break;
      case "min":
        aggregation.value = Math.min(aggregation.value, value);
        break;
      case "max":
        aggregation.value = Math.max(aggregation.value, value);
        break;
    }
  }

  getAggregationResults(): AggregationResult {
    const results: AggregationResult = {};
    for (const [path, aggregation] of this.aggregations) {
      results[path] = aggregation.value;
    }
    return results;
  }

  private emitAggregationUpdate(): void {
    const results: AggregationResult = {};
    for (const [path, aggregation] of this.aggregations) {
      results[path] = aggregation.value;
    }
    this.emit("aggregationUpdate", results);
  }

  private pathMatches(currentPath: string[], transformPath: string): boolean {
    const transformSegments = transformPath.split(".");
    if (currentPath.length !== transformSegments.length) return false;
    return transformSegments.every(
      (segment, index) => segment === "*" || segment === currentPath[index]
    );
  }

  on<E extends keyof ParserEvents>(event: E, listener: ParserEvents[E]): this {
    return super.on(event, listener);
  }

  emit<E extends keyof ParserEvents>(
    event: E,
    ...args: Parameters<ParserEvents[E]>
  ): boolean {
    if (event === "data" && this.selectivePaths) {
      const [data] = args as [JsonValue];
      if (typeof data === "object" && data !== null) {
        const partialData = this.createPartialObject(data as JsonObject);
        return super.emit(event, partialData as any);
      }
    }
    return super.emit(event, ...args);
  }

  end() {
    if (this.outputStream) {
      this.outputStream.end();
    }
    if (Object.keys(this.rootObject).length > 0) {
      this.emit("data", this.rootObject);
    }
    this.emit("end");
  }
}
