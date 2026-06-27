const { expect } = require('@playwright/test');

exports.DocumentLibraryPage = class DocumentLibraryPage {
    constructor(page) {
        this.page = page;
        this.menuLink          = page.locator('a[href="/documentlibrary"]');
        this.pageTitle         = page.locator('text=Document Library').first();
        this.loader            = page.locator('div.absolute.bg-white.bg-opacity-60');
        this.addFolderButton   = page.locator('button', { hasText: 'Add Folder' })
            .or(page.locator('//button[@class="h-[42px] w-[146px] text-white bg-[#0000FE] hover:bg-[#3232FF] rounded-lg"]'));
        this.folderNameInput   = page.locator('//*[@id="add_folder"]/div/div[1]/label/input');
        this.radioMarketCenter = page.locator('//input[@type="radio" and @name="mct"]');
        this.marketCenterSelect = page.getByLabel('Market center*');
        this.agentFolderCheckbox = page.getByRole('checkbox', { name: /Agent Folder/i });
        this.teamLeaderCheckbox  = page.getByRole('checkbox', { name: /Team leader/i }).first();
        this.createButton      = page.getByRole('button', { name: 'Create' });
        this.toastMessage      = page.getByTestId('toast-content');
        this.searchInput       = page.locator('input[placeholder="Search"]');
        this.searchResult      = page.locator('.font-bold.text-sm.break-words');
        this.deleteButton      = page.locator('button[title="Delete"]');
        this.confirmDeleteBtn  = page.getByRole('button', { name: 'Yes' });
    }

    async waitForLoader() {
        try { await this.loader.waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.loader.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    }

    async navigateToDocumentLibrary() {
        await this.page.goto('https://qa.procasaonboard.com/documentlibrary', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
        await this.waitForLoader();
        console.log(`>>> Document Library opened: ${this.page.url()}`);
    }

    async addNewFolder(folderName) {
        await this.addFolderButton.first().click();
        await expect(this.folderNameInput).toBeVisible({ timeout: 10000 });
        await this.folderNameInput.fill(folderName);
        await this.radioMarketCenter.first().click();
        // Select first available market center option
        const optionCount = await this.marketCenterSelect.locator('option').count();
        if (optionCount > 1) {
            await this.marketCenterSelect.selectOption({ index: 1 });
        }
        await this.agentFolderCheckbox.check().catch(() => {});
        await this.teamLeaderCheckbox.check().catch(() => {});
        await this.createButton.click();
        await expect(this.toastMessage).toBeVisible({ timeout: 15000 });
        const msg = (await this.toastMessage.textContent())?.trim();
        console.log(`>>> Folder created: "${folderName}" — toast: "${msg}"`);

        // stay on document library — navigate back if the app redirected away
        if (!this.page.url().includes('/documentlibrary')) {
            await this.page.goto('https://qa.procasaonboard.com/documentlibrary', { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
        await this.waitForLoader();
    }

    async searchFolder(folderName) {
        await this.waitForLoader();
        await this.searchInput.fill(folderName);
        await this.page.keyboard.press('Enter');
        await expect(this.searchResult.first()).toContainText(folderName, { timeout: 10000 });
        console.log(`>>> Folder found in search: "${folderName}"`);
    }

    async deleteFolder() {
        await this.deleteButton.first().click();
        await expect(this.confirmDeleteBtn).toBeVisible({ timeout: 10000 });
        await this.confirmDeleteBtn.click();
        await this.waitForLoader();
        console.log('>>> Folder deleted');
    }
};
