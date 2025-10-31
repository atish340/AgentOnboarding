const { expect } = require('@playwright/test');

exports.AddAgentPage = class AddAgentPage {
  constructor(page) {
    this.page = page;
    this.addAgentButton = page.locator('//button[@class="button-black mt-2 mb-4 mx-5 h-11"]');
    this.firstNameInput = page.locator('//input[@placeholder="Enter first name"]');
    this.lastNameInput = page.locator('//input[@placeholder="Enter last name"]');
    this.emailInput = page.locator('//input[@placeholder="Enter email"]');
    this.phoneInput = page.locator('//input[@placeholder="(999)-999-9999"]');
    this.roleRadio = page.locator('//label[.//input[@value="R0"]]');
    this.termsCheckbox = page.locator('//label[.//input[@name="Standard termsItem 1"]]');
    this.saveButton = page.locator('//input[@type="button" and @title="Save"]');
    this.toastMessage = page.getByRole('img', { name: 'play_icon' });

  }

  async addNewAgent({ firstName, lastName, email, phone }) {
    await this.addAgentButton.click();
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.emailInput.fill(email);
    await this.phoneInput.fill(phone);
    await this.roleRadio.click();
    await this.termsCheckbox.click();
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
    await expect(this.toastMessage).toBeVisible({ timeout: 10000 });


  }
};

