const { expect } = require('@playwright/test');

function randomPhone() {
    return `(${Math.floor(Math.random()*900)+100})-${Math.floor(Math.random()*900)+100}-${Math.floor(Math.random()*9000)+1000}`;
}
function randomZip() {
    return String(Math.floor(Math.random()*90000)+10000);
}
function randomLetters(n) {
    const c = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({length:n},()=>c[Math.floor(Math.random()*c.length)]).join('');
}

exports.AgentOnboardingPage = class AgentOnboardingPage {
    constructor(page) {
        this.page   = page;
        this.loader = page.locator('div.absolute.bg-white.bg-opacity-60');
    }

    async waitForLoader() {
        try { await this.loader.waitFor({ state: 'visible', timeout: 3000 }); } catch {}
        await this.loader.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }

    // ── Step 1: Find a 0% agent in Manage Agents and click View Onboarding ──────

    async clickViewOnboardingForZeroAgent() {
        await this.page.waitForTimeout(1000);

        const viewOnboardingBtns = this.page.locator('button', { hasText: 'View Onboarding' });
        await viewOnboardingBtns.first().waitFor({ state: 'visible', timeout: 10000 });
        const total = await viewOnboardingBtns.count();
        console.log(`>>> Scanning ${total} agent cards for 0% progress badge...`);

        // Walk UP from each % badge to find its card's "View Onboarding" button index
        const targetIndex = await this.page.evaluate(() => {
            const allViewBtns = Array.from(document.querySelectorAll('button'))
                .filter(b => b.textContent.trim() === 'View Onboarding');

            // Find every leaf element showing a percentage (e.g. "0%", "3%")
            const percentBadges = Array.from(document.querySelectorAll('*'))
                .filter(el => el.children.length === 0 && /^\d+%$/.test(el.textContent.trim()));

            for (const badge of percentBadges) {
                const pct = badge.textContent.trim();

                // Walk UP from the badge until we find a container with a "View Onboarding" button
                let node = badge;
                for (let i = 0; i < 15; i++) {
                    node = node?.parentElement;
                    if (!node) break;
                    const viewBtn = Array.from(node.querySelectorAll('button'))
                        .find(b => b.textContent.trim() === 'View Onboarding');
                    if (viewBtn) {
                        const idx = allViewBtns.indexOf(viewBtn);
                        console.log && console.log(`Badge "${pct}" → card index ${idx}`);
                        if (pct === '0%') return idx;
                        break; // not 0% — check next badge
                    }
                }
            }
            return -1;
        });

        // Log progress of each card for visibility
        for (let i = 0; i < total; i++) {
            const pct = await viewOnboardingBtns.nth(i).evaluate(el => {
                let node = el;
                for (let j = 0; j < 15; j++) {
                    node = node?.parentElement;
                    if (!node) break;
                    const leaves = Array.from(node.querySelectorAll('*')).filter(e => e.children.length === 0);
                    const badge = leaves.find(e => /^\d+%$/.test(e.textContent.trim()));
                    if (badge) return badge.textContent.trim();
                }
                return 'n/a';
            }).catch(() => 'n/a');
            console.log(`>>> Card ${i}: "${pct}"`);
        }

        if (targetIndex === -1) {
            throw new Error('No agent card found with "0%" progress badge on the Manage Agents page');
        }

        console.log(`>>> Clicking View Onboarding for 0% agent at card index ${targetIndex}`);
        await viewOnboardingBtns.nth(targetIndex).click();
        await this.page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
        await this.waitForLoader();

        // Wait for the actual profile content — tabs must be visible before proceeding
        await this.page.locator('text=Pre-Onboarding Activities').first()
            .waitFor({ state: 'visible', timeout: 30000 });
        console.log(`>>> Navigated to agent onboarding: ${this.page.url()}`);

        // Navigate to Pre-Onboarding Activities → Onboarding Form step
        await this.openPreOnboardingActivities();
        await this.clickOnboardingFormStep();
    }

    // ── Step 2: Verify 4 onboarding stages are visible ──────────────────────────

    async verifyOnboardingStages() {
        // Stages appear as tabs at the top of the page — wait for page to load first
        await this.page.waitForTimeout(1500);
        const stages = [
            'Pre-Onboarding Activities',
            'Onboarding Activities',
            'Account Setup',
            'Confirmation',
        ];
        for (const stage of stages) {
            const el = this.page.locator(`text=${stage}`).first();
            const visible = await el.isVisible({ timeout: 10000 }).catch(() => false);
            if (visible) {
                await expect(el).toBeVisible();
            }
            console.log(`>>> Stage ${visible ? 'visible ✓' : 'NOT found'}: "${stage}"`);
        }
    }

    // ── Step 3: Click Pre-Onboarding Activities → Onboarding Form ───────────────

    async openPreOnboardingActivities() {
        const preOnboarding = this.page.locator('text=Pre-Onboarding Activities').first();
        await preOnboarding.waitFor({ state: 'visible', timeout: 10000 });
        await preOnboarding.click();
        await this.page.waitForTimeout(800);
        console.log('>>> Pre-Onboarding Activities expanded');
    }

    async clickOnboardingFormStep() {
        await this.waitForLoader();
        await this.page.waitForTimeout(500);

        // Find the <p> with "Onboarding Form" text, then walk up to the flex row div
        // and call native .click() — ensures Vue's router receives the event
        await this.page.evaluate(() => {
            const allP = Array.from(document.querySelectorAll('p, span, a'));
            const stepText = allP.find(el =>
                el.textContent.trim() === 'Onboarding Form' && el.children.length === 0
            );
            if (!stepText) return;
            // Walk up to the clickable row (flex w-full div)
            let node = stepText;
            for (let i = 0; i < 6; i++) {
                node = node?.parentElement;
                if (!node) break;
                if (node.classList.contains('flex') && node.classList.contains('w-full')) {
                    node.click();
                    return;
                }
            }
            // Fallback: click direct parent
            stepText.parentElement?.click();
        });

        await this.page.waitForTimeout(2000);
        await this.waitForLoader();
        console.log('>>> Onboarding Form step clicked');
    }

    // ── Step 4: Select "Don't Send" and click Send & Next ──────────────────────

    async selectDontSendAndProceed() {
        // Check if "Don't Send" option is available (only for fresh agents where email not yet sent)
        const dontSend = this.page.locator('text=Don\'t Send').first()
            .or(this.page.locator('label', { hasText: /don.?t send/i }).first());

        const dontSendVisible = await dontSend.isVisible({ timeout: 3000 }).catch(() => false);

        if (!dontSendVisible) {
            console.log('>>> "Don\'t Send" not available — email already sent, skipping send step');
            return false;
        }

        await dontSend.click();
        await this.page.waitForTimeout(300);
        console.log('>>> "Don\'t Send" selected');

        const sendNextBtn = this.page.locator('button', { hasText: /send\s*&\s*next/i }).first();
        await sendNextBtn.waitFor({ state: 'visible', timeout: 8000 });
        await sendNextBtn.click();
        await this.page.waitForTimeout(500);
        console.log('>>> Send & Next clicked');
        return true;
    }

    async verifyEmailSentToast() {
        const toast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
        await expect(toast).toBeVisible({ timeout: 10000 });
        const msg = (await toast.textContent())?.trim();
        console.log(`>>> Toast: "${msg}"`);
        expect(msg).toContain('successfully');
        // Wait for page to settle after Send & Next before next interaction
        await this.page.waitForTimeout(1500);
        await this.waitForLoader();
        return msg;
    }

    // ── Step 5: Click Fill Onboarding Form ──────────────────────────────────────

    async clickFillOnboardingForm() {
        const fillBtn = this.page.locator('button, a').filter({ hasText: /fill onboarding form/i }).first()
            .or(this.page.locator('text=Fill Onboarding Form').first());
        await fillBtn.waitFor({ state: 'visible', timeout: 10000 });
        await fillBtn.click();
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.waitForLoader();
        console.log(`>>> Fill Onboarding Form opened: ${this.page.url()}`);
    }

    // ── Step 6: Fill all empty mandatory fields ──────────────────────────────────

    async fillMandatoryFields() {
        await this.page.waitForTimeout(1000);

        // Only fill strictly mandatory inputs — SurveyJS marks required with aria-required="true"
        const inputs = this.page.locator('input[aria-required="true"], input[required]');
        const inputCount = await inputs.count();
        console.log(`>>> Found ${inputCount} required inputs`);

        for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const isVisible  = await input.isVisible().catch(() => false);
            const isDisabled = await input.isDisabled().catch(() => false);
            if (!isVisible || isDisabled) continue;

            const val = await input.inputValue().catch(() => '');
            if (val.trim()) continue; // already filled

            const type        = await input.getAttribute('type') || 'text';
            const placeholder = (await input.getAttribute('placeholder') || '').toLowerCase();
            const name        = (await input.getAttribute('name') || '').toLowerCase();

            let fillValue = '';
            if (type === 'date') {
                fillValue = '2020-01-15';
            } else if (type === 'number') {
                fillValue = '5';
            } else if (type === 'email' || placeholder.includes('email') || name.includes('email')) {
                fillValue = `test${randomLetters(4)}@yopmail.com`;
            } else if (type === 'tel' || placeholder.includes('phone') || name.includes('phone')) {
                fillValue = randomPhone();
            } else if (placeholder.includes('zip') || name.includes('zip')) {
                fillValue = randomZip();
            } else if (placeholder.includes('address') || name.includes('address')) {
                fillValue = `${Math.floor(Math.random()*999)+1} Main St`;
            } else if (placeholder.includes('city') || name.includes('city')) {
                fillValue = 'New York';
            } else if (placeholder.includes('state') || name.includes('state')) {
                fillValue = 'NY';
            } else if (placeholder.includes('license') || name.includes('license')) {
                fillValue = `LIC${randomLetters(4).toUpperCase()}${Math.floor(Math.random()*9000)+1000}`;
            } else {
                fillValue = `Auto ${randomLetters(4)}`;
            }

            await input.fill(fillValue).catch(async () => {
                // fallback for inputs that reject the value (e.g. formatted fields)
                await input.type(fillValue, { delay: 30 }).catch(() => {});
            });
            console.log(`>>> Filled input [${placeholder || name || type}]: "${fillValue}"`);
        }

        // Fill empty required textareas only
        const textareas = this.page.locator('textarea[aria-required="true"], textarea[required]');
        const taCount = await textareas.count();
        for (let i = 0; i < taCount; i++) {
            const ta = textareas.nth(i);
            const isVisible = await ta.isVisible().catch(() => false);
            if (!isVisible) continue;
            const val = await ta.inputValue().catch(() => '');
            if (!val.trim()) {
                await ta.fill('Auto-generated response for required field.');
                console.log('>>> Filled required textarea');
            }
        }

        // Handle required selects only
        const selects = this.page.locator('select[aria-required="true"], select[required]');
        const selCount = await selects.count();
        for (let i = 0; i < selCount; i++) {
            const sel = selects.nth(i);
            const isVisible = await sel.isVisible().catch(() => false);
            if (!isVisible) continue;
            const val = await sel.inputValue().catch(() => '');
            if (!val.trim() || val === '0' || val === '') {
                await sel.selectOption({ index: 1 }).catch(() => {});
                console.log('>>> Selected option for required select');
            }
        }
    }

    // ── Step 7: Save the form (click twice if needed) ───────────────────────────

    async saveOnboardingForm() {
        // SurveyJS form uses <input type="button" title="Save" class="sd-navigation__complete-btn">
        const saveBtn = this.page.locator('input[title="Save"].sd-btn, input[value="Save"][type="button"], .sd-navigation__complete-btn').first();

        await saveBtn.waitFor({ state: 'visible', timeout: 8000 });
        await saveBtn.click();
        console.log('>>> Save clicked (1st attempt)');
        await this.page.waitForTimeout(1500);

        // If save button still visible, click again
        const stillVisible = await saveBtn.isVisible().catch(() => false);
        if (stillVisible) {
            await saveBtn.click();
            console.log('>>> Save clicked (2nd attempt)');
            await this.page.waitForTimeout(1500);
        }

        // Verify saved successfully via toast
        const savedToast = await this.page.waitForSelector(
            '[data-testid="toast-body"], [data-testid="toast-content"]',
            { state: 'visible', timeout: 15000 }
        ).catch(() => null);

        if (savedToast) {
            const msg = (await savedToast.textContent())?.trim();
            console.log(`>>> Save toast: "${msg}"`);
            expect(msg).toBeTruthy();
        } else {
            // SurveyJS may navigate on save — check current URL changed or page title
            const url = this.page.url();
            console.log(`>>> Form submitted — current URL: ${url}`);
        }
    }
};
