const { chromium } = require('@playwright/test');
const TestData = require('./TestData/DirAgentServices.json');

module.exports = async () => {
    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized', '--force-device-scale-factor=0.70']
    });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    await page.goto('https://qa.procasaonboard.com/login');
    await page.waitForSelector('input[name=email]', { state: 'visible', timeout: 15000 });
    await page.fill('input[name=email]', TestData.login.username);
    await page.fill('input[name=password]', TestData.login.password);
    await page.waitForSelector('button[type=submit]:not([disabled])', { timeout: 30000 });
    await page.click('button[type=submit]');
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 60000 });

    await context.storageState({ path: 'auth.json' });
    await browser.close();
    console.log('✓ Logged in — auth state saved to auth.json');
};
