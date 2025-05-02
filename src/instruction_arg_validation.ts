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

function validateUI32(text: string): boolean {
  // Check if the string is a valid integer
  if (!/^-?\d+$/.test(text)) {
    return false;
  }
  let val = parseInt(text);
  return val >= 0 && val <= Math.pow(2, 32) - 1;
}

function validateSI32(text: string): boolean {
  // Check if the string is a valid integer
  if (!/^-?\d+$/.test(text)) {
    return false;
  }
  let val = parseInt(text);
  return val >= -Math.pow(2, 31) && val <= Math.pow(2, 31) - 1;
}

function validateUI64(text: string): boolean {
  // Check if the string is a valid integer
  if (!/^-?\d+$/.test(text)) {
    return false;
  }
  let val = parseInt(text);
  return val >= 0 && val <= Math.pow(2, 64) - 1;
}

function validateSI64(text: string): boolean {
  // Check if the string is a valid integer
  if (!/^-?\d+$/.test(text)) {
    return false;
  }
  let val = parseInt(text);
  return val >= -Math.pow(2, 63) && val <= Math.pow(2, 63) - 1;
}

function validateI32(text: string): boolean {
  return validateUI32(text) || validateSI32(text);
}

function validateI64(text: string): boolean {
  return validateUI64(text) || validateSI64(text);
}

function validateF32(text: string): boolean {
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

function validateF64(text: string): boolean {
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

function validateLabelIndex(text: string): boolean {
  return validateUI32(text);
}

function validateLabelIndexVectorLabelIndex(text: string): boolean {
  return validateUI32(text);
}

function validateFuncIndex(text: string): boolean {
  return validateUI32(text);
}

function validateTypeIndex(text: string): boolean {
  return validateUI32(text);
}

function validateLocalIndex(text: string): boolean {
  return validateUI32(text);
}

function validateGlobalIndex(text: string): boolean {
  return validateUI32(text);
}

function validateMemoryArgument(text: string, text2: string): boolean {
  return validateUI32(text) && validateUI32(text2);
}

export function validateInstructionWithArgs(text: string): boolean {
  let vals = text.split(" ");
  if (vals.length === 1) {
    return noArgInstructions.includes(vals[0]);
  } else if (vals.length === 2) {
    if (labelIndexInstructions.includes(vals[0])) {
      return validateLabelIndex(vals[1]);
    } else if (labelIndexVectorLabelIndexInstructions.includes(vals[0])) {
      return validateLabelIndexVectorLabelIndex(vals[1]);
    } else if (funcIndexInstructions.includes(vals[0])) {
      return validateFuncIndex(vals[1]);
    } else if (typeIndexInstructions.includes(vals[0])) {
      return validateTypeIndex(vals[1]);
    } else if (localIndexInstructions.includes(vals[0])) {
      return validateLocalIndex(vals[1]);
    } else if (globalIndexInstructions.includes(vals[0])) {
      return validateGlobalIndex(vals[1]);
    } else if (i32Instructions.includes(vals[0])) {
      return validateI32(vals[1]);
    } else if (i64Instructions.includes(vals[0])) {
      return validateI64(vals[1]);
    } else if (f32Instructions.includes(vals[0])) {
      return validateF32(vals[1]);
    } else if (f64Instructions.includes(vals[0])) {
      return validateF64(vals[1]);
    } else {
      return false;
    }
  } else if (vals.length === 3) {
    return (
      memoryArgumentInstructions.includes(vals[0]) &&
      validateMemoryArgument(vals[1], vals[2])
    );
  } else {
    return false;
  }
}
