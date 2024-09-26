import { Writable } from "stream";

// JSON value types
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | Date
  | JsonObject
  | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

// Parser options
export interface ParserOptions {
  maxDepth?: number;
  allowComments?: boolean;
  reviver?: (key: string, value: any) => JsonValue;
  outputStream?: Writable;
}

// Parser statistics
export interface ParserStats {
  depth: number;
  objectCount: number;
  arrayCount: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  nullCount: number;
}

// Schema validation
export interface SchemaNode {
  type: string | string[];
  properties?: { [key: string]: SchemaNode };
  items?: SchemaNode | SchemaNode[];
  required?: string[];
  enum?: JsonValue[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | SchemaNode;
  additionalItems?: boolean | SchemaNode;
}

export interface ParserEvents {
  data: (data: JsonValue) => void;
  error: (error: Error) => void;
  end: () => void;
  chunkProcessed: () => void;
}
