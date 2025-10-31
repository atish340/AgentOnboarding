import { expect } from '@playwright/test';

export class UserSearchPage {
    constructor(page) {
        this.page = page;
        this.searchInput = page.locator('//*[@placeholder="Search Agent Name"]');
        this.searchButton = page.locator('//*[@class="h-[44px] text-[#0000FE] text-center inline-flex items-center"]');
        this.searchResult = page.locator('//*[@class="text-lg font-semibold flex relative"]');
        this.filterButton = page.locator('//*[@class="filter-button"]');
        this.filterPanel = page.locator('//*[@class="flex justify-between items-center sticky top-0 bg-white"]');
        this.marketCenterDropdown = page.getByRole('combobox').nth(1);
        this.onboardingstage = page.locator('//input[@id="Completed"]');
        this.productionlevel = page.locator('//input[@id="Mega"]');
        this.desicgnation = page.locator('//input[@id="Commercial"]');
        this.applyFilterButton = page.locator('//*[@class="btn py-1 px-4 rounded-lg app-blue bg-[#0000FE] hover:bg-[#0000F0] text-white font-semibold"]');
        this.marketCenterCells = page.locator('table >> tr >> td:nth-child(4)');
        this.clearFilterButton = page.locator('//*[@class="bg-white px-2 w-20 text-[#0000FE] font-semibold"]');
        this.closeFilterButton = page.locator('//*[@id="body-scroll"]/div[2]/div/div[2]/div[2]/div/div/div/div[1]/button');
    }

    async searchUser(name) {
        await this.searchInput.click();
        await this.searchInput.fill(name);
        await this.searchButton.click();
        await expect(this.searchResult).toHaveText(name);
    }

    async openFilters() {
        await this.filterButton.click();
        await expect(this.filterPanel).toBeVisible();
    }

    async applyMarketCenterFilter(value) {
        await this.marketCenterDropdown.selectOption(value);
        await this.onboardingstage.check();
        await this.productionlevel.check();
        await this.desicgnation.check();
        await this.applyFilterButton.click();
        await expect(this.marketCenterCells).toHaveText(
            Array(await this.marketCenterCells.count()).fill(value)
        );
    }

    async clearFilters() {
        await this.filterButton.click();
        await this.clearFilterButton.click();

        // Wait for the close button to be visible and enabled
        await this.closeFilterButton.waitFor({ state: 'visible', timeout: 10000 });

        // Ensure no overlay is blocking clicks
        await this.page.waitForSelector('div[data-v-83fa6d73].absolute', { state: 'detached', timeout: 10000 });

        // Now click safely
        await this.closeFilterButton.click();
    }
}
