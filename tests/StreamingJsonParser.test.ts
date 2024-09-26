import { StreamingJsonParser } from "../src/StreamingJsonParser";
import { Writable } from "stream";
import { JsonObject, JsonValue } from "../src/types";
import { isJsonObjectWithDate } from "../src/utils/typeGuards";

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

  it("should parse a simple complete JSON object", (done: jest.DoneCallback) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ name: "John", age: 30 });
      done();
    });
    parser.process('{"name": "John", "age": 30}');
  });

  it("should handle streaming data in multiple chunks", (done: jest.DoneCallback) => {
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

  it("should parse nested objects", (done: jest.DoneCallback) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ person: { name: "John", age: 30 } });
      done();
    });
    parser.process('{"person": {"name": "John", "age": 30}}');
  });

  it("should parse arrays", (done: jest.DoneCallback) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ numbers: [1, 2, 3], names: ["John", "Jane"] });
      done();
    });
    parser.process('{"numbers": [1, 2, 3], "names": ["John", "Jane"]}');
  });

  it("should handle different types of values", (done: jest.DoneCallback) => {
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

  it("should handle escaped characters in strings", (done: jest.DoneCallback) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ text: 'Hello "World"!' });
      done();
    });
    parser.process('{"text": "Hello \\"World\\"!"}');
  });

  it("should handle whitespace", (done: jest.DoneCallback) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ name: "John", age: 30 });
      done();
    });
    parser.process('{\n  "name": "John",\n  "age": 30\n}');
  });

  it("should parse large numbers correctly", (done: jest.DoneCallback) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ big: 1234567890, small: 0.00001 });
      done();
    });
    parser.process('{"big": 1234567890, "small": 0.00001}');
  });

  it("should parse scientific notation", (done: jest.DoneCallback) => {
    parser.on("data", (data) => {
      expect(data).toEqual({ large: 1e10, tiny: 1e-10 });
      done();
    });
    parser.process('{"large": 1e10, "tiny": 1e-10}');
  });

  it("should handle comments when allowComments option is true", (done: jest.DoneCallback) => {
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

  it("should use reviver function when provided", (done: jest.DoneCallback) => {
    const reviver = (key: string, value: any): any =>
      key === "date" ? new Date(value) : value;
    parser = new StreamingJsonParser({ reviver });
    parser.on("data", (data: JsonValue) => {
      if (isJsonObjectWithDate(data)) {
        expect(data.date).toBeInstanceOf(Date);
        done();
      } else {
        done(new Error("Expected data to be an object with a date property"));
      }
    });
    parser.process('{"date": "2023-01-01T00:00:00Z"}');
  });

  it("should provide correct statistics", (done: jest.DoneCallback) => {
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

  it("should validate against a simple schema", (done: jest.DoneCallback) => {
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

  it("should emit error on invalid JSON", (done: jest.DoneCallback) => {
    parser.on("error", (error) => {
      expect(error).toBeInstanceOf(Error);
      done();
    });
    parser.process('{"name": "John"');
  });

  it("should emit end event when parsing is complete", (done: jest.DoneCallback) => {
    parser.on("end", done);
    parser.process('{"name": "John"}');
    parser.end();
  });
});

describe("StreamingJsonParser Selective Parsing", () => {
  let parser: StreamingJsonParser;
  let outputStream: Writable;
  let output: string;

  beforeEach(() => {
    output = "";
    outputStream = new Writable({
      write(chunk, encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    parser = new StreamingJsonParser({ outputStream });
  });

  it("should parse only selected paths", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["name", "age"]);
    parser.on("data", (data) => {
      expect(data).toEqual({ name: "John", age: 30 });
      expect(output).toBe('{"name":"John","age":30}');
      done();
    });
    parser.process('{"name": "John", "age": 30, "city": "New York"}');
    parser.end();
  });

  it("should handle nested paths", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["user.name", "user.age"]);
    parser.on("data", (data) => {
      expect(data).toEqual({ user: { name: "John", age: 30 } });
      done();
    });
    parser.process('{"user": {"name": "John", "age": 30, "city": "New York"}}');
    parser.end();
  });

  it("should handle array wildcards", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["users.*.name"]);
    parser.on("data", (data) => {
      expect(data).toEqual({ users: [{ name: "John" }, { name: "Jane" }] });
      done();
    });
    parser.process(
      '{"users": [{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]}'
    );
    parser.end();
  });

  it("should handle multiple array levels", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["data.*.items.*.id"]);
    parser.on("data", (data) => {
      expect(data).toEqual({
        data: [
          { items: [{ id: 1 }, { id: 2 }] },
          { items: [{ id: 3 }, { id: 4 }] },
        ],
      });
      done();
    });
    parser.process(
      '{"data": [{"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]}, {"items": [{"id": 3, "name": "Item 3"}, {"id": 4, "name": "Item 4"}]}]}'
    );
    parser.end();
  });

  it("should handle paths that don't exist", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["name", "age", "address.street"]);
    parser.on("data", (data) => {
      expect(data).toEqual({ name: "John", age: 30 });
      done();
    });
    parser.process('{"name": "John", "age": 30}');
    parser.end();
  });

  it("should reset selective paths", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["name"]);
    parser.resetSelectivePaths();
    parser.on("data", (data) => {
      expect(data).toEqual({ name: "John", age: 30, city: "New York" });
      done();
    });
    parser.process('{"name": "John", "age": 30, "city": "New York"}');
    parser.end();
  });

  it("should throw error for invalid paths", () => {
    expect(() => {
      parser.setSelectivePaths(["name!"]);
    }).toThrow("Invalid path: name!");
  });

  it("should handle empty objects and arrays", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["emptyObj", "emptyArr"]);
    parser.on("data", (data) => {
      expect(data).toEqual({ emptyObj: {}, emptyArr: [] });
      done();
    });
    parser.process('{"emptyObj": {}, "emptyArr": [], "other": "data"}');
    parser.end();
  });

  it("should handle streaming of large objects with selective parsing", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["id", "name"]);
    const largeObject = {
      id: 1,
      name: "Large Object",
      data: Array(1000).fill({ key: "value" }),
    };

    parser.on("data", (data) => {
      expect(data).toEqual({ id: 1, name: "Large Object" });
      expect(JSON.stringify(data).length).toBeLessThan(
        JSON.stringify(largeObject).length
      );
      done();
    });

    parser.process(JSON.stringify(largeObject));
    parser.end();
  });

  it("should maintain correct JSON structure with selective parsing", (done: jest.DoneCallback) => {
    parser.setSelectivePaths(["a.b", "x.y"]);
    parser.on("data", (data) => {
      expect(data).toEqual({ a: { b: 2 }, x: { y: 4 } });
      expect(output).toBe('{"a":{"b":2},"x":{"y":4}}');
      done();
    });
    parser.process('{"a": {"b": 2, "c": 3}, "x": {"y": 4, "z": 5}}');
    parser.end();
  });
});
