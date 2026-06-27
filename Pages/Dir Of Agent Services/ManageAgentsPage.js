const { expect } = require('@playwright/test');

exports.ManageAgentsPage = class ManageAgentsPage {
    constructor(page) {
        this.page = page;
        this.manageAgentsLink   = page.locator('//a[@href="/manageAgents"]');
        this.pageTitle          = page.locator('text=Manage Agents').first();
        this.loader             = page.locator('div.absolute.bg-white.bg-opacity-60');
        this.searchInput        = page.locator('input[placeholder="Search Agent Name"]');

        // Status tabs
        this.tabInitiated       = page.locator('text=Initiated').first();
        this.tabInProgress      = page.locator('text=In Progress').first();
        this.tabCompleted       = page.locator('text=Completed').first();
        this.tabCancelled       = page.locator('text=Cancelled').first();
        this.tabDisabled        = page.locator('text=Disabled').first();
        this.tab100Day          = page.locator('text=100-Day Checklist').first();
        this.tabPendingCreds    = page.locator('text=Pending Credentials').first();

        // Agent name divs — confirmed from DOM: div.capitalize.truncate with title attribute
        this.agentNameDivs      = page.locator('div.capitalize.truncate[title]');

        // Buttons — confirmed from DOM: data-testid prefixes
        this.viewProfileBtns    = page.locator('[data-testid^="agent-view-profile-"]');
        this.viewOnboardingBtns = page.locator('[data-testid^="agent-view-onboarding-"]');
    }

    async waitForLoader() {
        try { await this.loader.waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.loader.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }

    async navigateToManageAgents() {
        await this.manageAgentsLink.click();
        await this.page.waitForURL('**/manageAgents', { timeout: 15000 });
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.waitForLoader();
        console.log(`>>> Manage Agents opened: ${this.page.url()}`);
    }

    async verifyPageAndTabs() {
        await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
        console.log('>>> Page title verified: Manage Agents');

        const tabs = [
            { locator: this.tabInitiated,    name: 'Initiated' },
            { locator: this.tabInProgress,   name: 'In Progress' },
            { locator: this.tabCompleted,    name: 'Completed' },
            { locator: this.tabCancelled,    name: 'Cancelled' },
            { locator: this.tabDisabled,     name: 'Disabled' },
            { locator: this.tab100Day,       name: '100-Day Checklist' },
            { locator: this.tabPendingCreds, name: 'Pending Credentials' },
        ];
        for (const tab of tabs) {
            await expect(tab.locator).toBeVisible({ timeout: 8000 });
            const text = (await tab.locator.textContent())?.trim();
            console.log(`>>> Tab visible: "${text}"`);
        }
    }

    async getAgentCountFromTab(tabLocator, tabName) {
        const text  = (await tabLocator.textContent())?.trim();
        const match = text?.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1]) : 0;
        console.log(`>>> ${tabName} count: ${count}`);
        return count;
    }

    async getAllTabCounts() {
        const tabs = [
            { locator: this.tabInitiated,    name: 'Initiated' },
            { locator: this.tabInProgress,   name: 'In Progress' },
            { locator: this.tabCompleted,    name: 'Completed' },
            { locator: this.tabCancelled,    name: 'Cancelled' },
            { locator: this.tabDisabled,     name: 'Disabled' },
            { locator: this.tab100Day,       name: '100-Day Checklist' },
            { locator: this.tabPendingCreds, name: 'Pending Credentials' },
        ];
        for (const tab of tabs) {
            await this.getAgentCountFromTab(tab.locator, tab.name);
        }
    }

    async clickTab(tabLocator, tabName) {
        await tabLocator.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.waitForLoader();
        await this.page.waitForTimeout(500);
        console.log(`>>> Active tab: "${tabName}"`);
    }

    async getFirstAgentName() {
        try {
            await this.agentNameDivs.first().waitFor({ state: 'visible', timeout: 8000 });
            const name = await this.agentNameDivs.first().getAttribute('title');
            console.log(`>>> First agent: "${name}"`);
            return name;
        } catch {
            console.log('>>> No agents on this tab');
            return null;
        }
    }

    async searchAgent(agentName) {
        await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await this.searchInput.fill(agentName);
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.waitForLoader();
        await this.page.waitForTimeout(500);
        console.log(`>>> Searched: "${agentName}"`);
    }

    async clearSearch() {
        await this.searchInput.fill('');
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.waitForLoader();
        await this.page.waitForTimeout(500);
        console.log('>>> Search cleared');
    }

    async verifySearchResults(agentName) {
        const result = this.page.locator(`[title="${agentName}"]`).first();
        await expect(result).toBeVisible({ timeout: 10000 });
        console.log(`>>> Search result verified: "${agentName}"`);
    }

    async clickViewProfile() {
        // Find the first ENABLED View Profile button (some tabs like Cancelled have disabled buttons)
        const enabledBtn = this.page.locator('[data-testid^="agent-view-profile-"]:not([disabled])');
        const hasEnabled = await enabledBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
        if (!hasEnabled) {
            console.log('>>> View Profile button is disabled — skipping');
            return false;
        }
        await enabledBtn.first().click();
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.waitForLoader();
        console.log(`>>> View Profile opened: ${this.page.url()}`);
        return true;
    }

    async clickViewOnboarding() {
        // Find the first ENABLED View Onboarding button
        const enabledBtn = this.page.locator('[data-testid^="agent-view-onboarding-"]:not([disabled])');
        const hasEnabled = await enabledBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
        if (!hasEnabled) {
            console.log('>>> View Onboarding button is disabled — skipping');
            return false;
        }
        await enabledBtn.first().click();
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.waitForLoader();
        console.log(`>>> View Onboarding opened: ${this.page.url()}`);
        return true;
    }

    async goBack() {
        await this.page.goBack();
        await this.page.waitForURL('**/manageAgents', { timeout: 15000 }).catch(() => {});
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.waitForLoader();
        console.log('>>> Back to Manage Agents');
    }

    // Used by Add New Agent test
    async searchAndVerifyAgent_legacy(firstName) {
        await this.searchInput.waitFor({ state: 'visible', timeout: 15000 });
        await this.searchInput.fill(firstName);
        const matchingCard = this.page.locator(`//*[contains(text(),"${firstName}")]`).first();
        await expect(matchingCard).toBeVisible({ timeout: 15000 });
        console.log(`>>> Agent "${firstName}" confirmed in Manage Agents`);
    }
};
