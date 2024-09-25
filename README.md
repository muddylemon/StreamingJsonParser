# StreamingJsonParser

StreamingJsonParser is a robust and flexible JSON parsing library for Node.js that supports both synchronous and asynchronous parsing of JSON data streams. It's designed to handle large JSON files efficiently by processing them in chunks, making it ideal for scenarios where memory usage is a concern.

## Features

- Streaming JSON parsing (both synchronous and asynchronous)
- Support for parsing incomplete or partial JSON data
- Configurable maximum parsing depth
- Optional comment support in JSON
- Custom value reviver function
- JSON schema validation
- Detailed parsing statistics
- Event-based parsing updates

## Installation

Install StreamingJsonParser using npm:

```bash
npm install streaming-json-parser
```

## Usage

### Synchronous Parsing

```javascript
const { StreamingJsonParser } = require("streaming-json-parser");
const { Writable } = require("stream");

// Create a custom output stream
const outputStream = new Writable({
  write(chunk, encoding, callback) {
    console.log("Parsed chunk:", chunk.toString());
    callback();
  },
});

// Initialize the parser
const parser = new StreamingJsonParser({
  outputStream,
  maxDepth: 5,
  allowComments: true,
  reviver: (key, value) => (key === "date" ? new Date(value) : value),
});

// Set up event listeners
parser.on("data", (data) => console.log("Parsed data:", data));
parser.on("error", (error) => console.error("Parsing error:", error));
parser.on("end", () => console.log("Parsing completed"));

// Process JSON data
parser.process('{"name": "John", "age": 30}');
parser.process('"hobbies": ["reading", "cycling"]}');

// Get parsing statistics
console.log("Parsing statistics:", parser.getStats());

// End parsing
parser.end();
```

### Asynchronous Parsing

```javascript
const { AsyncStreamingJsonParser } = require("streaming-json-parser");
const { createWriteStream } = require("fs");

async function parseJsonAsync() {
  const outputStream = createWriteStream("output.json");
  const parser = new AsyncStreamingJsonParser({
    outputStream,
    allowComments: true,
  });

  parser.on("data", (data) => console.log("Parsed data:", data));
  parser.on("error", (error) => console.error("Parsing error:", error));
  parser.on("end", () => console.log("Parsing completed"));
  parser.on("chunkProcessed", () => console.log("Chunk processed"));

  try {
    await parser.process('{"users": [');
    await parser.process('{"name": "Alice", "age": 28},');
    await parser.process('{"name": "Bob", "age": 32}');
    await parser.process(']}');

    console.log("Final parsed JSON:", parser.getCurrentJson());
    console.log("Parsing statistics:", parser.getStats());

    await parser.endAsync();
  } catch (error) {
    console.error("Error during async parsing:", error);
  }
}

parseJsonAsync().catch(console.error);
```

## API Documentation

### StreamingJsonParser

#### Constructor

```javascript
new StreamingJsonParser(options)
```

- `options` (Object, optional):
  - `outputStream` (Writable): Stream to write parsed JSON.
  - `maxDepth` (number): Maximum nesting depth (default: Infinity).
  - `maxStringLength` (number): Maximum string length (default: Infinity).
  - `allowComments` (boolean): Allow comments in JSON (default: false).
  - `reviver` (Function): Custom reviver function for `JSON.parse`.

#### Methods

- `process(chunk: string): void`: Process a chunk of JSON data.
- `getCurrentJson(): JsonValue`: Get the current parsed JSON value.
- `getStats(): ParserStats`: Get parsing statistics.
- `validateAgainstSchema(schema: any): boolean`: Validate parsed JSON against a schema.
- `setOutputStream(outputStream: Writable): void`: Set or change the output stream.
- `end(): void`: End the parsing process.

#### Events

- `'data'`: Emitted when a complete JSON value is parsed.
- `'error'`: Emitted when a parsing error occurs.
- `'end'`: Emitted when parsing is complete.

### AsyncStreamingJsonParser

Extends `StreamingJsonParser` with the following differences:

#### Methods

- `process(chunk: string): Promise<void>`: Asynchronously process a chunk of JSON data.
- `endAsync(): Promise<void>`: Asynchronously end the parsing process.

#### Events

In addition to the events from `StreamingJsonParser`:

- `'chunkProcessed'`: Emitted when an asynchronous chunk processing is complete.

## ParserStats Object

The `getStats()` method returns an object with the following properties:

- `depth`: Maximum depth reached during parsing.
- `objectCount`: Number of objects parsed.
- `arrayCount`: Number of arrays parsed.
- `stringCount`: Number of strings parsed.
- `numberCount`: Number of numbers parsed.
- `booleanCount`: Number of booleans parsed.
- `nullCount`: Number of null values parsed.

## Error Handling

Both parsers emit an `'error'` event when a parsing error occurs. It's recommended to always attach an error listener to handle potential parsing errors.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any problems or have any questions, please open an issue in the GitHub repository.
