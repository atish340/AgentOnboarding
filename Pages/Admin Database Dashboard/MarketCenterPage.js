const { expect } = require('@playwright/test');


class MarketCenterPage {
    constructor(page) {
        this.page = page;
        // Locators
        this.marketCenterTab = page.locator('//a[@href="/marketcenter"]');
        this.marketCenterHeader = page.locator('//*[@class="font-semibold text-xl font-sans"]');
        this.searchBox = page.getByRole('textbox', { name: 'Search Market center' })
        this.searchResultCell = page.locator('//*[@class="accordion-item rounded-lg"]');
        this.openMc = page.locator('//*[@class="flex justify-end text-3xl mr-2"]');
        this.googleSignInButton = page.locator('//button[@class="btn auth-button order-2"]');
        this.googlelink = page.locator('//*[@role="link" and @jsname="MBVUVe"]');
        this.advancedButton = page.locator('//a[@href="#" and @jsname="BO4nrb"]');
        this.procasaonboardlink = page.locator('//a[@href="#" and @jsname="ehL7e"]');
        this.continueButton = page.locator('#submit_approve_access > div > button');
        this.addButton = page.locator('//button[@class="button-black h-10 ml-4 w-[220px] capitalize"]');
        this.addHeader = page.locator('//*[@class="font-medium text-xl font-sans"]');
        this.mcNameInput = page.locator('//input[@id="marketCenter"]');
        this.mcNumberInput = page.locator('//input[@id="marketCenterNumber"]');
        this.nextButton = page.locator('//*[@class="button-black h-10 mt-4 w-40 ml-auto flex items-center cursor-pointer justify-center"]');
        this.firstNameInput = page.locator('input[name="firstName"]');
        this.lastNameInput = page.locator('input[name="lastName"]');
        this.emailInput = page.locator('input[name="email"]');
        this.saveButton = page.locator('//button[@class="btn-primary-blue px-6 mt-4 py-3"]');
        this.finalSaveButton = page.locator('//button[@class="btn-primary-blue px-6 mt-4 w-28"]');
    }

    async waitForLoader() {
        try { await this.page.locator('div.absolute.bg-white.bg-opacity-60').first().waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.page.locator('div.absolute.bg-white.bg-opacity-60').first().waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
        await this.page.locator('div.absolute.bg-white.bg-opacity-60.z-10').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    }

    async openMarketCenterTab() {
        await this.marketCenterTab.click();
        await expect(this.marketCenterHeader).toBeVisible({ timeout: 10000 });
        await this.waitForLoader();
    }

    async searchMarketCenter(name) {
        await this.searchBox.fill(name);
        await this.page.keyboard.press('Enter');
        await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 15000 });
        // await this.openMc.click();
        // await this.googleSignInButton.click();
        // await this.page.waitForTimeout(5000); // Wait for 5 seconds to ensure the page loads completely
        // await this.googlelink.click();
        // await this.advancedButton.click();
        // await this.procasaonboardlink.click();
        // await this.continueButton.click();
        // await expect(this.page.locator('text=Google Calendar Synced Successfully')).toBeVisible({ timeout: 20000 });


//getByRole('textbox', { name: 'Email or phone' })
//getByRole('button', { name: 'Next' })



    }

    async addMarketCenter(name, id) {
        await this.waitForLoader();
        await this.addButton.click();
        await expect(this.addHeader).toBeVisible({ timeout: 10000 });
        await this.page.waitForTimeout(2000);
        await this.mcNameInput.fill(name);
        await this.mcNumberInput.fill(id);
        await this.nextButton.click();
    }

    async fillOwnerDetails(firstName, lastName, email) {
        await this.firstNameInput.fill(firstName);
        await this.lastNameInput.fill(lastName);
        await this.emailInput.fill(email);
    }

    async selectRoles() {
        const page = this.page;
        await this.waitForLoader();
        await page.getByText('Select Role').click();
        await page.getByText('Director of agent services', { exact: true }).click();
        await page.getByText('Team leader', { exact: true }).click();
        await page.getByRole('option', { name: 'Market center administrator' }).locator('span').first().click();
        await page.getByText('Director of marketing', { exact: true }).click();
        await page.getByRole('option', { name: 'Director of coaching' }).locator('span').first().click();
        await page.getByText('Director of operations', { exact: true }).click();
        await page.getByRole('option', { name: 'Director of first impression' }).locator('span').first().click();
        await page.getByText('Broker of record', { exact: true }).click();
        await page.getByRole('option', { name: 'Launch Coach' }).locator('span').first().click();
        await this.page.waitForTimeout(2000);
        await this.page.mouse.click(0, 0);


    }

    async saveMarketCenter() {
        await this.saveButton.click();
        await this.finalSaveButton.click();
    }
}

module.exports = { MarketCenterPage };





