const { expect } = require('@playwright/test');


class EmailNotificationPage {
    constructor(page) {
        this.page = page;
        this.emailNotificationTab = page.locator('//a[@href="/emailnotification"]');
        this.header = page.locator('//*[@class="font-bold text-xl text-black mb-4 flex"]');
        this.addTemplateButton = page.locator('//*[@class="flex flex-col items-center"]');
        this.templateNameInput = page.locator('//*[@placeholder="Enter Template Name"]');
        this.sendToInput = page.locator('//*[@id="sendto"]');
        this.roleDropdown = page.locator('//*[@role="combobox"]').nth(0);
        this.closeDropdown = page.getByRole('combobox')
            .filter({ hasText: 'Director of agent' })
            .locator('div')
            .first();
        // this.RecipientsDropdown = page.locator('//*[@role="combobox"]').nth(1);
        this.closeRecipientsDropdown = page.getByRole('combobox').first();
        this.subjectInput = page.locator('//*[@id="subject"]');
        this.bodyInput = page.locator('#text-editor > div:nth-child(2) > div');
        this.saveButton = page.locator('//*[@class="btn-primary-blue px-6 mt-4 w-28"]').nth(1);
        this.toastMessage = page.getByText('New email template created successfully', { exact: true });

        this.inAppNotificationTab = page.locator('//a[@href="/inAppNotification"]');
        this.saveNotificationButton = page.locator('//button[@class="btn-primary-blue px-6 mt-4 w-28"]');

    }

    async openEmailNotificationTab() {
        await this.page.goto('https://qa.procasaonboard.com/emailnotification', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(this.header).toBeVisible({ timeout: 15000 });
    }

    async addEmailTemplate(templateName, email, subject, body) {
        await this.addTemplateButton.click();
        await this.templateNameInput.fill(templateName);
        await this.sendToInput.fill(email);

        // ✅ Wait for dropdown to be visible, then click

        await this.roleDropdown.click();

        // optionally select an option before closing
        await this.page.getByRole('option', { name: 'Director of agent services' }).click();

        // ✅ Close dropdown safely
        await this.closeDropdown.click();
        // await this.RecipientsDropdown.click();
        await this.subjectInput.fill(subject);
        await this.bodyInput.fill(body);
        await this.saveButton.click();

        await expect(this.toastMessage).toBeVisible({ timeout: 10000 });
    }

    async openInAppNotificationTab() {
        await this.inAppNotificationTab.click();
        await this.saveNotificationButton.click();
    }
}

module.exports = { EmailNotificationPage };


