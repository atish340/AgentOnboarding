import { expect } from '@playwright/test';

class FaqPage {
  constructor(page) {
    this.page = page;
    this.faqTab = page.locator('//a[@href="/faq"]');
    this.faqHeader = page.locator('//*[contains(@class,"font-bold text-xl text-black mb-4")]');
    this.addFaqButton = page.locator('//button[@class="btn-primary-blue ml-4 w-22 mt-[-10px]"]');
    this.titleInput = page.locator('//input[@placeholder="Enter title here"]').nth(1);
    this.contentInput = page.locator('//textarea[@placeholder="Enter Content here"]').nth(0);
    this.saveButton = page.locator('#add_modal > div > div > form > button.btn-primary-blue.ml-4.w-20');
    this.toastMessage = page.getByText('FAQ created successfully', { exact: true });
  }

  async openFaqTab() {
    await this.faqTab.click();
    await expect(this.faqHeader).toBeVisible({ timeout: 10000 });
  }

  async addFaq(title, content) {
    await this.addFaqButton.click();
    await this.titleInput.fill(title);
    await this.contentInput.fill(content);
    await this.saveButton.click();
    await expect(this.toastMessage).toBeVisible({ timeout: 10000 });
  }
}

module.exports = { FaqPage };


