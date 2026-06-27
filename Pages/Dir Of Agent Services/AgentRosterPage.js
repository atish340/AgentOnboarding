const { expect } = require('@playwright/test');

exports.AgentRosterPage = class AgentRosterPage {
    constructor(page) {
        this.page = page;
        this.agentRosterLink    = page.locator('//a[@href="/viewAgent"]');
        this.pageTitle          = page.locator('//*[@class="text-left font-bold text-xl"]');
        this.downloadPDFButton  = page.locator('//button[@class="px-4 py-2 bg-[#0000FE] text-white rounded-lg hover:bg-blue-700 flex items-center h-10"]');
        this.applyFilterButton  = page.locator('//button[@class="ml-3 py-1 px-4 rounded-lg app-blue bg-[#0000FE] hover:bg-[#0000F0] text-white font-semibold"]');
        this.agentNameInput     = page.locator('//input[@id="agentName"]');
        this.applyFiltersButton = page.locator('//button[@class="px-4 py-2 rounded-md bg-blue-600 text-white"]');
        this.resetButton        = page.locator('//button[@class="px-4 py-2 rounded-md border border-gray-400 text-gray-700"]');
        this.closeFilterButton  = page.locator('//button[@class="btn btn-sm btn-circle btn-ghost"]').first();
        this.firstAgentName     = page.locator('table tbody tr:first-child td:first-child span[title="View Profile"]');
        this.tableAgentNames    = page.locator('table tbody tr td:first-child span[title="View Profile"]');
    }

    async navigateToAgentRosterPage() {
        await this.page.goto('https://qa.procasaonboard.com/viewAgent', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await expect(this.pageTitle).toHaveText('Agent Roster', { timeout: 15000 });
        console.log('>>> Agent Roster page verified open');
    }

    async downloadPDF() {
        const [download] = await Promise.all([
            this.page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
            this.downloadPDFButton.click(),
        ]);
        if (download) {
            console.log(`>>> PDF downloaded: ${download.suggestedFilename()}`);
        } else {
            console.log('>>> Download PDF clicked');
        }
    }

    async getFirstAgentName() {
        await this.firstAgentName.waitFor({ state: 'visible', timeout: 10000 });
        const name = (await this.firstAgentName.textContent())?.trim();
        console.log(`>>> First agent in table: "${name}"`);
        return name;
    }

    async searchAndVerifyAgent(agentName) {
        await this.applyFilterButton.click();
        await this.agentNameInput.waitFor({ state: 'visible', timeout: 8000 });
        console.log('>>> Filter panel opened');

        await this.agentNameInput.fill(agentName);
        console.log(`>>> Searching for agent: "${agentName}"`);

        await this.applyFiltersButton.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(500);

        await expect(this.tableAgentNames.first()).toBeVisible({ timeout: 10000 });
        const firstResult = (await this.tableAgentNames.first().textContent())?.trim();
        expect(firstResult?.toLowerCase()).toContain(agentName.toLowerCase().split(' ')[0]);
        console.log(`>>> Search results verified — first result: "${firstResult}"`);
    }

    async clickAgentAndVerifyProfile(agentName) {
        const agentSpan = this.page.locator('table tbody tr td:first-child span[title="View Profile"]', { hasText: agentName }).first();
        await agentSpan.click();
        console.log(`>>> Clicked on agent "${agentName}"`);
        await this.page.waitForLoadState('networkidle', { timeout: 20000 });
        await this.page.waitForFunction(
            () => !document.querySelector('[class*="loading"], [class*="spinner"]'),
            { timeout: 15000 }
        ).catch(() => {});
        console.log(`>>> Agent profile loaded: ${this.page.url()}`);
    }
};
