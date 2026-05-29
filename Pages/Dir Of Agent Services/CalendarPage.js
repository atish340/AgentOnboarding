const { expect } = require('@playwright/test');

exports.CalendarPage = class CalendarPage {
    constructor(page) {
        this.page = page;
        this.menuLink = page.locator('a', { hasText: 'Calendar' });
    }

    async navigateToCalendar() {
        await this.menuLink.click();
        await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        console.log(`>>> Calendar opened: ${this.page.url()}`);
    }

    async clickCurrentDate() {
        const today = this.page.locator('.fc-day-today, .fc-daygrid-day.fc-day-today').first();
        const fallback = this.page.locator(`[data-date="${new Date().toISOString().split('T')[0]}"]`).first();
        const todayVisible = await today.isVisible().catch(() => false);
        if (todayVisible) {
            await today.click();
        } else {
            await fallback.click();
        }
        await this.page.waitForTimeout(800);
        console.log('>>> Clicked current date');
    }

    async fillEventForm(title, link, startHour, startMinute, startAmPm) {
        await this.page.waitForTimeout(500);

        // Selects in order: 0=Agent, 1=StartHour, 2=StartMin, 3=StartAMPM, 4=EndHour, 5=EndMin, 6=EndAMPM
        const allSelects = this.page.locator('select');
        await allSelects.first().waitFor({ state: 'visible', timeout: 8000 });

        // Agent — index 0
        await allSelects.nth(0).selectOption({ index: 1 });
        const agentName = await allSelects.nth(0).evaluate(el => el.options[el.selectedIndex]?.text);
        console.log(`>>> Agent selected: "${agentName?.trim()}"`);

        // Event title
        const titleInput = this.page.locator('input').filter({ hasText: '' }).nth(0)
            .or(this.page.locator('input[placeholder*="Title"], input[placeholder*="title"]').first());
        // Use a more direct approach: find all inputs and pick the text one
        const inputs = this.page.locator('input[type="text"], input:not([type])');
        await inputs.first().waitFor({ state: 'visible', timeout: 8000 });
        await inputs.nth(0).fill(title);
        console.log(`>>> Event title: "${title}"`);

        // Event link — second text input
        const inputCount = await inputs.count();
        if (inputCount > 1) {
            await inputs.nth(1).fill(link);
            console.log(`>>> Event link: "${link}"`);
        }

        // Start time — indexes 1, 2, 3
        await allSelects.nth(1).selectOption(startHour.toString());
        await allSelects.nth(2).selectOption(String(startMinute).padStart(2, '0'));
        await allSelects.nth(3).selectOption(startAmPm);
        console.log(`>>> Start time: ${startHour}:${String(startMinute).padStart(2, '0')} ${startAmPm}`);

        // End time: 2 hours after start — indexes 4, 5, 6
        let endHour = startHour + 2;
        let endAmPm = startAmPm;
        if (endHour > 12) { endHour -= 12; endAmPm = startAmPm === 'AM' ? 'PM' : 'AM'; }
        await allSelects.nth(4).selectOption(endHour.toString());
        await allSelects.nth(5).selectOption(String(startMinute).padStart(2, '0'));
        await allSelects.nth(6).selectOption(endAmPm);
        console.log(`>>> End time: ${endHour}:${String(startMinute).padStart(2, '0')} ${endAmPm}`);
    }

    async submitEvent() {
        const submitBtn = this.page.getByRole('button', { name: 'Submit' });
        await submitBtn.waitFor({ state: 'visible', timeout: 8000 });
        await submitBtn.click();
        console.log('>>> Submit clicked');
    }

    async verifyEventAdded() {
        const toast = this.page.locator('[data-testid="toast-body"]').first();
        await expect(toast).toBeVisible({ timeout: 15000 });
        const msg = (await toast.textContent())?.trim();
        console.log(`>>> Toast: "${msg}"`);
        return msg;
    }
};
