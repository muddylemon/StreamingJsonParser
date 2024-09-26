import { AsyncStreamingJsonParser } from "../src/AsyncStreamingJsonParser";
import { Writable } from "stream";

jest.setTimeout(30000); // Increase timeout to 30 seconds

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
    const dataPromise = new Promise<void>((resolve) => {
      parser.on("data", (data) => {
        expect(data).toEqual({ name: "John", age: 30 });
        resolve();
      });
    });

    await parser.process('{"name": "John", ');
    await parser.process('"age": 30}');
    await dataPromise;
  });

  it("should handle large inputs without blocking", async () => {
    const largeInput = '{"numbers": [' + Array(10000).fill(1).join(",") + "]}";
    const dataPromise = new Promise<void>((resolve) => {
      parser.on("data", (data) => {
        expect(data).toEqual({ numbers: Array(10000).fill(1) });
        resolve();
      });
    });

    await parser.process(largeInput);
    await dataPromise;
  });

  it("should use reviver function when provided", async () => {
    const reviver = (key: string, value: any): any =>
      key === "date" ? new Date(value) : value;
    parser = new AsyncStreamingJsonParser({ reviver });
    const dataPromise = new Promise<void>((resolve) => {
      parser.on("data", (data: any) => {
        expect(data.date).toBeInstanceOf(Date);
        resolve();
      });
    });

    await parser.process('{"date": "2023-01-01T00:00:00Z"}');
    await dataPromise;
  });

  it("should provide correct statistics after async parsing", async () => {
    const dataPromise = new Promise<void>((resolve) => {
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
        resolve();
      });
    });

    await parser.process(
      '{"name": "John", "age": 30, "hobbies": ["reading", true], "address": null}'
    );
    await dataPromise;
  });

  it("should validate against a simple schema after async parsing", async () => {
    const dataPromise = new Promise<void>((resolve) => {
      parser.on("data", () => {
        const schema = {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        };
        expect(parser.validateAgainstSchema(schema)).toBe(true);
        resolve();
      });
    });

    await parser.process('{"name": "John", "age": 30}');
    await dataPromise;
  });

  it("should emit error on invalid JSON", async () => {
    const errorPromise = new Promise<void>((resolve) => {
      parser.on("error", (error) => {
        expect(error).toBeInstanceOf(Error);
        resolve();
      });
    });

    await parser.process('{"name": "John"');
    await errorPromise;
  });

  it("should handle comments when allowComments option is true", async () => {
    parser = new AsyncStreamingJsonParser({ allowComments: true });
    const dataPromise = new Promise<void>((resolve) => {
      parser.on("data", (data) => {
        expect(data).toEqual({ name: "John", age: 30 });
        resolve();
      });
    });

    await parser.process(
      '{"name": "John", /* comment */ "age": 30 // another comment\n}'
    );
    await dataPromise;
  });
});
