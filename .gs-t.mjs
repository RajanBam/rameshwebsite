import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const FIX = '/tmp/claude-0/-home-user-rameshwebsite/226540f2-524f-52ac-92f1-f245459faa47/scratchpad/';
try {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log('page loaded');
  await browser.close();
} catch (e) {
  console.log('LAUNCH/GOTO ERROR:', String(e).split('\n')[0]);
}
