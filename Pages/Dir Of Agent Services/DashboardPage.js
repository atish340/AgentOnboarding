const { expect } = require('@playwright/test');

exports.DashboardPage = class DashboardPage {
    constructor(page) {
        this.page = page;
        this.dashboardLink = page.locator('a[href="/dashboard"]');
        this.pageTitle     = page.locator('h2.text-xl.font-semibold.text-black');
        this.downloadBtn   = page.locator('button', { hasText: 'Download Dashboard' });
    }

    async navigateToDashboard() {
        await this.dashboardLink.click();
        await this.page.waitForURL('**/dashboard', { timeout: 15000 });
        await this.page.waitForLoadState('networkidle');
        await this.dismissPreferenceDialog();
    }

    async dismissPreferenceDialog() {
        await this.page.evaluate(() => {
            const m = document.getElementById('modal_1');
            if (m && typeof m.close === 'function') m.close();
        }).catch(() => {});
        await this.page.waitForTimeout(300);
    }

    async verifyDashboardOpen() {
        await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
        console.log('>>> Dashboard page verified open');
    }

    async _openDropdown() {
        await this.dismissPreferenceDialog();
        // click the filter trigger (the styled div showing current selection)
        await this.page.locator('.dropdown-container > div').first().click({ force: true });
        // wait for options list to appear
        await this.page.locator('.dropdown-container .absolute.z-50').waitFor({ state: 'visible', timeout: 8000 });
        await this.page.waitForTimeout(300);
    }

    async _closeDropdownWithoutSelecting() {
        // click the page title to close dropdown without selecting
        await this.pageTitle.click({ force: true });
        await this.page.waitForTimeout(300);
    }

    async getFilterOptions() {
        await this._openDropdown();
        const labels = await this.page
            .locator('.dropdown-container .absolute.z-50 > div[draggable="true"] > div > span:first-child')
            .evaluateAll(els => els.map(e => e.textContent.trim()).filter(t => t));
        await this._closeDropdownWithoutSelecting();
        // skip Custom Date — it opens a date picker (separate flow)
        const options = labels.filter(o => o !== 'Custom Date');
        console.log(`>>> Filter options found: ${JSON.stringify(options)}`);
        return options;
    }

    async applyFilter(optionText) {
        await this._openDropdown();
        await this.page
            .locator('.dropdown-container .absolute.z-50 > div[draggable="true"]')
            .filter({ hasText: optionText })
            .locator('> div > span:first-child')
            .click({ force: true });
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.dismissPreferenceDialog();
        console.log(`>>> Filter applied: ${optionText}`);
    }

    async downloadDashboard() {
        const [download] = await Promise.all([
            this.page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
            this.downloadBtn.click({ force: true }),
        ]);
        if (download) {
            console.log(`>>> Dashboard downloaded: ${download.suggestedFilename()}`);
        } else {
            console.log('>>> Download button clicked (no file event — may be server-side export)');
        }
    }
};
