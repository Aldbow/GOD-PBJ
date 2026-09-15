import { chromium } from 'playwright';

const OUT = 'C:/Users/User/AppData/Local/Temp/claude/c--Users-User-Documents-Aldiva-App-Project-PBJ-GOD/3cb9b6e9-65bf-4b28-aeb3-084a7a82bf0f/scratchpad/shots';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 900 }, storageState: undefined });
const page = await context.newPage();

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', 'admin@dewa-pbj.go.id');
await page.fill('input[name="password"]', 'AdminDewa#2026');
await page.click('button[type="submit"]');
await page.waitForURL('**/', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);

await page.screenshot({ path: `${OUT}/mobile-top.png` });

// Scroll to Komposisi tab bar area and screenshot
const komposisi = page.locator('#komposisi');
await komposisi.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/mobile-komposisi.png` });

// Click Metode tab to verify tab switching works
await page.locator('button:has-text("Metode")').first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/mobile-komposisi-metode.png` });

// Peringkat section with rank badges + search bar
const peringkat = page.locator('#peringkat');
await peringkat.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/mobile-peringkat.png` });

await browser.close();
