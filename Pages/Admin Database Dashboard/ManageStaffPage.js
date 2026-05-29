const { expect } = require('@playwright/test');

class ManageStaffPage {
    constructor(page) {
        this.page = page;

        // Page locators
        this.manageStaffLink = page.locator('//a[@href="/managestaff"]');
        this.headingManageStaff = page.getByRole('heading', { name: 'Manage Staff' });
        this.tabMC = page.locator('//a[@class="tab pb-3 capitalize"]');
        this.addEmployeeBtn = page.locator('//*[@class="button-black h-10 ml-4 w-[220px]"]');

        this.firstNameField = page.getByRole('textbox', { name: 'Enter First Name' }).first();
        this.lastNameField = page.getByRole('textbox', { name: 'Enter Last Name' }).first();
        this.emailField = page.getByRole('textbox', { name: 'Enter Email' }).first();

        this.sendInviteButton = page.getByRole('button', { name: 'Send invite' }).first();
        this.searchField = page.getByPlaceholder('Search').first();
        this.centralizedtab = page.getByRole('tab', { name: 'Centralized Services' });
        this.menu = page.locator('//*[@class="flex items-center justify-center relative popup-container"]').first();

        this.managemember = page.locator('//*[@class="text-black"]').first();
        this.teamMemberDropdown = page.getByRole('combobox').nth(2);
        this.saveButton = page.locator('//button[@class="btn-primary-blue w-20 mt-4"]');



    }

    async openManageStaff() {
        await this.manageStaffLink.click();
        await expect(this.headingManageStaff).toBeVisible({ timeout: 10000 });
    }

    async goToMCtab() {
        await this.tabMC.click();
    }

    async waitForLoader() {
        try { await this.page.locator('div.absolute.bg-white.bg-opacity-60').waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.page.locator('div.absolute.bg-white.bg-opacity-60').waitFor({ state: 'hidden', timeout: 60000 });
    }

    async addEmployee(firstName, lastName, email) {
        await this.addEmployeeBtn.click();
        await this.firstNameField.fill(firstName);
        await this.lastNameField.fill(lastName);
        await this.emailField.fill(email);

        await this.sendInviteButton.click();
        await this.page.waitForTimeout(3000);

        // Wait for the new employee row to appear in the "Employees Invited" table
        // const invitedTable = this.page.locator('h1:has-text("Employees Invited") + table');
        // const employeeRow = invitedTable.locator('tr', { hasText: `${firstName} ${lastName}` });
        // await expect(employeeRow).toBeVisible({ timeout: 15000 });
    }


    // async searchEmployee(name) {
    //     await this.searchField.fill(name);

    //     const invitedTable = this.page.locator('h1:has-text("Employees Invited") + table');
    //     const employeeRow = invitedTable.locator('tr', { hasText: name });
    //     await expect(employeeRow).toBeVisible({ timeout: 15000 });
    // }

    async inviteAndVerify(firstName, lastName, email) {
        await this.addEmployee(firstName, lastName, email);
        // await this.searchEmployee(`${firstName} ${lastName}`);
    }

    async centralizedtabclick(memberName) {
        await expect(this.centralizedtab).toBeVisible();
        await this.centralizedtab.click();
        await this.waitForLoader();

        await expect(this.menu).toBeVisible({ timeout: 15000 });
        await this.menu.click();

        await expect(this.managemember).toBeVisible({ timeout: 10000 });
        await this.managemember.click();

        // Wait for the modal and dropdown options to load
        await expect(this.teamMemberDropdown).toBeVisible({ timeout: 15000 });
        await this.page.waitForTimeout(2000);

        // Pick a random option (skip index 0 which is the placeholder)
        const optionCount = await this.teamMemberDropdown.locator('option').count();
        const randomIndex = Math.floor(Math.random() * (optionCount - 1)) + 1;
        await this.teamMemberDropdown.selectOption({ index: randomIndex });

        await this.saveButton.click();
        await this.waitForLoader();
    }
}

module.exports = { ManageStaffPage };
