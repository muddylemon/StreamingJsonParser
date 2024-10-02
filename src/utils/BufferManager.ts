class BufferManager {
  private buffer: string = "";
  private lastCompleteToken: number = 0;

  append(chunk: string): void {
    this.buffer += chunk;
  }

  consume(index: number): void {
    this.lastCompleteToken = index + 1;
  }

  clean(): void {
    this.buffer = this.buffer.slice(this.lastCompleteToken);
    this.lastCompleteToken = 0;
  }

  get content(): string {
    return this.buffer;
  }
}

export { BufferManager };
