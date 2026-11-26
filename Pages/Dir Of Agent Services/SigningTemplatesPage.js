const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// "AI generated" — realistic e-sign template names/descriptions, made unique per run
function generateTemplateNameAndDescription() {
    const docTypes = [
        'Independent Contractor Agreement', 'Exclusive Buyer Representation Agreement',
        'Listing Agreement', 'Commission Disclosure Form', 'Agent Onboarding Agreement',
        'Non-Disclosure Agreement', 'Referral Fee Agreement', 'Property Management Agreement',
        'Broker-Agent Agreement', 'Marketing Consent Form',
    ];
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const uniqueSuffix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const docType = docTypes[Math.floor(Math.random() * docTypes.length)];
    const name = `${docType} ${uniqueSuffix}`;
    const description = `Signing template for the ${docType.toLowerCase()}, used to collect the required signatures during agent onboarding.`;
    return { name, description };
}

// Builds a syntactically valid PDF padded with random bytes to land within [minMB, maxMB]
function generateSigningDocumentPdf(minMB = 3, maxMB = 6) {
    const dir = path.join(__dirname, '..', '..', 'tests', 'uploadfiles');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `SigningTemplateDoc_${Date.now()}.pdf`);

    const targetMB = Math.random() * (maxMB - minMB) + minMB;
    const targetBytes = Math.round(targetMB * 1024 * 1024);

    const contentStream = 'BT /F1 18 Tf 72 720 Td (Automation Test Document) Tj ET';
    const header = '%PDF-1.4\n' +
        '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n' +
        '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n' +
        '3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>\nendobj\n' +
        `4 0 obj\n<</Length ${contentStream.length}>>\nstream\n${contentStream}\nendstream\nendobj\n`;

    const overheadEstimate = 400; // padding-object wrapper + xref/trailer text
    const paddingBytes = Math.max(0, targetBytes - Buffer.byteLength(header, 'utf8') - overheadEstimate);
    const padHeader = `5 0 obj\n<</Type/EmbeddedFile/Length ${paddingBytes}>>\nstream\n`;
    const padFooter = '\nendstream\nendobj\n';
    const trailer = 'xref\n0 6\n0000000000 65535 f \ntrailer\n<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF';

    const buffer = Buffer.concat([
        Buffer.from(header, 'utf8'),
        Buffer.from(padHeader, 'utf8'),
        crypto.randomBytes(paddingBytes),
        Buffer.from(padFooter, 'utf8'),
        Buffer.from(trailer, 'utf8'),
    ]);

    fs.writeFileSync(filePath, buffer);
    const actualMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`>>> Generated signing document: ${path.basename(filePath)} (${actualMB} MB)`);
    return filePath;
}

exports.SigningTemplatesPage = class SigningTemplatesPage {
    constructor(page) {
        this.page = page;

        // Sidebar — "Signing Templates" parent menu + its three sub-items
        this.signingTemplatesMenu = page.locator('span', { hasText: 'Signing Templates' }).first();
        this.templatesLink = page.locator('a[href="/esign/templates"]');
        this.statusTrackerLink = page.locator('a[href="/esign/status-tracker"]');
        this.providerSettingsLink = page.locator('a[href="/esign-settings"]');

        // Provider Settings page
        this.providerSettingsTitle = page.locator('h1', { hasText: 'eSignature Settings' });
        this.procasaRadio = page.locator('input[type="radio"][value="docuseal"]');
        // the provider Save button is the first "Save" button on this page (page also has profile/email-signature Save buttons further down)
        this.providerSaveBtn = page.locator('button', { hasText: 'Save' }).first();
        this.successToast = page.locator('[data-testid="toast-body"]').first();

        // Templates page
        this.templatesTitle = page.locator('h1', { hasText: 'Signing Templates' });
        this.createTemplateBtn = page.locator('button', { hasText: 'Create Template' }).first();
        this.createTemplateFormTitle = page.locator('h3', { hasText: 'Create Signing Template' });
        this.cancelBtn = page.locator('button', { hasText: 'Cancel' });

        // Create Signing Template wizard — Step 1: Details & Documents
        this.formFieldLabels = page.locator('.relative.bg-white.rounded-2xl label, .relative.bg-white.rounded-2xl p.text-xs.font-semibold.text-gray-600');
        this.templateNameInput = page.locator('#tpl-name');
        this.templateDescriptionInput = page.locator('#tpl-description');
        this.roleMultiselect = page.locator('.multiselect').first();
        this.roleOptions = page.locator('.multiselect__content li.multiselect__element');
        this.documentFileInput = page.locator('#tpl-file-input');
        this.nextBtn = page.locator('button', { hasText: 'Next' });

        // Step 2: Signing Order
        this.signingOrderCheckbox = page.locator('input[type="checkbox"].checkbox-primary');

        // Step 3: Email Message
        this.emailSubjectInput = page.locator('#tpl-email-subject');
        this.emailBodyInput = page.locator('#tpl-email-body');
        this.submitCreateTemplateBtn = page.locator('button', { hasText: 'Create Template' }).last();

        // Template field editor (opens automatically after a template is created)
        this.saveTemplateBtn = page.locator('button', { hasText: 'Save Template' });
        this.documentPageImage = page.locator('img.block.w-full.h-auto').first();
        this.procasaFieldsHeader = page.locator('text=Procasa Fields').first();
        this.signatureFieldBtn = page.locator('button[title="Drag or click to place Signature"]');
    }

    async openSigningTemplatesMenu() {
        // sub-menu is collapsed by default — expand it if the sub-links aren't visible yet
        if (!(await this.providerSettingsLink.isVisible().catch(() => false))) {
            await this.signingTemplatesMenu.click();
            await this.providerSettingsLink.waitFor({ state: 'visible', timeout: 10000 });
        }
        console.log('>>> "Signing Templates" menu expanded — Templates / Status Tracker / Provider Settings visible');
    }

    async openProviderSettings() {
        await this.openSigningTemplatesMenu();
        await this.providerSettingsLink.click();
        await expect(this.providerSettingsTitle).toBeVisible({ timeout: 15000 });
        // provider data loads asynchronously after route mount — let it settle before reading/toggling the radio state
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        console.log('>>> Provider Settings page opened');
    }

    async selectProcasaProviderIfNotSelected() {
        await this.procasaRadio.waitFor({ state: 'visible', timeout: 10000 });
        if (await this.procasaRadio.isChecked()) {
            console.log('>>> Procasa is already the selected signing provider — nothing to do');
            return;
        }
        await this.procasaRadio.click({ force: true });
        await this.providerSaveBtn.click();
        await expect(this.successToast).toBeVisible({ timeout: 15000 });
        console.log('>>> Procasa selected and saved as signing provider');
    }

    async openTemplates() {
        await this.openSigningTemplatesMenu();
        await this.templatesLink.click();
        await expect(this.templatesTitle).toBeVisible({ timeout: 15000 });
        console.log('>>> Templates page opened');
    }

    async clickCreateTemplateAndVerifyFormOpens() {
        await this.createTemplateBtn.click();
        await expect(this.createTemplateFormTitle).toBeVisible({ timeout: 10000 });
        console.log('>>> "Create Signing Template" form verified open');
    }

    async readFormFields() {
        const labels = await this.formFieldLabels.evaluateAll(els =>
            els.map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)
        );
        console.log(`>>> Create Template form fields: ${JSON.stringify(labels)}`);
        return labels;
    }

    async fillTemplateNameAndDescription() {
        const { name, description } = generateTemplateNameAndDescription();
        await this.templateNameInput.fill(name);
        await this.templateDescriptionInput.fill(description);
        console.log(`>>> Template Name: "${name}"`);
        console.log(`>>> Description: "${description}"`);
        return { name, description };
    }

    async selectRoles() {
        await this.roleMultiselect.click();
        await this.roleOptions.first().waitFor({ state: 'visible', timeout: 10000 });

        const agentOption = this.page.locator('.multiselect__content li').filter({ hasText: /^Agent$/ });
        await agentOption.first().click();
        console.log('>>> Role selected: Agent');

        const dasOption = this.page.locator('.multiselect__content li', { hasText: 'Director of agent services' });
        await dasOption.first().click();
        console.log('>>> Role selected: Director of agent services');

        // close the dropdown by clicking elsewhere on the form
        await this.templateNameInput.click();
    }

    async uploadSigningDocument() {
        const pdfPath = generateSigningDocumentPdf(3, 6);
        await this.documentFileInput.setInputFiles(pdfPath);
        await this.page.waitForTimeout(1000);
        console.log('>>> Signing document uploaded');
        // the browser already read the file's bytes into memory for the upload — safe to remove from disk now
        this._uploadedPdfPath = pdfPath;
        return pdfPath;
    }

    async verifyNextEnabledAndClick() {
        await expect(this.nextBtn).toBeEnabled({ timeout: 10000 });
        console.log('>>> "Next" button is enabled');
        await this.nextBtn.click();
        console.log('>>> Clicked "Next"');
    }

    async verifySigningOrderCheckedAndProceed() {
        await this.signingOrderCheckbox.waitFor({ state: 'visible', timeout: 10000 });
        if (!(await this.signingOrderCheckbox.isChecked())) {
            await this.signingOrderCheckbox.click({ force: true });
            console.log('>>> "Set signing order" checkbox was unchecked — checked it now');
        } else {
            console.log('>>> "Set signing order" checkbox is already checked');
        }
        await this.nextBtn.click();
        console.log('>>> Clicked "Next" from Signing Order step');
    }

    async fillEmailAndCreateTemplate(templateName) {
        await this.emailSubjectInput.fill(`Please sign: ${templateName}`);
        await this.emailBodyInput.fill('Please review and sign the attached document.');

        await this.submitCreateTemplateBtn.click();
        console.log('>>> Clicked "Create Template"');

        await Promise.race([
            this.createTemplateFormTitle.waitFor({ state: 'hidden', timeout: 45000 }),
            this.successToast.waitFor({ state: 'visible', timeout: 45000 }),
        ]);
        await expect(this.successToast).toBeVisible({ timeout: 15000 });
        console.log(`>>> Toast: ${await this.successToast.textContent()}`);

        // clean up the generated test PDF — no longer needed once the upload has completed
        if (this._uploadedPdfPath) {
            fs.unlink(this._uploadedPdfPath, () => {});
        }
    }

    async waitForTemplateEditorToOpen() {
        await this.saveTemplateBtn.waitFor({ state: 'visible', timeout: 20000 });
        await this.documentPageImage.waitFor({ state: 'visible', timeout: 20000 });
        console.log('>>> Template field editor opened — document loaded');
    }

    async openProcasaFieldsPanel() {
        // field type list is collapsed by default — expand it if not already visible
        if (!(await this.signatureFieldBtn.isVisible().catch(() => false))) {
            await this.procasaFieldsHeader.click();
            await this.signatureFieldBtn.waitFor({ state: 'visible', timeout: 10000 });
        }
        console.log('>>> "Procasa Fields" panel expanded');
    }

    async dragSignatureFieldOntoDocument(targetY = 100) {
        const srcBox = await this.signatureFieldBtn.boundingBox();
        await this.signatureFieldBtn.dragTo(this.documentPageImage, {
            sourcePosition: { x: srcBox.width / 2, y: srcBox.height / 2 },
            targetPosition: { x: 100, y: targetY },
        });
        await this.page.waitForTimeout(800);
        console.log('>>> Dragged a Signature field onto the document');
    }

    async assignFieldsToRecipient(recipientName) {
        const recipientBtn = this.page.locator('button', { hasText: recipientName });
        await recipientBtn.click();
        console.log(`>>> "Assign to" switched to: ${recipientName}`);
    }

    // Places one signature field per recipient — field 1 for the recipient active by
    // default ("Agent"), then switches "Assign to" and places field 2 for the 2nd recipient
    async placeSignatureFieldsForBothRecipients() {
        await this.openProcasaFieldsPanel();

        await this.dragSignatureFieldOntoDocument(100);

        await this.assignFieldsToRecipient('Director of agent services');
        await this.dragSignatureFieldOntoDocument(250);
    }

    async saveTemplate() {
        await this.saveTemplateBtn.click();
        console.log('>>> Clicked "Save Template"');

        // the app navigates back to the templates list right after saving — the toast
        // can auto-dismiss before/around that navigation, so accept either signal
        await Promise.race([
            this.successToast.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
            this.page.waitForURL(/\/esign\/templates$/, { timeout: 20000 }).catch(() => {}),
        ]);

        const toastVisible = await this.successToast.isVisible().catch(() => false);
        if (toastVisible) {
            console.log(`>>> Toast: ${await this.successToast.textContent()}`);
        }
        await expect(this.page).toHaveURL(/\/esign\/templates$/, { timeout: 15000 });
        console.log('>>> Template saved — back on Signing Templates list');
    }
};
