import { JsonValue, JsonObject } from "../types";

export function isJsonObjectWithDate(
  value: JsonValue
): value is JsonObject & { date: Date } {
  return (
    typeof value === "object" &&
    value !== null &&
    "date" in value &&
    value.date instanceof Date
  );
}
