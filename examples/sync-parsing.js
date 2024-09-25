const { StreamingJsonParser } = require("../dist/StreamingJsonParser");
const { Writable } = require("stream");

// Create a custom output stream
const outputStream = new Writable({
  write(chunk, encoding, callback) {
    console.log("Parsed chunk:", chunk.toString());
    callback();
  },
});

// Initialize the parser with options
const parser = new StreamingJsonParser({
  outputStream,
  maxDepth: 5,
  allowComments: true,
  reviver: (key, value) => (key === "date" ? new Date(value) : value),
});

// Set up event listeners
parser.on("data", (data) => {
  console.log("Parsed data:", JSON.stringify(data, null, 2));
  
  // Validate against a schema
  const schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
      hobbies: { type: "array", items: { type: "string" } },
      address: {
        type: "object",
        properties: {
          city: { type: "string" },
          zip: { type: "string" },
        },
      },
      active: { type: "boolean" },
      salary: { type: "number" },
      date: { type: "string", format: "date-time" },
    },
    required: ["name", "age", "hobbies", "address", "active", "salary", "date"],
  };

  console.log("Schema validation result:", parser.validateAgainstSchema(schema));
});
parser.on("error", (error) => console.error("Parsing error:", error));
parser.on("end", () => {
  console.log("Parsing completed");
  
  // Get and log statistics
  console.log("Parsing statistics:", parser.getStats());
});

// Example JSON data
const jsonData = [
  '{"name": "John Doe", /* This is a comment */ "age": 30,',
  '"hobbies": ["reading", "cycling"],',
  '"address": {"city": "New York", "zip": "10001"},',
  '"active": true,',
  '"salary": 75000.50,',
  '"date": "2023-01-01T00:00:00Z"}',
];

// Process the JSON data in chunks
jsonData.forEach((chunk) => parser.process(chunk));

// End parsing
parser.end();