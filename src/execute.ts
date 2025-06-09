import {
  AST,
  Function,
  Instruction,
  InstructionWithLabel,
  InstructionWithImmediate,
  AllInstruction,
} from "./ast.js";
import { Canvas } from "./canvas.js";
import { Line } from "./line.js";
import {
  InstructionName,
  DataType,
  intTypes,
  floatTypes,
  dataTypes,
  StackValue,
  labelIndexInstructions,
  localIndexInstructions,
} from "./syntax.constants.js";

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
  private instructionStack: { body: AllInstruction[]; index: number }[] = [];
  private currentBody: AllInstruction[] = [];
  private currentIndex: number = 0;
  private executedBranch: boolean = false;
  private locals: Map<string, StackValue> = new Map();
  private canvas: Canvas;

  constructor(
    func: Function,
    stackVisualization: HTMLElement,
    canvas: Canvas,
    lines_: Line[],
  ) {
    if (!Execution.initialized) {
      Execution.registerConstants();
      Execution.registerArithmeticOperations();
      Execution.registerComparisonOperations();
      Execution.registerBitwiseOperations();
      Execution.registerParametricOperations();
      Execution.registerConversionOperations();
      Execution.registerBranchOperations();
      Execution.registerLocalOperations();
      Execution.registerCallOperation();
      Execution.initialized = true;
    }
    this.currentFunction = func;
    this.stackVisualization = stackVisualization;
    this.lines = lines_;
    this.stack = [];
    this.canvas = canvas;
    // Initialize stack visualization
    const stackItems = this.stackVisualization.querySelector("#stack-items");
    if (stackItems) {
      stackItems.innerHTML = '<div class="stack-item">(empty stack)</div>';
    }
    this.currentBody = this.currentFunction.body;
    this.currentIndex = 0;
    this.instructionStack = [];
    this.locals = new Map<string, StackValue>();
    for (const loc of func.locals) {
      this.locals.set(loc.name, [loc.type, 0]);
    }
  }

  private afterStepCallback?: (
    exec: Execution,
    instruction: AllInstruction,
  ) => void;
  setAfterStepCallback(
    cb: (exec: Execution, instruction: AllInstruction) => void,
  ) {
    this.afterStepCallback = cb;
  }

  private static registerLocalOperations() {
    localIndexInstructions.forEach((instr) => {
      this.instructionHandlers.set(
        instr,
        (exec, instruction: InstructionWithLabel) => {
          const name = instruction.label as string;
          if (
            !exec.locals.has(name) ||
            (exec.stack.length < 1 &&
              (instr === "local.set" || instr === "local.tee"))
          ) {
            exec.error = true;
            return;
          }
          if (instr === "local.get") {
            exec.stack.push(exec.locals.get(name)!);
          } else if (instr === "local.set") {
            exec.locals.set(name, exec.stack.pop()!);
          } else if (instr === "local.tee") {
            const val = exec.stack[exec.stack.length - 1];
            exec.locals.set(name, val);
          }
        },
      );
    });
  }

  private static registerCallOperation() {
    this.instructionHandlers.set(
      "call",
      (exec, instruction: InstructionWithLabel) => {
        const name = instruction.label as string;
        if ((name != "$draw" || exec.stack.length < 2) && name != "$clear") {
          exec.error = true;
          return;
        }
        if (name == "$draw") {
          const x = exec.stack.pop()!;
          const y = exec.stack.pop()!;
          exec.canvas.plotPoints([[x[1], y[1]]]);
        } else if (name == "$clear") {
          exec.canvas.clear();
        }
      },
    );
  }

  private findBlockContextByLabel(
    label: string | number,
  ): { body: AllInstruction[]; index: number } | null {
    let stack = [
      ...this.instructionStack,
      { body: this.currentBody, index: this.currentIndex },
    ];
    for (let i = stack.length - 1; i >= 0; i--) {
      const { body } = stack[i];
      for (let j = 0; j < body.length; j++) {
        const instr = body[j];
        if (
          "label" in instr &&
          instr.label === label &&
          "metadata" in instr &&
          instr.metadata.endPos !== undefined
        ) {
          if (instr.name === "loop") {
            console.log("loop", instr.body);
            return { body: instr.body, index: 0 };
          } else if (instr.name === "block") {
            for (let k = j + 1; k < body.length; k++) {
              const maybeEnd = body[k];
              if (
                "line" in maybeEnd &&
                maybeEnd.line === instr.metadata.endPos
              ) {
                return { body, index: k + 1 };
              }
            }
          }
        }
      }
    }
    return null;
  }

  private static registerBranchOperations() {
    labelIndexInstructions.forEach((instr) => {
      this.instructionHandlers.set(
        instr,
        (exec, instruction: InstructionWithLabel) => {
          if (instr === "br_if") {
            if (exec.stack.length < 1) {
              exec.error = true;
              return;
            }
            const cond = exec.stack.pop()!;
            if (cond[1] === 0) {
              exec.executedBranch = false;
              return;
            }
          }
          const context = exec.findBlockContextByLabel(instruction.label);
          if (context) {
            exec.currentBody = context.body;
            exec.currentIndex = context.index;
            exec.executedBranch = true;
          } else {
            exec.error = true;
          }
          return;
        },
      );
    });
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
    if (!stackItems) {
      console.error("Could not find #stack-items element");
      return;
    }
    const html = this.error
      ? '<div class="stack-item">Error</div>'
      : this.stack.length === 0
        ? '<div class="stack-item">(empty stack)</div>'
        : [...this.stack]
            .slice()
            .reverse()
            .map(
              (value) =>
                `<div class="stack-item">${value[0]}, ${value[1]}</div>`,
            )
            .join("");
    stackItems.innerHTML = html;
  }

  private highlightCurrentInstruction(instruction: AllInstruction) {
    const lineId = instruction.line;
    console.log("Looking for line with ID:", lineId);
    console.log("All lines:", document.querySelectorAll(".line"));

    // Add highlight to current instruction
    const currentLine = this.getLineById(lineId);
    console.log("Found line:", currentLine);

    if (currentLine) {
      const container = currentLine().div;
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
      if (this.instructionStack.length > 0) {
        const prev = this.instructionStack.pop()!;
        this.currentBody = prev.body;
        this.currentIndex = prev.index;
        return this.step();
      }
      if (this.oldLine) {
        this.oldLine().div.classList.remove("executing");
      }
      return false; // Execution complete
    }

    const instruction = this.currentBody[this.currentIndex];
    if (!instruction) return false;
    console.log("executing", instruction);
    this.highlightCurrentInstruction(instruction);

    if ("body" in instruction && Array.isArray(instruction.body)) {
      this.instructionStack.push({
        body: this.currentBody,
        index: this.currentIndex + 1,
      });
      this.currentBody = instruction.body;
      this.currentIndex = 0;
      return this.step();
    }

    this.executedBranch = false;
    this.executeInstruction(instruction);
    if (this.afterStepCallback) {
      this.afterStepCallback(this, instruction);
    }
    if (!this.executedBranch) this.currentIndex++;
    if (
      instruction.name === "end" ||
      this.currentIndex >= this.currentBody.length
    ) {
      if (this.instructionStack.length > 0) {
        const prev = this.instructionStack.pop()!;
        this.currentBody = prev.body;
        this.currentIndex = prev.index;
        return this.step();
      }
      this.currentIndex++;
      return true;
    }
    this.updateStackVisualization();
    return true;
  }

  getStack(): StackValue[] {
    return this.stack;
  }
}

export function createExecution(
  ast: AST,
  stackVisualization: HTMLElement,
  lines: Line[],
  canvas: Canvas,
): Execution | null {
  if (ast.functions.length === 0) {
    return null;
  }
  return new Execution(ast.functions[0], stackVisualization, canvas, lines);
}
