const { expect } = require('@playwright/test');

exports.DailySnapshotPage = class DailySnapshotPage {
    constructor(page) {
        this.page = page;
        this.pageTitle    = page.locator('h1, h2').filter({ hasText: /daily snapshot/i }).first();
        this.snapshotRows = page.locator('table tbody tr');
        // "Add daily Snapshot" modal elements — title uses lowercase 'd'
        this.addModalTitle = page.locator('text=/add daily snapshot/i');
        // URL input — plain text input inside the modal (no for-attribute association)
        this.urlInput      = page.locator('input[type="text"]:not([disabled]):not([placeholder])');
        this.addButton     = page.getByRole('button', { name: 'Add', exact: true });
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
        // Find the first row that has NO link yet — always attach to that one
        let rowWithoutLink = -1;
        for (let i = 0; i < count; i++) {
            const actionCell = this.snapshotRows.nth(i).locator('td:last-child');
            const text = (await actionCell.textContent() || '').trim();
            if (!text || /no link yet/i.test(text)) {
                rowWithoutLink = i;
                break;
            }
        }

        if (rowWithoutLink === -1) {
            // Every row already has a link — nothing to attach
            console.log('>>> All rows already have links — no row available to attach');
            return;
        }

        console.log(`>>> Row ${rowWithoutLink + 1} has no link — attaching Google URL`);
        await this.attachSnapshotLink(rowWithoutLink, 'https://www.google.com');
        await this.openSnapshotLink(rowWithoutLink);
    }

    async attachSnapshotLink(rowIndex, url) {
        // Click the "Attach dailysnapshot link" button on the target row
        const attachBtn = this.snapshotRows.nth(rowIndex).locator('button.custom-btn');
        await attachBtn.click();

        // Wait for "Add Daily Snapshot" modal
        await expect(this.addModalTitle).toBeVisible({ timeout: 10000 });
        console.log('>>> "Add Daily Snapshot" modal opened');

        // Fill the URL field
        await this.urlInput.fill(url);

        // Click Add button
        await this.addButton.click();
        console.log('>>> Clicked Add — closing modal');

        // Wait briefly for the add operation to process
        await this.page.waitForTimeout(1500);

        // Close the modal explicitly (it may not auto-close after Add)
        const isStillOpen = await this.addModalTitle.isVisible().catch(() => false);
        if (isStillOpen) {
            // Press Escape to close (same as user doing it manually)
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);

            // If still open, try clicking a visible close/cancel button
            const stillOpen = await this.addModalTitle.isVisible().catch(() => false);
            if (stillOpen) {
                const closeBtn = this.page.locator('button').filter({ hasText: /close|cancel/i }).first();
                if (await closeBtn.count() > 0) await closeBtn.click();
            }
        }

        // Wait until modal is fully gone
        await this.addModalTitle.waitFor({ state: 'hidden', timeout: 10000 });
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        console.log(`>>> Link "${url}" attached and modal closed — row ${rowIndex + 1}`);
    }

    async openSnapshotLink(rowIndex) {
        const row = this.snapshotRows.nth(rowIndex);
        const actionCell = row.locator('td:last-child');

        const cellText = (await actionCell.textContent() || '').trim();
        console.log(`>>> Action cell content: "${cellText}"`);

        if (/no link yet/i.test(cellText)) {
            console.log(`>>> Row ${rowIndex + 1} has no link to click`);
            return;
        }

        // Click whichever element is clickable: <a>, button, or the whole cell
        const clickable = actionCell.locator('a, button').first();
        const target = (await clickable.count() > 0) ? clickable : actionCell;
        console.log(`>>> Clicking snapshot link...`);
        await target.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        console.log('>>> Link clicked — done');
    }
};
