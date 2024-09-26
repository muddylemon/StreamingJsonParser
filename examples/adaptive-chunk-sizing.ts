const { StreamingJsonParser } = require("../dist/StreamingJsonParser");
const { Writable } = require("stream");
const fs = require("fs");

// Create a custom output stream
const outputStream = new Writable({
    write(chunk, _encoding, callback) {
        console.log("Processed chunk size:", chunk.length);
        callback();
    },
});

// Initialize the parser with adaptive chunk sizing options
const parser = new StreamingJsonParser({
    outputStream,
    adaptiveChunkSizing: {
        initialChunkSize: 1024,
        minChunkSize: 256,
        maxChunkSize: 4096,
        targetProcessingTime: 50, // in milliseconds
    },
});

// Set up event listeners
parser.on("data", (data) => {
    console.log("Parsed data:", JSON.stringify(data, null, 2));
});
parser.on("error", (error) => console.error("Parsing error:", error));
parser.on("end", () => console.log("Parsing completed"));

// Read and process a large JSON file
const fileStream = fs.createReadStream("large-data.json", { encoding: "utf8" });

fileStream.on("data", (chunk) => {
    parser.process(chunk.toString());
});

fileStream.on("end", () => {
    parser.end();
});