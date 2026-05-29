// this.navigateToMyProfile = page.locator('//a[@href="/faq"]').click();
// this.verifyPageTitle = page.locator('//*[@class="font-bold text-xl text-black mb-4"]').toHaveText('FAQ');
// this.expandFaq = page.locator('//*[@class="ml-4 h-4 w-4 cursor-pointer"]').nth(0).click()
// //again i want click same button to close expanded faq after reading around 5 sec 

const { expect } = require('@playwright/test');

class FaqPage {
    constructor(page) {
        this.page = page;

        // LOCATORS (unchanged)
        this.navigateToMyProfile = page.locator('//a[@href="/faq"]');
        this.pageTitle = page.locator('//*[@class="font-bold text-xl text-black mb-4"]');
        this.expandFaq = page
            .locator('//*[@class="ml-4 h-4 w-4 cursor-pointer"]')
            .nth(0);
    }

    async navigateToFaq() {
        await this.navigateToMyProfile.click();
    }

    async verifyFaqPageTitle() {
        await expect(this.pageTitle).toHaveText('FAQ');
    }

    async expandFaqReadAndClose() {
        // 1. Expand immediately
        await this.expandFaq.click();

        // 2. Wait 5 seconds for reading
        await this.page.waitForTimeout(2000);

        // 3. Collapse using same button
        await this.expandFaq.click();
    }
}

module.exports = { FaqPage };