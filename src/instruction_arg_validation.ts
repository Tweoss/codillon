import {
  instructions,
  noArgInstructions,
  labelIndexInstructions,
  labelIndexVectorLabelIndexInstructions,
  funcIndexInstructions,
  typeIndexInstructions,
  localIndexInstructions,
  globalIndexInstructions,
  memoryArgumentInstructions,
  i32Instructions,
  i64Instructions,
  f32Instructions,
  f64Instructions,
} from "./syntax.constants.js";

export function validateUI32(text: string): boolean {
  // Check if the string is a valid integer
  if (!/^-?\d+$/.test(text)) {
    return false;
  }
  let val = parseInt(text);
  return val >= 0 && val <= Math.pow(2, 32) - 1;
}

export function validateSI32(text: string): boolean {
  // Check if the string is a valid integer
  if (!/^-?\d+$/.test(text)) {
    return false;
  }
  let val = parseInt(text);
  return val >= -Math.pow(2, 31) && val <= Math.pow(2, 31) - 1;
}

export function validateUI64(text: string): boolean {
  // Check if the string is a valid integer
  if (!/^-?\d+$/.test(text)) {
    return false;
  }
  let val = parseInt(text);
  return val >= 0 && val <= Math.pow(2, 64) - 1;
}

export function validateSI64(text: string): boolean {
  // Check if the string is a valid integer
  if (!/^-?\d+$/.test(text)) {
    return false;
  }
  let val = parseInt(text);
  return val >= -Math.pow(2, 63) && val <= Math.pow(2, 63) - 1;
}

export function validateI32(text: string): boolean {
  return validateUI32(text) || validateSI32(text);
}

export function validateI64(text: string): boolean {
  return validateUI64(text) || validateSI64(text);
}

export function validateF32(text: string): boolean {
  // Check if the string is a valid float
  if (!/^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(text)) {
    return false;
  }
  let val = parseFloat(text);
  if (isNaN(val)) {
    return false;
  }
  return val >= -3.4028234663852886e38 && val <= 3.4028234663852886e38;
}

export function validateF64(text: string): boolean {
  // Check if the string is a valid float
  if (!/^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(text)) {
    return false;
  }
  let val = parseFloat(text);
  if (isNaN(val)) {
    return false;
  }
  return val >= -1.7976931348623157e308 && val <= 1.7976931348623157e308;
}

export function validateLabelIndex(text: string): boolean {
  return validateUI32(text);
}

export function validateLabelIndexVectorLabelIndex(text: string): boolean {
  return validateUI32(text);
}

export function validateFuncIndex(text: string): boolean {
  return validateUI32(text);
}

export function validateTypeIndex(text: string): boolean {
  return validateUI32(text);
}

export function validateLocalIndex(text: string): boolean {
  return validateUI32(text);
}

export function validateGlobalIndex(text: string): boolean {
  return validateUI32(text);
}

export function validateMemoryArgument(text: string, text2: string): boolean {
  return validateUI32(text) && validateUI32(text2);
}

export function validateInstructionWithArgs(text: string): boolean {
  let vals = text.split(" ");
  if (vals.length === 1) {
    return noArgInstructions.includes(vals[0] as any);
  } else if (vals.length === 2) {
    if (labelIndexInstructions.includes(vals[0] as any)) {
      return validateLabelIndex(vals[1] as any);
    } else if (
      labelIndexVectorLabelIndexInstructions.includes(vals[0] as any)
    ) {
      return validateLabelIndexVectorLabelIndex(vals[1] as any);
    } else if (funcIndexInstructions.includes(vals[0] as any)) {
      return validateFuncIndex(vals[1] as any);
    } else if (typeIndexInstructions.includes(vals[0] as any)) {
      return validateTypeIndex(vals[1] as any);
    } else if (localIndexInstructions.includes(vals[0] as any)) {
      return validateLocalIndex(vals[1] as any);
    } else if (globalIndexInstructions.includes(vals[0] as any)) {
      return validateGlobalIndex(vals[1] as any);
    } else if (i32Instructions.includes(vals[0] as any)) {
      return validateI32(vals[1] as any);
    } else if (i64Instructions.includes(vals[0] as any)) {
      return validateI64(vals[1] as any);
    } else if (f32Instructions.includes(vals[0] as any)) {
      return validateF32(vals[1] as any);
    } else if (f64Instructions.includes(vals[0] as any)) {
      return validateF64(vals[1] as any);
    } else {
      return false;
    }
  } else if (vals.length === 3) {
    return (
      memoryArgumentInstructions.includes(vals[0] as any) &&
      validateMemoryArgument(vals[1], vals[2])
    );
  } else {
    return false;
  }
}
