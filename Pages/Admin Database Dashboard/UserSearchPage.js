const { expect } = require('@playwright/test');

class UserSearchPage {
    constructor(page) {
        this.page = page;
        this.loader = page.locator('div.absolute.bg-white.bg-opacity-60');
        this.searchInput = page.locator('//*[@placeholder="Search Agent Name"]');
        this.searchButton = page.locator('//*[@class="h-[44px] text-[#0000FE] text-center inline-flex items-center"]');
        this.filterButton = page.locator('//*[@class="filter-button"]');
        this.filterPanel = page.locator('//*[contains(@class,"flex") and contains(@class,"justify-between") and contains(@class,"sticky") and contains(@class,"top-0")]');
        this.marketCenterDropdown = page.getByRole('combobox').nth(1);
        this.onboardingstage = page.locator('//input[@id="Completed"]');
        this.productionlevel = page.locator('//input[@id="Mega"]');
        this.desicgnation = page.locator('//input[@id="Commercial"]');
        this.applyFilterButton = page.locator('//*[@class="btn py-1 px-4 rounded-lg app-blue bg-[#0000FE] hover:bg-[#0000F0] text-white font-semibold"]');
        this.marketCenterCells = page.locator('table >> tr >> td:nth-child(4)');
        this.clearFilterButton = page.locator('//*[@class="bg-white px-2 w-20 text-[#0000FE] font-semibold"]');
        this.closeFilterButton = page.locator('//*[contains(@class,"sticky") and contains(@class,"top-0")]//button').first();
    }

    async waitForLoader() {
        try { await this.loader.first().waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.loader.first().waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
        await this.page.locator('div.absolute.bg-white.bg-opacity-60.z-10').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    }

    async searchUser(name) {
        await this.searchInput.click();
        await this.searchInput.fill(name);
        await this.searchButton.click();
        await this.waitForLoader();
        const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        await expect(this.page.getByText(regex).first()).toBeVisible({ timeout: 15000 });
    }

    async openFilters() {
        await this.filterButton.click();
        await this.waitForLoader();
        await expect(this.filterPanel).toBeVisible();
    }

    async applyMarketCenterFilter(value) {
        await this.marketCenterDropdown.selectOption(value);
        await this.waitForLoader();
        await this.applyFilterButton.click();
        await this.waitForLoader();
    }

    async clearFilters() {
        await this.filterButton.click();
        await this.waitForLoader();
        await this.clearFilterButton.click();
    }
}

module.exports = { UserSearchPage };
