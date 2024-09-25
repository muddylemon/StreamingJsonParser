const { AsyncStreamingJsonParser } = require("../dist/AsyncStreamingJsonParser");
const { createWriteStream } = require("fs");

async function parseJsonAsync() {
  // Create an output stream to a file
  const outputStream = createWriteStream("output.json");

  // Initialize the async parser with options
  const parser = new AsyncStreamingJsonParser({
    outputStream,
    allowComments: true,
    maxDepth: 10,
    reviver: (key, value) => (key === "timestamp" ? new Date(value) : value),
  });

  // Set up event listeners
  parser.on("data", (data) => console.log("Parsed data:", data));
  parser.on("error", (error) => console.error("Parsing error:", error));
  parser.on("end", () => console.log("Parsing completed"));
  parser.on("chunkProcessed", () => console.log("Chunk processed"));

  // Example JSON data
  const jsonData = [
    '{"users": [',
    '{"name": "Alice", "age": 28, "roles": ["admin", "user"]},',
    '{"name": "Bob", "age": 32, "roles": ["user"]},',
    '{"name": "Charlie", "age": 45, "roles": ["manager", "user"]}',
    "],",
    '"company": "TechCorp",',
    '"active": true,',
    '"timestamp": "2023-09-24T12:00:00Z"',
    "}",
  ];

  try {
    // Process the JSON data in chunks
    for (const chunk of jsonData) {
      await parser.process(chunk);
      // Simulate some asynchronous operation between chunks
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("Final parsed JSON:", parser.getCurrentJson());
    console.log("Parsing statistics:", parser.getStats());

    // Validate against a schema
    const schema = {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
              roles: { type: "array", items: { type: "string" } },
            },
          },
        },
        company: { type: "string" },
        active: { type: "boolean" },
        timestamp: { type: "string" },
      },
    };
    console.log(
      "Schema validation result:",
      parser.validateAgainstSchema(schema)
    );

    // End parsing
    await parser.endAsync();
  } catch (error) {
    console.error("Error during async parsing:", error);
  }
}

parseJsonAsync().catch(console.error);
