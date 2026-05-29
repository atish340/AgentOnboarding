const { expect } = require('@playwright/test');

function randomName(minLen = 4, maxLen = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
    let name = '';
    for (let i = 0; i < len; i++) name += chars[Math.floor(Math.random() * chars.length)];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function randomPhone() {
    const area = Math.floor(Math.random() * 900) + 100;
    const mid = Math.floor(Math.random() * 900) + 100;
    const last = Math.floor(Math.random() * 9000) + 1000;
    return `(${area})-${mid}-${last}`;
}

exports.AddAgentPage = class AddAgentPage {
    constructor(page) {
        this.page = page;
        this.addAgentButton = page.locator('//button[@class="button-black mt-2 mb-4 mx-5 h-11"]');
        this.firstNameInput = page.locator('//input[@placeholder="Enter first name"]');
        this.lastNameInput = page.locator('//input[@placeholder="Enter last name"]');
        this.emailInput = page.locator('//input[@placeholder="Enter email"]');
        this.phoneInput = page.locator('//input[@placeholder="(999)-999-9999"]');
        this.roleRadio = page.locator('//label[.//input[@value="R0"]]');
        this.termsCheckbox = page.locator('//label[.//input[@name="Standard termsItem 1"]]');
        this.saveButton = page.locator('//input[@type="button" and @title="Save"]');
        // success image shown after save (navigates to /manageAgents)
        this.successImage = page.locator('//img[@alt="play_icon"]');
    }

    async addNewAgent() {
        const firstName = randomName();
        const lastName = randomName();
        const email = `${firstName.toLowerCase()}${lastName.toLowerCase()}@yopmail.com`;
        const phone = randomPhone();

        console.log(`>>> Adding agent: ${firstName} ${lastName} | ${email} | ${phone}`);

        await this.addAgentButton.click();

        // wait for form to be ready
        await this.firstNameInput.waitFor({ state: 'visible', timeout: 15000 });

        await this.firstNameInput.fill(firstName);
        await this.lastNameInput.fill(lastName);
        await this.emailInput.fill(email);
        await this.phoneInput.fill(phone);
        await this.roleRadio.click();
        await this.termsCheckbox.click();
        await this.saveButton.click();

        // app auto-navigates to /manageAgents after save — navigation confirms success
        await this.page.waitForURL('**/manageAgents', { timeout: 30000 });
        console.log(`>>> Agent saved — navigated to Manage Agents`);

        return { firstName, lastName, email };
    }
};
