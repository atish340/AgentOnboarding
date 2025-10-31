const { test, expect } = require('@playwright/test');

test('LoginPage', async ({ page }) => {
    await page.goto('https://qa.procasaonboard.com/login')

    const PageTitle = await page.title();
    console.log(PageTitle)
    await expect(page).toHaveTitle('Login')

    const PageURL = await page.url();
    console.log(PageURL)
    await expect(page).toHaveURL('https://qa.procasaonboard.com/login')

    await page.close();

})