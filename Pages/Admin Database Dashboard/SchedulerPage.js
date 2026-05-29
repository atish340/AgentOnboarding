const { expect } = require('@playwright/test');

class SchedulerPage {
    constructor(page) {
        this.page = page;
        this.scheduleReportBtn = page.getByRole('button', { name: 'Schedule Report' });
        this.confirmScheduleBtn = page.locator('//button[contains(@class,"bg-[#0000FE]") and contains(@class,"rounded-lg") and contains(@class,"mr-4")]');
        this.nextBtn = page.getByRole('button', { name: 'Next' });
        this.eventNameField = page.locator('//*[@placeholder="Enter Event Name"]');
        this.timezoneDropdown = page.locator('div').filter({ hasText: /^Select timezoneUS\/PacificUS\/MountainUS\/CentralUS\/Eastern$/ }).getByRole('combobox');
        this.hourDropdown = page.locator('div').filter({ hasText: /^Hour010203040506070809101112$/ }).getByRole('combobox');
        this.ampmDropdown = page.locator('div').filter({ hasText: /^AM\/PMAMPM$/ }).getByRole('combobox');
        this.recipientsField = page.locator('//input[@placeholder="Please enter comma seperated receipents email ids"]');
        this.subjectField = page.locator('//input[@placeholder="Enter Email Subject"]');
        this.bodyField = page.locator('//*[@data-placeholder="Placeholder Text"]');
        this.sendBtn = page.getByRole('button', { name: 'Schedule' }).last();
    }

    async openScheduler() {
        await this.scheduleReportBtn.click();
        await expect(this.page.getByText('Schedule Report', { exact: true })).toBeVisible();

        const overlay = this.page.locator('div.absolute.bg-white.bg-opacity-60');
        try { await overlay.waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await overlay.waitFor({ state: 'hidden', timeout: 60000 });

        await this.confirmScheduleBtn.click();
    }


    async selectFilters() {
        await this.page.getByRole('combobox').first().selectOption({ label: 'This Year' });
        await this.page.getByRole('combobox').nth(1).selectOption('Pune');

        const statuses = ['Pending', 'Initiated', 'Cancelled', 'In Progress', 'Completed'];
        for (const status of statuses) {
            await this.page.getByRole('checkbox', { name: status }).check();
        }

        const checkboxes = ['Unlicensed Staff', 'R0', 'R1', 'R2', 'Commercial', 'Referral', 'Residential'];
        for (const id of checkboxes) {
            await this.page.locator(`//*[@id="${id}"]`).check();
        }

        await this.page.locator('//*[@class="text-white bg-[#0000FE] font-medium rounded py-2.5 px-3 w-20 hover:bg-[#0056b3]"]').click();
    }

    async waitForLoader() {
        try { await this.page.locator('div.absolute.bg-white.bg-opacity-60').waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.page.locator('div.absolute.bg-white.bg-opacity-60').waitFor({ state: 'hidden', timeout: 60000 });
    }

    async goToEventNamePage() {
        // Check for actual input, not generic text that appears in earlier wizard steps
        for (let i = 0; i < 20; i++) {
            if (await this.eventNameField.isVisible()) break;
            await this.nextBtn.click();
            // Wait for tab/step content to finish loading — resolves immediately on fast tabs,
            // waits naturally on slow API-backed tabs; avoids the 3s try/catch loader overhead
            await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        }
        await expect(this.eventNameField).toBeVisible({ timeout: 30000 });
    }

    async fillEventDetails(eventName, timezone, hour, ampm, recipients, subject, body) {
        await this.eventNameField.fill(eventName);
        await this.timezoneDropdown.selectOption(timezone);
        await this.hourDropdown.selectOption(hour);
        await this.ampmDropdown.selectOption(ampm);
        await this.recipientsField.fill(recipients);
        await this.subjectField.fill(subject);
        await this.bodyField.fill(body);
    }

    async sendSchedule() {
        await this.sendBtn.click();
    }
}

module.exports = { SchedulerPage };
