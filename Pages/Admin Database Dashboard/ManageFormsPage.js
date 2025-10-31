const { expect } = require('@playwright/test');

class ManageFormsPage {
    constructor(page) {
        this.page = page;

        // Locators
        this.manageFormsTab = page.locator('//a[@href="/manageforms"]');
        this.manageFormsHeader = page.getByRole('heading', { name: 'Manage Forms' });
        this.recruitingTab = page.locator('//a[@class="tab font-semibold pb-3 border-b-2 border-[#0000FE] text-[#0000FE] capitalize"]');
        this.addFormButton = page.locator('//*[@class="btn-primary-blue whitespace-nowrap"]');
        this.editRecruitingHeader = page.getByText('Edit Recruiting Form');
        this.addFieldButton = page.locator('//*[@class="text-white text-sm w-fit justify-center bg-white py-2 px-4 rounded font-medium inline-flex space-x-1 items-center"]').nth(1);
        this.addFormFieldHeader = page.getByRole('heading', { name: 'Add Form Field' });
        this.fieldTitleInput = page.locator('//*[@data-placeholder="Placeholder Text"]');
        this.firstDropdown = page.getByRole('combobox').nth(1);
        this.roleDropdown = page.getByRole('textbox', { name: 'Select role' });
        this.closedropdown = page.getByRole('combobox').filter({ hasText: 'Director of agent' }).locator('div').first();
        this.categoryDropdown = page.getByRole('combobox').nth(3);
        this.saveButton = page.locator('//button[@class="save-btn"]')
        this.onboardingform = page.getByText('Onboarding Form');
        this.editOnboardingHeader = page.getByText('Edit Onboarding Form');
        this.marketingform = page.locator('//*[@class="tab pb-3 capitalize"]').nth(1);
        this.editMarketingHeader = page.getByText('Edit Marketing Form');
        this.additionalform = page.locator('//*[@class="tab pb-3 capitalize"]').nth(2);
        this.editAdditionalHeader = page.getByText('Edit Additional Form');
        this.techSetUpform = page.locator('//*[@class="tab pb-3 capitalize"]').nth(3);
        this.editTechSetUpHeader = page.getByText('Edit Tech SetUp Form');
        this.addFormFieldButton = page.locator('//button[@class="text-white text-sm w-fit justify-center bg-white py-2 px-4 rounded font-medium inline-flex space-x-1 items-center"]')
    }

    async openManageForms() {
        await this.manageFormsTab.click();
        await expect(this.manageFormsHeader).toBeVisible({ timeout: 10000 });
    }

    async openRecruitingTab() {
        await this.recruitingTab.click();
        await this.addFormButton.click();
        await expect(this.editRecruitingHeader).toBeVisible({ timeout: 10000 });
    }

    async addFormField(fieldName) {
        await this.addFieldButton.click();
        await expect(this.addFormFieldHeader).toBeVisible({ timeout: 10000 });
        await this.fieldTitleInput.fill(fieldName);
    }

    async configureDropdowns() {
        await this.firstDropdown.selectOption('Yes/No');
        await this.page.getByText('Select Role').click();
        await this.page.getByText('Director of agent services', { exact: true }).click();
        await this.closedropdown.click();
        await this.categoryDropdown.selectOption('Administrative & Other');
        await this.categoryDropdown.click();
    }

    async saveForm() {
        await this.saveButton.click();
        await this.page.getByRole('button', { name: 'Save' }).nth(0).click();
        await this.page.waitForTimeout(5000);
    }
    async openOnboardingform() {
        await this.onboardingform.click();
        await this.addFormButton.click();
        await expect(this.editOnboardingHeader).toBeVisible({ timeout: 10000 });
    }
    async addFormField1(fieldName) {
        await this.addFormFieldButton.click();
        await expect(this.addFormFieldHeader).toBeVisible({ timeout: 10000 });
        await this.fieldTitleInput.fill(fieldName);
    }

    async openMarketingform() {
        await this.marketingform.click();
        await this.addFormButton.click();
        await expect(this.editMarketingHeader).toBeVisible({ timeout: 10000 });
    }
    async openAdditionalform() {
        await this.additionalform.click();
        await this.addFormButton.click();
        await expect(this.editAdditionalHeader).toBeVisible({ timeout: 10000 });
    }
    async openTechSetUpform() {
        await this.techSetUpform.click();
        await this.addFormButton.click();
        await expect(this.editTechSetUpHeader).toBeVisible({ timeout: 10000 });
    }


}

module.exports = { ManageFormsPage };
