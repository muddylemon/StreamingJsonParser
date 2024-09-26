import { StreamingJsonParser } from "../StreamingJsonParser";
import * as np from "numpy";
import * as pd from "pandas";
import { JsonValue } from "../types";

export function parseNumPyArray(jsonString: string): np.NDArray {
  const parser = new StreamingJsonParser();
  let arrayData: number[] = [];

  parser.on("data", (data: JsonValue) => {
    if (Array.isArray(data)) {
      arrayData = data.filter(
        (item): item is number => typeof item === "number"
      );
    }
  });

  parser.process(jsonString);
  parser.end();

  if (arrayData.length === 0) {
    throw new Error("No valid numeric data found for NumPy array");
  }

  return np.array(arrayData);
}

// Pandas integration (corrected version)
export function parsePandasDataFrame(jsonString: string): pd.DataFrame {
  const parser = new StreamingJsonParser();
  let dfData: Record<string, JsonValue[]> | null = null;

  parser.on("data", (data: JsonValue) => {
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      dfData = Object.entries(data).reduce((acc, [key, value]) => {
        if (Array.isArray(value)) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, JsonValue[]>);
    }
  });

  parser.process(jsonString);
  parser.end();

  if (!dfData) {
    throw new Error("No valid data found for Pandas DataFrame");
  }

  return new pd.DataFrame(dfData);
}
