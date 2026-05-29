const { expect } = require('@playwright/test');

class DocumentPage {
    constructor(page) {
        this.page = page;
        this.navigateToDocLibrary = page.locator('//a[@href="/documentlibrary"]').nth(1);
        this.pageTitle = page.locator('//*[@class="inline-block text-xl leading-normal mb-2 font-bold text-black tracking-tight mr-2"]');
        this.mcFolder = page.locator('//*[@class="card w-[187px] bg-base-100 rounded-lg h-full flex justify-between"]');
        this.downloadDocument = page.getByTestId('doclib-document-6981a6267d014bbaafa2ba6b').getByRole('img', { name: 'Document' });
        this.myFolder = page.locator('//a[@href="/myFolder"]');
        this.addFolderButton = page.locator('//button[@class="h-[42px] w-[146px] text-white bg-[#0000FE] hover:bg-[#3232FF] rounded-lg"]');
        this.folderTitle = page.locator('//*[@class="font-bold text-lg mb-4 mt-[-12px]"]').nth(0);
        this.folderNameInput = page.locator('//input[@placeholder="Enter name of folder"]');
        this.createButton = page.locator('//button[@class="btn px-4 py-1 bg-[#0000FE] hover:bg-[#4C4CFE] text-white"]').nth(0);
        this.editFolder = page.locator('//button[@title="Edit"]').nth(1);
        this.saveButton = page.locator('//button[@class="btn px-4 py-1 bg-[#0000FE] hover:bg-[#4C4CFE] text-white"]').nth(1);
        this.deleteFolderButton = page.locator('//button[@title="Delete"]').nth(1);
        this.confirmation = page.locator('//button[@class="rounded-md px-5 py-2 bg-[#0000FE] hover:bg-[#4C4CFE] text-white"]');
    }

    async openMarketCenter() {
        await this.navigateToDocLibrary.click();
        await expect(this.pageTitle).toBeVisible();
        await expect(this.pageTitle).toHaveText('Market Center Folders');
    }

    async openMCFolderAndDownload() {
        await this.mcFolder.click();
        await this.downloadDocument.click();
    }

    async openMyFolder() {
        await this.myFolder.click();
    }

    async addFolder(name) {
        await this.addFolderButton.click();
        await expect(this.folderTitle).toHaveText('Add Folder');
        await this.folderNameInput.nth(0).fill(name);
        await this.createButton.click();
    }

    async editFolderName(newName) {
        await this.editFolder.click();
        await this.folderNameInput.nth(1).fill(newName);
        await this.saveButton.click();
    }

    async deleteFolder() {
        await this.deleteFolderButton.click();
        await this.confirmation.click();
    }
}

module.exports = { DocumentPage };
