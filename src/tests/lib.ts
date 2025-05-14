import { createInterface } from "readline";
import path from "path";

const DIRECTORY = path.resolve(path.dirname(""));

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    crimson: "\x1b[38m", // Scarlet
  },
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    gray: "\x1b[100m",
    crimson: "\x1b[48m",
  },
};

function get_location(level: number = 1): string[] {
  // Go up the call stack by 1 + level (in case we are in nested asserts).
  const error = new Error();
  const location = error
    .stack!.toString()
    .split(/\r\n|\n/)
    .slice(1 + level)
    .map((location) =>
      location
        .trim()
        .substring("at ".length)
        .replace(`file://${DIRECTORY}/`, "")
        .trim(),
    );
  return location;
}

export function passed(message: string) {
  console.log(
    `${colors.bright}${colors.fg.green}Passed test ${colors.reset}"${message}"${
      colors.bright
    }${colors.dim} at ${get_location()[1]}${colors.reset}`,
  );
}

export function assert_b(
  condition: boolean,
  msg: string = "",
  level: number = 1,
) {
  if (!condition) {
    const location = get_location(level + 1)
      .map((l) => "  at " + l)
      .join("\n");
    if (msg.length > 0) {
      msg = ": " + msg;
    }
    console.error(
      `${colors.bright}${colors.fg.red}Failed assertion${msg} ${colors.reset} ${colors.bright}${colors.dim}\n${location}${colors.reset}`,
    );
  }
  return condition;
}

function stringify<T>(obj: T): string {
  if (obj === undefined) {
    return "undefined";
  }
  return JSON.stringify(obj);
}

export function assert_eq<T>(a: T, b: T, msg: string = "", level: number = 1) {
  const a_json = stringify(a);
  const b_json = stringify(b);
  const limit = 80;
  let a_trimmed =
    a_json.length > limit ? a_json.substring(0, limit) + " ..." : a_json;
  let b_trimmed =
    b_json.length > limit ? b_json.substring(0, limit) + " ..." : b_json;
  return assert_b(
    a_json == b_json,
    `\n\t${a_trimmed} and ${b_trimmed} are not equal. \n\t` + msg,
    level + 1,
  );
}

export async function sleep(duration_ms: number) {
  await new Promise((e) => setTimeout(() => e(0), duration_ms));
}

export async function wait_for_stdin(
  prompt: string = "waiting for input",
): Promise<string> {
  // Skips waiting when in CI
  if (process.env.CI) {
    return Promise.resolve("");
  }
  const int = createInterface({ output: process.stdout, input: process.stdin });
  const loc = get_location(2);
  const line = await new Promise((r) =>
    int.question(`Paused at ${loc[0]}, ${prompt}: `, (l) => r(l)),
  );
  return line as string;
}
