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
- Transformation Pipelines for on-the-fly data preparation
- Adaptive Chunk Sizing for optimized performance



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


## Transformation Pipelines

The Transformation Pipelines feature allows you to define a series of transformations that are applied to the parsed data as it's being processed. This is particularly useful for on-the-fly data preparation, especially when working with AI models or other scenarios that require specific data formats.

### Using Transformations

You can add transformations in two ways:

1. During parser initialization:

```javascript
const parser = new StreamingJsonParser({
  transforms: [
    {
      path: "data.price",
      transform: (value) => parseFloat(value)
    },
    {
      path: "data.date",
      transform: (value) => new Date(value)
    }
  ]
});
```

2. After parser initialization:

```javascript
parser.addTransform("data.name", (value) => value.toUpperCase());
```

### Transformation Function Signature

A transformation function has the following signature:

```typescript
(value: JsonValue, key: string, path: string[]) => JsonValue
```

- `value`: The current value being processed
- `key`: The key of the current value in its parent object
- `path`: An array representing the full path to the current value

### Path Specification

Paths are specified as dot-separated strings. You can use `*` as a wildcard to match any key at a particular level. For example:

- `"data.price"`: Matches the "price" field inside a "data" object
- `"users.*.name"`: Matches the "name" field of any object inside the "users" array

### Example

Here's an example demonstrating how to use transformation pipelines:

```javascript
const { StreamingJsonParser } = require("streaming-json-parser");

const parser = new StreamingJsonParser({
  transforms: [
    {
      path: "data.price",
      transform: (value) => parseFloat(value)
    },
    {
      path: "data.date",
      transform: (value) => new Date(value)
    }
  ]
});

parser.addTransform("data.name", (value) => value.toUpperCase());

parser.on("data", (data) => {
  console.log("Parsed and transformed data:", data);
});

parser.process('{"data": {"name": "Product X", "price": "19.99", "date": "2023-09-26T12:00:00Z"}}');
parser.end();
```

In this example, the "price" will be converted to a float, the "date" to a Date object, and the "name" will be uppercased.

### Benefits

1. **Efficiency**: Transformations are applied during parsing, eliminating the need for separate processing steps.
2. **Flexibility**: You can easily add or modify transformations as needed.
3. **Targeted Processing**: Transformations can be applied to specific paths in your JSON data.
4. **Reduced Memory Usage**: Since transformations are applied on-the-fly, you don't need to hold the entire dataset in memory.

By using Transformation Pipelines, you can streamline your data processing workflow, making it easier to prepare data for AI models or other applications that require specific data formats.



## Adaptive Chunk Sizing

The Adaptive Chunk Sizing feature dynamically adjusts the chunk size based on the complexity of the JSON being parsed and system resources. This optimization is particularly valuable for diverse AI application environments where JSON structures and system conditions can vary significantly.

### Using Adaptive Chunk Sizing

You can enable adaptive chunk sizing by providing options during parser initialization:

```javascript
const parser = new StreamingJsonParser({
  adaptiveChunkSizing: {
    initialChunkSize: 1024,
    minChunkSize: 256,
    maxChunkSize: 4096,
    targetProcessingTime: 50 // in milliseconds
  }
});
```

### Adaptive Chunk Sizing Options

- `initialChunkSize`: The starting chunk size in bytes.
- `minChunkSize`: The minimum allowed chunk size in bytes.
- `maxChunkSize`: The maximum allowed chunk size in bytes.
- `targetProcessingTime`: The ideal processing time for each chunk in milliseconds.

### How it Works

The adaptive chunk sizing algorithm:

1. Starts with the initial chunk size.
2. Measures the processing time and complexity of each chunk.
3. Adjusts the chunk size based on these metrics:
   - If processing time is too high, it reduces the chunk size.
   - If processing time is too low, it increases the chunk size.
   - It also considers the complexity of the JSON structure.
4. Ensures the chunk size stays within the specified min and max limits.

### Benefits

1. **Optimized Performance**: Automatically adjusts to different JSON structures and system conditions.
2. **Efficient Resource Usage**: Balances processing speed and memory usage.
3. **Consistency**: Aims to maintain a consistent processing time across varying JSON complexities.
4. **Flexibility**: Works well in diverse environments, from resource-constrained systems to high-performance servers.

By using Adaptive Chunk Sizing, your JSON parsing can automatically optimize itself for the specific data and system it's running on, providing better performance and resource utilization across a wide range of scenarios.



## Error Handling

Both parsers emit an `'error'` event when a parsing error occurs. It's recommended to always attach an error listener to handle potential parsing errors.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any problems or have any questions, please open an issue in the GitHub repository.
