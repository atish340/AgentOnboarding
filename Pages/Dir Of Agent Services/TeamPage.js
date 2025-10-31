const { expect } = require('@playwright/test');

exports.TeamPage = class TeamPage {
    constructor(page) {
        this.page = page;
        this.teamLink = page.locator('//a[@href="/teams"]');
        this.pageTitle = page.locator('//*[@class="text-black font-bold text-xl leading-7 text-left mb-5"]');
        this.createTeamButton = page.locator('//button[@class="ml-3 mr-1 py-1 px-4 rounded-lg app-blue bg-[#0000FE] hover:bg-[#0000F0] text-white font-semibold"]');
        this.teamTitle = page.locator('//h2[@class="text-xl font-bold ml-2"]');
        this.uploadLogoButton = this.page.locator('.flex.items-center.justify-center.h-10').first();
        this.teamNameInput = page.locator('//input[@id="teamName"]');
        this.selectLeaderDropdown = page.locator('//select[@id="selectedLeader"]');
        this.create = page.locator('//button[@class="btn-primary-blue ml-4 w-24"]');
        // this.successMessage = page.locator('//p[@class="text-green-600 text-sm mt-2"]');
    }

    async navigateToTeamPage() {
        await this.teamLink.click();
        await expect(this.pageTitle).toHaveText('Teams');
    }

    async createNewTeam({ teamName, teamLeader }) {
        await this.createTeamButton.click();
        await expect(this.teamTitle).toHaveText('Create Team');
        await this.uploadLogoButton.setInputFiles('D:/Playwrite/tests/uploadfiles/133893442423165944.jpg');
        await this.teamNameInput.fill(teamName);
        await this.selectLeaderDropdown.selectOption({ label: teamLeader });
        await this.create.click();
        // await expect(this.successMessage).toHaveText('Team created successfully');
    }
};
