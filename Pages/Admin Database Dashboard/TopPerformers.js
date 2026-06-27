
const { expect } = require('@playwright/test');

class TopPerformersPage {
    constructor(page) {
        this.page = page;
        this.topPerformersTab = page.locator('//a[@href="/topPerformers"]');
        this.topPerformersHeader = page.locator('//*[@class="text-xl font-[600]"]');
        this.addButton = page.locator('//button[@class="ml-3 mr-1 py-2 px-4 rounded-lg app-blue bg-app-blue hover:bg-blue-700 text-white font-semibold"]');
        this.addPopupHeader = page.locator('//*[@class="text-xl font-bold ml-2"]');
        this.dropdownTrigger = page.getByText('Select Member');
        this.saveButton = page.locator('#body-scroll').getByRole('button', { name: 'Save' });
        this.searchBox = page.getByRole('textbox', { name: 'Search' });
        // X close button inside the modal
        this.modalCloseButton = page.locator('div.fixed.inset-0 button').filter({ hasText: /^[×✕x]$/i }).first();
        // Fallback: any button with aria-label close inside the modal
        this.modalDialog = page.locator('div.fixed.inset-0');
    }

    async openTopPerformers() {
        await this.topPerformersTab.click();
        await expect(this.topPerformersHeader).toBeVisible({ timeout: 10000 });
        await this.waitForLoader();
    }

    async waitForLoader() {
        try { await this.page.locator('div.absolute.bg-white.bg-opacity-60').first().waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.page.locator('div.absolute.bg-white.bg-opacity-60').first().waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
        await this.page.locator('div.absolute.bg-white.bg-opacity-60.z-10').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    }

    async addPerformer() {
        await this.waitForLoader();
        await this.addButton.click();
        await expect(this.addPopupHeader).toBeVisible({ timeout: 10000 });
        await this.waitForLoader();

        await expect(this.dropdownTrigger).toBeVisible({ timeout: 15000 });

        const dropdownItems = this.page.locator('div[class*="hover:bg-blue-50"]');
        let selectedName = '';

        for (let i = 0; i < 10; i++) {
            // Open the custom dropdown
            await expect(this.dropdownTrigger).toBeVisible({ timeout: 10000 });
            await this.dropdownTrigger.click();
            await expect(dropdownItems.first()).toBeVisible({ timeout: 10000 });

            const item = dropdownItems.nth(i);
            if (!await item.isVisible()) break;

            selectedName = (await item.textContent())?.trim() || '';
            await item.click();
            // Wait for any loader triggered by item selection before closing dropdown
            await this.waitForLoader();

            // Close the dropdown: Escape first, then top-left corner click as fallback
            await this.page.keyboard.press('Escape');
            try {
                await dropdownItems.first().waitFor({ state: 'hidden', timeout: 2000 });
            } catch {
                // Dropdown didn't close via Escape — click safe area (top-left corner)
                await this.page.mouse.click(10, 10);
                await this.page.waitForTimeout(300);
            }

            await this.page.waitForTimeout(400);
            if (await this.saveButton.isEnabled()) break;
        }

        console.log(`>>> Selected top performer: "${selectedName}"`);
        await expect(this.saveButton).toBeEnabled({ timeout: 5000 });

        // Ensure dropdown is fully gone before clicking Save
        await dropdownItems.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

        // Click Save — no force needed since dropdown is closed
        await this.saveButton.click();

        // Wait for modal to close — up to 30s for slow API
        try {
            await this.modalDialog.waitFor({ state: 'hidden', timeout: 30000 });
        } catch {
            // Modal still open — try clicking the X close button
            console.log('>>> Modal did not auto-close, trying X button...');
            const xBtn = this.page.locator('div.fixed.inset-0').getByRole('button').first();
            if (await xBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await xBtn.click();
            } else {
                await this.page.keyboard.press('Escape');
            }
            // Give it one more chance to close
            await this.modalDialog.waitFor({ state: 'hidden', timeout: 10000 });
        }
    }

    async searchPerformer(name) {
        await this.searchBox.click();
        await this.searchBox.fill(name);
        await this.searchBox.press('Enter');
        const performerRow = this.page.locator('table >> tbody >> tr').filter({
            has: this.page.getByText(name, { exact: false })
        });
        await expect(performerRow).toBeVisible({ timeout: 10000 });
    }
}

module.exports = { TopPerformersPage };
