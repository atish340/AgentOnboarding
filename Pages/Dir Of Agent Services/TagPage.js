const { expect } = require('@playwright/test');

exports.TagPage = class TagPage {
    constructor(page) {
        this.page = page;
        this.tagLink = page.locator('//a[@href="/tags"]');
        this.pageTitle = page.locator('//*[@class="text-black font-bold text-xl leading-7 text-left mb-5"]');
        this.createTagButton = page.locator('//button[@class="ml-3 mr-1 py-[6px] px-4 rounded-lg app-blue bg-[#0000FE] hover:bg-[#0000F0] text-white font-semibold"]');
        this.tagTitle = page.locator('//h2[@class="text-xl font-bold ml-2"]');
        this.tagNameInput = page.locator('//input[@id="tagName"]');
        this.create = page.locator('///button[@class="btn-primary-blue ml-4 w-20" and @type="button"]');
        this.addMemberButton = page.locator('//button[@title="Add members"]');
        


    }



};
