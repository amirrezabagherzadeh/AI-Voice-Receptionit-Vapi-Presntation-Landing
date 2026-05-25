import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.env.AUDIT_URL || "http://127.0.0.1:5173";
const outputDir = "artifacts/ui-audit";

const viewports = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText,
    });
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({
    path: `${outputDir}/${viewport.name}.png`,
    fullPage: true,
  });

  const metrics = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const buttons = [...document.querySelectorAll("button")].map((button) => ({
      label: button.getAttribute("aria-label") || button.innerText.trim(),
      disabled: button.disabled,
      width: Math.round(button.getBoundingClientRect().width),
      height: Math.round(button.getBoundingClientRect().height),
    }));

    const focusable = [
      ...document.querySelectorAll(
        "a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])",
      ),
    ].map((element) => ({
      tag: element.tagName,
      label:
        element.getAttribute("aria-label") ||
        element.innerText?.trim() ||
        element.getAttribute("name") ||
        "",
    }));

    const viewportWidth = window.innerWidth;
    const overflowElements = [...document.querySelectorAll("*")]
      .filter((element) => !element.closest("[aria-hidden='true']"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className: String(element.className || "").slice(0, 100),
          text: element.innerText?.slice(0, 80) || "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.right > viewportWidth + 1 || item.left < -1)
      .slice(0, 12);

    return {
      title: document.title,
      hasMain: Boolean(document.querySelector("main")),
      h1Count: document.querySelectorAll("h1").length,
      hasBrand: bodyText.includes("Dubai Elite Investments"),
      hasPrompt: bodyText.includes("Start your call with AI Voice Receptionist"),
      hasTimer: bodyText.includes("0:00"),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      hasHorizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      buttons,
      focusable,
      overflowElements,
    };
  });

  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    label:
      document.activeElement?.getAttribute("aria-label") ||
      document.activeElement?.innerText?.trim() ||
      "",
  }));

  results.push({
    viewport,
    consoleErrors,
    failedRequests,
    firstFocus,
    metrics,
  });

  await page.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));
