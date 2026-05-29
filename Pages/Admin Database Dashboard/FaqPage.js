const { expect } = require('@playwright/test');

class FaqPage {
  constructor(page) {
    this.page = page;
    this.faqTab = page.locator('//a[@href="/faq"]');
    this.faqHeader = page.locator('//*[contains(@class,"font-bold text-xl text-black mb-4")]');
    this.addFaqButton = page.locator('//button[@class="btn-primary-blue ml-4 w-22 mt-[-10px]"]');
    // #add_modal wraps both Add and Edit forms; use .first() to target visible Add form elements
    this.titleInput = page.locator('#add_modal input[placeholder="Enter title here"]').first();
    this.contentTextarea = page.locator('#add_modal textarea[placeholder="Enter Content here"]').first();
    this.saveButton = page.locator('#add_modal button').filter({ hasText: 'Save' }).first();
    this.toastMessage = page.getByText('FAQ created successfully', { exact: true });
  }

  async waitForLoader() {
    try { await this.page.locator('div.absolute.bg-white.bg-opacity-60').waitFor({ state: 'visible', timeout: 3000 }); } catch {}
    await this.page.locator('div.absolute.bg-white.bg-opacity-60').waitFor({ state: 'hidden', timeout: 60000 });
  }

  async openFaqTab() {
    await this.faqTab.click();
    await expect(this.faqHeader).toBeVisible({ timeout: 10000 });
    await this.waitForLoader();
  }

  async addFaq(title, content) {
    await this.addFaqButton.click();
    await expect(this.titleInput).toBeVisible({ timeout: 10000 });

    // Fill title
    await this.titleInput.click();
    await this.titleInput.fill(title);

    // Fill content — use evaluate to guarantee Vue's v-model picks up the value
    await this.contentTextarea.click();
    await this.contentTextarea.evaluate((el, val) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeInputValueSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, content);
    await this.contentTextarea.press('Tab');
    await this.page.waitForTimeout(500);

    await this.saveButton.click({ force: true });
    await expect(this.toastMessage).toBeVisible({ timeout: 40000 });
  }
}

module.exports = { FaqPage };
