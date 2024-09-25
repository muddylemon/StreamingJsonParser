import { StreamingJsonParser } from "../src/StreamingJsonParser";
import { Writable } from "stream";

describe("StreamingJsonParser", () => {
  let parser: StreamingJsonParser;
  let outputStream: Writable;

  beforeEach(() => {
    outputStream = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    parser = new StreamingJsonParser({ outputStream });
  });

  it("should parse a simple complete JSON object", (done) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ name: "John", age: 30 });
      done();
    });
    parser.process('{"name": "John", "age": 30}');
  });

  it("should handle streaming data in multiple chunks", (done) => {
    const expectedResults = [{}, { name: "John" }, { name: "John", age: 30 }];
    let dataCount = 0;

    parser.on("data", (data) => {
      expect(data).toEqual(expectedResults[dataCount]);
      dataCount++;
      if (dataCount === expectedResults.length) {
        done();
      }
    });

    parser.process('{"name": ');
    parser.process('"John", ');
    parser.process('"age": 30}');
  });

  it("should parse nested objects", (done) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ person: { name: "John", age: 30 } });
      done();
    });
    parser.process('{"person": {"name": "John", "age": 30}}');
  });

  it("should parse arrays", (done) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ numbers: [1, 2, 3], names: ["John", "Jane"] });
      done();
    });
    parser.process('{"numbers": [1, 2, 3], "names": ["John", "Jane"]}');
  });

  it("should handle different types of values", (done) => {
    parser.on("data", (data) => {
      expect(data).toEqual({
        string: "hello",
        number: 42,
        float: 3.14,
        bool: true,
        null: null,
      });
      done();
    });
    parser.process(
      '{"string": "hello", "number": 42, "float": 3.14, "bool": true, "null": null}'
    );
  });

  it("should handle escaped characters in strings", (done) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ text: 'Hello "World"!' });
      done();
    });
    parser.process('{"text": "Hello \\"World\\"!"}');
  });

  it("should handle whitespace", (done) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ name: "John", age: 30 });
      done();
    });
    parser.process('{\n  "name": "John",\n  "age": 30\n}');
  });

  it("should parse large numbers correctly", (done) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ big: 1234567890, small: 0.00001 });
      done();
    });
    parser.process('{"big": 1234567890, "small": 0.00001}');
  });

  it("should parse scientific notation", (done) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ large: 1e10, tiny: 1e-10 });
      done();
    });
    parser.process('{"large": 1e10, "tiny": 1e-10}');
  });

  it("should handle comments when allowComments option is true", (done) => {
    parser = new StreamingJsonParser({ allowComments: true });
    parser.on("data", (data) => {
      expect(data).toEqual({ name: "John", age: 30 });
      done();
    });
    parser.process(
      '{"name": "John", /* comment */ "age": 30 // another comment\n}'
    );
  });

  it("should respect maxDepth option", () => {
    parser = new StreamingJsonParser({ maxDepth: 2 });
    expect(() => {
      parser.process('{"a": {"b": {"c": 1}}}');
    }).toThrow();
  });

  it("should use reviver function when provided", (done) => {
    const reviver = (key: string, value: any) =>
      key === "date" ? new Date(value) : value;
    parser = new StreamingJsonParser({ reviver });
    parser.on("data", (data) => {
      expect(data.date).toBeInstanceOf(Date);
      done();
    });
    parser.process('{"date": "2023-01-01T00:00:00Z"}');
  });

  it("should provide correct statistics", (done) => {
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
      done();
    });
    parser.process(
      '{"name": "John", "age": 30, "hobbies": ["reading", true], "address": null}'
    );
  });

  it("should validate against a simple schema", (done) => {
    parser.on("data", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      };
      expect(parser.validateAgainstSchema(schema)).toBe(true);
      done();
    });
    parser.process('{"name": "John", "age": 30}');
  });

  it("should emit error on invalid JSON", (done) => {
    parser.on("error", (error) => {
      expect(error).toBeInstanceOf(Error);
      done();
    });
    parser.process('{"name": "John"');
  });

  it("should emit end event when parsing is complete", (done) => {
    parser.on("end", done);
    parser.process('{"name": "John"}');
    parser.end();
  });
});
