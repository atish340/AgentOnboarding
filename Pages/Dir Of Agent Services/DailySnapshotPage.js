const { expect } = require('@playwright/test');

exports.DailySnapshotPage = class DailySnapshotPage {
    constructor(page) {
        this.page = page;
        this.menuLink     = page.locator('a', { hasText: 'Daily Snapshot' });
        this.pageTitle    = page.locator('h1, h2').filter({ hasText: /daily snapshot/i }).first();
        this.snapshotRows = page.locator('table tbody tr');
    }

    async navigateToDailySnapshot() {
        await this.page.goto('https://qa.procasaonboard.com/dailysnapshot', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
        console.log(`>>> Daily Snapshot page opened: ${this.page.url()}`);
    }

    async verifySnapshotListVisible() {
        await this.snapshotRows.first().waitFor({ state: 'visible', timeout: 10000 });
        const count = await this.snapshotRows.count();
        expect(count).toBeGreaterThan(0);
        console.log(`>>> Snapshot list has ${count} rows`);
        return count;
    }

    async clickRandomSnapshot(count) {
        const randomIndex = Math.floor(Math.random() * count);
        const row = this.snapshotRows.nth(randomIndex);
        const link = row.locator('a').first();
        const linkCount = await link.count();

        if (linkCount > 0) {
            const href = await link.getAttribute('href');
            console.log(`>>> Clicking snapshot row ${randomIndex + 1}, link: ${href}`);
            // external links open in new tab — intercept and handle
            const [newPage] = await Promise.all([
                this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
                link.click(),
            ]);
            if (newPage) {
                await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
                console.log(`>>> Snapshot opened in new tab: ${newPage.url()}`);
                await newPage.close();
                console.log('>>> New tab closed, back on Daily Snapshot');
            } else {
                await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
                console.log(`>>> Snapshot opened in same tab: ${this.page.url()}`);
                await this.page.goBack().catch(() => {});
                await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
                console.log('>>> Returned to Daily Snapshot');
            }
        } else {
            console.log(`>>> Row ${randomIndex + 1} has no link — skipping click`);
        }
    }
};
