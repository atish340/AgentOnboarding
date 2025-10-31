class DatabaseDashboard {
    constructor(page) {
        this.page = page;
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
}

module.exports = { DatabaseDashboard };
