import { ParserOptions } from "./types";
import { StreamingJsonParser } from "./StreamingJsonParser";

export class AsyncStreamingJsonParser extends StreamingJsonParser {
  private parsePromise: Promise<void> | null = null;
  private resolveParser: (() => void) | null = null;

  constructor(options?: ParserOptions) {
    super(options);
  }

  async process(chunk: string): Promise<void> {
    super.process(chunk);

    if (!this.parsePromise) {
      this.parsePromise = new Promise<void>((resolve) => {
        this.resolveParser = resolve;
      });

      setImmediate(() => this.asyncParseBuffer());
    }

    return this.parsePromise;
  }

  private async asyncParseBuffer() {
    const chunkSize = 1024; // Process in smaller chunks to avoid blocking
    let startIndex = 0;

    while (startIndex < this.buffer.length) {
      const endIndex = Math.min(startIndex + chunkSize, this.buffer.length);
      const chunk = this.buffer.slice(startIndex, endIndex);

      super.parseBuffer();

      startIndex = endIndex;

      // Yield to the event loop periodically
      await new Promise((resolve) => setImmediate(resolve));
    }

    if (this.resolveParser) {
      this.resolveParser();
      this.parsePromise = null;
      this.resolveParser = null;
    }

    this.emit("chunkProcessed");
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
}
