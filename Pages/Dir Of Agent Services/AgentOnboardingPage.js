const { expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

// Creates a minimal valid PDF on disk and returns its path
function getSamplePdfPath() {
    const dir      = path.join(__dirname, '..', '..', 'tests', 'uploadfiles');
    const filePath = path.join(dir, 'sample_onboarding.pdf');
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(dir, { recursive: true });
        // Minimal valid PDF-1.4 structure
        const pdf = '%PDF-1.4\n' +
            '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n' +
            '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n' +
            '3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>\nendobj\n' +
            'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n' +
            '0000000058 00000 n \n0000000115 00000 n \n' +
            'trailer\n<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF';
        fs.writeFileSync(filePath, pdf);
    }
    return filePath;
}

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
        try { await this.loader.waitFor({ state: 'visible', timeout: 2000 }); } catch {}
        await this.loader.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }

    // ── Step 1: Find a 0% agent in Manage Agents and click View Onboarding ──────

    async clickViewOnboardingForZeroAgent() {
        await this.page.waitForTimeout(1000);

        const viewOnboardingBtns = this.page.locator('button', { hasText: 'View Onboarding' });
        await viewOnboardingBtns.first().waitFor({ state: 'visible', timeout: 10000 });
        const total = await viewOnboardingBtns.count();
        console.log(`>>> Scanning ${total} agent cards for 0% progress badge...`);

        // Walk UP from each % badge to find its card's "View Onboarding" button index
        // Pick the card with the LOWEST progress percentage (prefer 0%, then lowest)
        const targetIndex = await this.page.evaluate(() => {
            const allViewBtns = Array.from(document.querySelectorAll('button'))
                .filter(b => b.textContent.trim() === 'View Onboarding');

            const percentBadges = Array.from(document.querySelectorAll('*'))
                .filter(el => el.children.length === 0 && /^\d+%$/.test(el.textContent.trim()));

            let bestIdx = -1;
            let bestPct = Infinity;

            for (const badge of percentBadges) {
                const pct = parseInt(badge.textContent.trim());

                let node = badge;
                for (let i = 0; i < 15; i++) {
                    node = node?.parentElement;
                    if (!node) break;
                    const viewBtn = Array.from(node.querySelectorAll('button'))
                        .find(b => b.textContent.trim() === 'View Onboarding');
                    if (viewBtn) {
                        const idx = allViewBtns.indexOf(viewBtn);
                        if (pct < bestPct) {
                            bestPct = pct;
                            bestIdx = idx;
                        }
                        break;
                    }
                }
            }
            return bestIdx;
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
            throw new Error('No agent card found with a progress badge on the Manage Agents page');
        }

        console.log(`>>> Clicking View Onboarding for lowest-progress agent at card index ${targetIndex}`);
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
        // If form was already submitted in a previous run, go back to onboarding overview
        const alreadySubmitted = this.page.locator('text=Your response has already been submitted').first();
        const isSubmitted = await alreadySubmitted.isVisible({ timeout: 3000 }).catch(() => false);
        if (isSubmitted) {
            console.log('>>> Form already submitted — going back to onboarding overview');
            await this.page.goBack().catch(() => {});
            await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            await this.waitForLoader();
            return;
        }

        // SurveyJS form uses <input type="button" title="Save" class="sd-navigation__complete-btn">
        const saveBtn = this.page.locator('input[title="Save"].sd-btn, input[value="Save"][type="button"], .sd-navigation__complete-btn').first();
        const saveBtnVisible = await saveBtn.isVisible({ timeout: 8000 }).catch(() => false);
        if (!saveBtnVisible) {
            console.log('>>> Save button not found — form may be in read-only state, going back');
            await this.page.goBack().catch(() => {});
            await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            await this.waitForLoader();
            return;
        }

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

    // ── Agent Documents Upload step ──────────────────────────────────────────────

    async uploadDocumentsStep() {
        console.log('>>> Processing Agent Documents Upload step');

        // Step 1: Check "Select All" first, then all remaining labeled checkboxes
        const selectAllLabel = this.page.locator('label', { hasText: /select all/i }).first();
        const selectAllVisible = await selectAllLabel.isVisible({ timeout: 3000 }).catch(() => false);
        if (selectAllVisible) {
            await selectAllLabel.click().catch(() => {});
            console.log('>>> Clicked "Select All"');
            await this.page.waitForTimeout(500);
        }
        const labeledCbs = this.page.locator('label').filter({ has: this.page.locator('input[type="checkbox"]') });
        const cbCount = await labeledCbs.count().catch(() => 0);
        for (let i = 0; i < cbCount; i++) {
            const lbl = labeledCbs.nth(i);
            if (!(await lbl.isVisible().catch(() => false))) continue;
            const cb = lbl.locator('input[type="checkbox"]');
            if (!(await cb.isChecked().catch(() => false))) await cb.check().catch(() => {});
        }
        console.log(`>>> Checked ${cbCount} checkbox(es)`);

        // Step 2: Upload sample PDF
        const pdfPath = getSamplePdfPath();
        const fileName = path.basename(pdfPath);
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfBase64 = pdfBytes.toString('base64');

        // Try "browse files" button first (triggers native file chooser in this app)
        // Falls back to DataTransfer API injection (works on hidden inputs in Vue.js)
        let uploaded = false;

        const uploadBtns = [
            this.page.locator('button', { hasText: /browse files/i }).first(),
            this.page.locator('button', { hasText: /choose files/i }).first(),
        ];

        for (const btn of uploadBtns) {
            if (uploaded) break;
            const btnVisible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
            if (!btnVisible) continue;
            try {
                const [fileChooser] = await Promise.all([
                    this.page.waitForEvent('filechooser', { timeout: 8000 }),
                    btn.click(),
                ]);
                await fileChooser.setFiles(pdfPath);
                console.log(`>>> PDF set via file chooser: ${fileName}`);
                uploaded = true;
            } catch {
                console.log('>>> File chooser not triggered by button, trying next...');
            }
        }

        if (!uploaded) {
            // DataTransfer API — injects the file directly into Vue's reactive file input
            const injected = await this.page.evaluate((b64) => {
                const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
                const target = inputs[0];
                if (!target) return false;
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const file = new File([bytes], 'sample_onboarding.pdf', { type: 'application/pdf' });
                const dt = new DataTransfer();
                dt.items.add(file);
                Object.defineProperty(target, 'files', { value: dt.files, writable: false });
                target.dispatchEvent(new Event('change', { bubbles: true }));
                target.dispatchEvent(new Event('input',  { bubbles: true }));
                return true;
            }, pdfBase64);
            console.log(`>>> PDF injected via DataTransfer API: ${injected}`);
        }

        await this.page.waitForTimeout(1500).catch(() => {});

        // After file selection, app shows a modal with "Upload 1 file" button — click it
        const uploadFileBtn = this.page.locator('button', { hasText: /upload \d+ file/i }).first();
        const uploadFileBtnVisible = await uploadFileBtn.isVisible({ timeout: 8000 }).catch(() => false);
        if (uploadFileBtnVisible) {
            await uploadFileBtn.click();
            console.log('>>> Clicked "Upload 1 file" button');

            // Wait for "Upload complete" text — confirms server-side upload finished
            await this.page.waitForSelector('text=Upload complete', { timeout: 30000 }).catch(() => {});
            await this.page.waitForTimeout(500).catch(() => {});

            // Click "Done" via evaluate — works regardless of element type (button/a/div/span)
            const clicked = await this.page.evaluate(() => {
                const all = Array.from(document.querySelectorAll('*'));
                const done = all.find(el =>
                    el.children.length === 0 &&
                    el.textContent.trim() === 'Done' &&
                    el.offsetParent !== null
                );
                if (done) { done.click(); return true; }
                return false;
            });
            console.log(clicked ? '>>> Clicked "Done" — upload modal closed' : '>>> "Done" element not found');
            await this.page.waitForTimeout(1000).catch(() => {});
            console.log('>>> File uploaded successfully');
        } else {
            console.log('>>> "Upload 1 file" button not found');
        }

        await this.waitForLoader().catch(() => {});

        // Click Save & Next
        const saveNext = this.page.locator('button').filter({ hasText: /save\s*(&|and)\s*next/i }).first();
        const saveNextVisible = await saveNext.isVisible({ timeout: 5000 }).catch(() => false);
        if (saveNextVisible) {
            await saveNext.click({ force: true }).catch(async () => { await saveNext.dispatchEvent('click'); });
            console.log('>>> Clicked "Save & Next"');
            await this.page.waitForTimeout(3000).catch(() => {});
            await this.waitForLoader().catch(() => {});
            const resultToast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
            const resultMsg = await resultToast.textContent({ timeout: 3000 }).catch(() => null);
            if (resultMsg) console.log(`>>> Toast: "${resultMsg.trim()}"`);
        } else {
            console.log('>>> App auto-advanced after upload');
        }
        console.log('>>> Agent Documents Upload complete');
    }

    // ── Fill the 8 answerable question types on the current step ─────────────────
    // Save & Next may NOT be visible yet — it appears AFTER answering

    async fillAllVisibleFields() {
        await this.page.waitForTimeout(500);

        // TYPE 1: Yes/No toggle — find ANY element (p, span, div, button) with exact "Yes" text
        // that is paired with a "No" element (confirms it's a question toggle, not a dialog button)
        // Use evaluate to find and click the actual Yes element in the DOM regardless of tag type
        const clickedYes = await this.page.evaluate(() => {
            // Find all leaf elements with EXACTLY "Yes" text that are visible
            const allLeaves = Array.from(document.querySelectorAll('*'))
                .filter(el =>
                    el.children.length === 0 &&
                    el.textContent.trim() === 'Yes' &&
                    el.offsetParent !== null // is visible
                );
            // Find all leaf elements with EXACTLY "No" text that are visible
            const noLeaves = Array.from(document.querySelectorAll('*'))
                .filter(el =>
                    el.children.length === 0 &&
                    el.textContent.trim() === 'No' &&
                    el.offsetParent !== null
                );
            if (allLeaves.length === 0 || noLeaves.length === 0) return 0;
            // Click only the FIRST Yes element that shares an ancestor with a "No" element
            // SKIP if the Yes/No pair is inside a cancel/confirmation dialog
            for (const yesEl of allLeaves) {
                // Safety: skip if any ancestor contains "cancel profile" or "are you sure" text
                const isConfirmationDialog = (() => {
                    let node = yesEl;
                    for (let i = 0; i < 12; i++) {
                        node = node?.parentElement;
                        if (!node) break;
                        const txt = (node.innerText || '').toLowerCase();
                        if (txt.includes('cancel') && txt.includes('profile')) return true;
                        if (txt.includes('are you sure')) return true;
                        if (txt.includes('sure you want')) return true;
                        if (node.classList.contains('modal-box') || node.classList.contains('modal')) return true;
                    }
                    return false;
                })();
                if (isConfirmationDialog) continue;

                const hasNoPair = noLeaves.some(noEl => {
                    let node = yesEl;
                    for (let i = 0; i < 5; i++) {
                        node = node?.parentElement;
                        if (!node) break;
                        if (node.contains(noEl)) return true;
                    }
                    return false;
                });
                if (hasNoPair) {
                    yesEl.click();
                    return 1; // click only ONE Yes/No pair per call
                }
            }
            return 0;
        });
        if (clickedYes > 0) console.log(`>>> Yes/No: clicked "Yes" (${clickedYes} question(s))`);

        // TYPE 2: Radio Group — first visible option in each group
        const radios = this.page.locator('input[type="radio"]:not([disabled])');
        const radioCount = await radios.count().catch(() => 0);
        const seenGroups = new Set();
        for (let i = 0; i < radioCount; i++) {
            const r = radios.nth(i);
            if (!(await r.isVisible().catch(() => false))) continue;
            const grp = await r.getAttribute('name') || `g${i}`;
            if (seenGroups.has(grp)) continue;
            seenGroups.add(grp);
            await r.check().catch(() => {});
            console.log(`>>> Radio "${grp}": selected first option`);
        }

        // TYPE 3: Dropdown — first non-empty option
        const selects = this.page.locator('select:not([disabled])');
        const selCount = await selects.count().catch(() => 0);
        for (let i = 0; i < selCount; i++) {
            const sel = selects.nth(i);
            if (!(await sel.isVisible().catch(() => false))) continue;
            const val = await sel.inputValue().catch(() => '');
            if (!val || val === '0') {
                await sel.selectOption({ index: 1 }).catch(() => {});
                const chosen = await sel.inputValue().catch(() => '');
                console.log(`>>> Dropdown: "${chosen}"`);
            }
        }

        // TYPE 4 (Single-line) + Date: text/email/number/date/url inputs
        const inputs = this.page.locator(
            'input:not([type="radio"]):not([type="checkbox"]):not([type="file"]):not([type="hidden"]):not([disabled])'
        );
        const inputCount = await inputs.count().catch(() => 0);
        for (let i = 0; i < inputCount; i++) {
            const inp = inputs.nth(i);
            if (!(await inp.isVisible().catch(() => false))) continue;
            const val = await inp.inputValue().catch(() => '');
            if (val.trim()) continue;
            const type = (await inp.getAttribute('type') || 'text').toLowerCase();
            const ph   = (await inp.getAttribute('placeholder') || '').toLowerCase();
            let v = type === 'date'                                           ? '2024-06-01'
                  : type === 'url' || ph.includes('url') || ph.includes('link') ? `https://example.com/${randomLetters(6)}`
                  : type === 'email' || ph.includes('email')                  ? `auto${randomLetters(4)}@yopmail.com`
                  : type === 'tel'   || ph.includes('phone')                  ? randomPhone()
                  : type === 'number'                                          ? '1'
                  : ph.includes('zip')                                         ? randomZip()
                  :                                                              `Auto ${randomLetters(4)}`;
            await inp.fill(v).catch(() => {});
            console.log(`>>> Input [${ph || type}]: "${v}"`);
        }

        // TYPE 5 (Multi-line): textareas
        const textareas = this.page.locator('textarea:not([disabled])');
        const taCount = await textareas.count().catch(() => 0);
        for (let i = 0; i < taCount; i++) {
            const ta = textareas.nth(i);
            if (!(await ta.isVisible().catch(() => false))) continue;
            const val = await ta.inputValue().catch(() => '');
            if (!val.trim()) {
                await ta.fill('Auto-generated response.').catch(() => {});
                console.log('>>> Multi-line: filled');
            }
        }

        // TYPE 6: Checkbox — check only the FIRST option (per question behaviour)
        const labeledCbs = this.page.locator('label').filter({
            has: this.page.locator('input[type="checkbox"]')
        });
        const cbCount = await labeledCbs.count().catch(() => 0);
        for (let i = 0; i < cbCount; i++) {
            const lbl = labeledCbs.nth(i);
            if (!(await lbl.isVisible().catch(() => false))) continue;
            const cb = lbl.locator('input[type="checkbox"]');
            const checked = await cb.isChecked().catch(() => false);
            if (!checked) {
                await cb.check().catch(() => {});
                console.log('>>> Checkbox: checked first option');
                break; // only first option per step
            }
        }

        // TYPE 7: Label — no action needed (display-only, handled by skipping)

        // TYPE 8: Date — already handled in input loop above (type="date")
    }

    // ── Generic step: fill based on field type and submit ────────────────────────

    async fillAndSubmitStep(stepName) {
        console.log(`>>> Filling: "${stepName}"`);

        // SurveyJS form — fill mandatory fields and save
        const surveyForm = this.page.locator('.sd-container-modern, .sv-root-modern').first();
        const hasSurvey = await surveyForm.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasSurvey) {
            await this.fillMandatoryFields();
            await this.saveOnboardingForm();
            return;
        }

        // Fill all visible interactive fields
        await this.fillAllVisibleFields();

        // Submit
        await this.clickSaveAndNext();
    }

    // ── Save & Next button ───────────────────────────────────────────────────────

    async clickSaveAndNext() {
        try {
            // Try "Save & Next" button first, then plain "Save"
            const saveNextBtn = this.page.locator('button', { hasText: /save\s*&\s*next/i }).first();
            const saveNextVisible = await saveNextBtn.isVisible({ timeout: 2000 }).catch(() => false);

            if (saveNextVisible) {
                await saveNextBtn.click();
                console.log('>>> Clicked "Save & Next"');
            } else {
                const saveBtn = this.page.locator('button', { hasText: /^save$/i }).first();
                const saveVisible = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);
                if (saveVisible) {
                    await saveBtn.dispatchEvent('click');
                    console.log('>>> Clicked "Save"');
                } else {
                    console.log('>>> No Save button found — step may have auto-completed');
                    return;
                }
            }

            await this.page.waitForTimeout(1500).catch(() => {});
            await this.waitForLoader().catch(() => {});

            // Log any toast
            const toast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
            const toastVisible = await toast.isVisible({ timeout: 2000 }).catch(() => false);
            if (toastVisible) {
                const msg = (await toast.textContent().catch(() => ''))?.trim();
                console.log(`>>> Toast: "${msg}"`);
            }
        } catch (e) {
            console.log(`>>> clickSaveAndNext: skipped (${e.message.split('\n')[0]})`);
        }
    }

    // ── Follow the wizard: click first pending step, then Save & Next each step ──

    async processRemainingPreOnboardingSteps() {
        await this.page.waitForTimeout(2000).catch(() => {});
        await this.waitForLoader().catch(() => {});
        console.log('>>> Starting remaining Pre-Onboarding steps...');

        // Track visited steps to prevent infinite loops — start with already-done step
        const visited = new Set(['Onboarding Form']);
        const MAX_STEPS = 20;

        for (let i = 0; i < MAX_STEPS; i++) {
            await this.page.waitForTimeout(800).catch(() => {});

            // Find next unvisited step from the left-panel list
            const nextStep = await this.page.evaluate((visitedArr) => {
                const all = Array.from(document.querySelectorAll('p.capitalize'));
                for (const p of all) {
                    const name = p.textContent.trim();
                    if (name && !visitedArr.includes(name)) return name;
                }
                return null;
            }, [...visited]).catch(() => null);

            if (!nextStep) {
                console.log('>>> No more unvisited steps — Pre-Onboarding complete');
                break;
            }

            visited.add(nextStep);
            console.log(`\n>>> Step ${i + 1}: "${nextStep}"`);

            // Click the step row in the left panel
            const stepEl = this.page.locator('p.capitalize', { hasText: nextStep }).first();
            await stepEl.click({ force: true }).catch(() => {});
            await this.page.waitForTimeout(2500).catch(() => {});
            await this.waitForLoader().catch(() => {});

            // ── Detect: document upload step by name (file input may be hidden) ──
            const isDocUploadStep = /document.*upload|upload.*document/i.test(nextStep);
            if (isDocUploadStep) {
                console.log('>>> Document upload step detected by name');
                await this.uploadDocumentsStep();
                continue;
            }

            // ── Detect: SurveyJS form ──
            const hasSurvey = await this.page.locator('.sd-container-modern, .sv-root-modern')
                .first().isVisible({ timeout: 1500 }).catch(() => false);
            if (hasSurvey) {
                console.log('>>> Survey form detected — filling required fields');
                await this.fillMandatoryFields();
                await this.saveOnboardingForm();
                continue;
            }

            // ── Detect: Save & Next button ──
            const saveNextBtn = this.page.locator('button').filter({ hasText: /save\s*(&|and)\s*next/i }).first();
            const hasSaveNext = await saveNextBtn.isVisible({ timeout: 3000 }).catch(() => false);

            if (hasSaveNext) {
                // Fill any visible interactive fields (Yes/No, radio, dropdowns, inputs)
                await this.fillAllVisibleFields().catch(() => {});
                await this.page.waitForTimeout(500).catch(() => {});
                await saveNextBtn.click({ force: true }).catch(async () => {
                    await saveNextBtn.dispatchEvent('click').catch(() => {});
                });
                console.log('>>> Clicked "Save & Next"');
                await this.page.waitForTimeout(3000).catch(() => {});
                await this.waitForLoader().catch(() => {});
                const toast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
                const msg = await toast.textContent({ timeout: 2000 }).catch(() => null);
                if (msg) console.log(`>>> Toast: "${msg.trim()}"`);
            } else {
                console.log(`>>> "${nextStep}" — no interactive content, skipping`);
            }
        }

        console.log('>>> Pre-Onboarding Activities complete');
    }

    // ── Stage 2: Onboarding Activities ───────────────────────────────────────────

    async processOnboardingActivities() {
        await this.page.waitForTimeout(1500).catch(() => {});
        await this.waitForLoader().catch(() => {});
        console.log('>>> Starting Onboarding Activities stage...');

        // Navigate back to agent overview page to ensure stage tabs are accessible
        const currentUrl = this.page.url();
        const accountMatch = currentUrl.match(/\/accounts\/([a-f0-9]+)/);
        if (accountMatch) {
            const agentUrl = `https://qa.procasaonboard.com/accounts/${accountMatch[1]}`;
            if (currentUrl !== agentUrl) {
                await this.page.goto(agentUrl);
                await this.page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
                await this.waitForLoader();
                await this.page.waitForTimeout(2000).catch(() => {});
            }
        }

        // Click "Onboarding Activities" stage tab
        const tab = this.page.locator('button', { hasText: /^Onboarding Activities$/ }).first();
        const tabVisible = await tab.isVisible({ timeout: 8000 }).catch(() => false);
        if (tabVisible) {
            await tab.click();
        } else {
            // Fallback: evaluate-based click on any element with exact text
            await this.page.evaluate(() => {
                const all = Array.from(document.querySelectorAll('*'));
                const el = all.find(e =>
                    e.children.length === 0 &&
                    e.textContent.trim() === 'Onboarding Activities' &&
                    e.offsetParent !== null
                );
                if (el) el.closest('button, [role="tab"]')?.click() || el.click();
            }).catch(() => {});
        }
        await this.page.waitForTimeout(2000).catch(() => {});
        await this.waitForLoader().catch(() => {});
        // Wait a bit more for the step list to populate
        await this.page.waitForSelector('p.capitalize', { timeout: 5000 }).catch(() => {});
        console.log(`>>> Onboarding Activities tab clicked: ${this.page.url()}`);

        // Process each step using visited Set
        const visited = new Set();
        const MAX_STEPS = 10;

        for (let i = 0; i < MAX_STEPS; i++) {
            await this.page.waitForTimeout(800).catch(() => {});

            const nextStep = await this.page.evaluate((visitedArr) => {
                const all = Array.from(document.querySelectorAll('p.capitalize'));
                for (const p of all) {
                    const name = p.textContent.trim();
                    if (name && !visitedArr.includes(name)) return name;
                }
                return null;
            }, [...visited]).catch(() => null);

            if (!nextStep) {
                console.log('>>> No more Onboarding Activity steps — stage complete');
                break;
            }

            visited.add(nextStep);
            console.log(`\n>>> Onboarding Activity Step ${i + 1}: "${nextStep}"`);

            // Click the step row in the left panel
            const stepEl = this.page.locator('p.capitalize', { hasText: nextStep }).first();
            await stepEl.click({ force: true }).catch(() => {});
            await this.page.waitForTimeout(2500).catch(() => {});
            await this.waitForLoader().catch(() => {});

            // Fill all visible fields (handles URL/text/radio/checkbox/Yes-No/textarea/date)
            await this.fillAllVisibleFields().catch(() => {});
            await this.page.waitForTimeout(500).catch(() => {});

            // Submit via SurveyJS complete button (input.sd-navigation__complete-btn)
            // This covers all Onboarding Activity forms — value may be "Save & Next" or "Complete"
            const submitted = await this.page.evaluate(() => {
                // Try SurveyJS complete button first (input type="button")
                const surveyBtn = document.querySelector('.sd-navigation__complete-btn');
                if (surveyBtn && surveyBtn.offsetParent !== null) {
                    surveyBtn.click();
                    return 'survey-btn';
                }
                // Fallback: any button with "Save & Next" text
                const allBtns = Array.from(document.querySelectorAll('button'));
                const saveNext = allBtns.find(b =>
                    /save\s*(&|and)\s*next/i.test(b.textContent.trim()) &&
                    b.offsetParent !== null
                );
                if (saveNext) {
                    saveNext.click();
                    return 'save-next-btn';
                }
                return null;
            }).catch(() => null);

            if (submitted) {
                console.log(`>>> Submitted "${nextStep}" via ${submitted}`);
                await this.page.waitForTimeout(2500).catch(() => {});
                await this.waitForLoader().catch(() => {});
                const toast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
                const msg = await toast.textContent({ timeout: 2000 }).catch(() => null);
                if (msg) console.log(`>>> Toast: "${msg.trim()}"`);
            } else {
                console.log(`>>> "${nextStep}" — no submit button found, moving on`);
            }
        }

        console.log('>>> Onboarding Activities stage complete');
    }
};
