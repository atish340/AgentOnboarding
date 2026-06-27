const { expect } = require('@playwright/test');

class ImportDataPage {
    constructor(page) {
        this.page = page;
        this.loader = page.locator('div.absolute.bg-white.bg-opacity-60');
        this.importButton = page.getByRole('button', { name: 'Import', exact: true });
        this.importAgentsHeading = page.getByText('Import Agents');
        this.marketCenterDropdown = page.getByRole('combobox');
        this.fileInput = page.locator('#import');
        this.autoInviteYes = page.getByRole('radio', { name: 'Yes' });
        this.uploadButton = page.getByRole('button', { name: 'Upload' });
        this.loadingText = page.getByText('Loading forms for selected Market Center');
    }

    async waitForLoader() {
        try { await this.loader.first().waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.loader.first().waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
        await this.page.locator('div.absolute.bg-white.bg-opacity-60.z-10').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    }

    async openImportModal() {
        await this.waitForLoader();
        await this.importButton.click();
        await expect(this.importAgentsHeading).toBeVisible({ timeout: 10000 });
        await this.waitForLoader();
    }

    async selectMarketCenter(value) {
        await expect(this.marketCenterDropdown).toBeVisible({ timeout: 10000 });
        await this.marketCenterDropdown.selectOption({ label: value });
        // Wait for the MC forms loading indicator to appear then disappear
        try { await this.loadingText.waitFor({ state: 'visible', timeout: 5000 }); } catch {}
        await this.loadingText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
        // Also wait for any page-level spinner
        await this.waitForLoader();
    }

    async uploadFile(filePath) {
        await this.waitForLoader();
        const [fileChooser] = await Promise.all([
            this.page.waitForEvent('filechooser'),
            this.fileInput.click(),
        ]);
        await fileChooser.setFiles(filePath);
        await this.page.waitForTimeout(3000);
    }

    async confirmImport() {
        await this.autoInviteYes.click();
        await this.page.waitForTimeout(1000);
        await expect(this.uploadButton).toBeEnabled({ timeout: 60000 });
        await this.uploadButton.click();
        // Wait for success toast confirming the import completed
        const successToast = this.page.locator('[class*="toast"], [class*="Toast"], [class*="notification"], [class*="alert"], [class*="snack"]')
            .filter({ hasText: /success|imported|upload/i });
        try {
            await successToast.first().waitFor({ state: 'visible', timeout: 60000 });
            await successToast.first().waitFor({ state: 'hidden', timeout: 15000 });
        } catch {
            // Toast may auto-dismiss before we catch it — give backend a moment to persist
            await this.page.waitForTimeout(3000);
        }
    }

    async importAgents(filePath, marketCenterValue) {
        await this.openImportModal();
        await this.selectMarketCenter(marketCenterValue);
        await this.uploadFile(filePath);
        await this.confirmImport();
    }
}

module.exports = { ImportDataPage };
