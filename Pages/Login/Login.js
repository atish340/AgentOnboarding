const { expect } = require('@playwright/test');

exports.LoginPage =
    class LoginPage {
        constructor(page) {
            this.page = page;
            this.emailInput = 'input[name=email]';
            this.passwordInput = 'input[name=password]';
            this.loginButton = 'button[type=submit]';
            this.forgotPasswordLink = 'a.text-sm.text-gray-600';
            this.logoImage = 'img[alt="company logo"]';
            this.loginHeader = 'h1.text-3xl.font-bold';
        }

        async navigate() {
            await this.page.goto('https://qa.procasaonboard.com/login');
        }

        async enterEmail(email) {
            await this.page.fill(this.emailInput, email);
        }

        async enterPassword(password) {
            await this.page.fill(this.passwordInput, password);
        }

        async clickLoginButton() {
            // Wait for button to be enabled (page may still be loading/hydrating)
            await this.page.waitForSelector(`${this.loginButton}:not([disabled])`, { timeout: 30000 });
            await this.page.click(this.loginButton);

            // If still on login page after 5s, button may have been re-disabled — retry once
            await this.page.waitForTimeout(5000);
            if (this.page.url().includes('/login')) {
                await this.page.waitForSelector(`${this.loginButton}:not([disabled])`, { timeout: 15000 }).catch(() => {});
                await this.page.click(this.loginButton).catch(() => {});
            }
        }

        async clickForgotPassword() {
            await this.page.click(this.forgotPasswordLink);
        }

        async isLogoVisible() {
            return await this.page.isVisible(this.logoImage);
        }

        async getLoginHeaderText() {
            return await this.page.textContent(this.loginHeader);
        }

        // Multi-role users land in their default role (e.g. Team Leader) — switch via avatar menu → "Switch role"
        async switchRole(roleName) {
            const headerRole = this.page.locator('.navbar');
            await headerRole.waitFor({ state: 'visible', timeout: 30000 });
            if ((await headerRole.innerText()).toLowerCase().includes(roleName.toLowerCase())) return;

            await this.page.locator('label.avatar').click();
            await this.page.locator('ul.dropdown-content li').filter({ hasText: 'Switch role' }).click();
            await this.page.getByText('Please select a role').waitFor({ state: 'visible', timeout: 10000 });
            await this.page.getByText(new RegExp(`^${roleName}\\(`, 'i')).first().click();
            await expect(headerRole).toContainText(new RegExp(roleName, 'i'), { timeout: 15000 });
            console.log(`✓ Switched role to "${roleName}"`);
        }
    }
