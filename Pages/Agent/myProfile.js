const { expect } = require('@playwright/test');

class MyProfilePage {
    constructor(page) {
        this.page = page;
        this.myProfileLink = page.locator('//a[@href="/profile"]');
        this.pageTitle = page.locator('//*[@class="container mx-auto flex justify-between items-center rounded-md mb-4 mt-2"]');
        this.documentsIcon = page.locator('//img[@alt="Document Uploaded"]');
        this.downloadDocumentsCard = page.locator('//*[@class="card h-30 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors"]');
        this.closeDocumentButton = page.locator('//button[@class="btn btn-sm btn-circle btn-ghost" and @title="Close"]');
        this.editIcon = page.locator('//button[@class="ml-2 flex items-center"]');
        this.addressInput = page.locator('//*[@class="sd-input sd-comment" and @placeholder="Enter Address"]');
        this.saveButton = page.locator('//*[@type="button" and @title="Save"]');
        this.toastMessage = page.locator('[data-testid="toast-body"]').filter({ hasText: /submitted successfully/i });
    }

    async navigateToMyProfile() {
        await this.myProfileLink.click();
        // wait for profile to fully load before interacting
        await this.editIcon.waitFor({ state: 'visible', timeout: 30000 });
    }

    async verifyPageTitle() {
        await expect(this.pageTitle).toBeVisible();
        await expect(this.pageTitle).toHaveText(/My Profile/i);
    }

    async openDocuments() {
        await this.documentsIcon.click();
    }

    async closeDocument() {
        await this.closeDocumentButton.click();
    }

    async editAddress() {
        const randomNum = Math.floor(Math.random() * 9000) + 1000;
        const streets = ['Main St', 'Oak Ave', 'Elm Rd', 'Park Blvd', 'Cedar Ln'];
        const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
        const randomAddress = `${randomNum} ${streets[Math.floor(Math.random() * streets.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}`;

        await this.editIcon.click();
        await this.addressInput.waitFor({ state: 'visible', timeout: 10000 });
        await this.addressInput.click({ clickCount: 3 });
        await this.page.keyboard.press('Control+a');
        await this.page.keyboard.press('Delete');
        await this.addressInput.fill(randomAddress);
        return randomAddress;
    }

    async saveChanges() {
        await this.saveButton.click();
        await expect(this.toastMessage).toBeVisible({ timeout: 30000 });
    }
}

module.exports = { MyProfilePage };
