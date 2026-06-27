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
        this.roleRadio = page.locator('label').filter({ hasText: /Unlicensed\s*Staff/i }).first();
        this.termsCheckbox = page.locator('//label[.//input[@name="Standard termsItem 1"]]');
        this.saveButton = page.locator('//input[@type="button" and @title="Save"]');
        // success image shown after save (navigates to /manageAgents)
        this.successImage = page.locator('//img[@alt="play_icon"]');
    }

    async waitForLoader() {
        const loader = this.page.locator('div.absolute.bg-white.bg-opacity-60');
        try { await loader.waitFor({ state: 'visible', timeout: 2000 }); } catch {}
        await loader.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }

    async dismissDialogs() {
        // Dismiss any blocking dialogs (e.g. "Save Duration Preference", confirmations)
        for (const btnText of [/^No$/i, /^Cancel$/i, /^close$/i]) {
            const btn = this.page.locator('button').filter({ hasText: btnText }).first();
            if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await btn.click().catch(() => {});
                await this.page.waitForTimeout(300);
            }
        }
    }

    async addNewAgent() {
        const firstName = randomName();
        const lastName = randomName();
        const email = `${firstName.toLowerCase()}${lastName.toLowerCase()}@yopmail.com`;
        const phone = randomPhone();

        console.log(`>>> Adding agent: ${firstName} ${lastName} | ${email} | ${phone}`);

        // Step 1: Navigate to Manage Agents
        await this.page.goto('https://qa.procasaonboard.com/manageAgents', { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('>>> Navigated to Manage Agents');

        // Step 2: Wait for page to fully load
        await this.waitForLoader();
        await this.dismissDialogs();
        await this.page.waitForTimeout(1000);

        // Step 3: Wait for + New Agent button to be visible and click it
        await this.addAgentButton.waitFor({ state: 'visible', timeout: 30000 });
        console.log('>>> Clicking + New Agent button');
        await this.addAgentButton.click();

        // Step 4: Wait for form to fully load
        await this.waitForLoader();
        await this.page.waitForTimeout(1000);
        await this.firstNameInput.waitFor({ state: 'visible', timeout: 30000 });
        await this.waitForLoader();
        console.log('>>> Form loaded — filling details');
        await this.page.waitForTimeout(500);

        await this.firstNameInput.fill(firstName);
        await this.page.waitForTimeout(300);
        await this.lastNameInput.fill(lastName);
        await this.page.waitForTimeout(300);
        await this.emailInput.fill(email);
        await this.page.waitForTimeout(300);
        await this.phoneInput.fill(phone);
        await this.page.waitForTimeout(300);

        // Wait for role radio then click Unlicensed Staff
        await this.roleRadio.waitFor({ state: 'visible', timeout: 10000 });
        await this.roleRadio.click();
        await this.page.waitForTimeout(500);

        // Wait for terms checkbox then click
        await this.termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
        await this.termsCheckbox.click();
        await this.page.waitForTimeout(500);

        // Wait for save button then click
        await this.saveButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.saveButton.click();

        // Wait for navigation back to manageAgents
        await this.page.waitForURL(/manageAgents/, { timeout: 30000 });
        console.log(`>>> Agent saved — navigated to Manage Agents`);

        return { firstName, lastName, email };
    }
};
