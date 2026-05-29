const { expect } = require('@playwright/test');

exports.TrainingNvideosPage = class TrainingNvideosPage {
    constructor(page) {
        this.page = page;
        this.teamLink = page.locator('//a[@href="/trainings-videos"]');
        this.pageTitle = page.locator('//*[@class="inline-block mt-2 text-xl leading-normal font-bold text-black tracking-tight"]');
        this.selectCategoryDropdown = page.locator('//select[@class="select select-bordered w-[220px]"]');
        this.addVideoButton = page.locator('//button[@class="mr-4 btn btn-outline btn-primary"]');
        this.videoTitleInput = page.locator('//input[@placeholder="Enter Video Title"]');
        this.videoLinkInput = page.locator('//input[@placeholder="Enter Video Link"]');
        this.requiredCheckbox = page.locator('//input[@name="must_have"]');
        this.saveButton = page.locator('//button[@class="btn-primary-blue w-20 mt-2"]');
        this.switchToAgent = page.locator('//*[@class="tab pb-3 pl-[14px] capitalize border-b border-transparent"]');
        this.selectAgent = page.locator('//*[@class="select select-bordered w-[200px]"]');


    }

    async navigateToTrainingNvideosPage() {
        await this.teamLink.click();
        await expect(this.pageTitle).toHaveText('Manage Videos');
    }
    async addNewVideo({ category, title, link }) {
        await this.selectCategoryDropdown.selectOption({ label: category });
        await this.addVideoButton.click();
        await this.videoTitleInput.fill(title);
        await this.videoLinkInput.fill(link);
        await this.requiredCheckbox.check();
        await this.saveButton.click();
    }
    async switchToAgentTab({ title, link }) {
        await this.switchToAgent.click();
        await this.selectAgent.selectOption({ label: 'Khando Balal' });
        await this.addVideoButton.click();
        await this.videoTitleInput.fill(title);
        await this.videoLinkInput.fill(link);
        await this.requiredCheckbox.check();
        await this.saveButton.click();
    }


};