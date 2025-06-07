import {
  AST,
  Function,
  Instruction,
  InstructionWithLabel,
  InstructionWithImmediate,
} from "./ast.js";
import { Line } from "./line.js";
import {
  InstructionName,
  DataType,
  intTypes,
  floatTypes,
  dataTypes,
} from "./syntax.constants.js";

type StackValue = [DataType, number];

const _buf = new ArrayBuffer(8);
const _i32 = new Uint32Array(_buf);
const _f32 = new Float32Array(_buf);
const _i64 = new BigUint64Array(_buf);
const _f64 = new Float64Array(_buf);
const mask32 = 0xffffffff;
const mask64 = (1n << 64n) - 1n;

export class Execution {
  private static readonly instructionHandlers: Map<
    InstructionName,
    (exec: Execution, instruction?: any) => void
  > = new Map();
  private static initialized: boolean = false;
  private stack: StackValue[] = [];
  private currentFunction: Function;
  private currentInstructionIndex: number = 0;
  private stackVisualization: HTMLElement;
  private lines: Line[] = [];
  // used to remove highlight from old line
  private oldLine: Line | null = null;
  private error: boolean = false;

  constructor(func: Function, stackVisualization: HTMLElement, lines_: Line[]) {
    if (!Execution.initialized) {
      Execution.registerConstants();
      Execution.registerArithmeticOperations();
      Execution.registerComparisonOperations();
      Execution.registerBitwiseOperations();
      Execution.registerParametricOperations();
      Execution.registerConversionOperations();
      Execution.initialized = true;
    }
    this.currentFunction = func;
    this.stackVisualization = stackVisualization;
    this.lines = lines_;
    this.stack = [];
    // Initialize stack visualization
    const stackItems = this.stackVisualization.querySelector("#stack-items");
    if (stackItems) {
      stackItems.innerHTML = '<div class="stack-item">(empty stack)</div>';
    }
  }

  private static registerConstants() {
    dataTypes.forEach((type) => {
      const name = `${type}.const` as InstructionName;
      this.instructionHandlers.set(
        name,
        (exec, instruction: InstructionWithImmediate) => {
          exec.stack.push([type, instruction.argument]);
        },
      );
    });
  }

  private static registerArithmeticOperations() {
    const intOperations: Record<
      string,
      (a: number, b: number, type: DataType) => number
    > = {
      add: (a, b) => a + b,
      sub: (a, b) => a - b,
      mul: (a, b) => a * b,
      div_s: (a, b, type) => {
        if (b === 0) throw new Error("division by zero");
        if (type === "i32") return ((a >> 0) / (b >> 0)) >> 0;
        return Math.floor(a / b);
      },
      div_u: (a, b, type) => {
        a = a >>> 0;
        b = b >>> 0;
        if (b === 0) throw new Error("division by zero");
        if (type === "i32") return ((a >> 0) / (b >> 0)) >>> 0;
        return (a / b) >>> 0;
      },
      rem_s: (a, b) => a % b,
      rem_u: (a, b) => (a >>> 0) % (b >>> 0),
    };
    const floatOperations: Record<string, (a: number, b: number) => number> = {
      add: (a, b) => a + b,
      sub: (a, b) => a - b,
      mul: (a, b) => a * b,
      div: (a, b) => a / b,
      min: (a, b) => Math.min(a, b),
      max: (a, b) => Math.max(a, b),
      copysign: (a, b) => Math.sign(b) * Math.abs(a),
    };
    const floatUnaryOperations: Record<string, (a: number) => number> = {
      abs: Math.abs,
      neg: (a) => -a,
      ceil: Math.ceil,
      floor: Math.floor,
      trunc: Math.trunc,
      nearest: Math.round,
      sqrt: Math.sqrt,
    };
    this.registerTypedOperations(intTypes, intOperations, 2);
    this.registerTypedOperations(floatTypes, floatOperations, 2);
    this.registerTypedOperations(floatTypes, floatUnaryOperations, 1);
  }

  private static registerComparisonOperations() {
    const binaryComparisons: Record<string, (a: number, b: number) => boolean> =
      {
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
        lt_s: (a, b) => a < b,
        lt_u: (a, b) => a >>> 0 < b >>> 0,
        gt_s: (a, b) => a > b,
        gt_u: (a, b) => a >>> 0 > b >>> 0,
        le_s: (a, b) => a <= b,
        le_u: (a, b) => a >>> 0 <= b >>> 0,
        ge_s: (a, b) => a >= b,
        ge_u: (a, b) => a >>> 0 >= b >>> 0,
      };
    this.registerTypedOperations(dataTypes, binaryComparisons, 2, true);
    const unaryComparisons: Record<string, (a: number) => boolean> = {
      eqz: (a) => a === 0,
    };
    this.registerTypedOperations(intTypes, unaryComparisons, 1, true);
  }

  private static registerBitwiseOperations() {
    const binaryBitwiseOps: Record<string, (a: number, b: number) => number> = {
      and: (a, b) => a & b,
      or: (a, b) => a | b,
      xor: (a, b) => a ^ b,
      shl: (a, b) => a << (b & 31),
      shr_s: (a, b) => a >> (b & 31),
      shr_u: (a, b) => a >>> (b & 31),
      rotl: (a, b) => (a << (b & 31)) | (a >>> (32 - (b & 31))),
      rotr: (a, b) => (a >>> (b & 31)) | (a << (32 - (b & 31))),
    };
    const unaryBitwiseOps: Record<string, (a: number) => number> = {
      clz: (a) => Math.clz32(a),
      ctz: (a) => {
        if (a === 0) return 32;
        let count = 0;
        while ((a & 1) === 0) {
          count++;
          a >>>= 1;
        }
        return count;
      },
      popcnt: (a) => (a >>> 0).toString(2).split("1").length - 1,
      eqz: (a) => (a === 0 ? 1 : 0),
    };
    this.registerTypedOperations(intTypes, binaryBitwiseOps, 2);
    this.registerTypedOperations(intTypes, unaryBitwiseOps, 1);
  }

  private static registerParametricOperations() {
    this.instructionHandlers.set("drop", (exec) => {
      if (exec.stack.length < 1) {
        exec.error = true;
        return;
      }
      exec.stack.pop();
    });
    this.instructionHandlers.set("select", (exec) => {
      if (exec.stack.length < 3) {
        exec.error = true;
        return;
      }
      const c = exec.stack.pop()!;
      const b = exec.stack.pop()!;
      const a = exec.stack.pop()!;
      exec.stack.push(c[1] !== 0 ? a : b);
    });
  }

  private static registerTypedOperations(
    types: readonly DataType[],
    operations: Record<string, any>,
    operandCount: number,
    returnsBoolean = false,
  ) {
    types.forEach((type) => {
      Object.entries(operations).forEach(([op, handler]) => {
        const instruction = `${type}.${op}` as InstructionName;
        this.instructionHandlers.set(instruction, (exec) => {
          if (exec.stack.length < operandCount) {
            exec.error = true;
            return;
          }
          const operands = [];
          for (let i = 0; i < operandCount; i++) {
            const [ty, val] = exec.stack.pop()!;
            if (ty !== type) {
              exec.error = true;
              return;
            }
            operands.unshift(val);
          }
          try {
            const result = handler(...operands, type);
            const resultType = returnsBoolean ? "i32" : type;
            const resultValue = returnsBoolean ? (result ? 1 : 0) : result;
            exec.stack.push([resultType, resultValue]);
          } catch {
            exec.error = true;
          }
        });
      });
    });
  }

  private executeInstruction(
    instruction: Instruction | InstructionWithLabel | InstructionWithImmediate,
  ) {
    const handler = Execution.instructionHandlers.get(instruction.name);
    if (!handler) {
      console.log("Unhandled instruction:", instruction.name);
      return;
    }
    try {
      handler(this, instruction);
    } catch (error) {
      console.error("Error executing instruction:", error);
      this.error = true;
    }
  }

  private static registerConversionOperations() {
    const conversions: Record<
      string,
      { from: DataType; to: DataType[]; handler: (n: number) => number }
    > = {
      wrap_i64: {
        from: "i64",
        to: ["i32"],
        handler: (n: number) => n & mask32,
      },
      extend_i32_s: { from: "i32", to: ["i64"], handler: (n: number) => n },
      extend_i32_u: {
        from: "i32",
        to: ["i64"],
        handler: (n: number) => Number(BigInt(n) & mask64),
      },
      demote_f64: {
        from: "f64",
        to: ["f32"],
        handler: (n: number) => Math.fround(n),
      },
      promote_f32: { from: "f32", to: ["f64"], handler: (n: number) => n },
      trunc_f32_s: {
        from: "f32",
        to: ["i32"],
        handler: (n: number) => Math.trunc(n) >> 0,
      },
      trunc_f32_u: {
        from: "f32",
        to: ["i32"],
        handler: (n: number) => Math.trunc(n) >>> 0,
      },
      trunc_f64_s: {
        from: "f64",
        to: ["i32"],
        handler: (n: number) => Math.trunc(n) >> 0,
      },
      trunc_f64_u: {
        from: "f64",
        to: ["i32"],
        handler: (n: number) => Math.trunc(n) >>> 0,
      },
      convert_i32_s: {
        from: "i32",
        to: ["f32", "f64"],
        handler: (n: number) => Math.fround(n >> 0),
      },
      convert_i32_u: {
        from: "i32",
        to: ["f32", "f64"],
        handler: (n: number) => Math.fround(n >>> 0),
      },
      convert_i64_s: {
        from: "i64",
        to: ["f32", "f64"],
        handler: (n: number) => Math.fround(n),
      },
      convert_i64_u: {
        from: "i64",
        to: ["f32", "f64"],
        handler: (n: number) => Math.fround(n),
      },
      reinterpret_i32: {
        from: "i32",
        to: ["f32"],
        handler: (n: number) => {
          _i32[0] = n >> 0;
          return _f32[0];
        },
      },
      reinterpret_i64: {
        from: "i64",
        to: ["f64"],
        handler: (n: number) => {
          _i64[0] = BigInt(n);
          return _f64[0];
        },
      },
      reinterpret_f32: {
        from: "f32",
        to: ["i32"],
        handler: (n: number) => {
          _f32[0] = n;
          return _i32[0] >> 0;
        },
      },
      reinterpret_f64: {
        from: "f64",
        to: ["i64"],
        handler: (n: number) => {
          _f64[0] = n;
          return Number(_i64[0]);
        },
      },
    };
    Object.entries(conversions).forEach(([op, { from, to, handler }]) => {
      to.forEach((t) => {
        const instruction = `${t}.${op}` as InstructionName;
        this.instructionHandlers.set(instruction, (exec) => {
          if (exec.stack.length < 1) {
            exec.error = true;
            return;
          }
          const [ty, val] = exec.stack.pop()!;
          if (ty !== from) {
            exec.error = true;
            return;
          }
          exec.stack.push([t, handler(val)]);
        });
      });
    });
  }

  private getLineById(id: number): Line | null {
    return this.lines.find((line) => line().line_id === id) ?? null;
  }

  private updateStackVisualization() {
    console.log("Updating stack visualization");
    console.log("Current stack:", this.stack);
    const stackItems = this.stackVisualization.querySelector("#stack-items");
    console.log("Stack items element:", stackItems);
    if (!stackItems) {
      console.error("Could not find #stack-items element");
      return;
    }
    const html = this.error
      ? '<div class="stack-item">Error</div>'
      : this.stack.length === 0
        ? '<div class="stack-item">(empty stack)</div>'
        : [...this.stack]
            .map(
              (value) =>
                `<div class="stack-item">${value[0]}, ${value[1]}</div>`,
            )
            .join("");
    console.log("Generated HTML:", html);
    stackItems.innerHTML = html;
  }

  private highlightCurrentInstruction() {
    const lineId = this.currentFunction.body[this.currentInstructionIndex].line;
    console.log("Looking for line with ID:", lineId);
    console.log("All lines:", document.querySelectorAll(".line"));

    // Add highlight to current instruction
    const currentLine = this.getLineById(lineId);
    console.log("Found line:", currentLine);

    if (currentLine) {
      const container = currentLine().div;
      console.log("Found container:", container);
      if (container) {
        container.classList.add("executing");
        console.log("Added executing class to container");
      }
    }
    if (this.oldLine) {
      this.oldLine().div.classList.remove("executing");
    }
    this.oldLine = currentLine;
  }

  step(): boolean {
    if (
      this.currentInstructionIndex > this.currentFunction.body.length ||
      this.error
    ) {
      if (this.oldLine) {
        this.oldLine().div.classList.remove("executing");
      }
      return false; // Execution complete
    }

    const instruction = this.currentFunction.body[this.currentInstructionIndex];
    console.log("executing", instruction);
    this.highlightCurrentInstruction();
    this.executeInstruction(instruction);
    this.currentInstructionIndex++;
    this.updateStackVisualization();
    return true;
  }
}

export function createExecution(
  ast: AST,
  stackVisualization: HTMLElement,
  lines: Line[],
): Execution | null {
  if (ast.functions.length === 0) {
    return null;
  }
  return new Execution(ast.functions[0], stackVisualization, lines);
}
