const { StreamingJsonParser } = require("../dist/StreamingJsonParser");
const { Writable } = require("stream");

const outputStream = new Writable({
    write(chunk, encoding, callback) {
        console.log("Transformed chunk:", chunk.toString());
        callback();
    },
});

const parser = new StreamingJsonParser({
    outputStream,
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

// Add an additional transformation after initialization
parser.addTransform("data.name", (value) => value.toUpperCase());

parser.on("data", (data) => {
    console.log("Parsed and transformed data:", JSON.stringify(data, null, 2));
});
parser.on("error", (error) => console.error("Parsing error:", error));
parser.on("end", () => console.log("Parsing completed"));

const jsonData = [
    '{"data": {',
    '"name": "Product X",',
    '"price": "19.99",',
    '"date": "2023-09-26T12:00:00Z"',
    '}}',
];

jsonData.forEach((chunk) => parser.process(chunk));

parser.end();