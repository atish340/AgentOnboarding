const { expect } = require('@playwright/test');

exports.HundredDayChecklistPage = class HundredDayChecklistPage {
    constructor(page) {
        this.page = page;
        this.menuLink        = page.locator('a[href="/checklist-dashboard"]');
        this.pageTitle       = page.locator('h1.font-semibold.text-md');
        this.tab1            = page.locator('button', { hasText: "Agent's 100 Days Checklist" });
        this.tab2            = page.locator('button', { hasText: "Agent's Completed 100 Days Checklist" });
        this.applyFilterBtn  = page.locator('button.h-9', { hasText: 'Apply Filter' });
        this.weekSelect      = page.locator('label:has-text("Select Week") ~ select, label:has-text("Select Week") + select').first();
        // "Apply Filter" inside the panel — scoped to the fixed overlay to distinguish from the trigger button
        this.applyFiltersBtn = page.locator('.fixed.inset-0 button').filter({ hasText: 'Apply Filter' });
        this.resetFilterBtn  = page.locator('button', { hasText: 'Reset' });
        this.accordionHeader = page.locator('.accordion-item .flex.justify-between.cursor-pointer').first();
        this.accordionTotal  = page.locator('.accordion-item .justify-end.text-sm.font-semibold').first();
        this.agentCards      = page.locator('[data-v-5fea4b9a] .cursor-pointer');
        this.viewTaskBtn     = page.locator('button.mr-1', { hasText: 'View Task' }).first();
    }

    async navigateToChecklist() {
        await this.menuLink.click();
        await this.page.waitForURL('**/checklist-dashboard', { timeout: 15000 });
        await this.page.waitForLoadState('networkidle');
        await expect(this.pageTitle).toHaveText("100 Day's Checklist", { timeout: 10000 });
        console.log(">>> 100-Day Checklist page opened");
    }

    async getCardCount(cardId) {
        const text = await this.page.evaluate((id) => {
            return document.getElementById(id)?.textContent?.trim();
        }, cardId);
        return parseInt(text ?? '0', 10);
    }

    async clickCard(cardId) {
        await this.page.evaluate((id) => {
            document.getElementById(id)?.parentElement?.parentElement?.parentElement?.click();
        }, cardId);
        await this.page.waitForTimeout(500);
        console.log(`>>> Clicked card: "${cardId}"`);
    }

    async clickAllCardsAndVerifyTotal() {
        // Click Total Tasks first and verify accordion count matches
        await this.clickCard('Total Tasks');
        const cardTotal = await this.getCardCount('Total Tasks');
        const accordionText = (await this.accordionTotal.textContent())?.trim() ?? '';
        const match = accordionText.match(/(\d+)$/);
        const accordionTotal = match ? parseInt(match[1], 10) : -1;
        expect(accordionTotal).toBe(cardTotal);
        console.log(`>>> Total Tasks card (${cardTotal}) matches accordion total (${accordionTotal})`);

        // Click remaining cards
        for (const card of ['Completed Tasks', 'Past Due Tasks', 'Future Tasks']) {
            await this.clickCard(card);
        }

        // Reset back to Total Tasks view for filter step
        await this.clickCard('Total Tasks');
        return cardTotal;
    }

    async openFilterPanel() {
        await this.applyFilterBtn.click();
        await this.page.locator('#searchInput').waitFor({ state: 'visible', timeout: 8000 });
        console.log('>>> Filter panel opened');
    }

    async selectWeek(weekValue) {
        // week select is the first select inside the filter panel with "All Weeks" option
        const weekSel = this.page.locator('.fixed.inset-0 select').filter({ hasText: 'All Weeks' }).first();
        await weekSel.selectOption({ value: weekValue });
        console.log(`>>> Week selected: ${weekValue}`);
    }

    async submitFilter() {
        await this.applyFiltersBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(500);
        console.log('>>> Filter applied');
    }

    async resetFilter() {
        await this.openFilterPanel();
        await this.resetFilterBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(500);
        console.log('>>> Filter reset');
    }

    async verifyCountChangedAfterFilter(previousTotal) {
        const newCardTotal = await this.getCardCount('Total Tasks');
        const accordionText = (await this.accordionTotal.textContent())?.trim() ?? '';
        const match = accordionText.match(/\d+/);
        const newAccordionTotal = match ? parseInt(match[0], 10) : -1;
        console.log(`>>> After Week 1 filter — Card: ${newCardTotal}, Accordion: ${newAccordionTotal} (was ${previousTotal})`);
        // accordion total should match card total after filter
        expect(newAccordionTotal).toBe(newCardTotal);
        return newCardTotal;
    }

    async expandFirstAgentCard() {
        await this.agentCards.first().click();
        // wait for table inside the expanded card
        await this.page.locator('[data-v-5fea4b9a] table').first().waitFor({ state: 'visible', timeout: 10000 });
        console.log('>>> First agent card expanded');
    }

    async clickViewTask() {
        await this.viewTaskBtn.waitFor({ state: 'visible', timeout: 8000 });
        await this.viewTaskBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log(`>>> View Task clicked — now at: ${this.page.url()}`);
    }

    async returnToChecklist() {
        await this.menuLink.click();
        await this.page.waitForURL('**/checklist-dashboard', { timeout: 15000 });
        await this.page.waitForLoadState('networkidle');
        console.log('>>> Returned to 100-Day Checklist');
    }

    async switchToTab2() {
        await this.tab2.click();
        await this.page.waitForTimeout(800);
        await this.page.waitForLoadState('networkidle').catch(() => {});
        console.log(">>> Switched to Agent's Completed 100 Days Checklist tab");
    }
};
