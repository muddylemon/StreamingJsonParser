import { AggregationType, ParserOptions, TransformFunction } from "./types";

import { StreamingJsonParser } from "./StreamingJsonParser";

export class AsyncStreamingJsonParser extends StreamingJsonParser {
  private parsePromise: Promise<void> | null = null;
  private resolveParser: (() => void) | null = null;

  constructor(options?: ParserOptions) {
    super(options);
  }

  async process(chunk: string): Promise<void> {
    try {
      super.process(chunk);

      if (!this.parsePromise) {
        this.parsePromise = new Promise<void>((resolve) => {
          this.resolveParser = resolve;
        });

        setImmediate(() => this.asyncParseBuffer());
      }

      return this.parsePromise;
    } catch (error: any) {
      this.emit("error", error);
      throw error;
    }
  }

  private async asyncParseBuffer() {
    try {
      super.parseBuffer();

      if (this.resolveParser) {
        this.resolveParser();
        this.parsePromise = null;
        this.resolveParser = null;
      }

      this.emit("chunkProcessed");
    } catch (error: any) {
      this.emit("error", error);
    }
  }

  async endAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.outputStream) {
        this.outputStream.end((error: any) => {
          if (error) reject(error);
          else {
            this.emit("end");
            resolve();
          }
        });
      } else {
        this.emit("end");
        resolve();
      }
    });
  }

  async addTransform(
    path: string,
    transform: TransformFunction
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      super.addTransform(path, transform);
      resolve();
    });
  }

  async addAggregation(path: string, type: AggregationType): Promise<void> {
    return new Promise<void>((resolve) => {
      super.addAggregation(path, type);
      resolve();
    });
  }
}
