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

        // Agent cards
        this.agentCards         = page.locator('[class*="card"], [class*="rounded"]').filter({ has: page.locator('button', { hasText: 'View Profile' }) });
        this.agentNames         = page.locator('p, h3, h4, span').filter({ has: page.locator('..') }).filter({ hasText: /^[A-Z][a-z]+ [A-Z][a-z]+/ });

        // Buttons on cards
        this.viewProfileBtns    = page.locator('button', { hasText: 'View Profile' });
        this.viewOnboardingBtns = page.locator('button', { hasText: 'View Onboarding' });
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

        // Verify all tabs are visible
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
            const tabText = (await tab.locator.textContent())?.trim();
            console.log(`>>> Tab visible: "${tabText}"`);
        }
    }

    async getAgentCountFromTab(tabLocator, tabName) {
        const tabText = (await tabLocator.textContent())?.trim();
        // Extract count from tab label e.g. "Initiated (10)" → 10
        const match = tabText?.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1]) : 0;
        console.log(`>>> ${tabName} agents: ${count}`);
        return count;
    }

    async getFirstAgentName() {
        await this.viewProfileBtns.first().waitFor({ state: 'visible', timeout: 10000 });
        // Extract name from first card using evaluate — avoids complex filter timeouts
        const name = await this.page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const firstViewProfile = btns.find(b => b.textContent.trim() === 'View Profile');
            if (!firstViewProfile) return null;
            // Walk up to find the card container
            let card = firstViewProfile.parentElement;
            for (let i = 0; i < 5; i++) {
                if (card && card.querySelectorAll('button').length >= 2) break;
                card = card?.parentElement;
            }
            if (!card) return null;
            // Find the name text: not empty, no @, no 'Created', no '%', no 'View', starts with uppercase
            const els = Array.from(card.querySelectorAll('p, h3, h4, span, div'));
            const nameEl = els.find(el => {
                const t = el.textContent.trim();
                return t.length > 2 && t.length < 60 &&
                    !t.includes('@') && !t.includes('Created') &&
                    !t.includes('%') && !t.includes('View') &&
                    /^[A-Z]/.test(t) && el.children.length === 0;
            });
            return nameEl?.textContent.trim() || null;
        });
        console.log(`>>> First agent name: "${name}"`);
        return name;
    }

    async searchAgent(agentName) {
        await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await this.searchInput.fill(agentName);
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.waitForLoader();
        await this.page.waitForTimeout(500);
        console.log(`>>> Searched for: "${agentName}"`);
    }

    async verifySearchResults(agentName) {
        const result = this.page.locator('body').locator(`text=${agentName}`).first();
        await expect(result).toBeVisible({ timeout: 10000 });
        console.log(`>>> Agent "${agentName}" found in search results`);
    }

    async clickViewProfile(agentName) {
        // Find View Profile button in the card containing the agent name
        const agentText = this.page.locator(`text=${agentName}`).first();
        await agentText.waitFor({ state: 'visible', timeout: 8000 });
        // The View Profile button is the first button sibling in the same card
        const viewProfileBtn = this.viewProfileBtns.first();
        await viewProfileBtn.waitFor({ state: 'visible', timeout: 8000 });
        await viewProfileBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.waitForLoader();
        console.log(`>>> View Profile opened: ${this.page.url()}`);
    }

    async clickViewOnboarding(agentName) {
        // Find View Onboarding button in the card containing the agent name
        const agentText = this.page.locator(`text=${agentName}`).first();
        await agentText.waitFor({ state: 'visible', timeout: 8000 });
        const viewOnboardingBtn = this.viewOnboardingBtns.first();
        await viewOnboardingBtn.waitFor({ state: 'visible', timeout: 8000 });
        await viewOnboardingBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.waitForLoader();
        console.log(`>>> View Onboarding opened: ${this.page.url()}`);
    }

    async goBack() {
        await this.page.goBack();
        await this.page.waitForURL('**/manageAgents', { timeout: 15000 }).catch(() => {});
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        console.log('>>> Navigated back to Manage Agents');
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
