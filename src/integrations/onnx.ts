import { AsyncStreamingJsonParser } from "../AsyncStreamingJsonParser";
import { JsonValue } from "../types";
import { InferenceSession } from "onnxruntime-node";

declare global {
  namespace onnxruntime {
    const InferenceSession: {
      create: (modelBuffer: Buffer) => Promise<any>;
    };
  }
}

export async function parseONNXModel(jsonString: string): Promise<any> {
  const parser = new AsyncStreamingJsonParser();
  let modelBuffer: Buffer | undefined;

  parser.on("data", (data: JsonValue) => {
    if (
      typeof data === "object" &&
      data !== null &&
      "model" in data &&
      typeof data.model === "string"
    ) {
      modelBuffer = Buffer.from(data.model, "base64");
    } else if (typeof data === "string") {
      modelBuffer = Buffer.from(data, "base64");
    } else {
      throw new Error("Invalid ONNX model data format");
    }
  });

  await parser.process(jsonString);
  await parser.endAsync();

  if (!modelBuffer) {
    throw new Error("No valid ONNX model data found");
  }

  return await InferenceSession.create(modelBuffer);
}
