import { StreamingJsonParser } from "../StreamingJsonParser";

export function createStreamingDataProcessor<T>(
  processChunk: (chunk: any) => T,
  onResult: (result: T) => void
): StreamingJsonParser {
  const parser = new StreamingJsonParser();

  parser.on("data", (data) => {
    const result = processChunk(data);
    onResult(result);
  });

  return parser;
}
