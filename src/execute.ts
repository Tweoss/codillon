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
  DataType,
} from "./syntax.constants.js";

type StackValue = [DataType, number];

export class Execution {
  private stack: StackValue[] = [];
  private currentFunction: Function;
  private currentInstructionIndex: number = 0;
  private stackVisualization: HTMLElement;
  private lines: Line[] = [];
  // used to remove highlight from old line
  private oldLine: Line | null = null;
  private error: boolean = false;

  constructor(func: Function, stackVisualization: HTMLElement, lines_: Line[]) {
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
            .map((value) => `<div class="stack-item">${value}</div>`)
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

  private executeInstruction(
    instruction: Instruction | InstructionWithLabel | InstructionWithImmediate,
  ) {
    // First determine the instruction name and any arguments
    let name: InstructionName;

    name = instruction.name;

    console.log(instruction);

    // Handle numeric instructions
    if (i32Instructions.includes(name as any)) {
      this.stack.push(["i32", instruction.argument]);
    } else if (i64Instructions.includes(name as any)) {
      this.stack.push(["i64", instruction.argument]);
    } else if (f32Instructions.includes(name as any)) {
      this.stack.push(["f32", instruction.argument]);
    } else if (f64Instructions.includes(name as any)) {
      this.stack.push(["f64", instruction.argument]);
    } else if (noArgInstructions.includes(name as any)) {
      switch (name) {
        case "i32.add":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            console.log("a", a);
            console.log("b", b);
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] + b[1]]);
          }
          break;
        case "i32.sub":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] - b[1]]);
          }
          break;
        case "i32.mul":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] * b[1]]);
          }
          break;
        case "i32.div_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", Math.floor(a[1] / b[1])]);
          }
          break;
        case "i32.eq":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] === b[1] ? 1 : 0]);
          }
          break;
        case "i32.ne":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] !== b[1] ? 1 : 0]);
          }
          break;
        case "i32.lt_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] < b[1] ? 1 : 0]);
          }
          break;
        case "i32.gt_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] > b[1] ? 1 : 0]);
          }
          break;
        case "i32.le_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] <= b[1] ? 1 : 0]);
          }
          break;
        case "i32.ge_s":
          if (this.stack.length >= 2) {
            const b = this.stack.pop()!;
            const a = this.stack.pop()!;
            if (a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] >= b[1] ? 1 : 0]);
          }
          break;
        case "i32.eqz":
          if (this.stack.length >= 1) {
            const a = this.stack.pop()!;
            if (a[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(["i32", a[1] === 0 ? 1 : 0]);
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
            if (c[0] !== "i32" || a[0] !== "i32" || b[0] !== "i32") {
              this.error = true;
              return;
            }
            this.stack.push(c[1] !== 0 ? a : b);
          }
          break;
        default:
          console.log("Unhandled instruction:", name);
          // For now, treat all other instructions as nops
          break;
      }
    }
  }

  step(): boolean {
    if (
      this.currentInstructionIndex >= this.currentFunction.body.length ||
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
