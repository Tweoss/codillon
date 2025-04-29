import puppeteer, { Page } from "puppeteer-core";
import { assert_b, assert_eq, passed } from "./lib.ts";

async function main() {
  const browserExecutablePath = process.argv.at(2);
  const usageString = `Usage: ${process.argv[0]} ${process.argv[1]} [browser-executable-path]`;
  if (!browserExecutablePath) {
    console.error(usageString);
    process.exit(1);
  }
  const browser = await puppeteer.launch({
    executablePath: browserExecutablePath,
    headless: false,
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
  process.exit(0);
}
main();

// We should be able to enter two lines.
async function test_enter(page: Page) {
  await page.type(".line", "i32.const 1");
  await page.keyboard.press("Enter");
  await (await page.evaluateHandle(() => document.activeElement))
    .asElement()
    ?.type("i32.const 2");
  const elements = await Promise.all(
    await page
      .$$("div.line")
      .then((els) => els.map((el) => el.evaluate((el) => el.textContent))),
  );
  if (
    assert_b(elements.length == 2, "should now have two lines") &&
    assert_eq(elements, ["i32.const 1", "i32.const 2"])
  )
    passed("entering two lines");
}
