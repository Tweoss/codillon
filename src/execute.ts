import {
  AST,
  Function,
  Instruction,
  InstructionWithLabel,
  InstructionWithImmediate,
} from "./ast.js";
import { Line } from "./line.js";
import {
  noArgInstructions,
  i32Instructions,
  i64Instructions,
  f32Instructions,
  f64Instructions,
  InstructionName,
} from "./syntax.constants.js";

type StackValue = number;

export class Execution {
  private stack: StackValue[] = [];
  private currentFunction: Function;
  private currentInstructionIndex: number = 0;
  private stackVisualization: HTMLElement;
  private lines: Line[] = [];
  // used to remove highlight from old line
  private oldLine: Line | null = null;

  constructor(func: Function, stackVisualization: HTMLElement, lines_: Line[]) {
    this.currentFunction = func;
    this.stackVisualization = stackVisualization;
    this.updateStackVisualization();
    this.lines = lines_;
  }

  private getLineById(id: number): Line | null {
    return this.lines.find((line) => line().line_id === id) ?? null;
  }

  private updateStackVisualization() {
    const stackItems = this.stackVisualization.querySelector("#stack-items")!;
    stackItems.innerHTML = this.stack
      .map((value) => `<div class="stack-item">${value}</div>`)
      .join("");
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

  private executeInstruction(
    instruction: Instruction | InstructionWithLabel | InstructionWithImmediate,
  ) {
    // First determine the instruction name and any arguments
    let name: InstructionName;
    let immediate: number | undefined;

    if ("label" in instruction) {
      name = instruction.name;
      // For now, ignore labels
    } else if ("immediate" in instruction) {
      name = instruction.name;
      // Convert immediate to number if it's a numeric instruction
      if (typeof instruction.immediate === "number") {
        immediate = instruction.immediate;
      } else if (
        typeof instruction.immediate === "string" &&
        !isNaN(Number(instruction.immediate))
      ) {
        immediate = Number(instruction.immediate);
      }
    } else {
      name = instruction.name;
    }

    // Handle numeric instructions
    if (i32Instructions.includes(name as any)) {
      if (immediate !== undefined) {
        this.stack.push(immediate);
      }
    } else if (i64Instructions.includes(name as any)) {
      // For now, treat i64 as i32
      if (immediate !== undefined) {
        this.stack.push(immediate);
      }
    } else if (
      f32Instructions.includes(name as any) ||
      f64Instructions.includes(name as any)
    ) {
      // For now, treat floats as integers
      if (immediate !== undefined) {
        this.stack.push(immediate);
      }
    } else if (noArgInstructions.includes(name as any)) {
      switch (name) {
        case "i32.add":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a + b);
          }
          break;
        case "i32.sub":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a - b);
          }
          break;
        case "i32.mul":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a * b);
          }
          break;
        case "i32.div_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(Math.floor(a / b));
          }
          break;
        case "i32.eq":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a === b ? 1 : 0);
          }
          break;
        case "i32.ne":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a !== b ? 1 : 0);
          }
          break;
        case "i32.lt_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a < b ? 1 : 0);
          }
          break;
        case "i32.gt_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a > b ? 1 : 0);
          }
          break;
        case "i32.le_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a <= b ? 1 : 0);
          }
          break;
        case "i32.ge_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(a >= b ? 1 : 0);
          }
          break;
        case "i32.eqz":
          if (this.stack.length >= 1) {
            const a = this.stack.pop()!;
            this.stack.push(a === 0 ? 1 : 0);
          }
          break;
        case "drop":
          if (this.stack.length >= 1) {
            this.stack.pop();
          }
          break;
        case "select":
          if (this.stack.length >= 3) {
            const c = this.stack.pop()!;
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            this.stack.push(c !== 0 ? a : b);
          }
          break;
        default:
          // For now, treat all other instructions as nops
          break;
      }
    }
  }

  step(): boolean {
    if (this.currentInstructionIndex >= this.currentFunction.body.length) {
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
