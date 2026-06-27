const { expect } = require('@playwright/test');

class DocumentLibraryPage {
    constructor(page) {
        this.page = page;
        this.documentLibraryLink = page.locator('//a[@href="/documentlibrary"]');
        this.pageTitle = page.locator('//*[@class="inline-block text-xl leading-normal mb-2 font-bold text-black tracking-tight mr-2"]');
        this.addFolderButton = page.locator('//button[@class="h-[42px] w-[146px] text-white bg-[#0000FE] hover:bg-[#3232FF] rounded-lg"]');
        this.folderNameInput = page.locator('//*[@id="add_folder"]/div/div[1]/label/input');
        this.radioMarketCenter = page.locator('//input[@type="radio" and @name="mct"]');
        this.marketCenterSelect = page.getByLabel('Market center*');
        this.agentFolderCheckbox = page.getByRole('checkbox', { name: /Agent Folder/i });
        this.teamLeaderCheckbox = page.getByRole('checkbox', { name: /Team leader/i }).first();
        this.createButton = page.getByRole('button', { name: 'Create' });
        this.toastMessage = page.getByTestId('toast-content');
        this.serachdocument = page.locator('//input[@placeholder="Search"]');
        this.serachresult = page.locator('//*[@class="font-bold text-sm break-words"]');
        this.deletefolder = page.locator('//button[@title="Delete"]');
        this.confirmDeleteButton = page.getByRole('button', { name: 'Yes' });

    }

    async waitForLoader() {
        try { await this.page.locator('div.absolute.bg-white.bg-opacity-60').first().waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.page.locator('div.absolute.bg-white.bg-opacity-60').first().waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
        await this.page.locator('div.absolute.bg-white.bg-opacity-60.z-10').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    }

    async openDocumentLibrary() {
        await this.documentLibraryLink.click();
        await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
        await this.waitForLoader();
    }

    async addNewFolder(folderName) {
        await this.addFolderButton.click();
        await expect(this.folderNameInput).toBeVisible({ timeout: 10000 });
        await this.folderNameInput.fill(folderName);
        // Procasa Team radio
        await this.page.locator('input[type="radio"]').first().click();
        // Wait for assignee list to load after radio selection
        await this.waitForLoader();
        // Check first available assignee inside the dialog (Assignee* is required)
        await this.page.locator('#add_folder input[type="checkbox"]').first().check();
        await this.createButton.click();
        // After successful creation the dialog resets the form (name clears) but stays open
        await expect(this.folderNameInput).toHaveValue('', { timeout: 10000 });
        // Wait for the save loader to finish before closing
        await this.waitForLoader();
        // Navigate to document library — closes the dialog and refreshes the folder list
        await this.waitForLoader();
        await this.page.goto('https://qa.procasaonboard.com/documentlibrary', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.waitForLoader();
    }

    async searchFolder(folderName) {
        await this.waitForLoader();
        await this.serachdocument.fill(folderName);
        await this.page.keyboard.press('Enter');
        await expect(this.serachresult.first()).toContainText(folderName, { timeout: 10000 });
    }

    async deleteFolder() {
        await this.deletefolder.first().click();
        await expect(this.confirmDeleteButton).toBeVisible({ timeout: 10000 });
        await this.confirmDeleteButton.click();
        await this.waitForLoader();
    }
}

module.exports = { DocumentLibraryPage };
