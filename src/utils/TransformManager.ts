import { Transform } from "stream";
import { TransformFunction, JsonValue } from "../types";

class TransformManager {
  private transforms: Transform[] = [];

  addTransform(path: string, transform: TransformFunction): void {
    // Implementation
  }

  applyTransforms(value: JsonValue, path: string[]): JsonValue {
    // Implementation
    return null;
  }
}

export { TransformManager };
