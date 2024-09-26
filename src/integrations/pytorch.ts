import { AsyncStreamingJsonParser } from "../AsyncStreamingJsonParser";
import * as torch from "torch";

export async function parsePyTorchModel(
  jsonString: string
): Promise<torch.nn.Module> {
  const parser = new AsyncStreamingJsonParser();
  let modelConfig: any;

  parser.on("data", (data) => {
    modelConfig = data;
  });

  await parser.process(jsonString);
  await parser.endAsync();

  return torch.jit.load(modelConfig);
}
