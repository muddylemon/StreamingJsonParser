const { StreamingJsonParser } = require("../dist/StreamingJsonParser");
const { Writable } = require("stream");

const outputStream = new Writable({
  write(chunk, encoding, callback) {
    console.log("Processed chunk:", chunk.toString());
    callback();
  },
});

const parser = new StreamingJsonParser({
  outputStream,
  aggregations: {
    "data.values": "average",
    "data.users": "count",
  },
});

parser.on("data", (data) => {
  console.log("Parsed data:", JSON.stringify(data, null, 2));
});

parser.on("aggregationUpdate", (results) => {
  console.log("Aggregation results:", results);
});

parser.on("error", (error) => console.error("Parsing error:", error));
parser.on("end", () => {
  console.log("Parsing completed");
  console.log("Final aggregation results:", parser.getAggregationResults());
});

// Example JSON data
const jsonData = [
  '{"data": {"values": [10, 20, 30], "users": [',
  '{"name": "Alice"}, {"name": "Bob"}, {"name": "Charlie"}',
  "]}}",
];

jsonData.forEach((chunk) => parser.process(chunk));

parser.end();
