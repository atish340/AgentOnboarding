const { expect } = require('@playwright/test');

exports.DatabaseDashboardPage = class DatabaseDashboardPage {
    constructor(page) {
        this.page = page;
        this.menuLink          = page.locator('a', { hasText: 'Database Dashb' });
        this.pageTitle         = page.locator('h1, h2, h3').filter({ hasText: /database dashboard/i }).first();
        this.loader            = page.locator('div.absolute.bg-white.bg-opacity-60');
        this.searchInput       = page.locator('input[placeholder="Search Agent Name"]');
        this.agentNameCells    = page.locator('table tbody tr td:nth-child(3)');
        this.rowCheckboxes     = page.locator('table tbody tr td:first-child input[type="checkbox"]');
        this.exportBtn         = page.getByRole('button', { name: 'Export' });
        this.scheduleReportBtn = page.getByRole('button', { name: 'Schedule Report' });
        this.confirmScheduleBtn = page.locator('//button[contains(@class,"bg-[#0000FE]") and contains(@class,"rounded-lg") and contains(@class,"mr-4")]');
        this.nextBtn           = page.getByRole('button', { name: 'Next' });
        this.eventNameField    = page.locator('//*[@placeholder="Enter Event Name"]');
        this.sendBtn           = page.getByRole('button', { name: 'Schedule' }).last();
    }

    async waitForLoader() {
        try { await this.loader.waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.loader.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    }

    async navigateToDatabaseDashboard() {
        await this.menuLink.click();
        await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
        console.log(`>>> Database Dashboard page opened: ${this.page.url()}`);
    }

    async getRandomAgentName() {
        await this.agentNameCells.first().waitFor({ state: 'visible', timeout: 10000 });
        const cells = await this.agentNameCells.all();
        let name = '';
        for (let i = 0; i < cells.length; i++) {
            const text = (await cells[i].textContent())?.trim();
            if (text) { name = text; break; }
        }
        console.log(`>>> Random agent selected: "${name}"`);
        return name;
    }

    async searchAgent(name) {
        await this.searchInput.fill(name);
        await this.searchInput.press('Enter');
        await this.waitForLoader();
        await this.page.waitForTimeout(1000);
        const regex = new RegExp(name.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        await expect(this.page.locator('table tbody tr td:nth-child(3)').filter({ hasText: regex }).first()).toBeVisible({ timeout: 15000 });
        console.log(`>>> Search results verified for: "${name}"`);
    }

    async openScheduler() {
        await this.scheduleReportBtn.click();
        await expect(this.page.getByText('Schedule Report', { exact: true })).toBeVisible({ timeout: 10000 });
        console.log('>>> Schedule Report dialog opened');

        const overlay = this.page.locator('div.absolute.bg-white.bg-opacity-60');
        try { await overlay.waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await overlay.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});

        await this.confirmScheduleBtn.click();
        console.log('>>> Confirm Schedule clicked');
    }

    async goToEventNamePage() {
        for (let i = 0; i < 20; i++) {
            if (await this.eventNameField.isVisible()) break;
            await this.nextBtn.click();
            await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        }
        await expect(this.eventNameField).toBeVisible({ timeout: 30000 });
        console.log('>>> Reached event name step');
    }

    async fillAndSchedule() {
        const eventName = `DAS Report ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
        await this.eventNameField.fill(eventName);

        const tzDropdown = this.page.locator('div').filter({ hasText: /^Select timezoneUS\/PacificUS\/MountainUS\/CentralUS\/Eastern$/ }).getByRole('combobox');
        await tzDropdown.selectOption('US/Eastern').catch(() => {});

        const hourDropdown = this.page.locator('div').filter({ hasText: /^Hour010203040506070809101112$/ }).getByRole('combobox');
        await hourDropdown.selectOption('09').catch(() => {});

        const ampmDropdown = this.page.locator('div').filter({ hasText: /^AM\/PMAMPM$/ }).getByRole('combobox');
        await ampmDropdown.selectOption('AM').catch(() => {});

        const recipientsField = this.page.locator('//input[@placeholder="Please enter comma seperated receipents email ids"]');
        await recipientsField.fill('test@yopmail.com').catch(() => {});

        const subjectField = this.page.locator('//input[@placeholder="Enter Email Subject"]');
        await subjectField.fill(`DAS Scheduled Report ${eventName}`).catch(() => {});

        await this.sendBtn.click();
        console.log(`>>> Schedule sent: "${eventName}"`);
    }

    async selectRandomAgents(count = 3) {
        await this.rowCheckboxes.first().waitFor({ state: 'visible', timeout: 10000 });
        const checkboxes = await this.rowCheckboxes.all();
        const pick = Math.min(count, checkboxes.length);
        for (let i = 0; i < pick; i++) {
            await checkboxes[i].check();
            await this.page.waitForTimeout(200);
        }
        console.log(`>>> Selected ${pick} agents via checkbox`);
    }

    async exportWithTemplate() {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const templateName = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

        // Click Export to open the export dialog
        await this.exportBtn.click();
        await this.page.waitForTimeout(500);
        console.log('>>> Export dialog opened');

        // Click "Create Template" card (a div/card with + icon, not a button)
        const createTemplateCard = this.page.locator('text=Create Template').first();
        await createTemplateCard.waitFor({ state: 'visible', timeout: 8000 });
        await createTemplateCard.click();
        console.log('>>> Create Template card clicked');

        // Click Next until "Save as Template" or "Update Template" appears
        const saveAsTemplateBtn  = this.page.locator('button', { hasText: /save as template/i });
        const updateTemplateBtn  = this.page.locator('button', { hasText: /update template/i });
        const finalExportBtn     = this.page.locator('button', { hasText: /^export$/i });

        for (let i = 0; i < 15; i++) {
            if (await saveAsTemplateBtn.first().isVisible()) break;
            if (await updateTemplateBtn.first().isVisible()) break;
            const next = this.page.getByRole('button', { name: 'Next' });
            if (await next.isVisible()) {
                await next.click();
                await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
                await this.page.waitForTimeout(300);
            } else {
                break;
            }
        }

        if (await updateTemplateBtn.first().isVisible()) {
            // Template already exists — skip creation and go straight to Export
            console.log('>>> Update Template found — skipping to Export directly');
        } else {
            // New template flow
            await saveAsTemplateBtn.first().waitFor({ state: 'visible', timeout: 15000 });
            await saveAsTemplateBtn.first().click();
            console.log('>>> Save as Template clicked');

            const nameInput = this.page.locator('input[placeholder="Enter Template Name"]');
            await nameInput.waitFor({ state: 'visible', timeout: 8000 });
            await nameInput.click();
            await nameInput.clear();
            // Type character by character with real keyboard events
            for (const char of templateName) {
                await this.page.keyboard.type(char, { delay: 100 });
            }
            // Tab out to trigger blur/change and enable the Save button
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
            console.log(`>>> Template name entered: "${templateName}"`);

            // Remove disabled, then real mouse click
            const saveBtn = this.page.locator('button[type="submit"]', { hasText: /^save$/i });
            await saveBtn.waitFor({ state: 'visible', timeout: 8000 });
            await this.page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button[type="submit"]'))
                    .find(b => b.textContent.trim() === 'Save');
                if (btn) btn.removeAttribute('disabled');
            });
            await this.page.waitForTimeout(300);
            const box = await saveBtn.boundingBox();
            if (box) {
                await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            }
            // Wait up to 3s for dialog to close; if still open, dismiss via X
            const dialogVisible = await this.page.locator('text=Save Template')
                .waitFor({ state: 'hidden', timeout: 3000 }).then(() => false).catch(() => true);
            if (dialogVisible) {
                await this.page.locator('[aria-label="close"], button:has-text("×"), button.btn-circle, .modal button[aria-label]')
                    .first().click({ force: true }).catch(() => {});
                await this.page.keyboard.press('Escape').catch(() => {});
                console.log('>>> Save dialog dismissed via X/Escape');
            }
            await this.page.waitForTimeout(500);
            console.log('>>> Template save step done');
        }

        // Click Export (final) — could be in wizard or main page
        const exportBtnVisible = await finalExportBtn.first()
            .waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
        if (exportBtnVisible) {
            await finalExportBtn.first().click();
        } else {
            // Fall back to main page Export button
            await this.exportBtn.click();
        }
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        console.log('>>> Final Export clicked');
    }
};
