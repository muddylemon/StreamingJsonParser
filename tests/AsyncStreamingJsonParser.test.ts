import { AsyncStreamingJsonParser } from "../src/AsyncStreamingJsonParser";
import { Writable } from "stream";

describe("AsyncStreamingJsonParser", () => {
  let parser: AsyncStreamingJsonParser;
  let outputStream: Writable;

  beforeEach(() => {
    outputStream = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    parser = new AsyncStreamingJsonParser({ outputStream });
  });

  it("should parse JSON asynchronously", async () => {
    const dataPromise = new Promise((resolve) => {
      parser.on("data", (data) => {
        expect(data).toEqual({ name: "John", age: 30 });
        resolve(null);
      });
    });

    await parser.process('{"name": "John", ');
    await parser.process('"age": 30}');
    await dataPromise;
  });

  it("should emit chunkProcessed event", (done) => {
    parser.on("chunkProcessed", () => {
      expect(parser.getCurrentJson()).toEqual({ name: "John" });
      done();
    });
    parser.process('{"name": "John"}');
  });

  it("should handle large inputs without blocking", async () => {
    const largeInput = '{"numbers": [' + Array(10000).fill(1).join(",") + "]}";
    const dataPromise = new Promise((resolve) => {
      parser.on("data", (data) => {
        expect(data).toEqual({ numbers: Array(10000).fill(1) });
        resolve(null);
      });
    });

    await parser.process(largeInput);
    await dataPromise;
  });

  it("should respect maxDepth option", async () => {
    parser = new AsyncStreamingJsonParser({ maxDepth: 2 });
    await expect(parser.process('{"a": {"b": {"c": 1}}}')).rejects.toThrow();
  });

  it("should use reviver function when provided", async () => {
    const reviver = (key: string, value: any) =>
      key === "date" ? new Date(value) : value;
    parser = new AsyncStreamingJsonParser({ reviver });
    const dataPromise = new Promise((resolve) => {
      parser.on("data", (data) => {
        expect(data.date).toBeInstanceOf(Date);
        resolve(null);
      });
    });

    await parser.process('{"date": "2023-01-01T00:00:00Z"}');
    await dataPromise;
  });

  it("should provide correct statistics after async parsing", async () => {
    const dataPromise = new Promise((resolve) => {
      parser.on("data", () => {
        const stats = parser.getStats();
        expect(stats).toEqual({
          depth: 2,
          objectCount: 1,
          arrayCount: 1,
          stringCount: 3,
          numberCount: 1,
          booleanCount: 1,
          nullCount: 1,
        });
        resolve(null);
      });
    });

    await parser.process(
      '{"name": "John", "age": 30, "hobbies": ["reading", true], "address": null}'
    );
    await dataPromise;
  });

  it("should validate against a simple schema after async parsing", async () => {
    const dataPromise = new Promise((resolve) => {
      parser.on("data", () => {
        const schema = {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        };
        expect(parser.validateAgainstSchema(schema)).toBe(true);
        resolve(null);
      });
    });

    await parser.process('{"name": "John", "age": 30}');
    await dataPromise;
  });

  it("should handle end method asynchronously", async () => {
    const endPromise = parser.endAsync();
    await expect(endPromise).resolves.not.toThrow();
  });

  it("should emit error on invalid JSON", (done) => {
    parser.on("error", (error) => {
      expect(error).toBeInstanceOf(Error);
      done();
    });
    parser.process('{"name": "John"');
  });

  it("should handle comments when allowComments option is true", async () => {
    parser = new AsyncStreamingJsonParser({ allowComments: true });
    const dataPromise = new Promise((resolve) => {
      parser.on("data", (data) => {
        expect(data).toEqual({ name: "John", age: 30 });
        resolve(null);
      });
    });

    await parser.process(
      '{"name": "John", /* comment */ "age": 30 // another comment\n}'
    );
    await dataPromise;
  });
});
