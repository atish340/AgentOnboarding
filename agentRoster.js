const { expect } = require('@playwright/test');

class AgentRosterPage {
    constructor(page) {
        this.page = page;
        this.agentRosterLink = page.locator('//a[@href="/viewAgent"]');
        this.pageTitle = page.locator('//*[@class="flex flex-row items-center justify-between pb-4"]');
        this.downloadPdfButton = page.locator('//button[@class="px-4 py-2 bg-[#0000FE] text-white rounded-lg hover:bg-blue-700 flex items-center h-10"]');
        this.applyFilterButton = page.locator('//button[contains(text(),"Apply Filter")]');
        this.agentNameInput = page.locator('//input[@id="agentName"]');
        this.applyButton = page.locator('//button[@class="px-4 py-2 rounded-md bg-blue-600 text-white"]');
        this.agentNameResult = page.locator('//*[@class="whitespace-nowrap px-3 py-4 text-md"]').first();
        this.resetFilterButton = page.locator('//button[contains(@class,"border-gray-400")]');
        this.closeFilterButton = page.locator('//button[@class="btn btn-sm btn-circle btn-ghost"]').first();
    }

    async navigateToAgentRoster() {
        await this.agentRosterLink.click();
    }

    async verifyPageTitle() {
        await expect(this.pageTitle).toHaveText('Agent Roster');
    }

    async applyFilter() {
        await this.applyFilterButton.click();
    }

    async searchByName(name) {
        await this.agentNameInput.fill(name);
        await this.applyButton.click();
    }

    async verifySearchName(name) {
        await expect(this.agentNameResult).toHaveText(name);
    }

    async viewAgentProfile() {
        const beforeUrl = this.page.url();
        await this.agentNameResult.click();

        const navigated = await this.page.waitForURL(
            url => url.href !== beforeUrl, { timeout: 6000 }
        ).then(() => true).catch(() => false);

        if (navigated) {
            console.log(`>>> Agent profile opened: ${this.page.url()}`);
            await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            await this.page.goBack();
            await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        } else {
            // Row click opens a panel in-page — close it and continue
            console.log(`>>> Agent profile panel opened (no navigation) — closing`);
            await this.page.keyboard.press('Escape').catch(() => {});
        }
    }

    async downloadPdf() {
        await this.downloadPdfButton.click();
    }
}

module.exports = { AgentRosterPage };
