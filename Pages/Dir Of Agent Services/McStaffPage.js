const { expect } = require('@playwright/test');

exports.McStaffPage = class McStaffPage {
    constructor(page) {
        this.page = page;
        this.mcStaffLink = page.locator('//a[@href="/mcstaff"]');
        this.pageTitle = page.locator('//*[@class="text-xl font-semibold"]');
        this.searchBox = page.locator(
            '//*[@class="input border border-transparent w-full pl-10 py-1.5 h-10 hover:border-gray-300 focus:border-blue-600 focus:outline-none"]'
        );
        this.searchResult = page.locator('//*[@class="text-base px-3 py-4 capitalize"]');
    }

    async navigateToMcStaff() {
        await this.mcStaffLink.click();
        await expect(this.pageTitle).toHaveText('MC Staff');
    }

    async searchStaff(name) {
        await this.searchBox.fill(name);
        await expect(this.searchResult).toHaveText(name);
    }
};
