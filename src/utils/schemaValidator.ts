import { JsonValue, SchemaNode } from '../types';

export function validateAgainstSchema(data: JsonValue, schema: SchemaNode): boolean {
  // Type validation
  if (Array.isArray(schema.type)) {
    if (!schema.type.some(type => validateType(data, type))) {
      return false;
    }
  } else if (!validateType(data, schema.type)) {
    return false;
  }

  // Object validation
  if (schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'))) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return false;
    }

    // Required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in data)) {
          return false;
        }
      }
    }

    // Property validation
    if (schema.properties) {
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        if (key in data && !validateAgainstSchema(data[key], propertySchema)) {
          return false;
        }
      }
    }

    // Additional properties
    if (schema.additionalProperties !== undefined) {
      const extraKeys = Object.keys(data).filter(key => !(schema.properties && key in schema.properties));
      if (schema.additionalProperties === false && extraKeys.length > 0) {
        return false;
      } else if (typeof schema.additionalProperties === 'object') {
        for (const key of extraKeys) {
          if (!validateAgainstSchema(data[key], schema.additionalProperties)) {
            return false;
          }
        }
      }
    }
  }

  // Array validation
  if (schema.type === 'array' || (Array.isArray(schema.type) && schema.type.includes('array'))) {
    if (!Array.isArray(data)) {
      return false;
    }

    if (schema.items) {
      if (Array.isArray(schema.items)) {
        for (let i = 0; i < data.length; i++) {
          if (i < schema.items.length) {
            if (!validateAgainstSchema(data[i], schema.items[i])) {
              return false;
            }
          } else if ('additionalItems' in schema && schema.additionalItems === false) {
            return false;
          }
        }
      } else {
        for (const item of data) {
          if (!validateAgainstSchema(item, schema.items)) {
            return false;
          }
        }
      }
    }
  }

  // String validation
  if (schema.type === 'string' || (Array.isArray(schema.type) && schema.type.includes('string'))) {
    if (typeof data !== 'string' && !(data instanceof Date)) {
      return false;
    }
    const stringValue = data instanceof Date ? data.toISOString() : data;
    if (schema.minLength !== undefined && stringValue.length < schema.minLength) {
      return false;
    }
    if (schema.maxLength !== undefined && stringValue.length > schema.maxLength) {
      return false;
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(stringValue)) {
      return false;
    }
  }

  // Number validation
  if (schema.type === 'number' || (Array.isArray(schema.type) && schema.type.includes('number'))) {
    if (typeof data !== 'number') {
      return false;
    }
    if (schema.minimum !== undefined && data < schema.minimum) {
      return false;
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      return false;
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(data)) {
    return false;
  }

  return true;
}

function validateType(data: JsonValue, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof data === 'string' || data instanceof Date;
    case 'number':
      return typeof data === 'number';
    case 'boolean':
      return typeof data === 'boolean';
    case 'null':
      return data === null;
    case 'object':
      return typeof data === 'object' && data !== null && !Array.isArray(data);
    case 'array':
      return Array.isArray(data);
    default:
      return false;
  }
}