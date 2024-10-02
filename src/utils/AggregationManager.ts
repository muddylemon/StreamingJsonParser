import {
  Aggregation,
  AggregationType,
  JsonValue,
  AggregationResult,
} from "../types";

class AggregationManager {
  private aggregations: Map<string, Aggregation> = new Map();

  addAggregation(path: string, type: AggregationType): void {
    // Implementation
  }

  updateAggregations(path: string[], value: JsonValue): void {
    // Implementation
  }

  getResults(): AggregationResult {
    // Implementation
    return {};
  }
}

export { AggregationManager };
