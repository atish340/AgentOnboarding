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
            await this.page.click(this.loginButton);
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
