// pages/DocumentLibraryPage.js
import { expect } from '@playwright/test';

export class DocumentLibraryPage {
    constructor(page) {
        this.page = page;
        this.documentLibraryLink = page.locator('//a[@href="/documentlibrary"]');
        this.pageTitle = page.locator('//*[@class="inline-block text-xl leading-normal mb-2 font-bold text-black tracking-tight mr-2"]');
        this.addFolderButton = page.locator('//button[@class="h-[42px] w-[146px] text-white bg-[#0000FE] hover:bg-[#3232FF] rounded-lg"]');
        this.folderNameInput = page.locator('//*[@id="add_folder"]/div/div[1]/label/input');
        this.radioMarketCenter = page.locator('//input[@type="radio" and @name="mct"]');
        this.marketCenterSelect = page.getByLabel('Market center*');
        this.agentFolderCheckbox = page.getByRole('checkbox', { name: 'Agent Folder Viewable Agent' });
        this.teamLeaderCheckbox = page.getByRole('checkbox', { name: 'Syndra Luis - Team leader' });
        this.createButton = page.getByRole('button', { name: 'Create' });
        this.toastMessage = page.getByTestId('toast-content');
        this.serachdocument = page.locator('//input[@placeholder="Search"]');
        this.serachresult = page.locator('//*[@class="font-bold text-sm break-words"]');
        this.deletefolder = page.locator('//button[@title="Delete"]');
        this.confirmDeleteButton = page.getByRole('button', { name: 'Yes' });

    }

    async openDocumentLibrary() {
        await this.documentLibraryLink.click();
        await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    }

    async addNewFolder(folderName) {
        await this.addFolderButton.click();
        await this.folderNameInput.fill(folderName);
        await this.radioMarketCenter.click();
        await this.marketCenterSelect.selectOption({ label: 'Hawaii' });
        await this.agentFolderCheckbox.check();
        await this.teamLeaderCheckbox.check();
        await this.createButton.click();
        await expect(this.toastMessage).toBeVisible({ timeout: 10000 });
    }
    async searchFolder(folderName) {
        await this.serachdocument.fill(folderName);
        await this.page.keyboard.press('Enter');
        await expect(this.serachresult).toHaveText(folderName);
    }
    async deleteFolder() {
        await this.deletefolder.click();
        await this.page.waitForTimeout(2000);
        await this.confirmDeleteButton.click();
        await this.page.waitForTimeout(2000);

    }
}
