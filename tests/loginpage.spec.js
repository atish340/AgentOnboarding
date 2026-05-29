const { test, expect } = require('@playwright/test');
const TestData = require('../TestData/adminlogin.json');
const { LoginPage } = require('../Pages/Login/Login');

test.describe('Login Page Tests', () => {
    test('should display correct login header', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        const headerText = await loginPage.getLoginHeaderText();
        expect(headerText).toBe('Log In');
    });

    test('should not log in with invalid credentials', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.enterEmail(TestData.invalidUser.email);
        await loginPage.enterPassword(TestData.invalidUser.password);
        await loginPage.clickLoginButton();
        // Wait for navigation or response after login click
        await page.waitForTimeout(1000); // Adjust timeout as needed
        // Add assertion for error message or redirection
        // const toaster = await page.locator('//*[@id="hrwy7ub"]/div[1]');
        // console.log('Toaster message:', toaster);
        // await expect(page.locator('//*[@id="hrwy7ub"]/div[1]')).toBeVisible();
    });

    test('should allow navigation to forgot password', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.clickForgotPassword();
        await page.locator('//*[@id="__nuxt"]/div/div/form/div/div/div[2]/input').fill(TestData.validUser.fpemail)
        await page.locator('button[type="submit"]').click();
        await page.locator('//*[@id="__nuxt"]/div/div/div/div/div[2]/p[2]/a').click();
        // Wait for the URL to match the expected value
        await expect(page).toHaveURL(TestData.URL.url_1, { timeout: 10000 });
    });

    test('should not log in with empty fields', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.clickLoginButton();
        // Wait for navigation or response after login click
        await page.waitForTimeout(1000); // Adjust timeout as needed
        // Add assertion for validation messages
        await expect(page.locator('//*[@id="__nuxt"]/div/div/div[2]/div[1]/form/div[1]/span')).toBeVisible();
        await expect(page.locator('#__nuxt > div > div > div.flex.items-center.justify-center.min-h-screen.bg-white.flex-col > div.w-full.max-w-md.mx-auto.p-6 > form > div.mb-3 > span')).toBeVisible();
    });

    test('login with valid emailId and password', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.enterEmail(TestData.validUser.email);
        await loginPage.enterPassword(TestData.validUser.password);
        await loginPage.clickLoginButton();
        await expect(page).toHaveURL(TestData.URL.url_2, { timeout: 30000 });
    });
});