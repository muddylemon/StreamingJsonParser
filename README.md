# StreamingJsonParser

StreamingJsonParser is a robust and flexible JSON parsing library for Node.js that supports both synchronous and asynchronous parsing of JSON data streams. It's designed to handle large JSON files efficiently by processing them in chunks, making it ideal for scenarios where memory usage is a concern.

## Why Use StreamingJsonParser?

In today's data-driven world, we often deal with large amounts of JSON data, especially when working with Large Language Models (LLMs) and AI applications. Here's why StreamingJsonParser can be particularly useful:

1. **Handling Large Datasets**: When working with LLMs, you might need to process huge JSON files containing training data, model outputs, or configuration settings. StreamingJsonParser allows you to handle these large files without loading the entire dataset into memory at once, preventing out-of-memory errors.

2. **Real-time Processing**: In applications where you're continuously receiving JSON data (e.g., from an API or a data stream), StreamingJsonParser lets you start processing the data as soon as it begins arriving, rather than waiting for the entire payload.

3. **Efficient Memory Usage**: By processing JSON in chunks, this library helps manage memory more efficiently. This is crucial when working with resource-intensive LLMs, where you need to reserve as much memory as possible for the model itself.

4. **Compatibility with Asynchronous Workflows**: The AsyncStreamingJsonParser is particularly useful in Node.js environments where you're likely dealing with asynchronous operations. It integrates well with async/await patterns commonly used in modern JavaScript and TypeScript applications.

5. **Flexible Parsing Options**: Features like comment support, custom revivers, and configurable depth limits make it easier to work with various JSON formats you might encounter in LLM projects, from model configurations to dataset descriptions.

6. **Schema Validation**: When working with LLMs, ensuring the integrity of your input and output data is crucial. The built-in schema validation helps you catch data inconsistencies early in your pipeline.

7. **Performance Insights**: The detailed parsing statistics can help you optimize your data processing pipeline, which is valuable when working with the large datasets typically used in LLM applications.

8. **Error Handling**: Robust error handling is essential when processing large datasets for LLMs. StreamingJsonParser's error events help you identify and address issues in your data without crashing your application.

By using StreamingJsonParser in your LLM projects, you can focus more on developing and fine-tuning your models, knowing that your JSON data processing is efficient, reliable, and scalable.

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

## Installing Integrations

To use StreamingJsonParser with specific AI libraries, you can install the necessary dependencies:

- For TensorFlow.js: `npm run install:tensorflow`
- For PyTorch: `npm run install:pytorch`
- For NumPy: `npm run install:numpy`
- For Pandas: `npm run install:pandas`
- For scikit-learn: `npm run install:sklearn`
- For Hugging Face: `npm run install:huggingface`
- For ONNX Runtime: `npm run install:onnx`

Or install all integrations: `npm install --include=optional`

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
