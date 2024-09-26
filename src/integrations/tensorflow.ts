import * as tf from "@tensorflow/tfjs-node";
import { StreamingJsonParser } from "../StreamingJsonParser";

export function parseTensorFlowModel(jsonString: string): tf.LayersModel {
  const parser = new StreamingJsonParser();
  let modelConfig: any;

  parser.on("data", (data) => {
    modelConfig = data;
  });

  parser.process(jsonString);
  parser.end();

  return tf.models.modelFromJSON(modelConfig);
}
