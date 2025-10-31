
const { expect } = require('@playwright/test');

class TopPerformersPage {
    constructor(page) {
        this.page = page;
        this.topPerformersTab = page.locator('//a[@href="/topPerformers"]');
        this.topPerformersHeader = page.locator('//*[@class="text-xl font-[600]"]');
        this.addButton = page.locator('//button[@class="ml-3 mr-1 py-2 px-4 rounded-lg app-blue bg-app-blue hover:bg-blue-700 text-white font-semibold"]');
        this.addPopupHeader = page.locator('//*[@class="text-xl font-bold ml-2"]');
        this.dropdown = page.getByRole('combobox');
        this.saveButton = page.locator('#body-scroll').getByRole('button', { name: 'Save' });
        this.searchBox = page.getByRole('textbox', { name: 'Search' });
    }

    async openTopPerformers() {
        await this.topPerformersTab.click();
        await expect(this.topPerformersHeader).toBeVisible({ timeout: 10000 });
    }

    async addPerformer(optionValue) {
        await this.addButton.click();
        await expect(this.addPopupHeader).toBeVisible({ timeout: 10000 });
        await this.dropdown.selectOption(optionValue);
        await this.saveButton.click();
    }

    async searchPerformer(name) {
        await this.searchBox.click();
        await this.searchBox.fill(name);
        await this.searchBox.press('Enter');
        // wait for the correct row that contains the performer
        const performerRow = this.page.locator('table >> tbody >> tr').filter({
            has: this.page.getByText(name, { exact: false })
        });

        await expect(performerRow).toBeVisible({ timeout: 10000 });
    }
}

module.exports = { TopPerformersPage };



