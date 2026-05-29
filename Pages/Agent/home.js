// this.navigateToMyProfile = page.locator('//a[@href="/home"]').click();
// this.completedTask = page.locator('//*[@class="h-full col-span-1 cursor-pointer"]').nth(1).click()
// this.totalTask = page.locator('//*[@class="h-full col-span-1 cursor-pointer"]').nth(0).click()
// this.day1 = page.locator('//*[@class="relative group flex justify-between cursor-pointer items-center h-12"]').nth(0).click()
// const checkboxes = page.locator(
//     '//*[@class="sd-visuallyhidden sd-item__control sd-checkbox__control"]'
// );

// const count = await checkboxes.count();

// for (let i = 0; i < count; i++) {
//     await checkboxes.nth(i).click();
// }



const { expect } = require('@playwright/test');

class HomeTasksPage {
    constructor(page) {
        this.page = page;

        // Locators ONLY (as provided)
        this.navigateToMyProfile = page.locator('//a[@href="/home"]');
        this.completedTask = page.locator('//*[@class="h-full col-span-1 cursor-pointer"]').nth(1);
        this.totalTask = page.locator('//*[@class="h-full col-span-1 cursor-pointer"]').nth(0);
        this.day1 = page.locator(
            '//*[@class="relative group flex justify-between cursor-pointer items-center h-12"]'
        ).nth(0);
        this.day2 = page.locator(
            '//*[@class="relative group flex justify-between cursor-pointer items-center h-12"]'
        ).nth(1);
        this.checkboxes = page.locator(
            '//*[@class="sd-visuallyhidden sd-item__control sd-checkbox__control"]'
        );
        this.confirmation = page.locator('//*[@class="text-lg font-semibold text-center pt-4"]')
    }

    // Actions
    async navigateToHome() {
        await this.navigateToMyProfile.click();
    }

    async openCompletedTasks() {
        await this.completedTask.click();
    }

    async openTotalTasks() {
        await this.totalTask.click();
    }

    async openDay1() {
        await this.day1.click();

        // Wait until at least one checkbox appears
        await this.checkboxes.first().waitFor({ state: 'visible' });
    }
    async clickAllCheckboxesSequentially() {
        const count = await this.checkboxes.count();

        for (let i = 0; i < count; i++) {
            const checkbox = this.checkboxes.nth(i);

            // Ensure checkbox still exists before interacting
            await checkbox.waitFor({ state: 'attached' });

            // Force-check via DOM (BEST for visually hidden inputs)
            await checkbox.evaluate(el => {
                if (!el.checked) {
                    el.click();
                }
            });

            // Small wait to allow UI re-render
            await this.page.waitForTimeout(300);
        }
    }


}

module.exports = { HomeTasksPage };