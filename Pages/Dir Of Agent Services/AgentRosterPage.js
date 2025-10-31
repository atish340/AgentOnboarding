const { expect } = require('@playwright/test');

exports.AgentRosterPage = class AgentRosterPage {
    constructor(page) {
        this.page = page;

        this.agentRosterLink = page.locator('//a[@href="/viewAgent"]');
        this.pageTitle = page.locator('//*[@class="text-left font-bold text-xl"]');
        this.applyfilterButton = page.locator('///button[@class="ml-3 py-1 px-4 rounded-lg app-blue bg-[#0000FE] hover:bg-[#0000F0] text-white font-semibold"]');
        this.searchByAgentName = page.locator('//input[@id="agentName"]');
        this.applyButton = page.locator('//button[@class="px-4 py-2 rounded-md bg-blue-600 text-white"]');
        this.searchResult = page.locator('//*[@title="View Profile"]');
        this.resetButton = page.locator('//button[@class="px-4 py-2 rounded-md border border-gray-400 text-gray-700"]');
        this.closeButton = page.locator('//button[@class="btn btn-sm btn-circle btn-ghost"]').first();
        this.downloadCSVButton = page.locator('//button[@class="px-4 py-2 bg-[#0000FE] text-white rounded-lg hover:bg-blue-700 flex items-center h-10"]');


    }
    async navigateToAgentRosterPage() {
        await this.agentRosterLink.click();
        await expect(this.pageTitle).toHaveText('Agent Roster');
    }
    async applyFilter({ agentName }) {
        await this.applyfilterButton.click();
        await this.searchByAgentName.fill(agentName);
        await this.applyButton.click();
        await expect(this.searchResult).toHaveValue('');
    }
    async resetFilter() {
        await this.applyfilterButton.click();
        await this.resetButton.click();

    }
    async closeFilter() {
        await this.closeButton.click();

    }
    async downloadCSV() {
        await this.downloadCSVButton.click();
    }


};
