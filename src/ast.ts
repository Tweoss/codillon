import {
  instructions,
  noArgInstructions,
  labelIndexInstructions,
  funcIndexInstructions,
  typeIndexInstructions,
  localIndexInstructions,
  globalIndexInstructions,
  memoryArgumentInstructions,
  i32Instructions,
  i64Instructions,
  f32Instructions,
  f64Instructions,
  InstructionName,
  DataType,
  controlStartTypes,
  ControlStartTypes,
  controlEndTypes,
  dataTypes,
} from "./syntax.constants.js";
import { LineID, globalStates } from "./global_variables.js";

let counter = 0;
export function new_line_id(): LineID {
  return counter++;
}

export function get_cur_line_id(): LineID {
  return counter;
}

export type Location = { after: LineID } | "start";
export class AST {
  functions: Function[];
  constructor(functions: Function[]) {
    this.functions = functions;
  }
  // Assumes input is formatted by line correctly.
  static parse(initial_lines: [string, LineID][]): ParseResult<AST> {
    let lines = initial_lines;
    let functions: Function[] = [];
    // TODO: handle more parentheses stuff
    while (lines.length > 0) {
      const { result } = Function.take(lines);
      if (result.type == "error") return ParseResult.erase(result);
      const [f, remainder] = result.value;
      functions.push(f);
      lines = remainder;
    }
    return ParseResult.ok(new AST(functions));
  }
  // TODO: removing instruction
  update_line([content, id]: [string, LineID], save: boolean): boolean {
    if (this.place_control_flow([content, id], save)) return true;
    if (parseLocal([content, id])) return true;
    for (const f of this.functions) {
      if (f.span[0] == id) return content == "(func";
      if (f.span[1] == id) return content == ")";
      // TODO: other function entries.
      for (let [i, prev] of f.body.entries()) {
        if (prev.line != id) {
          continue;
        }
        const instruction = parseInstructionWithArgs([content, id]);
        if (instruction.result.type == "error") return false;
        if (save) f.body[i] = instruction.result.value;
        if (
          (controlStartTypes as Readonly<Array<string>>).includes(prev.name)
        ) {
          prev.name = content.split(" ")[0] as ControlStartTypes;
        }
        return true;
      }
    }
    return false;
  }
  place_control_flow(cur_line: [string, LineID], save: boolean) {
    const cur_function = this.get_containing_function(cur_line[1]);
    const lineContent = cur_line[0].split(" ");
    if (
      !cur_function ||
      !(controlStartTypes as readonly string[]).includes(lineContent[0])
    )
      return false;
    const label = lineContent[1] ?? undefined;
    const startInstruction: ControlFlowInstruction = {
      name: lineContent[0] as ControlStartTypes,
      line: cur_line[1],
      metadata: {
        endPos: get_cur_line_id() + 2,
      },
      body: [],
      ...(label !== undefined ? { label } : {}),
    };
    const endInstruction: Instruction = {
      name: "end" as InstructionName,
      line: get_cur_line_id() + 2,
    };
    const containingBlock = this.get_containing_block(
      cur_function.body,
      startInstruction.line,
    );
    const targetBody = containingBlock
      ? containingBlock.body
      : cur_function.body;
    if (save) {
      targetBody.push(startInstruction);
      targetBody.push(endInstruction);
    }
    const nameParts = cur_line[0].split(" ");
    if (nameParts[0] !== "if") {
      if (
        nameParts.length <= 1 ||
        !nameParts[1].startsWith("$") ||
        nameParts[1].length <= 1
      )
        return false;
      const labelResult = parseLabel(nameParts[1], startInstruction.line);
      if (labelResult.result.type === "ok") {
        startInstruction.label = labelResult.result.value;
      }
    }
    return true;
  }
  place_function(span: [LineID, LineID], save: boolean): boolean {
    const insideFunction = this.get_containing_function(span[0]);
    if (!insideFunction) {
      const curLineNumber = globalStates.lineIdToIndex.get(span[0]) as number;
      for (const [i, f] of this.functions.entries()) {
        if (
          curLineNumber > (globalStates.lineIdToIndex.get(f.span[1]) as number)
        ) {
          if (save)
            this.functions.splice(
              i + 1,
              0,
              new Function([], null, [], [], span),
            );
          return true;
        }
      }
    }
    return false;
  }
  // Returns whether or not the line is valid at that location in the AST.
  place_instruction(
    location: Location,
    line: [string, LineID],
    save: boolean,
  ): boolean {
    if (location == "start") return false;
    // TODO: make these lazily evaluated? maybe
    const local = parseLocal(line);
    if (local) {
      const ref = location.after;
      const curFunction = this.get_containing_function(ref);
      if (!curFunction) return false;
      const idx = curFunction.locals.findIndex((l) => l.name === local.name);
      if (save) {
        if (idx !== -1) {
          curFunction.locals[idx] = local;
        } else {
          curFunction.locals.push(local);
        }
      }
      return true;
    }
    const instruction = parseInstructionWithArgs(line);
    if (instruction.result.type === "error") return false;

    // TODO: don't linear search over whole document :D
    const ref = location.after;
    const curFunction = this.get_containing_function(ref);
    for (const f of this.functions) {
      if (ref == f.span[0]) {
        if (save) f.body.unshift(instruction.result.value);
        return true;
      }
      // TODO: params, results, locals
      let block = this.get_containing_block(f.body, line[1]);
      let targetBody = block ? block.body : f.body;
      if (block && block.line === ref) {
        if (save) targetBody.unshift(instruction.result.value);
        return true;
      }
      for (const [i, v] of targetBody.entries()) {
        if (v.line == ref && instruction.result.type == "ok") {
          if (save) targetBody.splice(i + 1, 0, instruction.result.value);
          return true;
        }
      }
      if (save) targetBody.push(instruction.result.value);
      return true;
    }
    return false;
  }
  // TODO: get types, stack, etc
  // get_info(line: LineID) {
  //   for (const f of this.functions) {
  //     if (f.span[0] == line) return { type: "start", function: f } as const;
  //     if (f.span[1] == line) return { type: "end", function: f } as const;
  //     for (const i of f.body.entries()) {
  //       if (i[0] == line) return { type: "instruction", function: f } as const;
  //     }
  //   }
  //   return null;
  // }
  get_containing_block(
    body: AllInstruction[],
    location: LineID,
  ): ControlFlowInstruction | null {
    const index = globalStates.lineIdToIndex.get(location) as number;
    for (const instr of body) {
      if ("metadata" in instr && instr.metadata?.endPos) {
        const startLine = globalStates.lineIdToIndex.get(instr.line) as number;
        const endLine = globalStates.lineIdToIndex.get(
          instr.metadata.endPos!,
        ) as number;
        if (instr.metadata.endPos && index > startLine && index < endLine) {
          const nestedBlock = this.get_containing_block(instr.body, location);
          return nestedBlock || instr;
        }
      }
    }
    return null;
  }
  get_containing_function(location: LineID): Function | null {
    const index = globalStates.lineIdToIndex.get(location) as number;
    for (const f of this.functions) {
      const startLine = globalStates.lineIdToIndex.get(f.span[0]) as number;
      const endLine = globalStates.lineIdToIndex.get(f.span[1]) as number;
      if (index >= startLine && index <= endLine) {
        return f;
      }
    }
    return null;
  }
  get_autocomplete(location: LineID, prefix: string) {
    const instructionList: readonly string[] =
      !prefix || this.get_containing_function(location)
        ? instructions
        : ["(func"];
    return instructionList.filter((instruction) =>
      prefix.startsWith(instruction.slice(0, prefix.length)),
    );
  }
}
export class Function {
  argument_types: { type: DataType; label?: string }[];
  return_type: DataType | null;
  locals: Local[];
  body: AllInstruction[];
  span: [LineID, LineID];

  constructor(
    argument_types: { type: DataType; label?: string | undefined }[],
    return_type: DataType | null,
    locals: Local[],
    body: AllInstruction[],
    span: [number, number],
  ) {
    this.argument_types = argument_types;
    this.return_type = return_type;
    this.locals = locals;
    this.body = body;
    this.span = span;
  }

  static take(
    lines: [string, LineID][],
  ): ParseResult<[Function, typeof lines]> {
    if (lines[0][0] != "(func")
      return ParseResult.err("expected opening (func", lines[0][1]);
    const start = lines.shift()!;
    const end_index = lines.findIndex(([s, _]) => s == ")");
    if (end_index == -1)
      return ParseResult.err(
        "expected closing ) for function",
        lines.at(-1)![1],
      );
    // TODO: parameters, result
    const functionLines = lines.slice(0, end_index);
    const remainder = lines.slice(end_index + 1);
    const end = lines[end_index];

    const locals: Local[] = [];
    const instructionLines: [string, LineID][] = [];
    for (const line of functionLines) {
      const local = parseLocal(line);
      if (local) {
        locals.push(local);
      } else {
        instructionLines.push(line);
      }
    }

    let body: AllInstruction[];
    try {
      [body] = parseBlock([...instructionLines]);
    } catch (e: any) {
      return ParseResult.err(e.message, start[1]);
    }

    return ParseResult.ok([
      new Function([], null, locals, body, [start[1], end[1]]),
      remainder,
    ]);
  }
}

export type Local = { name: string; type: DataType };
export type Instruction = { name: InstructionName; line: LineID };
export type InstructionWithLabel = Instruction & { label: string | number };
export type InstructionWithImmediate = Instruction & { argument: number };
export type AllInstruction =
  | Instruction
  | InstructionWithImmediate
  | InstructionWithLabel
  | ControlFlowInstruction;
export type ControlFlowInstruction = Instruction & {
  label?: string | number;
  metadata: {
    endPos?: LineID;
    elsePos?: LineID;
  };
  body: AllInstruction[];
};
type ResultType<T> =
  | { type: "error"; error: string; line: LineID }
  | { type: "ok"; value: T };
class ParseResult<T> {
  result: ResultType<T>;
  constructor(r: ResultType<T>) {
    this.result = r;
  }
  check(check: (v: T) => boolean, msg: string, line: LineID): ParseResult<T> {
    if (this.result.type == "error") return this;
    if (check(this.result.value)) {
      return this;
    }
    return ParseResult.err(msg, line);
  }
  check_narrow<S extends T>(
    check: (v: T) => v is S,
    msg: string,
    line: LineID,
  ): ParseResult<S> {
    this.map((v) => v as S);
    if (this.result.type == "error")
      return ParseResult.err(this.result.error, line);
    if (check(this.result.value)) {
      return ParseResult.ok(this.result.value);
    }
    return ParseResult.err(msg, line);
  }
  map<S>(mapper: (v: T) => S): ParseResult<S> {
    if (this.result.type == "error")
      return ParseResult.err(this.result.error, this.result.line);
    return ParseResult.ok(mapper(this.result.value));
  }
  // See https://www.haskell.org/tutorial/monads.html#:~:text=The%20bind%20operations%2C%20%3E%3E%20and%20%3E%3E=%2C%20combine%20two%20monadic%20values
  bind<S>(mapper: (v: T) => ParseResult<S>): ParseResult<S> {
    if (this.result.type == "error")
      return ParseResult.err(this.result.error, this.result.line);
    return mapper(this.result.value);
  }
  or<S>(other: ParseResult<S>): ParseResult<T | S> {
    // TODO: should this also capture multiple lines
    if (this.result.type == "error") {
      if (other.result.type == "error") {
        return ParseResult.err(
          this.result.error + ", " + other.result.error,
          this.result.line,
        );
      }
      return other;
    }
    return this;
  }

  static ok<T>(value: T): ParseResult<T> {
    return new ParseResult({ type: "ok", value });
  }
  static err<T>(msg: string, line: LineID): ParseResult<T> {
    return new ParseResult({ type: "error", error: msg, line });
  }
  static erase<S>(e: {
    type: "error";
    error: string;
    line: LineID;
  }): ParseResult<S> {
    return ParseResult.err(e.error, e.line);
  }
}
// Type safe `contains` on nested arrays
// e.g.
// ```
// const a = "c";
// const check = contains([["a", "b"], ["c"]])
// if (check(a)) {
//   // Here, a has type "a" | "b" | "c"
// }
// ```
function contains<T extends readonly (readonly string[])[]>(
  lists: T,
): (value: string) => value is T[number][number] {
  return ((value) => {
    for (const list of lists) {
      for (const v of list) {
        if (v == value) {
          return true;
        }
      }
    }
    return false;
  }) as (value: string) => value is T[number][number];
}

function parseIntegerRegex(text: string, line: LineID): ParseResult<number> {
  // Check if the string is a valid integer
  return ParseResult.ok(text)
    .check((t) => /^-?\d+$/.test(t), "invalid integer", line)
    .map(parseInt);
}

function parseFloatRegex(text: string, line: LineID): ParseResult<number> {
  return ParseResult.ok(text)
    .check(
      (t) => /^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t),
      "invalid float",
      line,
    )
    .map(parseFloat);
}

const BOUNDS = {
  ui32: [0, Math.pow(2, 32) - 1],
  si32: [-Math.pow(2, 31), Math.pow(2, 31) - 1],
  ui64: [0, Math.pow(2, 64) - 1],
  si64: [-Math.pow(2, 63), Math.pow(2, 63) - 1],
  f32: [-3.4028234663852886e38, 3.4028234663852886e38],
  f64: [-1.7976931348623157e308, 1.7976931348623157e308],
};
function valid_bounds(k: keyof typeof BOUNDS, v: number) {
  return BOUNDS[k][0] <= v && BOUNDS[k][1] >= v;
}
function parseUI32(text: string, line: LineID): ParseResult<number> {
  return parseIntegerRegex(text, line).check(
    (v) => valid_bounds("ui32", v),
    "ui32 out of range",
    line,
  );
}

function parseI32(text: string, line: LineID): ParseResult<number> {
  return parseIntegerRegex(text, line).check(
    (v) => valid_bounds("ui32", v) || valid_bounds("si32", v),
    "i32 integer out of range",
    line,
  );
}

function parseI64(text: string, line: LineID): ParseResult<number> {
  return parseIntegerRegex(text, line).check(
    (v) => valid_bounds("ui64", v) || valid_bounds("si64", v),
    "i64 integer out of range",
    line,
  );
}

function parseF32(text: string, line: LineID): ParseResult<number> {
  return parseFloatRegex(text, line).check(
    (v) => isNaN(v) || valid_bounds("f32", v),
    "f32 out of range",
    line,
  );
}

function parseF64(text: string, line: LineID): ParseResult<number> {
  return parseFloatRegex(text, line).check(
    (v) => isNaN(v) || valid_bounds("f64", v),
    "f64 out of range",
    line,
  );
}

function parseLabel(text: string, line: LineID): ParseResult<number | string> {
  // TODO: validate proper label name
  return ParseResult.ok(text)
    .check((t) => t.startsWith("$"), "label should start with $", line)
    .or(parseUI32(text, line));
}

function parseLocal(line: [string, LineID]): Local | null {
  const [text] = line;
  const parts = text.trim().split(/\s+/);
  if (parts.length === 3 && parts[0] === "local" && parts[1].startsWith("$")) {
    const name = parts[1];
    const type = parts[2] as DataType;
    if (!(dataTypes as Readonly<Array<string>>).includes(type)) {
      throw new Error(`invalid type at line ${line[1]}`);
    }
    return { name, type };
  }
  return null;
}

function parseBlock(
  lines: [string, LineID][],
): [AllInstruction[], [string, LineID][]] {
  const body: AllInstruction[] = [];
  let i = 0;
  while (i < lines.length) {
    const [text, line] = lines[i];
    const name = text.split(" ")[0];
    if (
      (controlEndTypes as Readonly<Array<string>>).includes(name) ||
      name === "(func"
    ) {
      break;
    }
    if (text.trim() === "") {
      i++;
      continue;
    }
    if ((controlStartTypes as Readonly<Array<string>>).includes(name)) {
      const startLine = lines[i];
      const nameParts = startLine[0].split(" ");
      let label: string | number | undefined = undefined;
      if (nameParts.length > 1) {
        const labelResult = parseLabel(nameParts[1], startLine[1]);
        if (labelResult.result.type === "ok") {
          label = labelResult.result.value;
        }
      }
      const [nestedBody, rest] = parseBlock(lines.slice(i + 1));
      if (
        rest.length === 0 ||
        !(controlEndTypes as Readonly<Array<string>>).includes(rest[0][0])
      ) {
        throw new Error(
          `Missing end for control flow starting at line ${startLine[1]}`,
        );
      }
      const endLine = rest[0];
      const controlInstr: ControlFlowInstruction = {
        name: nameParts[0] as ControlStartTypes,
        line: startLine[1],
        metadata: { endPos: endLine[1] },
        body: nestedBody,
        ...(label !== undefined ? { label } : {}),
      };
      body.push(controlInstr);
      const endInstr: Instruction = {
        name: endLine[0] as InstructionName,
        line: endLine[1],
      };
      body.push(endInstr);
      i += nestedBody.length + 2;
      continue;
    }
    const instrResult = parseInstructionWithArgs([text, line]);
    if (instrResult.result.type === "ok") {
      body.push(instrResult.result.value);
    }
    i++;
  }
  return [body, lines.slice(i)];
}

// TODO: handle vector label index
function parseInstructionWithArgs([text, line]: [
  string,
  LineID,
]): ParseResult<AllInstruction> {
  let vals = text.split(" ");
  const name = vals.at(0);
  if (!name) return ParseResult.err("missing instruction", line);
  if (
    vals.length === 1 &&
    // TODO: handle explicit memories
    ((noArgInstructions as Readonly<Array<string>>).includes(name) ||
      (memoryArgumentInstructions as Readonly<Array<string>>).includes(name))
  ) {
    return ParseResult.ok(name)
      .check_narrow(
        contains([noArgInstructions, memoryArgumentInstructions]),
        "invalid instruction",
        line,
      )
      .map(
        (name) =>
          ({
            line,
            name,
          }) satisfies Instruction,
      );
  }
  if (vals.length === 2) {
    // TODO: better error reporting when const fails to parse
    const matches = (
      [
        [i32Instructions, parseI32] as const,
        [i64Instructions, parseI64] as const,
        [f32Instructions, parseF32] as const,
        [f64Instructions, parseF64] as const,
      ] as const
    )
      .map(([instructions, parse]) =>
        ParseResult.ok(name)
          .check_narrow(
            contains([instructions]),
            "not a const instruction",
            line,
          )
          .bind((name) => {
            return parse(vals[1], line).map(
              (val) =>
                ({
                  line,
                  name,
                  argument: val,
                }) satisfies InstructionWithImmediate,
            );
          }),
      )
      .filter((y) => y.result.type == "ok");
    if (matches.length > 0) return matches[0];

    return ParseResult.ok(name)
      .check_narrow(
        contains([
          labelIndexInstructions,
          funcIndexInstructions,
          typeIndexInstructions,
          localIndexInstructions,
          globalIndexInstructions,
        ]),
        "invalid instruction with argument",
        line,
      )
      .bind((instruction) => {
        return parseLabel(vals[1], line).map(
          (label) =>
            ({
              line,
              name: instruction,
              label,
            }) satisfies InstructionWithLabel,
        );
      });
  }
  return ParseResult.err("unknown instruction", line);
}
