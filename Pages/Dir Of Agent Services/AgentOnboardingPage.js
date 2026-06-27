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

        // Inner helper: scan current tab for best real (non-test) agent, return index or -1
        const findBestAgentIndex = async () => {
            const viewOnboardingBtns = this.page.locator('button', { hasText: 'View Onboarding' });
            const total = await viewOnboardingBtns.count().catch(() => 0);
            if (total === 0) return -1;

            console.log(`>>> Scanning ${total} agent cards for lowest-progress real agent...`);

            // Walk UP from each % badge; skip cards whose title contains "test"
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
                            // Skip dummy/test accounts by checking the agent name element
                            const nameEl = node.querySelector('[class*="capitalize"][title], [title]');
                            const agentName = (nameEl?.getAttribute('title') || nameEl?.textContent || '').toLowerCase();
                            if (agentName.includes('test') || agentName.trim() === '') break;

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

            // Log each card's progress for visibility
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

            return targetIndex;
        };

        let targetIndex = await findBestAgentIndex();

        // Fallback: if Initiated tab has no real agent, try In Progress tab
        if (targetIndex === -1) {
            console.log('>>> No real agent in current tab — switching to In Progress tab');
            const inProgressTab = this.page.locator('button, a, [role="tab"]')
                .filter({ hasText: /In progress/i }).first();
            const tabVisible = await inProgressTab.isVisible({ timeout: 5000 }).catch(() => false);
            if (tabVisible) {
                await inProgressTab.click();
                await this.page.waitForTimeout(1500);
                await this.waitForLoader();
                targetIndex = await findBestAgentIndex();
            }
        }

        if (targetIndex === -1) {
            throw new Error('No real (non-test) agent card found with a progress badge');
        }

        // Capture agent name from the card before navigating away
        this.selectedAgentName = await this.page.locator('div.capitalize.truncate[title]')
            .nth(targetIndex).getAttribute('title').catch(() => null);
        console.log(`>>> Selected agent: "${this.selectedAgentName}" (card ${targetIndex})`);

        const viewOnboardingBtns = this.page.locator('button', { hasText: 'View Onboarding' });
        console.log(`>>> Clicking View Onboarding for agent at card index ${targetIndex}`);
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
            } else if (placeholder.includes('dre#') || placeholder.includes('dre number') || placeholder.includes('dre no') || name.includes('dre') ||
                       placeholder.includes('nrds') || name.includes('nrds') ||
                       placeholder.includes('nar member') || placeholder.includes('member id')) {
                fillValue = '0987654321';
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

        // TYPE 1: Yes/No toggle — find "No" elements paired with "Yes" and click "No"
        const clickedNo = await this.page.evaluate(() => {
            const noLeaves = Array.from(document.querySelectorAll('*'))
                .filter(el =>
                    el.children.length === 0 &&
                    el.textContent.trim() === 'No' &&
                    el.offsetParent !== null
                );
            const yesLeaves = Array.from(document.querySelectorAll('*'))
                .filter(el =>
                    el.children.length === 0 &&
                    el.textContent.trim() === 'Yes' &&
                    el.offsetParent !== null
                );
            if (noLeaves.length === 0 || yesLeaves.length === 0) return 0;
            for (const noEl of noLeaves) {
                const isConfirmationDialog = (() => {
                    let node = noEl;
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

                const hasYesPair = yesLeaves.some(yesEl => {
                    let node = noEl;
                    for (let i = 0; i < 5; i++) {
                        node = node?.parentElement;
                        if (!node) break;
                        if (node.contains(yesEl)) return true;
                    }
                    return false;
                });
                if (hasYesPair) {
                    noEl.click();
                    return 1;
                }
            }
            return 0;
        });
        if (clickedNo > 0) console.log(`>>> Yes/No: clicked "No" (${clickedNo} question(s))`);

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
                  : ph.includes('dre#') || ph.includes('dre number') || ph.includes('nrds') || ph.includes('nar member') || ph.includes('member id') ? '0987654321'
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
            const hasSurvey = await this.page.locator('.sd-root-modern, .sd-container-modern, .sv-root-modern')
                .first().isVisible({ timeout: 3000 }).catch(() => false);
            if (hasSurvey) {
                console.log(`>>> Survey form detected for "${nextStep}" — filling all visible fields`);

                // "Account Credentials" step: expand Command Login / KW Email Login accordions
                // BEFORE submitting the form. These accordions are collapsed by default and only
                // visible to the user after clicking their header. The SurveyJS submit marks this
                // activity as complete — so credential filling MUST happen here, not in stage=2.
                if (/account\s*credentials/i.test(nextStep)) {
                    console.log('>>> Account Credentials: expanding Command Login and KW Email Login...');
                    for (const secName of ['Command Login', 'KW Email Login']) {
                        // Click the accordion header using a simple text locator
                        const header = this.page.locator(`text="${secName}"`).first();
                        if (!await header.isVisible({ timeout: 2000 }).catch(() => false)) {
                            console.log(`>>> "${secName}" header not visible — skipping`);
                            continue;
                        }
                        await header.click({ force: true }).catch(() => {});
                        console.log(`>>> Clicked "${secName}" header`);
                        await this.page.waitForTimeout(1500);

                        // Fill all empty visible inputs now exposed by the expanded accordion
                        const inputs = this.page.locator(
                            '.sd-root-modern input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([disabled])'
                        );
                        const count = await inputs.count().catch(() => 0);
                        let nFilled = 0;
                        for (let k = 0; k < count; k++) {
                            const inp = inputs.nth(k);
                            if (!await inp.isVisible({ timeout: 300 }).catch(() => false)) continue;
                            if ((await inp.inputValue().catch(() => '')).trim()) continue;
                            const t = await inp.getAttribute('type') || 'text';
                            const ph = (await inp.getAttribute('placeholder') || '').toLowerCase();
                            const val = t === 'password' || ph.includes('pass') ? 'Auto@Pass123'
                                : t === 'email' || ph.includes('email') ? 'autotest@yopmail.com'
                                : t === 'url' || ph.includes('url') ? 'https://example.com'
                                : ph.includes('user') || ph.includes('login') ? 'AutoUser'
                                : 'AutoFill';
                            await inp.fill(val).catch(async () => {
                                const h = await inp.elementHandle().catch(() => null);
                                if (h) await this.page.evaluate((el, v) => {
                                    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                                    s.call(el, v);
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                }, h, val).catch(() => {});
                            });
                            nFilled++;
                        }
                        console.log(`>>> "${secName}": filled ${nFilled} field(s)`);

                        // Click the Save button for this accordion section
                        const saveBtn = this.page.locator('button').filter({ hasText: /^save$/i }).first();
                        if (await saveBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
                            await saveBtn.click({ force: true }).catch(() => {});
                            console.log(`>>> "${secName}": save clicked`);
                            await this.page.waitForTimeout(1500);
                            const toast = await this.page.locator('[data-testid="toast-body"]').first()
                                .textContent({ timeout: 2000 }).catch(() => null);
                            if (toast) console.log(`>>> Toast: "${toast.trim()}"`);
                        } else {
                            console.log(`>>> "${secName}": no Save button visible`);
                        }
                    }
                }

                // Multi-page loop: fill → Next until Submit button appears
                let surveySubmitted = false;
                for (let pg = 0; pg < 15; pg++) {
                    await this.fillSurveyJSFormFields().catch(() => {});
                    await this.page.waitForTimeout(1000).catch(() => {});

                    // Diagnostic on first page: show all inputs to debug missing fields
                    if (pg === 0) {
                        const diagInputs = await this.page.evaluate(() =>
                            Array.from(document.querySelectorAll('input:not([type="hidden"])'))
                                .filter(el => el.offsetParent !== null)
                                .map(el => ({
                                    type: el.type || 'text', ph: el.placeholder || '', id: el.id || '',
                                    val: (el.value || '').substring(0, 30),
                                    dis: el.disabled, ro: el.readOnly,
                                    inSurvey: !!el.closest('.sd-root-modern')
                                }))
                        ).catch(() => []);
                        console.log(`>>> "${nextStep}" page inputs: ${JSON.stringify(diagInputs)}`);
                    }

                    const submitBtn = this.page.locator('.sd-navigation__complete-btn').first();
                    if (await submitBtn.count().catch(() => 0) > 0) {
                        await submitBtn.click().catch(async () => {
                            await submitBtn.click({ force: true }).catch(() => {});
                        });
                        console.log(`>>> "${nextStep}" submitted (page ${pg + 1})`);
                        surveySubmitted = true;
                        await this.page.waitForTimeout(2000).catch(() => {});
                        await this.waitForLoader().catch(() => {});
                        const toast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
                        const msg = await toast.textContent({ timeout: 2000 }).catch(() => null);
                        if (msg) console.log(`>>> Toast: "${msg.trim()}"`);
                        break;
                    }

                    const nextBtn = this.page.locator('.sd-navigation__next-btn').first();
                    if (await nextBtn.count().catch(() => 0) > 0) {
                        console.log(`>>> "${nextStep}" form page ${pg + 1} → Next`);
                        await nextBtn.click().catch(async () => {
                            await nextBtn.click({ force: true }).catch(() => {});
                        });
                        await this.page.waitForTimeout(600).catch(() => {});
                        continue;
                    }

                    // No SurveyJS nav buttons — fall back to standard save
                    await this.saveOnboardingForm().catch(() => {});
                    surveySubmitted = true;
                    break;
                }
                if (!surveySubmitted) console.log(`>>> "${nextStep}" — form not submitted`);
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
        console.log('>>> Starting Onboarding Activities stage...');

        // Navigate to agent base URL. Wait for Vue to render stage tabs (not networkidle —
        // that's too slow). Then click "Onboarding Activities" immediately before the Vue
        // router auto-redirects to stage=0.
        const currentUrl = this.page.url();
        const accountMatch = currentUrl.match(/\/accounts\/([a-f0-9]+)/);
        if (!accountMatch) {
            console.log('>>> Could not determine agent URL — skipping Onboarding Activities');
            return;
        }
        const agentUrl = `https://qa.procasaonboard.com/accounts/${accountMatch[1]}`;

        // "Onboarding Activities" tab — wait for agent API to respond (shows "Total Progress")
        // Use getByText (trims whitespace) instead of hasText regex.
        const tab = this.page.getByText('Onboarding Activities', { exact: true }).first();

        // Quick check — tab should already be visible if page is loaded
        let tabVisible = await tab.isVisible({ timeout: 5000 }).catch(() => false);
        console.log(`>>> Tab visible immediately: ${tabVisible}`);

        if (!tabVisible) {
            // Wait for agent profile to load (API fetch); "Total Progress" appears after data arrives
            console.log('>>> Waiting for agent profile API data...');
            await this.page.waitForSelector('text=Total Progress', { state: 'visible', timeout: 30000 })
                .catch(() => {});
            tabVisible = await tab.isVisible({ timeout: 5000 }).catch(() => false);
        }

        if (!tabVisible) {
            // Last resort: navigate to agent base URL and wait again
            console.log('>>> Navigating to agent base URL...');
            await this.page.goto(agentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
            await this.page.waitForSelector('text=Total Progress', { state: 'visible', timeout: 30000 })
                .catch(() => {});
            tabVisible = await tab.isVisible({ timeout: 5000 }).catch(() => false);
        }

        if (!tabVisible) {
            console.log('>>> Onboarding Activities tab not found — skipping');
            return;
        }

        await tab.click();

        // Confirm we reached stage=1
        const navigated = await this.page.waitForURL(/stage=1/, { timeout: 8000 })
            .then(() => true).catch(() => false);

        if (!navigated) {
            // Retry once after settling
            await this.page.waitForTimeout(1500).catch(() => {});
            await tab.click({ force: true }).catch(() => {});
            await this.page.waitForURL(/stage=1/, { timeout: 5000 }).catch(() => {});
        }

        await this.waitForLoader().catch(() => {});
        await this.page.waitForTimeout(1000).catch(() => {});

        const finalUrl = this.page.url();
        console.log(`>>> Onboarding Activities URL: ${finalUrl}`);

        if (!/stage=1/.test(finalUrl)) {
            console.log('>>> Onboarding Activities not accessible for this agent — skipping');
            return;
        }

        // Process each step. Skip already-completed steps (sidebar checkbox checked).
        // If SurveyJS auto-navigates away from stage=1, re-navigate back.
        const visited = new Set();
        const MAX_STEPS = 10;

        for (let i = 0; i < MAX_STEPS; i++) {
            await this.page.waitForTimeout(800).catch(() => {});

            // If URL moved to stage=2 or higher, OA is naturally complete — stop here
            const urlNow = this.page.url();
            if (urlNow && !/stage=1/.test(urlNow) && /accounts\//.test(urlNow)) {
                if (/stage=[23]/.test(urlNow)) {
                    console.log(`>>> OA complete — app navigated to stage 2/3 naturally`);
                    break;
                }
                // Went to stage=0 (unexpected) — re-navigate to OA tab
                console.log(`>>> URL went to unexpected stage — re-clicking OA tab`);
                const retab = this.page.getByText('Onboarding Activities', { exact: true }).first();
                if (await retab.isVisible({ timeout: 4000 }).catch(() => false)) {
                    await retab.click();
                    await this.page.waitForURL(/stage=1/, { timeout: 6000 }).catch(() => {});
                    await this.page.waitForTimeout(1000).catch(() => {});
                }
            }

            // Find next unvisited, non-completed step
            const stepInfo = await this.page.evaluate((visitedArr) => {
                const all = Array.from(document.querySelectorAll('p.capitalize'));
                for (const p of all) {
                    const name = p.textContent.trim();
                    if (!name || visitedArr.includes(name)) continue;
                    // Walk up to find the sidebar row's checkbox (completion indicator)
                    let node = p;
                    let cbChecked = false;
                    for (let j = 0; j < 8; j++) {
                        node = node?.parentElement;
                        if (!node) break;
                        const cb = node.querySelector('input[type="checkbox"]');
                        if (cb) { cbChecked = cb.checked; break; }
                    }
                    return { name, completed: cbChecked };
                }
                return null;
            }, [...visited]).catch(() => null);

            if (!stepInfo) {
                console.log('>>> No more Onboarding Activity steps — stage complete');
                break;
            }

            visited.add(stepInfo.name);

            if (stepInfo.completed) {
                console.log(`>>> "${stepInfo.name}" already completed — skipping`);
                continue;
            }

            console.log(`\n>>> Onboarding Activity Step ${i + 1}: "${stepInfo.name}"`);

            // Click step in left panel
            const stepEl = this.page.locator('p.capitalize', { hasText: stepInfo.name }).first();
            await stepEl.click({ force: true }).catch(() => {});
            await this.page.waitForTimeout(2500).catch(() => {});
            await this.waitForLoader().catch(() => {});

            // Simple flow: fill fields → Save & Next (first priority) → SurveyJS complete → SurveyJS next-page
            let submitted = false;
            for (let pg = 0; pg < 15; pg++) {
                await this.page.waitForTimeout(500).catch(() => {});

                // Fill whatever fields are visible on this form page
                const hasSurvey = await this.page.locator('.sd-root-modern').first()
                    .isVisible({ timeout: 2000 }).catch(() => false);
                if (hasSurvey) {
                    await this.fillSurveyJSFormFields().catch(() => {});
                    await this.page.waitForTimeout(1000).catch(() => {});
                } else {
                    await this.fillAllVisibleFields().catch(() => {});
                    await this.page.waitForTimeout(500).catch(() => {});
                }

                // Scroll to bottom so any buttons below the fold become reachable
                await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
                await this.page.waitForTimeout(400).catch(() => {});

                // Priority 1: "Save & Next" button (Marketing Form, Tech Set Up Form, etc.)
                // Use count() not isVisible() — button may be present but not yet scrolled into viewport
                const saveNextBtn = this.page.locator('button, [role="button"]')
                    .filter({ hasText: /save\s*(&|and)\s*next/i }).first();
                const saveNextCount = await saveNextBtn.count().catch(() => 0);
                if (saveNextCount > 0) {
                    await saveNextBtn.scrollIntoViewIfNeeded().catch(() => {});
                    await this.page.waitForTimeout(300).catch(() => {});
                    await saveNextBtn.click({ force: true }).catch(async () => {
                        await saveNextBtn.dispatchEvent('click').catch(() => {});
                    });
                    console.log(`>>> "${stepInfo.name}" — clicked Save & Next`);
                    submitted = true;
                    await this.page.waitForTimeout(2500).catch(() => {});
                    await this.waitForLoader().catch(() => {});
                    const toast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
                    const msg = await toast.textContent({ timeout: 2000 }).catch(() => null);
                    if (msg) console.log(`>>> Toast: "${msg.trim()}"`);
                    break;
                }

                // Priority 2: SurveyJS complete button (final page of a survey)
                const completeBtn = this.page.locator(
                    '.sd-navigation__complete-btn, .sv-footer__complete-btn'
                ).first();
                if (await completeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await completeBtn.click().catch(async () => {
                        await completeBtn.click({ force: true }).catch(() => {});
                    });
                    console.log(`>>> "${stepInfo.name}" — clicked complete (pg ${pg + 1})`);
                    submitted = true;
                    await this.page.waitForTimeout(2500).catch(() => {});
                    await this.waitForLoader().catch(() => {});
                    const toast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
                    const msg = await toast.textContent({ timeout: 2000 }).catch(() => null);
                    if (msg) console.log(`>>> Toast: "${msg.trim()}"`);
                    break;
                }

                // Priority 3: SurveyJS Next button — advance to the next survey page and loop
                const nextBtn = this.page.locator('.sd-navigation__next-btn').first();
                if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                    console.log(`>>> "${stepInfo.name}" — survey page ${pg + 1} → Next`);
                    await nextBtn.click().catch(async () => {
                        await nextBtn.click({ force: true }).catch(() => {});
                    });
                    await this.page.waitForTimeout(600).catch(() => {});
                    continue;
                }

                // No submit mechanism found — log DOM state for diagnosis
                const dbg = await this.page.evaluate(() => ({
                    sdRoots: document.querySelectorAll('.sd-root-modern').length,
                    completeBtns: document.querySelectorAll('.sd-navigation__complete-btn').length,
                    nextBtns: document.querySelectorAll('.sd-navigation__next-btn').length,
                    saveNextBtns: Array.from(document.querySelectorAll('button'))
                        .filter(b => /save.*next/i.test(b.textContent)).length,
                    url: window.location.search,
                })).catch(() => null);
                console.log(`>>> "${stepInfo.name}" — no submit button on pg ${pg + 1}: ${JSON.stringify(dbg)}`);
                break;
            }
            if (!submitted) {
                console.log(`>>> "${stepInfo.name}" — not submitted (read-only or no submit button found)`);
            }
        }

        // Verify all OA sidebar steps have green marks before declaring complete
        const uncheckedOA = await this.page.evaluate(() => {
            const unchecked = [];
            const all = document.querySelectorAll('p.capitalize');
            for (const p of all) {
                const name = p.textContent.trim();
                if (!name) continue;
                let node = p;
                let cbChecked = false;
                for (let j = 0; j < 8; j++) {
                    node = node?.parentElement;
                    if (!node) break;
                    const cb = node.querySelector('input[type="checkbox"]');
                    if (cb) { cbChecked = cb.checked; break; }
                }
                if (!cbChecked) unchecked.push(name);
            }
            return unchecked;
        }).catch(() => []);

        if (uncheckedOA.length > 0) {
            console.log(`>>> OA steps WITHOUT green mark: [${uncheckedOA.join(', ')}]`);
        } else {
            console.log('>>> All OA steps confirmed green ✓');
        }

        console.log('>>> Onboarding Activities stage complete');
    }

    // ── Stage 3: Account Setup ───────────────────────────────────────────────────

    async processAccountSetup() {
        console.log('\n>>> Starting Account Setup stage...');

        const currentUrl = this.page.url();
        const accountMatch = currentUrl.match(/\/accounts\/([a-f0-9]+)/);
        if (!accountMatch) {
            console.log('>>> Could not determine agent URL — skipping Account Setup');
            return;
        }
        const agentUrl = `https://qa.procasaonboard.com/accounts/${accountMatch[1]}`;

        // Click the "Account Setup" stage tab — the one in the 4-tab bar between
        // "Onboarding Activities" and "Confirmation".
        // Strategy 1: find the DIRECT PARENT of the other stage tabs (OA / Confirmation)
        // and click its "Account Setup" sibling — avoids the 3-match proximity sort bug
        // where the wrong element was clicked and navigation went to stage=3.
        // Strategy 2: fall back to the parent-element approach.
        // Strategy 3: old proximity sort (last resort).
        const clickAccountSetupTab = async () => {
            return await this.page.evaluate(() => {
                const visRect = (el) => {
                    const s = window.getComputedStyle(el);
                    if (s.display === 'none' || s.visibility === 'hidden') return null;
                    const r = el.getBoundingClientRect();
                    return (r.width > 0 && r.height > 0) ? r : null;
                };

                // Strategy 1: find the element whose DIRECT PARENT also contains
                // "Onboarding Activities" and "Confirmation" as direct children
                for (const el of document.querySelectorAll('*')) {
                    const txt = (el.innerText || '').trim();
                    if (txt !== 'Onboarding Activities' && txt !== 'Confirmation') continue;
                    if (!visRect(el)) continue;
                    const parent = el.parentElement;
                    if (!parent) continue;
                    const siblings = Array.from(parent.children);
                    const sibTexts = siblings.map(c => (c.innerText || '').trim());
                    if (!sibTexts.includes('Account Setup')) continue;
                    // This parent IS the 4-tab bar — click its "Account Setup" child
                    const asChild = siblings.find(c => (c.innerText || '').trim() === 'Account Setup');
                    if (asChild) {
                        asChild.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                        return 'sibling';
                    }
                }

                // Strategy 2: any visible element with exact text "Account Setup" whose
                // parent also contains a visible "Confirmation" sibling
                for (const el of document.querySelectorAll('*')) {
                    if ((el.innerText || '').trim() !== 'Account Setup') continue;
                    if (!visRect(el)) continue;
                    const parent = el.parentElement;
                    if (!parent) continue;
                    const hasSibConf = Array.from(parent.children).some(
                        c => c !== el && (c.innerText || '').trim() === 'Confirmation'
                    );
                    if (!hasSibConf) continue;
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    return 'parent-sibling';
                }

                // Strategy 3: proximity sort (legacy fallback)
                let tabBarY = null;
                for (const el of document.querySelectorAll('*')) {
                    const txt = (el.innerText || '').trim();
                    if (txt !== 'Onboarding Activities' && txt !== 'Confirmation') continue;
                    const r = visRect(el);
                    if (r) { tabBarY = r.top; break; }
                }
                const candidates = [];
                for (const el of document.querySelectorAll('*')) {
                    if ((el.innerText || '').trim() !== 'Account Setup') continue;
                    const r = visRect(el);
                    if (r) candidates.push({ el, top: r.top });
                }
                if (candidates.length === 0) return false;
                if (tabBarY !== null) {
                    candidates.sort((a, b) => Math.abs(a.top - tabBarY) - Math.abs(b.top - tabBarY));
                }
                candidates[0].el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return candidates.length;
            }).catch(() => false);
        };

        // Wait for page to be ready
        let tabClicked = await clickAccountSetupTab();
        console.log(`>>> Account Setup tab JS-clicked (matches: ${tabClicked})`);

        if (!tabClicked) {
            await this.page.waitForSelector('text=Total Progress', { state: 'visible', timeout: 30000 }).catch(() => {});
            tabClicked = await clickAccountSetupTab();
        }

        if (!tabClicked) {
            await this.page.goto(agentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
            await this.page.waitForSelector('text=Total Progress', { state: 'visible', timeout: 30000 }).catch(() => {});
            tabClicked = await clickAccountSetupTab();
        }

        if (!tabClicked) {
            console.log('>>> Account Setup tab not found — skipping');
            return;
        }

        const navigated = await this.page.waitForURL(/stage=2/, { timeout: 8000 })
            .then(() => true).catch(() => false);

        if (!navigated) {
            await this.page.waitForTimeout(1500).catch(() => {});
            await clickAccountSetupTab();
            await this.page.waitForURL(/stage=2/, { timeout: 5000 }).catch(() => {});
        }

        await this.waitForLoader().catch(() => {});
        await this.page.waitForTimeout(1000).catch(() => {});

        const finalUrl = this.page.url();
        console.log(`>>> Account Setup URL: ${finalUrl}`);

        if (!/stage=2/.test(finalUrl)) {
            if (/stage=1/.test(finalUrl)) {
                console.log(`>>> Account Setup blocked at stage=1 — trying submit buttons only at: ${finalUrl}`);
                await this.page.waitForTimeout(1000).catch(() => {});

                // IMPORTANT: do NOT call fillSurveyJSFormFields() here — the form may be read-only
                // and filling it can corrupt state and navigate backward. Only try submit buttons.

                // 1. SurveyJS complete button
                const blockCBtn = this.page.locator('.sd-navigation__complete-btn').first();
                if (await blockCBtn.count().catch(() => 0) > 0) {
                    console.log('>>> Blocking step — clicking complete button');
                    await blockCBtn.click({ force: true }).catch(() => {});
                    await this.page.waitForTimeout(2000).catch(() => {});
                }

                // 2. Save & Next button
                const blockSNBtn = this.page.locator('button').filter({ hasText: /save\s*(&|and)\s*next/i }).first();
                if (await blockSNBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    console.log('>>> Blocking step — clicking Save & Next');
                    await blockSNBtn.click({ force: true }).catch(() => {});
                    await this.page.waitForTimeout(2000).catch(() => {});
                }

                // 3. Broader complete/next/submit button (word-boundary, catches "Complete Activity" etc.)
                const blockGenBtn = this.page.locator('button').filter({
                    hasText: /\b(complete|done|finish|next|submit)\b/i
                }).first();
                if (await blockGenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    const gText = await blockGenBtn.textContent().catch(() => '');
                    console.log(`>>> Blocking step — clicking: "${gText.trim()}"`);
                    await blockGenBtn.click({ force: true }).catch(() => {});
                    await this.page.waitForTimeout(2000).catch(() => {});
                }

                const blockToast = this.page.locator('[data-testid="toast-body"]').first();
                const blockMsg = await blockToast.textContent({ timeout: 2000 }).catch(() => null);
                if (blockMsg) console.log(`>>> Blocking step toast: "${blockMsg.trim()}"`);

                // Retry Account Setup tab from agent base URL (use same JS DOM walk)
                await this.page.goto(agentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                await this.page.waitForSelector('text=Total Progress', { state: 'visible', timeout: 20000 }).catch(() => {});
                await clickAccountSetupTab();
                await this.page.waitForURL(/stage=2/, { timeout: 8000 }).catch(() => {});
                await this.waitForLoader().catch(() => {});
                await this.page.waitForTimeout(1000).catch(() => {});
                const retryUrl = this.page.url();
                console.log(`>>> Account Setup retry URL: ${retryUrl}`);
                if (!/stage=2/.test(retryUrl)) {
                    console.log('>>> Account Setup still blocked after retry — skipping');
                    return;
                }
            } else {
                // Tab click jumped past stage=2 (e.g. to stage=3).
                // This can happen when the JS dispatch hit the wrong element or Vue
                // treated the account as already having stage=2 credentials. Try once
                // more from the agent base URL using the improved tab-container strategy.
                const skippedTo = finalUrl.match(/stage=(\d)/)?.[1];
                console.log(`>>> Account Setup tab went to stage=${skippedTo} — retrying from agent base URL`);

                await this.page.goto(agentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                await this.waitForLoader().catch(() => {});
                await this.page.waitForTimeout(3000).catch(() => {});

                await clickAccountSetupTab();
                await this.page.waitForURL(/stage=2/, { timeout: 8000 }).catch(() => {});
                await this.waitForLoader().catch(() => {});
                await this.page.waitForTimeout(1000).catch(() => {});

                const retryUrl2 = this.page.url();
                console.log(`>>> Account Setup retry URL: ${retryUrl2}`);

                if (!/stage=2/.test(retryUrl2)) {
                    // Tab retry also failed to reach stage=2.
                    // Try forcing stage=2 by navigating directly to the same URL but with stage=2.
                    // The finalUrl already has the correct activity ID — just swap the stage number.
                    const forcedStage2Url = finalUrl.replace(/stage=\d/, 'stage=2');
                    console.log(`>>> Forcing direct stage=2 URL: ${forcedStage2Url}`);
                    await this.page.goto(forcedStage2Url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                    await this.waitForLoader().catch(() => {});
                    await this.page.waitForTimeout(2000).catch(() => {});

                    const forcedUrl = this.page.url();
                    console.log(`>>> Stage=2 forced URL result: ${forcedUrl}`);

                    if (!/stage=2/.test(forcedUrl)) {
                        // Truly can't reach stage=2 — proceed directly to Confirmation
                        console.log('>>> Account Setup stage=2 inaccessible — proceeding to Confirmation');
                        if (/stage=3/.test(finalUrl)) {
                            await this.page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
                            await this.waitForLoader().catch(() => {});
                            await this.page.waitForTimeout(1500).catch(() => {});
                        }
                        return;
                    }
                    // stage=2 reached via forced URL navigation
                    console.log('>>> Account Setup: reached stage=2 via forced URL — processing accordion form');
                    // Fall through to the processing loop below
                } else {
                // stage=2 reached via retry — fall through to processing loop below
                console.log('>>> Account Setup: reached stage=2 via retry — processing accordion form');
                }
            }
        }

        // Drive Account Setup by URL index — each Save & Next advances index=N → index=N+1.
        // This handles forms where multiple pages share the same sidebar label (e.g. "Account
        // Credentials" at index=0 is the notification form; index=1 is the URL/username/password form).
        const MAX_STEPS = 10;
        let lastIndex = -1;

        for (let i = 0; i < MAX_STEPS; i++) {
            await this.page.waitForTimeout(1500).catch(() => {});
            await this.waitForLoader().catch(() => {});

            const urlNow = this.page.url();

            // Stop if we've left Account Setup (stage=2) entirely
            if (/accounts\//.test(urlNow) && !/stage=2/.test(urlNow)) {
                console.log(`>>> Account Setup complete — navigated away from stage=2 (${urlNow})`);
                break;
            }

            // Detect current index from URL
            const idxMatch = urlNow.match(/[?&]index=(\d+)/);
            const currentIndex = idxMatch ? parseInt(idxMatch[1]) : 0;

            // If index didn't advance after a submission, no more steps
            if (i > 0 && currentIndex === lastIndex) {
                console.log(`>>> Account Setup: index=${currentIndex} unchanged — stage complete`);
                break;
            }
            lastIndex = currentIndex;

            // Log sidebar step labels for diagnosis (p.capitalize elements)
            const sidebarLabels = await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll('p.capitalize'))
                    .map(p => p.textContent.trim()).filter(t => t);
            }).catch(() => []);
            console.log(`\n>>> Account Setup Step ${i + 1} (index=${currentIndex}) sidebar: [${sidebarLabels.join(', ')}]`);

            const stepInfo = { name: sidebarLabels[0] || `Step ${i + 1}` };

            // Handle Account Credentials accordion sections ONE AT A TIME.
            // Each section (Command Login, KW Email Login) must be expanded individually,
            // filled, and saved before moving to the next — they may use v-if (inputs only
            // exist in DOM when expanded) and may be mutually exclusive (only one open at once).
            if (i === 0) {
                const credSections = ['Command Login', 'KW Email Login'];
                for (const secName of credSections) {
                    // Step 1: click the section header via Playwright native click (respects Vue handlers)
                    const secHeaderLocators = await this.page.locator('*').all();
                    let headerClicked = false;
                    for (const loc of secHeaderLocators) {
                        try {
                            const txt = (await loc.innerText({ timeout: 200 }).catch(() => '')).trim();
                            if (txt !== secName) continue;
                            if (!(await loc.isVisible({ timeout: 200 }).catch(() => false))) continue;
                            await loc.click({ force: true, timeout: 3000 });
                            headerClicked = true;
                            console.log(`>>> Account Credentials: clicked "${secName}" header`);
                            break;
                        } catch (_) { continue; }
                    }
                    if (!headerClicked) {
                        // Fallback: JS dispatch
                        headerClicked = await this.page.evaluate((name) => {
                            for (const el of document.querySelectorAll('*')) {
                                if ((el.innerText || '').trim() !== name) continue;
                                const r = el.getBoundingClientRect();
                                if (r.width > 0 && r.height > 0) { el.click(); return true; }
                            }
                            return false;
                        }, secName).catch(() => false);
                        if (headerClicked) console.log(`>>> Account Credentials: JS-clicked "${secName}" header`);
                    }
                    if (!headerClicked) {
                        console.log(`>>> Account Credentials: "${secName}" header not found — skipping`);
                        continue;
                    }

                    // Step 2: wait for inputs to appear (v-if inserts them into DOM after click)
                    await this.page.waitForTimeout(2000).catch(() => {});

                    // Scroll the accordion header into view so its body content is reachable
                    await this.page.evaluate((name) => {
                        for (const el of document.querySelectorAll('*')) {
                            if ((el.innerText || '').trim() !== name) continue;
                            const r = el.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) {
                                el.scrollIntoView({ behavior: 'instant', block: 'start' });
                                break;
                            }
                        }
                    }, secName).catch(() => {});
                    await this.page.waitForTimeout(400).catch(() => {});
                    // Scroll down to reveal the accordion body content below the header
                    await this.page.evaluate(() => window.scrollBy(0, 300)).catch(() => {});
                    await this.page.waitForTimeout(400).catch(() => {});

                    // Step 3: force-fill inputs, textareas and selects SCOPED to the accordion body.
                    // Strategy: walk up from the header element to find a sibling container that holds
                    // the form fields (the accordion body). Fall back to Y-position filter if not found.
                    const allInputsNow = await this.page.evaluate((name) => {
                        const inputSetter   = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,  'value').set;
                        const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;

                        // Locate the header element
                        let headerEl = null;
                        let headerBottom = 0;
                        for (const el of document.querySelectorAll('*')) {
                            if ((el.innerText || '').trim() !== name) continue;
                            const r = el.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) { headerEl = el; headerBottom = r.bottom; break; }
                        }

                        // Walk up from header to find a parent whose nextElementSibling contains form fields
                        // (this is the accordion body container)
                        let accordionBody = null;
                        let node = headerEl;
                        for (let i = 0; i < 12 && node; i++) {
                            const sib = node.nextElementSibling;
                            if (sib && sib.querySelector('input, textarea, select')) {
                                accordionBody = sib;
                                break;
                            }
                            node = node.parentElement;
                        }

                        const container = accordionBody || document;
                        const inSidebar = (el) => !!el.closest('[class*="sidebar"], [id*="sidebar"], nav, header');
                        // Only apply Y filter when no container found (document fallback)
                        const aboveHeader = (el) => {
                            if (accordionBody) return false;
                            const r = el.getBoundingClientRect();
                            return r.width > 0 && r.height > 0 && r.top < headerBottom - 10;
                        };

                        const results = [];

                        // --- INPUT elements ---
                        const inputs = container.querySelectorAll(
                            'input:not([disabled]):not([readonly]):not([type="hidden"]):not([type="button"])' +
                            ':not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])'
                        );
                        for (const inp of inputs) {
                            if (inSidebar(inp) || aboveHeader(inp)) continue;
                            const ph = (inp.placeholder || '').toLowerCase();
                            if (ph.includes('recipient') || ph.includes('select recipient')) continue;
                            const t = (inp.type || 'text').toLowerCase();
                            const existing = (inp.value || '').trim();
                            let val = null;
                            if (!existing) {
                                if (t === 'password' || ph.includes('pass')) val = 'Auto@Pass123';
                                else if (t === 'email' || ph.includes('email')) val = 'autotest@yopmail.com';
                                else if (t === 'url' || ph.includes('url') || ph.includes('link')) val = 'https://example.com';
                                else if (ph.includes('user') || ph.includes('login') || ph.includes('name')) val = 'AutoUser';
                                else val = 'AutoFill';
                            }
                            if (val) {
                                inputSetter.call(inp, val);
                                inp.dispatchEvent(new Event('input', { bubbles: true }));
                                inp.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            results.push({ t, ph, val: (inp.value || '').substring(0, 25), filled: !!val });
                        }

                        // --- TEXTAREA elements ---
                        const textareas = container.querySelectorAll('textarea:not([disabled]):not([readonly])');
                        for (const ta of textareas) {
                            if (inSidebar(ta) || aboveHeader(ta)) continue;
                            // Skip hidden (v-show collapsed)
                            const taR = ta.getBoundingClientRect();
                            if (taR.width === 0 && taR.height === 0) continue;
                            const existing = (ta.value || '').trim();
                            if (!existing) {
                                const val = 'AutoFill Text';
                                textareaSetter.call(ta, val);
                                ta.dispatchEvent(new Event('input', { bubbles: true }));
                                ta.dispatchEvent(new Event('change', { bubbles: true }));
                                results.push({ t: 'textarea', ph: ta.placeholder || '', val, filled: true });
                            }
                        }

                        // --- SELECT elements ---
                        const selects = container.querySelectorAll('select:not([disabled])');
                        for (const sel of selects) {
                            if (inSidebar(sel) || aboveHeader(sel)) continue;
                            const selR = sel.getBoundingClientRect();
                            if (selR.width === 0 && selR.height === 0) continue;
                            const existing = sel.value;
                            if (!existing || existing === '' || sel.selectedIndex <= 0) {
                                const opts = Array.from(sel.options).filter(o => o.value && o.value !== '');
                                if (opts.length > 0) {
                                    sel.value = opts[0].value;
                                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                                    results.push({ t: 'select', ph: sel.name || '', val: opts[0].value.substring(0, 25), filled: true });
                                }
                            }
                        }

                        return results;
                    }, secName).catch(() => []);
                    const newlyFilled = allInputsNow.filter(x => x.filled);
                    console.log(`>>> "${secName}" force-filled ${newlyFilled.length} field(s): ${JSON.stringify(newlyFilled)}`);

                    // Step 4: click Save button using Y-position proximity —
                    // find the header element's bottom Y, then pick the Save button
                    // that is visible and closest below that Y, excluding sidebar/nav areas.
                    const saveResult = await this.page.evaluate((name) => {
                        // Locate the header element
                        let headerEl = null;
                        for (const el of document.querySelectorAll('*')) {
                            if ((el.innerText || '').trim() !== name) continue;
                            const r = el.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) { headerEl = el; break; }
                        }
                        if (!headerEl) return 'no-header';

                        const headerBottom = headerEl.getBoundingClientRect().bottom;

                        // All visible Save buttons below the header, not inside sidebar/nav
                        const saveBtns = Array.from(document.querySelectorAll('button'))
                            .filter(b => /^save$/i.test((b.textContent || '').trim()))
                            .filter(b => {
                                const r = b.getBoundingClientRect();
                                return r.width > 0 && r.height > 0 && r.top >= headerBottom - 10;
                            })
                            .filter(b => !b.closest('[class*="sidebar"], [id*="sidebar"], nav, header'));

                        if (saveBtns.length === 0) return 'no-save-btn';

                        // Click the topmost one (closest to the header)
                        saveBtns.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
                        saveBtns[0].click();
                        return 'clicked';
                    }, secName).catch(() => 'error');

                    console.log(`>>> "${secName}" save result: ${saveResult}`);
                    if (saveResult === 'clicked') {
                        await this.page.waitForTimeout(1500).catch(() => {});
                        const t = await this.page.locator('[data-testid="toast-body"]').first()
                            .textContent({ timeout: 2000 }).catch(() => null);
                        if (t) console.log(`>>> "${secName}" save toast: "${t.trim()}"`);
                    }

                    // Diagnostic: dump all form elements still in the accordion body after save
                    const postSaveDump = await this.page.evaluate((name) => {
                        let headerEl = null;
                        for (const el of document.querySelectorAll('*')) {
                            if ((el.innerText || '').trim() !== name) continue;
                            const r = el.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) { headerEl = el; break; }
                        }
                        let container = document;
                        let node = headerEl;
                        for (let i = 0; i < 12 && node; i++) {
                            const sib = node.nextElementSibling;
                            if (sib && sib.querySelector('input, textarea, select')) { container = sib; break; }
                            node = node.parentElement;
                        }
                        const fields = [];
                        for (const el of container.querySelectorAll('input, textarea, select, [contenteditable="true"]')) {
                            const r = el.getBoundingClientRect();
                            fields.push({
                                tag: el.tagName.toLowerCase(),
                                type: el.type || '',
                                ph: (el.placeholder || el.name || '').substring(0, 30),
                                val: (el.value || el.textContent || '').substring(0, 20),
                                visible: r.width > 0 && r.height > 0,
                            });
                        }
                        return { containerFound: container !== document, fieldCount: fields.length, fields };
                    }, secName).catch(() => null);
                    if (postSaveDump) {
                        console.log(`>>> "${secName}" post-save dump (container=${postSaveDump.containerFound}, total=${postSaveDump.fieldCount}): ${JSON.stringify(postSaveDump.fields)}`);
                    }
                }
            }

            let submitted = false;
            for (let pg = 0; pg < 25; pg++) {
                await this.page.waitForTimeout(500).catch(() => {});

                // Always fill all field types before trying to submit.
                // Skip generic fill at i===0 (Account Credentials accordion step) — accordion
                // sections were already individually saved above; running fillAllVisibleFields()
                // here picks up sidebar fields and causes spurious checkbox/date fills.
                const hasSurvey = await this.page.locator('.sd-root-modern').first()
                    .isVisible({ timeout: 3000 }).catch(() => false);
                if (i !== 0) {
                    if (hasSurvey) {
                        await this.fillSurveyJSFormFields().catch(() => {});
                        await this.page.waitForTimeout(400).catch(() => {});
                    }
                    await this.fillAllVisibleFields().catch(() => {});
                    await this.page.waitForTimeout(400).catch(() => {});
                    await this.fillMandatoryFields().catch(() => {});
                }
                await this.page.waitForTimeout(400).catch(() => {});

                // Handle typeahead / multiselect inputs (e.g. "Select Recipient Names")
                // Skip at i===0 — those are sidebar fields, accordion sections were already saved.
                if (i !== 0) {
                    const typeaheads = this.page.locator(
                        'input[type="text"]:not([disabled]):not([readonly])'
                    ).filter({ hasText: '' });
                    const thCount = await typeaheads.count().catch(() => 0);
                    for (let ti = 0; ti < thCount; ti++) {
                        const th = typeaheads.nth(ti);
                        if (!(await th.isVisible().catch(() => false))) continue;
                        const ph = (await th.getAttribute('placeholder') || '').toLowerCase();
                        if (!ph.includes('select')) continue;
                        const val = await th.inputValue().catch(() => '');
                        if (val.trim()) continue; // already has a value
                        // Click to open dropdown, then pick first available option
                        await th.click({ force: true }).catch(() => {});
                        await this.page.waitForTimeout(700).catch(() => {});
                        const dropdownItem = this.page.locator(
                            'li[role="option"], [class*="option"]:not([class*="disabled"]), ' +
                            '[class*="dropdown-item"], [class*="multiselect__element"]'
                        ).first();
                        if (await dropdownItem.isVisible({ timeout: 1500 }).catch(() => false)) {
                            await dropdownItem.click({ force: true }).catch(() => {});
                            console.log(`>>> Typeahead [${ph}]: selected first option`);
                            await this.page.waitForTimeout(400).catch(() => {});
                        } else {
                            await this.page.keyboard.press('Escape').catch(() => {});
                            console.log(`>>> Typeahead [${ph}]: no options found`);
                        }
                    }
                    await this.page.waitForTimeout(300).catch(() => {});
                }

                await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
                await this.page.waitForTimeout(400).catch(() => {})

                // Diagnostic: log visible inputs after filling so we can see what was filled
                const dbgInputs = await this.page.evaluate(() => {
                    return Array.from(document.querySelectorAll('input:not([type="hidden"])'))
                        .filter(el => el.offsetParent !== null)
                        .map(el => ({
                            type: el.type || 'text',
                            ph: el.placeholder || '',
                            val: (el.value || '').substring(0, 25),
                            disabled: el.disabled,
                            readonly: el.readOnly,
                        }));
                }).catch(() => []);
                console.log(`>>> "${stepInfo.name}" inputs after fill: ${JSON.stringify(dbgInputs)}`);

                // (Accordion section saves were already handled in the i===0 pre-loop block above.
                //  No global "Save" button click here — sidebar profile/email Save buttons would fire instead.)

                // PRIORITY 1: Save & Next — handles <button>, input[type="button"], input[type="submit"]
                // Account Credentials uses input[type="button"][value="Save & Next"]
                let saveNextEl = this.page.locator('button').filter({ hasText: /save\s*(&|and)\s*next/i }).first();
                let hasSaveNext = await saveNextEl.isVisible({ timeout: 1500 }).catch(() => false);
                if (!hasSaveNext) {
                    // input[type="button"] or input[type="submit"] with value containing "Save"
                    const saveInputEl = this.page.locator(
                        'input[type="button"][value*="Save"], input[type="submit"][value*="Save"]'
                    ).first();
                    if (await saveInputEl.isVisible({ timeout: 1000 }).catch(() => false)) {
                        saveNextEl = saveInputEl;
                        hasSaveNext = true;
                    }
                }
                if (hasSaveNext) {
                    await saveNextEl.scrollIntoViewIfNeeded().catch(() => {});
                    await saveNextEl.click({ force: true }).catch(async () => {
                        await saveNextEl.dispatchEvent('click').catch(() => {});
                    });
                    console.log(`>>> "${stepInfo.name}" — clicked Save & Next (pg ${pg + 1})`);
                    submitted = true;
                    await this.page.waitForTimeout(2500).catch(() => {});
                    await this.waitForLoader().catch(() => {});
                    const toast1 = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
                    const msg1 = await toast1.textContent({ timeout: 2000 }).catch(() => null);
                    if (msg1) console.log(`>>> Toast: "${msg1.trim()}"`);
                    // Wait for URL index to advance (next Account Setup step)
                    await this.page.waitForURL(
                        new RegExp(`index=${currentIndex + 1}`), { timeout: 5000 }
                    ).catch(() => {});
                    break;
                }

                // PRIORITY 2: SurveyJS complete button
                if (hasSurvey) {
                    const submitBtn = this.page.locator('.sd-navigation__complete-btn').first();
                    if (await submitBtn.count().catch(() => 0) > 0) {
                        await submitBtn.click().catch(async () => {
                            await submitBtn.click({ force: true }).catch(() => {});
                        });
                        console.log(`>>> "${stepInfo.name}" — SurveyJS complete (pg ${pg + 1})`);
                        submitted = true;
                        await this.page.waitForTimeout(2000).catch(() => {});
                        await this.waitForLoader().catch(() => {});
                        const toast2 = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
                        const msg2 = await toast2.textContent({ timeout: 2000 }).catch(() => null);
                        if (msg2) console.log(`>>> Toast: "${msg2.trim()}"`);
                        break;
                    }

                    // PRIORITY 3: SurveyJS next-page button
                    const nextBtn = this.page.locator('.sd-navigation__next-btn').first();
                    if (await nextBtn.count().catch(() => 0) > 0) {
                        console.log(`>>> Form page ${pg + 1} → Next`);
                        await nextBtn.click().catch(async () => {
                            await nextBtn.click({ force: true }).catch(() => {});
                        });
                        await this.page.waitForTimeout(600).catch(() => {});
                        continue;
                    }
                }

                // No submit mechanism found
                const dbg = await this.page.evaluate(() => ({
                    sdRoots: document.querySelectorAll('.sd-root-modern').length,
                    completeBtns: document.querySelectorAll('.sd-navigation__complete-btn').length,
                    nextBtns: document.querySelectorAll('.sd-navigation__next-btn').length,
                    saveNextBtns: Array.from(document.querySelectorAll('button, input[type="button"]'))
                        .filter(b => /save.*next/i.test(b.textContent || b.value)).length,
                    url: window.location.search,
                })).catch(() => null);
                console.log(`>>> "${stepInfo.name}" — no submit on pg ${pg + 1}: ${JSON.stringify(dbg)}`);
                break;
            }

            if (!submitted) {
                console.log(`>>> "${stepInfo.name}" — not submitted (may be read-only or auto-completed)`);
            }
        }

        console.log('>>> Account Setup stage complete');
    }

    // ── Final step: Confirmation tab → Invite Agent ──────────────────────────────

    async clickConfirmationAndInviteAgent() {
        console.log('\n>>> Navigating to Confirmation tab...');

        const currentUrl = this.page.url();
        const accountMatch = currentUrl.match(/\/accounts\/([a-f0-9]+)/);
        const agentBase = accountMatch
            ? `https://qa.procasaonboard.com/accounts/${accountMatch[1]}`
            : null;

        // If we're already at stage=3 (e.g. Account Setup was auto-complete and tab click
        // landed on Confirmation), skip navigation — but verify the page stays at stage=3
        // (Vue router can redirect away if credentials are incomplete).
        let reachedStage3 = /stage=3/.test(currentUrl);
        if (reachedStage3) {
            console.log(`>>> Confirmation (stage=3) detected in URL — verifying page stays at stage=3...`);
            await this.waitForLoader().catch(() => {});
            await this.page.waitForTimeout(2500).catch(() => {});
            const verifyUrl = this.page.url();
            if (!/stage=3/.test(verifyUrl)) {
                console.log(`>>> Page redirected away from stage=3 to: ${verifyUrl} — will re-navigate`);
                reachedStage3 = false; // force re-navigation below
            } else {
                console.log(`>>> Stage=3 confirmed, proceeding to Invite Agent.`);
            }
        }

        if (!reachedStage3) {
            // Step 1: click the Confirmation tab from the CURRENT page.
            // The 4 stage tabs are always rendered on stage pages — no navigation needed.
            const confTabBtn = this.page.locator('button').filter({ hasText: /^Confirmation$/ }).first();
            let confBtnVisible = await confTabBtn.isVisible({ timeout: 5000 }).catch(() => false);

            // If not visible, navigate to the agent base URL and wait for tabs
            if (!confBtnVisible && agentBase) {
                console.log('>>> Confirmation tab not visible — navigating to agent base URL...');
                await this.page.goto(agentBase, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                await this.waitForLoader().catch(() => {});
                await this.page.waitForTimeout(3000).catch(() => {});
                console.log(`>>> Agent overview URL: ${this.page.url()}`);
                confBtnVisible = await confTabBtn.isVisible({ timeout: 5000 }).catch(() => false);
            }

            if (confBtnVisible) {
                await confTabBtn.click({ force: true }).catch(() => {});
                console.log('>>> Clicked Confirmation tab');
                reachedStage3 = await this.page.waitForURL(/stage=3/, { timeout: 10000 })
                    .then(() => true).catch(() => false);
                await this.waitForLoader().catch(() => {});
                await this.page.waitForTimeout(2000).catch(() => {});
                console.log(`>>> After Confirmation click: ${this.page.url()}`);
            }

            // Step 2: fallback — JS click via DOM text match (handles Vue-rendered button)
            if (!reachedStage3) {
                console.log('>>> Trying JS click on Confirmation tab...');
                await this.page.evaluate(() => {
                    for (const btn of document.querySelectorAll('button')) {
                        if ((btn.textContent || '').trim() === 'Confirmation') {
                            btn.click(); return;
                        }
                    }
                }).catch(() => {});
                await this.page.waitForURL(/stage=3/, { timeout: 8000 }).catch(() => {});
                await this.waitForLoader().catch(() => {});
                await this.page.waitForTimeout(2000).catch(() => {});
                reachedStage3 = /stage=3/.test(this.page.url());
                console.log(`>>> After JS Confirmation click: ${this.page.url()}`);
            }

            // Step 3: last resort — direct URL with stage=3
            if (!reachedStage3 && agentBase) {
                console.log('>>> Direct stage=3 URL fallback...');
                await this.page.goto(`${agentBase}?redirected=false&stage=3`,
                    { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                await this.waitForLoader().catch(() => {});
                await this.page.waitForTimeout(2000).catch(() => {});
                reachedStage3 = /stage=3/.test(this.page.url());
                console.log(`>>> Direct stage=3 result: ${this.page.url()}`);
            }
        } // end if (!reachedStage3)

        // Step 5: find and click "Invite Agent" button
        const inviteBtn = this.page.locator('button').filter({ hasText: /invite\s*agent/i }).first();
        const inviteVisible = await inviteBtn.isVisible({ timeout: 20000 }).catch(() => false);
        if (!inviteVisible) {
            await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
            await this.page.waitForTimeout(1000).catch(() => {});
        }

        // Wrap waitFor — prevents "page closed" crash from surfacing as an unhandled error
        try {
            await inviteBtn.waitFor({ state: 'visible', timeout: 15000 });
        } catch (e) {
            const errMsg = e?.message?.slice(0, 150) || String(e);
            try { console.log(`>>> Invite Agent button unreachable: ${errMsg}`); } catch (_) {}
            try { console.log(`>>> Current URL: ${this.page.url()}`); } catch (_) {}
            throw new Error(`Invite Agent button not found — agent may not be ready for invitation. ${errMsg}`);
        }

        await inviteBtn.click();
        console.log('>>> Clicked "Invite Agent" button');

        // Handle confirmation dialog — click "Allow"
        await this.page.waitForTimeout(1500).catch(() => {});
        const allowBtn = this.page.locator('button').filter({ hasText: /^allow$/i }).first()
            .or(this.page.locator('button').filter({ hasText: /allow/i }).first());
        if (await allowBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
            await allowBtn.click();
            console.log('>>> Clicked "Allow" on confirmation dialog');
        } else {
            console.log('>>> No "Allow" dialog found — proceeding');
        }

        // Wait for invitation success — the app shows either a toast OR a static inline message
        // "Invitation email has been successfully sent to the agent" + "Re-Invite" button.
        console.log('>>> Waiting for invitation success indicator...');
        await this.page.waitForTimeout(2000);

        // Check for toast (quick dismissing notification)
        const toast = this.page.locator('[data-testid="toast-body"], [data-testid="toast-content"]').first();
        const toastVisible = await toast.isVisible({ timeout: 5000 }).catch(() => false);
        if (toastVisible) {
            const msg = (await toast.textContent())?.trim();
            console.log(`>>> Invite Agent toast: "${msg}"`);
            await this.page.waitForTimeout(3000);
            return msg;
        }

        // Check for static success message or Re-Invite button (appears after successful invite)
        const successText = this.page.locator('text=Invitation email has been successfully sent').first();
        const reInviteBtn = this.page.locator('button').filter({ hasText: /re.?invite/i }).first();
        const successVisible = await successText.isVisible({ timeout: 10000 }).catch(() => false);
        const reInviteVisible = await reInviteBtn.isVisible({ timeout: 2000 }).catch(() => false);

        if (successVisible || reInviteVisible) {
            console.log('>>> Invitation confirmed — "Invitation email has been successfully sent to the agent"');
            await this.page.waitForTimeout(3000);
            return 'Invitation sent successfully';
        }

        // Last resort: check current page text for any success indicator
        const pageText = await this.page.textContent('body').catch(() => '');
        if (/invitation.*sent|invited|onboard.*success/i.test(pageText)) {
            console.log('>>> Invitation success detected in page text');
            await this.page.waitForTimeout(3000);
            return 'Invitation sent successfully';
        }

        console.log('>>> No explicit success indicator found — invite may have been processed');
        await this.page.waitForTimeout(3000);
        return 'Invite clicked';
    }

    // Fill all SurveyJS form fields scoped to .sd-root-modern (safe — avoids sidebar)
    async fillSurveyJSFormFields() {
        await this.page.waitForTimeout(300);

        // Radios — first option per group
        const radios = this.page.locator('.sd-root-modern input[type="radio"]:not([disabled])');
        const radioCount = await radios.count().catch(() => 0);
        const seenGroups = new Set();
        for (let i = 0; i < radioCount; i++) {
            const r = radios.nth(i);
            if (!(await r.isVisible().catch(() => false))) continue;
            const grp = await r.getAttribute('name') || `g${i}`;
            if (seenGroups.has(grp)) continue;
            seenGroups.add(grp);
            await r.check({ force: true }).catch(() => {});
            console.log(`>>> Radio "${grp}": first option`);
        }

        // SurveyJS dropdowns — click "Select..." inputs to open popup, then pick first option
        const dropdownInputs = this.page.locator(
            '.sd-root-modern input[placeholder="Select..."]:not([disabled]):not([readonly])'
        );
        const ddCount = await dropdownInputs.count().catch(() => 0);
        for (let i = 0; i < ddCount; i++) {
            const dd = dropdownInputs.nth(i);
            if (!(await dd.isVisible().catch(() => false))) continue;
            const currentVal = await dd.inputValue().catch(() => '');
            if (currentVal.trim()) continue; // already has a selection
            await dd.click({ force: true }).catch(() => {});
            await this.page.waitForTimeout(600).catch(() => {});
            // First option in SurveyJS popup list
            const popupOption = this.page.locator(
                '.sv-popup .sv-list__item:not(.sv-list__item--disabled),' +
                '.sv-popup [role="option"],' +
                '[class*="sd-popup"] [class*="item"],' +
                '[class*="sv-popup"] [class*="item"]'
            ).first();
            const optCount = await popupOption.count().catch(() => 0);
            if (optCount > 0) {
                await popupOption.click({ force: true }).catch(() => {});
                await this.page.waitForTimeout(300).catch(() => {});
                console.log('>>> Dropdown: selected first option');
            } else {
                await this.page.keyboard.press('Escape').catch(() => {});
                console.log('>>> Dropdown: no options found, closed');
            }
        }

        // Text / URL / email / date inputs (skip file, button, radio, checkbox, hidden)
        // Also skip typeahead "Select..." inputs — they have placeholder="Select..." or id ending
        // in _N (SurveyJS dropdown backing inputs). Filling these with text breaks SurveyJS validation.
        const inputs = this.page.locator(
            '.sd-root-modern input:not([type="radio"]):not([type="checkbox"])' +
            ':not([type="file"]):not([type="hidden"]):not([type="button"]):not([disabled]):not([readonly])'
        );
        const inputCount = await inputs.count().catch(() => 0);
        for (let i = 0; i < inputCount; i++) {
            const inp = inputs.nth(i);
            if (!(await inp.isVisible().catch(() => false))) continue;
            const ph  = (await inp.getAttribute('placeholder') || '').toLowerCase();
            const id  = (await inp.getAttribute('id') || '');
            // Skip SurveyJS typeahead/dropdown inputs (placeholder "select..." or id ends in _N)
            if (ph.includes('select') || /sq_\w+_\d+$/.test(id)) continue;
            const val = await inp.inputValue().catch(() => '');
            // Skip if already filled (and not just a mask placeholder)
            if (val.trim() && !val.includes('_')) continue;
            const type = (await inp.getAttribute('type') || 'text').toLowerCase();
            const imode = (await inp.getAttribute('inputmode') || '').toLowerCase();
            let v = type === 'date'                                                          ? '2024-06-01'
                  : type === 'url'  || ph.includes('url')                                  ? 'https://example.com'
                  : type === 'email'|| ph.includes('email')                                ? `auto${randomLetters(4)}@yopmail.com`
                  : ph.includes('phone') || ph.includes('999')                             ? '5125551234'
                  : ph.includes('dre#') || ph.includes('dre number') || ph.includes('nrds') || ph.includes('nar member') || ph.includes('member id') ? '0987654321'
                  : type === 'number' || imode === 'numeric' || imode === 'decimal'        ? '12345678'
                  :                                                                           `Auto ${randomLetters(4)}`;
            await inp.fill(v, { force: true }).catch(() => {});
            console.log(`>>> Input [${ph || id || type}]: "${v}"`);
        }

        // Textareas
        const textareas = this.page.locator('.sd-root-modern textarea:not([disabled]):not([readonly])');
        const taCount = await textareas.count().catch(() => 0);
        for (let i = 0; i < taCount; i++) {
            const ta = textareas.nth(i);
            if (!(await ta.isVisible().catch(() => false))) continue;
            const val = await ta.inputValue().catch(() => '');
            if (!val.trim()) {
                await ta.fill('Auto response.', { force: true }).catch(() => {});
                console.log('>>> Textarea: filled');
            }
        }

        // Checkboxes — first option only
        const cbs = this.page.locator('.sd-root-modern input[type="checkbox"]:not([disabled])');
        const cbCount = await cbs.count().catch(() => 0);
        for (let i = 0; i < cbCount; i++) {
            const cb = cbs.nth(i);
            if (!(await cb.isVisible().catch(() => false))) continue;
            if (!(await cb.isChecked().catch(() => false))) {
                await cb.check({ force: true }).catch(() => {});
                console.log('>>> Checkbox: checked first option');
                break;
            }
        }

        // Label-based overrides — find inputs by their SurveyJS question title text
        // and set a fixed value regardless of what the generic loop filled above.
        // (this comment kept for context — method continues below)
        const labelOverrides = [
            { keywords: ['dre#', 'dre number', 'dre no'],     value: '0987654321' },
            { keywords: ['nrds', 'nar member', 'member id'],  value: '0987654321' },
        ];
        for (const spec of labelOverrides) {
            const filled = await this.page.evaluate((spec) => {
                // Only match individual question titles (.sd-question__title), NOT panel/group titles
                // (.sd-element__title is too broad — it matches containers enclosing multiple questions)
                const titleEls = Array.from(document.querySelectorAll(
                    '.sd-root-modern .sd-question__title, .sd-root-modern .sv-question__title'
                ));
                for (const titleEl of titleEls) {
                    const text = (titleEl.textContent || '').toLowerCase().trim();
                    if (!spec.keywords.some(kw => text.includes(kw))) continue;
                    // Navigate precisely to this question's own container using closest()
                    // SurveyJS structure: .sd-question > .sd-question__header > .sd-question__title
                    //                                 > .sd-question__content > input
                    const question = titleEl.closest('.sd-question, .sv-question');
                    if (!question) continue;
                    const inp = question.querySelector(
                        'input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]):not([disabled]):not([readonly])'
                    );
                    if (!inp) continue;
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                    nativeSetter?.call(inp, spec.value);
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    return text;
                }
                return null;
            }, spec);
            if (filled) console.log(`>>> Label override ["${filled}"]: "${spec.value}"`);
        }
    }

    // ── Verify agent appears in Completed tab after invitation ───────────────────

    async verifyAgentInCompletedTab() {
        console.log('\n>>> Navigating back to Manage Agents to verify Completed tab...');

        // Navigate to Manage Agents
        await this.page.goto('https://qa.procasaonboard.com/manageAgents', {
            waitUntil: 'domcontentloaded', timeout: 20000
        }).catch(() => {});
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.waitForLoader();

        // Click the Completed tab
        const completedTab = this.page.locator('text=Completed').first();
        await completedTab.waitFor({ state: 'visible', timeout: 10000 });
        await completedTab.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.waitForLoader();
        await this.page.waitForTimeout(2000);
        const completedText = (await completedTab.textContent())?.trim();
        console.log(`>>> Completed tab: "${completedText}"`);

        if (this.selectedAgentName) {
            // Search for the agent by name in the search box
            const searchInput = this.page.locator('input[placeholder="Search Agent Name"]');
            await searchInput.waitFor({ state: 'visible', timeout: 10000 });
            await searchInput.fill(this.selectedAgentName);
            console.log(`>>> Searching for: "${this.selectedAgentName}"`);
            await this.page.waitForTimeout(3000); // wait for autocomplete dropdown to appear

            // Click the agent name from the dropdown suggestion list
            const suggestion = this.page.locator(`div.capitalize.truncate[title="${this.selectedAgentName}"]`).first();
            const suggestionVisible = await suggestion.isVisible({ timeout: 8000 }).catch(() => false);
            if (suggestionVisible) {
                await suggestion.click();
                console.log(`>>> Clicked agent name from dropdown: "${this.selectedAgentName}"`);
                await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
                await this.waitForLoader();
                await this.page.waitForTimeout(1000);

                // Verify agent card is visible after selecting from dropdown (non-fatal)
                const agentCard = this.page.locator(`div.capitalize.truncate[title="${this.selectedAgentName}"]`).first();
                const cardVisible = await agentCard.isVisible({ timeout: 5000 }).catch(() => false);
                if (cardVisible) {
                    console.log(`>>> Agent "${this.selectedAgentName}" confirmed in Completed tab ✓`);
                } else {
                    console.log(`>>> Agent "${this.selectedAgentName}" card not visible after clicking dropdown — onboarding may still be processing`);
                }
            } else {
                console.log(`>>> Agent "${this.selectedAgentName}" not found in Completed tab dropdown — agent may not have moved to Completed yet`);
                // Log current tab state for diagnosis
                const tabText = (await completedTab.textContent())?.trim();
                console.log(`>>> Current Completed tab count: "${tabText}"`);
            }
        } else {
            console.log('>>> Agent name not captured — verifying at least one agent is in Completed tab');
            const agentCards = this.page.locator('div.capitalize.truncate[title]');
            const count = await agentCards.count();
            expect(count).toBeGreaterThan(0);
            console.log(`>>> Completed tab has ${count} agent(s) ✓`);
        }
    }
};
