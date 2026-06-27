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
    }
