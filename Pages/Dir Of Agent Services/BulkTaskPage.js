const { expect } = require('@playwright/test');

exports.BulkTaskPage = class BulkTaskPage {
    constructor(page) {
        this.page = page;
        this.bulkTaskLink      = page.locator('a[href="/bulkTask"]');
        this.pageTitle         = page.locator('h2.text-xl.font-bold.ml-2');
        this.selectAgentsBtn   = page.locator('button', { hasText: 'Select Agents' });
        this.agentCheckboxes   = page.locator('.drpdwn label');
        this.tagsMultiselect   = page.locator('.multiselect.custom-multiselect');
        this.tagsOptions       = page.locator('.multiselect__element .multiselect__option');
        this.startDateInput    = page.locator('input[type="date"]');
        // Title: first TipTap contenteditable editor on the page
        this.titleEditor       = page.locator('div.tiptap.ProseMirror').first();
        // Type select
        this.typeSelect        = page.locator('select.text-sm');
        // Save button for bulk task form
        this.saveButton        = page.locator('button.btn-primary-blue.ml-4.w-20').first();
        // Toast
        this.successToast      = page.locator('[data-testid="toast-body"]').first();
    }

    async navigateToBulkTask() {
        await this.page.goto('https://qa.procasaonboard.com/bulkTask', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await expect(this.pageTitle).toHaveText('Add Activity', { timeout: 10000 });
        console.log('>>> Bulk Task page verified open');
    }

    async selectAgents(count = 2) {
        await this.selectAgentsBtn.click();
        await this.agentCheckboxes.first().waitFor({ state: 'visible', timeout: 8000 });
        const labels = await this.agentCheckboxes.all();
        const picked = [];
        for (let i = 0; i < Math.min(count, labels.length); i++) {
            const name = (await labels[i].textContent())?.trim();
            await labels[i].click();
            picked.push(name);
            await this.page.waitForTimeout(200);
        }
        // close dropdown by clicking elsewhere
        await this.pageTitle.click({ force: true });
        await this.page.waitForTimeout(300);
        console.log(`>>> Selected agents: ${JSON.stringify(picked)}`);
    }

    async selectFirstTag() {
        await this.tagsMultiselect.click();
        await this.tagsOptions.first().waitFor({ state: 'visible', timeout: 8000 });
        const tagName = (await this.tagsOptions.first().textContent())?.trim();
        await this.tagsOptions.first().click();
        // close multiselect by clicking elsewhere
        await this.pageTitle.click({ force: true });
        await this.page.waitForTimeout(300);
        console.log(`>>> Selected tag: "${tagName}"`);
    }

    async setStartDateToToday() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        await this.startDateInput.fill(today);
        console.log(`>>> Start date set to: ${today}`);
    }

    async enterTitle(title) {
        await this.titleEditor.waitFor({ state: 'visible', timeout: 8000 });
        await this.titleEditor.click();
        await this.titleEditor.fill(title);
        console.log(`>>> Task title entered: "${title}"`);
    }

    async selectYesNoType() {
        await this.typeSelect.selectOption({ label: 'Yes/No' });
        console.log('>>> Type selected: Yes/No');
    }

    async saveTask() {
        await this.saveButton.click();
        console.log('>>> Save clicked');
    }

    async verifySuccessToast() {
        await expect(this.successToast).toBeVisible({ timeout: 15000 });
        const msg = (await this.successToast.textContent())?.trim();
        console.log(`>>> Toast: "${msg}"`);
        return msg;
    }
};
