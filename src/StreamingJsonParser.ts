import { EventEmitter } from 'events';
import { Writable } from 'stream';
import { ParserStatistics } from './utils/statistics';
import { validateAgainstSchema } from './utils/schemaValidator';
import {
  JsonValue,
  JsonObject,
  JsonArray,
  ParserOptions,
  ParserStats,
  SchemaNode,
  ParserEvents
} from './types';

export class StreamingJsonParser extends EventEmitter {
  private statistics: ParserStatistics;
  protected buffer: string = "";
  protected stack: (JsonObject | JsonArray)[] = [];
  protected currentKey: string | null = null;
  protected isInString: boolean = false;
  protected stringBuffer: string = "";
  protected isEscaped: boolean = false;
  protected outputStream: Writable | null = null;
  protected isFirstWrite: boolean = true;
  protected options: ParserOptions;
  protected isComplete: boolean = false;
  protected rootObject: JsonObject = {};

  constructor(options: ParserOptions = {}) {
    super();
    this.options = {
      maxDepth: options.maxDepth || Infinity,
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
    } catch (error:any) {
      this.emit("error", error);
    }
  }

  protected parseBuffer() {
    for (let i = 0; i < this.buffer.length; i++) {
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
    }

    // Clear processed data from buffer
    this.buffer = "";
  }

  protected startObject() {
    this.checkDepth();
    this.writeToStream("{");
    const newObject = {};
    this.addValue(newObject);
    this.stack.push(newObject);
    this.statistics.incrementDepth();
    this.statistics.incrementObject();
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
    const completedContainer = this.stack.pop();
    if (this.stack.length === 0) {
      this.isComplete = true;
      this.rootObject = completedContainer as JsonObject;
    }
    this.writeToStream(completedContainer instanceof Array ? "]" : "}");
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
      if (this.currentKey !== null) {
        this.rootObject[this.currentKey] = value;
        this.currentKey = null;
      }
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
          this.writeToStream(`${JSON.stringify(this.currentKey)}:${JSON.stringify(value)}`);
          current[this.currentKey] = value;
          this.currentKey = null;
        } else if (typeof value === "string") {
          this.currentKey = value;
        }
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
    return this.rootObject;
  }

  validateAgainstSchema(schema: SchemaNode): boolean {
    return validateAgainstSchema(this.getCurrentJson(), schema);
  }
  
  on<E extends keyof ParserEvents>(event: E, listener: ParserEvents[E]): this {
    return super.on(event, listener);
  }

  emit<E extends keyof ParserEvents>(event: E, ...args: Parameters<ParserEvents[E]>): boolean {
    return super.emit(event, ...args);
  }

  end() {
    if (this.outputStream) {
      this.outputStream.end();
    }
    this.emit("data", this.rootObject);
    this.emit("end");
  }
}