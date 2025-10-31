import { expect } from '@playwright/test';

export class ManageStaffPage {
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
        this.teamMemberDropdown = page.getByRole('combobox').nth(2).selectOption('673ae1e76e7837db1dff406e');
        this.saveButton = page.locator('//button[@class="btn-primary-blue w-20 mt-4"]');



    }

    async openManageStaff() {
        await this.manageStaffLink.click();
        await expect(this.headingManageStaff).toBeVisible({ timeout: 10000 });
    }

    async goToMCtab() {
        await this.tabMC.click();
    }

    async addEmployee(firstName, lastName, email) {
        await this.addEmployeeBtn.click();
        await this.firstNameField.fill(firstName);
        await this.lastNameField.fill(lastName);
        await this.emailField.fill(email);

        await this.sendInviteButton.click();

        // Wait for a short duration to allow the invitation process to complete
        await this.page.waitForTimeout(2000);

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

        await expect(this.menu).toBeVisible();
        await this.menu.click();

        await expect(this.managemember).toBeVisible();
        await this.managemember.click();

        // Grab the dropdown by role
        // const dropdown = this.page.getByRole('combobox', { name: 'Team Members' });

        // Wait for the option text to appear
        // await expect(dropdown.locator(`option:has-text("${memberName}")`)).toBeVisible({ timeout: 10000 });

        // Select it
        // await dropdown.selectOption({ label: memberName });
        await this.teamMemberDropdown;


        await this.saveButton.click();
    }


}
