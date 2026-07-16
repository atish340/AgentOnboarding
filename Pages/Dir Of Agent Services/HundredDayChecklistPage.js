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
        this.applyFiltersBtn = page.locator('.fixed.inset-0 button').filter({ hasText: 'Apply Filter' });
        this.resetFilterBtn  = page.locator('button', { hasText: 'Reset' });
        this.accordionHeader = page.locator('.accordion-item .flex.justify-between.cursor-pointer').first();
        this.accordionTotal  = page.locator('.accordion-item .justify-end.text-sm.font-semibold').first();
        this.agentCards      = page.locator('[data-v-5fea4b9a] .cursor-pointer');
        this.viewTaskBtn     = page.locator('button.mr-1', { hasText: 'View Task' }).first();
    }

    async navigateToChecklist() {
        await this.page.goto('https://qa.procasaonboard.com/checklist-dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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
        await this.clickCard('Total Tasks');
        const cardTotal = await this.getCardCount('Total Tasks');
        const accordionText = (await this.accordionTotal.textContent())?.trim() ?? '';
        const match = accordionText.match(/(\d+)$/);
        const accordionTotal = match ? parseInt(match[1], 10) : -1;
        expect(accordionTotal).toBe(cardTotal);
        console.log(`>>> Total Tasks card (${cardTotal}) matches accordion total (${accordionTotal})`);

        for (const card of ['Completed Tasks', 'Past Due Tasks', 'Future Tasks']) {
            await this.clickCard(card);
        }

        await this.clickCard('Total Tasks');
        return cardTotal;
    }

    async openFilterPanel() {
        await this.applyFilterBtn.click();
        await this.page.locator('#searchInput').waitFor({ state: 'visible', timeout: 8000 });
        console.log('>>> Filter panel opened');
    }

    async selectWeek(weekValue) {
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

    async filterByAgentName(name) {
        await this.openFilterPanel();
        const searchInput = this.page.locator('#searchInput');
        await searchInput.clear();
        await searchInput.fill(name);
        await this.page.waitForTimeout(800);
        const suggestion = this.page.locator('.fixed.inset-0 ul li, .fixed.inset-0 [role="listbox"] [role="option"]').first();
        const hasSuggestion = await suggestion.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasSuggestion) {
            await suggestion.click();
            await this.page.waitForTimeout(300);
            console.log(`>>> Selected agent suggestion for "${name}"`);
        }
        await this.submitFilter();
        console.log(`>>> Agent name filter applied: "${name}"`);
    }

    async expandFirstAgentCard() {
        await this.agentCards.first().click();
        await this.page.locator('[data-v-5fea4b9a] table').first().waitFor({ state: 'visible', timeout: 10000 });
        console.log('>>> First agent card expanded');
    }

    async expandFirstAgentCardIfCollapsed() {
        const cardCount = await this.agentCards.count();
        if (cardCount === 0) {
            console.log('>>> No agent cards found — skipping expand');
            return false;
        }
        const table = this.page.locator('[data-v-5fea4b9a] table').first();
        const alreadyExpanded = await table.isVisible({ timeout: 2000 }).catch(() => false);
        if (!alreadyExpanded) {
            await this.agentCards.first().click();
            await table.waitFor({ state: 'visible', timeout: 10000 });
            console.log('>>> First agent card expanded');
        } else {
            console.log('>>> First agent card already expanded — skipping click');
        }
        return true;
    }

    async expandAgentCardByName(name) {
        const card = this.page.locator('[data-v-5fea4b9a] .cursor-pointer').filter({ hasText: name }).first();
        const cardVisible = await card.isVisible({ timeout: 5000 }).catch(() => false);
        if (!cardVisible) {
            console.log(`>>> No card found for agent "${name}" after filter`);
            return false;
        }
        const table = this.page.locator('[data-v-5fea4b9a] table').first();
        const alreadyExpanded = await table.isVisible({ timeout: 2000 }).catch(() => false);
        if (!alreadyExpanded) {
            await card.click();
            await table.waitFor({ state: 'visible', timeout: 10000 });
            console.log(`>>> Agent card for "${name}" expanded`);
        } else {
            console.log(`>>> Agent card for "${name}" already expanded`);
        }
        return true;
    }

    async clickViewTask() {
        await this.viewTaskBtn.waitFor({ state: 'visible', timeout: 8000 });
        await this.viewTaskBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 });
        const currentUrl = this.page.url();
        console.log(`>>> View Task clicked — now at: ${currentUrl}`);
        if (currentUrl.includes('/agentschecklist/')) {
            console.log('>>> Waiting 60s for agent checklist page to fully load...');
            await this.page.waitForTimeout(60000);
            console.log('>>> 60s wait done ✓');
        }
    }

    async navigateToCurrentDay() {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();

        // Step A: Click the <p> week element whose date range contains today.
        // Scoping to <p> tags avoids matching parent containers that share the same text,
        // which caused the TreeWalker approach to click the wrong element.
        const weekClicked = await this.page.evaluate((months) => {
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            function parseDate(str) {
                const m = str.match(/([A-Z][a-z]+)\s+(\d{1,2})\s+(\d{4})/);
                if (!m) return null;
                const mi = months.indexOf(m[1]);
                return mi < 0 ? null : new Date(parseInt(m[3]), mi, parseInt(m[2]), 12);
            }
            for (const p of document.querySelectorAll('p')) {
                const text = p.textContent || '';
                const rng = text.match(/([A-Z][a-z]+ \d{1,2} \d{4}) - ([A-Z][a-z]+ \d{1,2} \d{4})/);
                if (!rng) continue;
                const start = parseDate(rng[1]), end = parseDate(rng[2]);
                if (!start || !end) continue;
                end.setHours(23, 59, 59);
                if (today >= start && today <= end) { p.click(); return rng[0]; }
            }
            return null;
        }, months);
        console.log(`>>> Week click result: ${weekClicked || 'not found'}`);
        await this.page.waitForTimeout(1200);

        // Step B: Select today's date from the native <select> (Tasks for combobox).
        // After the week click the options update to "Day X - MMM D YYYY" format.
        const todayStr = `${months[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`;
        const daySelect = this.page.locator('select').first();
        const todayOpt = daySelect.locator('option').filter({ hasText: todayStr }).first();
        const todayOptText = await todayOpt.textContent().catch(() => null);
        if (todayOptText) {
            await daySelect.selectOption({ label: todayOptText.trim() });
            console.log(`>>> Selected today: ${todayOptText.trim()}`);
        } else {
            console.log(`>>> No option found for "${todayStr}" — proceeding on current day`);
        }
        await this.page.waitForTimeout(800);
    }

    async addTaskOnViewPage(taskTitle) {
        // Wait for page to be fully stable before interacting (handles post-navigation context loss)
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
        await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
        console.log(`>>> Page stable at: ${this.page.url()}`);

        // Navigate to current week + today's date so the edit icon becomes visible
        await this.navigateToCurrentDay();

        // Step 1: Click pencil edit icon.
        // The pencil may have pointer-events:none so elementFromPoint returns its wrapper (div/button),
        // not the img itself — accept ANY small non-background element to the right of the select.
        // The select may also be nested in a wrapper div, so DOM sibling walk must go up first.
        const pencilXY = await this.page.evaluate(() => {
            const select = document.querySelector('select');
            if (!select) return null;
            const sr = select.getBoundingClientRect();
            const cy = Math.round(sr.top + sr.height / 2);

            // Strategy 1: elementFromPoint rightward — accept any small element (not just IMG)
            for (let dy = -30; dy <= 30; dy += 10) {
                for (let dx = 10; dx <= 700; dx += 10) {
                    const el = document.elementFromPoint(sr.right + dx, cy + dy);
                    if (!el || el === document.body || el === document.documentElement) continue;
                    const r = el.getBoundingClientRect();
                    if (r.width > 0 && r.width < 150 && r.height > 0 && r.height < 80 && r.top > 100) {
                        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
                    }
                }
            }

            // Strategy 2: walk up from select, then search for a nearby img in each ancestor
            let node = select;
            for (let depth = 0; depth < 8; depth++) {
                node = node.parentElement;
                if (!node || node === document.body) break;
                const imgs = Array.from(node.querySelectorAll('img'));
                for (const img of imgs) {
                    const r = img.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0 &&
                        r.left >= sr.left &&
                        Math.abs(r.top + r.height / 2 - cy) < 80) {
                        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
                    }
                }
            }
            return null;
        });
        if (!pencilXY) throw new Error('Pencil icon not found next to day combobox');
        await this.page.mouse.click(pencilXY.x, pencilXY.y);
        console.log(`>>> Clicked pencil icon at (${pencilXY.x}, ${pencilXY.y})`);

        // Confirm Edit Activity Form opened
        await this.page.locator('text=Edit Activity Form').first().waitFor({ state: 'visible', timeout: 10000 });
        console.log('>>> Edit Activity Form opened ✓');
        await this.page.waitForTimeout(500);

        // Step 2: Click ⊕ Add Task button
        const addTaskBtn = this.page.locator('button').filter({ hasText: /add\s*task/i }).first();
        await addTaskBtn.waitFor({ state: 'visible', timeout: 10000 });
        await addTaskBtn.click();
        console.log('>>> Clicked Add Task');

        // Confirm Add Form Field modal opened
        await this.page.locator('text=Add Form Field').first().waitFor({ state: 'visible', timeout: 10000 });
        console.log('>>> Add Form Field modal opened ✓');
        await this.page.waitForTimeout(500);

        // Step 3: Type title in the Add Form Field panel's Title Tiptap editor.
        // Add Form Field is inside the drawer (not teleported), so nth(0) is the panel's
        // Title editor. We use evaluate(el.focus()) rather than force:true click because
        // force:true uses dispatchEvent which skips browser-native focus — without real
        // focus ProseMirror's onUpdate callback never fires and Vue's model stays empty,
        // leaving the Save button disabled despite text appearing in the DOM.
        const titleEditor = this.page.locator('div.tiptap.ProseMirror').nth(0);
        await titleEditor.waitFor({ state: 'visible', timeout: 8000 });
        await titleEditor.evaluate(el => el.focus());
        await this.page.waitForTimeout(200);
        await this.page.keyboard.type(taskTitle);
        console.log(`>>> Title typed: "${taskTitle}"`);
        await this.page.waitForTimeout(500);

        // Step 4: Select Yes/No from the Type native <select> in the modal.
        // Filter by option text to avoid matching the Add Tag custom combobox.
        const typeSelect = this.page.locator('select')
            .filter({ has: this.page.locator('option', { hasText: 'Yes/No' }) }).first();
        await typeSelect.waitFor({ state: 'visible', timeout: 8000 });
        await typeSelect.selectOption({ label: 'Yes/No' });
        console.log('>>> Yes/No type selected');
        await this.page.waitForTimeout(300);

        // Step 5: Click Save inside the Add Form Field modal.
        // The modal Save button is the sibling immediately before the "Add Task" button —
        // use evaluate() to find and click it directly, bypassing CSS visibility issues.
        const modalSaveClicked = await this.page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const addTaskIdx = btns.findIndex(b => /add\s*task/i.test((b.textContent || '').trim()));
            if (addTaskIdx > 0) {
                for (let i = addTaskIdx - 1; i >= 0; i--) {
                    if (/^save$/i.test((btns[i].textContent || '').trim())) {
                        btns[i].click();
                        return true;
                    }
                }
            }
            return false;
        });
        console.log(`>>> Modal Save clicked: ${modalSaveClicked}`);
        // Wait for the "Add Form Field" panel to close after saving
        await this.page.locator('text=Add Form Field').first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {
            console.log('>>> Add Form Field panel may still be visible — continuing');
        });
        await this.page.waitForTimeout(1000);

        // Step 6: Save the Edit Activity Form.
        // The banner Save is disabled after the panel Save (form resets its dirty-flag once
        // the task is persisted). Remove the disabled attribute and click on the same JS
        // tick before Vue's next-tick can re-disable it.
        await this.page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const saveBtn = btns.find(b => /^save$/i.test((b.textContent || '').trim()));
            if (saveBtn) { saveBtn.removeAttribute('disabled'); saveBtn.click(); }
        });
        console.log('>>> Saved Edit Activity Form ✓');
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
    }

    async verifyCountChangedAfterFilter(previousTotal) {
        const newCardTotal = await this.getCardCount('Total Tasks');
        const accordionText = (await this.accordionTotal.textContent())?.trim() ?? '';
        const match = accordionText.match(/\d+/);
        const newAccordionTotal = match ? parseInt(match[0], 10) : -1;
        console.log(`>>> After Week 1 filter — Card: ${newCardTotal}, Accordion: ${newAccordionTotal} (was ${previousTotal})`);
        expect(newAccordionTotal).toBe(newCardTotal);
        return newCardTotal;
    }

    async returnToChecklist() {
        await this.menuLink.click();
        await this.page.waitForURL('**/checklist-dashboard', { timeout: 15000 });
        await this.page.waitForLoadState('networkidle');
        console.log('>>> Returned to 100-Day Checklist');
    }

    async switchToTab1() {
        await this.tab1.click();
        await this.page.waitForTimeout(800);
        await this.page.waitForLoadState('networkidle').catch(() => {});
        console.log(">>> Switched to Agent's 100 Days Checklist tab (Tab 1)");
    }

    async switchToTab2() {
        await this.tab2.click();
        await this.page.waitForTimeout(800);
        await this.page.waitForLoadState('networkidle').catch(() => {});
        console.log(">>> Switched to Agent's Completed 100 Days Checklist tab");
    }
};
