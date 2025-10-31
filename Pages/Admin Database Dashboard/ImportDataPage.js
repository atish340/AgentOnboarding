import { expect } from '@playwright/test';

export class ImportDataPage {
    constructor(page) {
        this.page = page;
        this.importButton = page.getByRole('button', { name: 'Import' });
        this.importAgentsHeading = page.getByText('Import Agents');
        this.marketCenterDropdown = page.getByRole('combobox');
        this.uploadButton = page.locator('//*[@class="border text-white rounded-lg px-5 py-2 font-semibold shadow transition bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-300 cursor-pointer"]');
        this.fileInput = page.locator('//*[@id="import"]');
        this.confirmImportButton = page.locator('//*[@class="border text-white rounded-lg px-5 py-2 font-semibold shadow transition bg-[#0000FE] hover:bg-blue-800 focus:ring-2 focus:ring-blue-300"]');
    }

    async openImportModal() {
        await this.importButton.click();
        await expect(this.importAgentsHeading).toBeVisible();
    }

    async selectMarketCenter(value) {
        await this.marketCenterDropdown.selectOption(value);
    }

    async uploadFile(filePath) {
        await this.uploadButton.click();
        await this.fileInput.setInputFiles(filePath);
    }

    async confirmImport() {
        await this.confirmImportButton.click();
        // Waiting for import to process
        await this.page.waitForTimeout(40000);
    }

    async importAgents(filePath, marketCenterValue) {
        await this.openImportModal();
        await this.selectMarketCenter(marketCenterValue);
        await this.uploadFile(filePath);
        await this.confirmImport();
    }
}
