import puppeteer from "puppeteer-core";
import path from "path";

(async () => {
  const browserExecutablePath = process.argv.at(2);
  const usageString = `Usage: ${process.argv[0]} ${process.argv[1]} [browser-executable-path]`;
  if (!browserExecutablePath) {
    console.error(usageString);
    process.exit(1);
  }
  const browser = await puppeteer.launch({
    executablePath: browserExecutablePath,
    headless: true,
  });
  const page = await browser.newPage();
  page.on("console", (msg) =>
    console.log(
      "PAGE LOG:",
      msg.type(),
      msg.args(),
      msg.location(),
      msg.text(),
      msg.stackTrace(),
    ),
  );
  page.on("pagerror", (error) => console.log(error));
  page.on("requestfailed", (request) => {
    console.log(request.failure()?.errorText, request.url);
  });
  await page.goto("http://localhost:8080");
  await test_enter(page);
  await browser.close();
})();

// We should be able to enter two lines.
async function test_enter(page: puppeteer.Page) {
  await page.type(".line", "i32.const 1");
  await page.keyboard.press("Enter");
  await page.type(".line", "i32.const 2");
  assert((await page.$$(".line")).length == 2, "should now have two lines");
}

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

function assert(value: unknown, msg: string) {
  if (!value) {
    const error = new Error();
    const directory = path.resolve(path.dirname(""));
    const location = error
      .stack!.toString()
      .split(/\r\n|\n/)
      .slice(2)
      .map(
        (location) =>
          "  " + location.trim().replace(`file://${directory}/`, ""),
      )
      .join("\n");
    console.log(
      `${colors.fg.red}Failed assertion: ${msg} ${colors.reset} ${colors.bright}${colors.dim}\n${location}${colors.reset}`,
    );
  }
}
