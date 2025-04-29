import puppeteer from "puppeteer-core";

(async () => {
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
  await new Promise((r) => setTimeout(() => r(0), 3000));
  // other actions...
  await browser.close();
})();
