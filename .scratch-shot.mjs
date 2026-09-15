import { chromium } from 'playwright';

const OUT = 'C:/Users/User/AppData/Local/Temp/claude/c--Users-User-Documents-Aldiva-App-Project-PBJ-GOD/3cb9b6e9-65bf-4b28-aeb3-084a7a82bf0f/scratchpad/shots';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', 'admin@dewa-pbj.go.id');
await page.fill('input[name="password"]', 'AdminDewa#2026');
await page.click('button[type="submit"]');
await page.waitForURL('**/', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(4000);

await page.screenshot({ path: `${OUT}/desktop-light-top.png` });

// scroll through the whole page for a fuller look, then screenshot full page
await page.screenshot({ path: `${OUT}/desktop-light-full.png`, fullPage: true });

// Try toggling dark theme if a toggle exists
const themeToggle = page.locator('[aria-label*="tema" i], [aria-label*="theme" i], button:has-text("Dark"), button:has-text("Gelap")').first();
if (await themeToggle.count() > 0) {
  await themeToggle.click().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/desktop-dark-top.png` });
}

// Mobile viewport
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/mobile-full.png`, fullPage: true });

console.log('CONSOLE_ERRORS:', JSON.stringify(errors, null, 2));
console.log('URL after login:', page.url());

await browser.close();
