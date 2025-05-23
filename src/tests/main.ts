import puppeteer, { Page } from "puppeteer-core";
import { assert_b, assert_eq, passed, sleep, wait_for_stdin } from "./lib.ts";

const sleepDuration = 10;

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
  await test_integer_ops(await new_page());
  await test_float_ops(await new_page());
  await test_mixed_ops(await new_page());
  await test_bitwise_ops(await new_page());
  await browser.close();
  process.exit(0);
}
main();

async function next_line(page: Page) {
  await page.keyboard.press("Enter");
  await sleep(sleepDuration);
}

async function mult_step(page: Page, stepCount: number) {
  await (await page.waitForSelector(`#run-btn`))?.click();
  const stepBtn = await page.waitForSelector(`#step-over-btn`);
  for (let i = 0; i < stepCount; i++) {
    await stepBtn?.click();
  }
  await sleep(sleepDuration);
}

async function get_stack_items(page: Page) {
  return await page.$$eval(`#stack-items .stack-item`, (els) =>
    els.map((el) => el.textContent),
  );
}

async function type_line(page: Page, index: number, text: string) {
  await (await page.waitForSelector(
    `#content-editor div:nth-of-type(${index})`,
  ))!.type(text);
}

// We should be able to enter two lines.
async function test_enter(page: Page) {
  // This refocuses the page somehow.
  await (await page.waitForSelector(`.line:first-of-type`))?.click();
  // Our code takes a bit of time to run after we insert a new line.
  await next_line(page);
  await type_line(page, 2, "i32.const 1");
  await next_line(page);
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
  await (await page.waitForSelector(`.line:first-of-type`))?.click();
  await next_line(page);
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

async function test_integer_ops(page: Page) {
  await (await page.waitForSelector(`.line:first-of-type`))?.click();
  await next_line(page);
  await type_line(page, 2, "i32.const 4");
  await next_line(page);
  await type_line(page, 3, "i32.const 5");
  await next_line(page);
  await type_line(page, 4, "i32.add");
  await next_line(page);
  await type_line(page, 5, "i32.const 2");
  await next_line(page);
  await type_line(page, 6, "i32.mul");
  await mult_step(page, 5);
  const stackValues = await get_stack_items(page);
  if (
    assert_eq(stackValues, ["i32, 18"], "integer 4 + 5 then * 2 should be 18")
  )
    passed("integer arithmetic");
  else await wait_for_stdin("debugging");
}

async function test_float_ops(page: Page) {
  await (await page.waitForSelector(`.line:first-of-type`))?.click();
  await next_line(page);
  await type_line(page, 2, "f32.const 1.5");
  await next_line(page);
  await type_line(page, 3, "f32.const 2.25");
  await next_line(page);
  await type_line(page, 4, "f32.add");
  await next_line(page);
  await type_line(page, 5, "f32.sqrt");
  await mult_step(page, 4);
  const stackValues = await get_stack_items(page);
  const expected = Math.sqrt(1.5 + 2.25);
  if (
    assert_eq(
      stackValues,
      [`f32, ${expected}`],
      "float add + sqrt ≈ " + expected,
    )
  ) {
    passed("float operations");
  } else {
    await wait_for_stdin("debugging");
  }
}

async function test_mixed_ops(page: Page) {
  await (await page.waitForSelector(`.line:first-of-type`))?.click();
  await next_line(page);
  await type_line(page, 2, "i32.const 7");
  await next_line(page);
  await type_line(page, 3, "f32.convert_i32_s");
  await next_line(page);
  await type_line(page, 4, "f32.const 3.5");
  await next_line(page);
  await type_line(page, 5, "f32.mul");
  await mult_step(page, 4);
  const stackValues = await get_stack_items(page);
  const expected = 24.5;
  if (
    assert_eq(
      stackValues,
      [`f32, ${expected}`],
      "mixed int to float conversion and multiplication",
    )
  ) {
    passed("mixed int/float operations");
  } else {
    await wait_for_stdin("debugging");
  }
}

async function test_bitwise_ops(page: Page) {
  await (await page.waitForSelector(`.line:first-of-type`))?.click();
  await next_line(page);
  await type_line(page, 2, "i32.const 10");
  await next_line(page);
  await type_line(page, 3, "i32.const 12");
  await next_line(page);
  await type_line(page, 4, "i32.and");
  await next_line(page);
  await type_line(page, 5, "i32.const 1");
  await next_line(page);
  await type_line(page, 6, "i32.shl");
  await mult_step(page, 5);
  const stackValues = await get_stack_items(page);
  if (assert_eq(stackValues, ["i32, 16"], "bitwise AND then shl → 16")) {
    passed("bitwise operations");
  } else {
    await wait_for_stdin("debugging");
  }
}
