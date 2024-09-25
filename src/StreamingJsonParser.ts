import { EventEmitter } from 'events';
import { Writable } from 'stream';
import { ParserStatistics, ParserStats } from './utils/statistics';
import { validateAgainstSchema, SchemaNode } from './utils/schemaValidator';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}

export interface ParserOptions {
  maxDepth?: number;
  maxStringLength?: number;
  allowComments?: boolean;
  reviver?: (key: string, value: any) => any;
  outputStream?: Writable;
}

export class StreamingJsonParser extends EventEmitter {
  private statistics: ParserStatistics;
  protected buffer: string = "";
  protected stack: (JsonObject | JsonArray)[] = [];
  protected currentKey: string | null = null;
  protected isInString: boolean = false;
  protected isEscaped: boolean = false;
  protected outputStream: Writable | null = null;
  protected isFirstWrite: boolean = true;
  protected options: ParserOptions;

  constructor(options: ParserOptions = {}) {
    super();
    this.options = {
      maxDepth: options.maxDepth || Infinity,
      maxStringLength: options.maxStringLength || Infinity,
      allowComments: options.allowComments || false,
      reviver: options.reviver,
      outputStream: options.outputStream,
    };
    if (this.options.outputStream) {
      this.setOutputStream(this.options.outputStream);
    }
    this.statistics = new ParserStatistics();
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
      this.buffer += chunk;
      this.parseBuffer();
      const result = this.getCurrentJson();
      this.emit("data", result);
    } catch (error) {
      this.emit("error", error);
    }
  }

  protected parseBuffer() {
    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i];

      if (this.isInString) {
        if (char === '"' && !this.isEscaped) {
          this.isInString = false;
          this.addValue(this.buffer.substring(1, i));
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
            this.buffer = this.buffer.slice(i);
            i = 0;
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
    }

    // Clear processed data from buffer
    this.buffer = this.isInString ? '"' + this.buffer : "";
  }

  protected startObject() {
    this.checkDepth();
    this.writeToStream("{");
    this.stack.push({});
    this.statistics.incrementDepth();
    this.statistics.incrementObject();
  }

  protected startArray() {
    this.checkDepth();
    this.writeToStream("[");
    this.stack.push([]);
    this.statistics.incrementDepth();
    this.statistics.incrementArray();
  }

  protected endContainer() {
    const container = this.stack.pop();
    if (Array.isArray(container)) {
      this.writeToStream("]");
    } else {
      this.writeToStream("}");
    }
    this.statistics.decrementDepth();
  }

  protected addValue(value: JsonValue) {
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
      this.writeToStream(JSON.stringify(value));
    } else {
      const current = this.stack[this.stack.length - 1];
      if (Array.isArray(current)) {
        if (current.length > 0) {
          this.writeToStream(",");
        }
        this.writeToStream(JSON.stringify(value));
        current.push(value);
      } else if (this.currentKey !== null) {
        if (Object.keys(current).length > 0) {
          this.writeToStream(",");
        }
        this.writeToStream(
          `${JSON.stringify(this.currentKey)}:${JSON.stringify(value)}`
        );
        current[this.currentKey] = value;
      } else if (typeof value === "string") {
        this.currentKey = value;
      }
    }
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
      if (this.isFirstWrite) {
        this.isFirstWrite = false;
      } else {
        data = " " + data; // Add space for better formatting
      }
      this.outputStream.write(data);
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
    return this.stack.length > 0 ? this.stack[0] : null;
  }

  validateAgainstSchema(schema: SchemaNode): boolean {
    return validateAgainstSchema(this.getCurrentJson(), schema);
  }

  end() {
    if (this.outputStream) {
      this.outputStream.end();
    }
    this.emit("end");
  }
}
