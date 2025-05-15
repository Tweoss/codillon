import puppeteer, { Page } from "puppeteer-core";
import { assert_b, assert_eq, passed, sleep, wait_for_stdin } from "./lib.ts";

async function main() {
  const browserExecutablePath = process.argv.at(2);
  const usageString = `Usage: ${process.argv[0]} ${process.argv[1]} [browser-executable-path]`;
  if (!browserExecutablePath) {
    console.error(usageString);
    process.exit(1);
  }
  const extraArgs = (process.env.CHROME_ARGS ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const browser = await puppeteer.launch({
    executablePath: browserExecutablePath,
    headless: process.env.CI ? true : false,
    waitForInitialPage: false,
    args: ["--no-startup-window", ...extraArgs],
  });
  const new_page = async () => {
    const page = await browser.newPage();
    await page.goto("http://localhost:8080");
    return page;
  };
  const page = await new_page();
  await test_enter(page);

  await test_invalid_enter(await new_page());
  await browser.close();
  process.exit(0);
}
main();

async function type_line(page: Page, index: number, text: string) {
  await (await page.waitForSelector(
    `#content-editor div:nth-of-type(${index})`,
  ))!.type(text);
}

// We should be able to enter two lines.
async function test_enter(page: Page) {
  // This refocuses the page somehow.
  await page.keyboard.press("Enter");
  await type_line(page, 1, "\n");
  // Our code takes a bit of time to run after we insert a new line.
  await sleep(10);
  await type_line(page, 2, "i32.const 1\n");
  await sleep(10);
  await type_line(page, 3, "i32.const 2");
  const elements = await Promise.all(
    await page
      .$$("div.line .block-container:not(.empty)")
      .then((els) => els.map((el) => el.evaluate((el) => el.innerText))),
  );
  if (
    assert_eq(elements, [
      "(func",
      "i32.const 1",
      "i32.const 2",
      ")",
      "(func",
      ")",
    ])
  )
    passed("entering two lines");
  else await wait_for_stdin("debugging");
}

// We should be able not be able to enter an invalid line.
async function test_invalid_enter(page: Page) {
  await page.keyboard.press("Enter");
  await type_line(page, 1, "\n");
  await sleep(10);
  await type_line(page, 2, "invalid text\n");
  const elements = await Promise.all(
    await page
      .$$("div.line .block-container:not(.empty)")
      .then((els) => els.map((el) => el.evaluate((el) => el.innerText))),
  );
  if (
    assert_eq(
      elements,
      ["(func", "invalid text", ")", "(func", ")"],
      "should have kept text",
    )
  )
    passed("entering invalid line");
  else await wait_for_stdin("debugging");
}
