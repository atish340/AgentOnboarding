const { expect } = require('@playwright/test');

function randomTagName(minLen = 4, maxLen = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
    let name = '';
    for (let i = 0; i < len; i++) name += chars[Math.floor(Math.random() * chars.length)];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

exports.TagPage = class TagPage {
    constructor(page) {
        this.page = page;
        this.tagLink = page.locator('//a[@href="/tags"]');
        this.pageTitle = page.locator('//*[@class="text-black font-bold text-xl leading-7 text-left mb-5"]');
        this.createTagButton = page.locator('//button[@class="ml-3 mr-1 py-[6px] px-4 rounded-lg app-blue bg-[#0000FE] hover:bg-[#0000F0] text-white font-semibold"]');
        this.tagModalTitle = page.locator('//h2[@class="text-xl font-bold ml-2"]');
        this.tagNameInput = page.locator('//input[@id="tagName"]');
        this.createBtn = page.locator('//button[@class="btn-primary-blue ml-4 w-20" and @type="button"]');
        this.successToast = page.locator('[data-testid="toast-body"]');
        this.searchInput = page.locator('//input[@placeholder="Search"]');
        this.addMemberButton = page.locator('//button[@title="Add members"]');
        // member select inside the Add Member modal
        this.memberSelect = page.locator('select').first();
        // Save button scoped after the "Add Members" modal title
        this.saveMemberBtn = page.locator('//*[normalize-space()="Add Members"]/following::button[normalize-space()="Save"]').first();
    }

    async navigateToTags() {
        await this.page.goto('https://qa.procasaonboard.com/tags', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(this.pageTitle).toHaveText('Tags', { timeout: 15000 });
    }

    async createTag() {
        const tagName = randomTagName();
        console.log(`>>> Creating tag: ${tagName}`);

        await this.createTagButton.click();
        await expect(this.tagModalTitle).toHaveText('Create Tag');
        await this.tagNameInput.fill(tagName);
        // wait for loader to clear, then dispatch click to bypass any overlay
        const loader = this.page.locator('div.absolute.bg-white.bg-opacity-60');
        await loader.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(500);
        await this.createBtn.dispatchEvent('click');

        // verify toast
        await expect(this.successToast).toBeVisible({ timeout: 15000 });
        const toastText = await this.successToast.textContent();
        console.log(`>>> Toast: ${toastText}`);

        // stay on tags page — navigate back if the app redirected away
        if (!this.page.url().includes('/tags')) {
            await this.page.goto('https://qa.procasaonboard.com/tags', { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
        await this.page.waitForTimeout(1000);

        return tagName;
    }

    async searchAndVerifyTag(tagName) {
        await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await this.searchInput.fill(tagName);
        const tagResult = this.page.locator(`//*[contains(text(),"${tagName}")]`).first();
        await expect(tagResult).toBeVisible({ timeout: 15000 });
        console.log(`>>> Tag "${tagName}" confirmed in list`);
    }

    async addMemberToTag() {
        await this.addMemberButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.addMemberButton.click();

        // wait for member select to appear and options to load
        await this.memberSelect.waitFor({ state: 'visible', timeout: 15000 });
        await expect(async () => {
            const count = await this.memberSelect.locator('option:not([disabled]):not([value=""])').count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 15000, intervals: [500] });

        // pick a random available option
        const options = await this.memberSelect.locator('option:not([disabled]):not([value=""])').all();
        const idx = Math.floor(Math.random() * options.length);
        const val = await options[idx].getAttribute('value');
        const label = await options[idx].textContent();

        await this.memberSelect.evaluate((el, value) => {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, val);

        console.log(`>>> Member selected: ${label?.trim()}`);

        // wait for Save button to appear and click
        await this.saveMemberBtn.waitFor({ state: 'visible', timeout: 10000 });
        await this.saveMemberBtn.click({ force: true });
        console.log(`>>> Save clicked`);
    }
};
