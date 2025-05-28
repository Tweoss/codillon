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
} from "./syntax.constants.js";
import { LineID, globalStates } from "./global_variables.js";

let counter = 0;
export function new_line_id(): LineID {
  return counter++;
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
  place_control_flow(
    cur_function: Function | null | undefined,
    startInstruction: ControlFlowInstruction,
    endInstruction: Instruction,
  ): boolean {
    if (cur_function) {
      cur_function.body.push(startInstruction, endInstruction);
      const name = startInstruction.name.split(" ");
      if (name.length > 1) {
        const labelResult = parseLabel(name[1], startInstruction.line);
        if (labelResult.result.type === "ok") {
          ParseResult.ok({
            ...startInstruction,
            label: labelResult.result.value,
          });
        }
      }
      return true;
    }
    return false;
  }
  place_function(
    location: { after: LineID } | "start",
    span: [LineID, LineID],
    save: boolean,
  ): boolean {
    if (location == "start") {
      if (save) this.functions.unshift(new Function([], null, [], [], span));
      return true;
    }
    // Make sure location
    for (const [i, f] of this.functions.entries()) {
      if (location.after == f.span[1]) {
        if (save)
          this.functions.splice(i + 1, 0, new Function([], null, [], [], span));
        return true;
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
    if ((controlStartTypes as Readonly<Array<string>>).includes(line[0]))
      return true;
    const instruction = parseInstructionWithArgs(line);

    // TODO: don't linear search over whole document :D
    const ref = location.after;
    for (const f of this.functions) {
      if (ref == f.span[0] && instruction.result.type == "ok") {
        if (save) f.body.unshift(instruction.result.value);
        return true;
      }
      // TODO: params, results, locals
      for (const [i, v] of f.body.entries()) {
        if (v.line == ref && instruction.result.type == "ok") {
          if (save) f.body.splice(i + 1, 0, instruction.result.value);
          return true;
        }
      }
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
  get_containing_function(location: LineID): Function | null {
    const index = globalStates.lineIdToIndex.get(location) as number;
    for (const f of this.functions) {
      const startLine = globalStates.lineIdToIndex.get(f.span[0]) as number;
      const endLine = globalStates.lineIdToIndex.get(f.span[1]) as number;
      if (index > startLine && index < endLine) {
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
  locals: string[];
  body: (
    | Instruction
    | InstructionWithLabel
    | InstructionWithImmediate
    | ControlFlowInstruction
  )[];
  span: [LineID, LineID];

  constructor(
    argument_types: { type: DataType; label?: string | undefined }[],
    return_type: DataType | null,
    locals: string[],
    body: (
      | Instruction
      | InstructionWithImmediate
      | InstructionWithLabel
      | ControlFlowInstruction
    )[],
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
    const start = lines.splice(0, 1)[0];
    const end_index = lines.findIndex(([s, _]) => s == ")");
    if (end_index == -1)
      return ParseResult.err(
        "expected closing ) for function",
        lines.at(-1)![1],
      );
    // TODO: parameters, result

    const remainder = lines.splice(end_index + 1);
    const end = lines.splice(end_index, 1)[0];

    // Only return first error.
    const parsed_lines = lines
      .map(parseInstructionWithArgs)
      .reduce(
        (lines, next_result) =>
          lines.bind((l) => next_result.map((i) => l.concat([i]))),
        ParseResult.ok([] as typeof Function.prototype.body),
      );

    if (parsed_lines.result.type == "error")
      return ParseResult.err(
        parsed_lines.result.error,
        parsed_lines.result.line,
      );

    return ParseResult.ok([
      new Function([], null, [], parsed_lines.result.value, [start[1], end[1]]),
      remainder,
    ]);
  }
}

export type Instruction = { name: InstructionName; line: LineID };
export type InstructionWithLabel = Instruction & { label: string | number };
export type InstructionWithImmediate = Instruction & { argument: number };
export type ControlFlowInstruction = Instruction & {
  metadata: {
    endPos?: LineID;
    elsePos?: LineID;
  };
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

// TODO: handle vector label index
function parseInstructionWithArgs([text, line]: [string, LineID]): ParseResult<
  | Instruction
  | InstructionWithImmediate
  | InstructionWithLabel
  | ControlFlowInstruction
> {
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
