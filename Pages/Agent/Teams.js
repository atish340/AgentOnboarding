const { expect } = require('@playwright/test');

class TeamsPage {
    constructor(page) {
        this.page = page;
        this.myProfileLink = page.locator('//a[@href="/teams"]');
        this.expandTab = page.locator('//*[@class="ml-20"]').first();
        this.searchInput = page.locator('//input[@placeholder="Search"]');
        this.searchResult = page.locator('//*[@class="bg-[#FFF3D2] text-[#E87104] text-sm font-[500] py-1 px-3 rounded-md"]');
    }

    async navigateToTeams() {
        await this.myProfileLink.click();
    }

    async expandFirstTab() {
        await this.expandTab.click();
    }

    async searchTeam(teamName) {
        await this.searchInput.fill(teamName);
    }

    async verifyTeamResult(teamName) {
        await expect(this.searchResult).toHaveText(teamName);
    }
}

module.exports = { TeamsPage };
