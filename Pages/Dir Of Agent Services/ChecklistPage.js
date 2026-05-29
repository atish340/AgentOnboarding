const { expect } = require('@playwright/test');

function generateActivityName() {
    const verbs = ['Complete', 'Submit', 'Review', 'Verify', 'Upload', 'Schedule', 'Confirm', 'Finalize'];
    const nouns = ['License Documentation', 'Profile Setup', 'Onboarding Form', 'Background Check', 'MLS Registration', 'Contract Review', 'Training Module', 'Credential Verification'];
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${verbs[Math.floor(Math.random() * verbs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${suffix}`;
}

function generateDescription() {
    const templates = [
        'Ensure all required documents are submitted and verified before proceeding.',
        'Complete this activity as part of the standard onboarding process.',
        'Review and confirm accuracy of all provided information.',
        'Upload supporting documents and notify the relevant team members.',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

function generateFieldTitle() {
    const words = ['Verification', 'Confirmation', 'Acknowledgement', 'Declaration', 'Consent', 'Agreement', 'Review', 'Approval'];
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${words[Math.floor(Math.random() * words.length)]} ${suffix}`;
}

function generate100DayActivityName() {
    const actions = ['Orientation', 'Training Session', 'Coaching', 'Mentorship Review', 'Goal Setting', 'Performance Assessment', 'Networking', 'Market Study'];
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${actions[Math.floor(Math.random() * actions.length)]} ${suffix}`;
}

function generate100DayDescription() {
    const templates = [
        'This activity is part of the 100-day onboarding program to ensure agent success.',
        'Complete this milestone to progress through the structured 100-day plan.',
        'Track agent development and provide support throughout the onboarding journey.',
        'Review progress and adjust goals based on performance metrics.',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

function generateSmartSubject() {
    const subjects = ['100-Day Milestone Reached', 'Agent Progress Update', 'Onboarding Reminder', 'Training Completion Notice', 'Next Steps in Your 100-Day Plan'];
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${subjects[Math.floor(Math.random() * subjects.length)]} ${suffix}`;
}

function generateSmartBody() {
    const bodies = [
        'Please complete the assigned task as part of your onboarding journey.',
        'Congratulations on reaching this milestone in your 100-day plan.',
        'Your progress has been noted. Please review the next steps and proceed accordingly.',
        'This is a reminder to complete your pending onboarding activities.',
    ];
    return bodies[Math.floor(Math.random() * bodies.length)];
}

function generateDayTaskTitle() {
    const titles = ['Initial Assessment', 'Day 1 Orientation Check', 'First Week Review', 'Onboarding Confirmation', 'Progress Verification'];
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${titles[Math.floor(Math.random() * titles.length)]} ${suffix}`;
}

function generateTagActivityName() {
    const actions = ['Complete', 'Submit', 'Review', 'Attend', 'Participate In', 'Finish', 'Schedule'];
    const topics = ['Tag Orientation', 'Tag Training', 'Group Coaching Session', 'Tag Milestone Review', 'Progress Evaluation', 'Tag Activity Assessment'];
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${actions[Math.floor(Math.random() * actions.length)]} ${topics[Math.floor(Math.random() * topics.length)]} ${suffix}`;
}

exports.ChecklistPage = class ChecklistPage {
    constructor(page) {
        this.page = page;

        // Navigate to checklist page 
        this.checklistLink = page.locator('//a[@href="/checklist"]');

        // Verify page name 
        this.pageTitle = page.locator('//*[@class="text-xl font-semibold pb-2 pl-[14px]"]');

        // Verify checklist card present 
        this.checklistCard = page.locator('//*[@class="pl-[14px]"]');

        // Create new version of RO checklist 
        this.createVersionBtn = page.locator('div[data-testid^="checklist-card"]', { hasText: 'R0' })
            .locator('img[alt="search"]');


        // Confirmation modal 
        this.confirmationModal = page.locator('//*[@class="modal-box"]');

        // Click Yes 
        this.confirmYes = page.locator('//button[@class="btn bg-[#0000FE] text-white hover:bg-[#0000FE]"]');

        // Open RO checklist in design 
        this.roChecklistCard = page.locator('div[data-testid^="checklist-card"]', { hasText: 'R0' }).last();


        // Add task 
        this.addTaskBtn = page.locator('//*[@class="bg-black hover:bg-[#474747] text-white px-4 py-2 rounded-lg text-base"]').nth(0);
        this.activityTitle = page.locator('//*[@id="formName"]');
        this.activityDescription = page.locator('//*[@data-placeholder="Placeholder Text"]');
        this.activityDuration = page.locator('//input[@placeholder="Enter duration"]');
        this.firstDropdown = page.locator('div').filter({ hasText: /^Select Oversight$/ })
        this.selectRole = page.locator('span').filter({ hasText: 'Director of agent services' }).first()

        this.secondDropdown = page.locator('select[name="selectAccountable"]');

        this.addFormFieldBtn = page.getByRole('button', { name: 'Add Form Field *' })


        this.formFieldTitle = page.locator('//div[@id="manage-activity-title"]//p[@data-placeholder="Placeholder Text"]');
        this.formFieldDescription = page.locator('//div[@id="manage-activity-description"]//p[@data-placeholder="Placeholder Text"]');

        this.fieldTypeDropdown = page.locator('//select[@class="form-select"]');

        // Save buttons
        this.saveFormFieldBtn = page.locator('//button[@id="activity-task-save"]');
        this.saveActivityBtn = page.locator('//button[@id="manage-activity-save"]');

        // Publish
        this.publishChecklist = page.getByRole('button', { name: 'Publish' });
        this.confirmVersion = page.locator('//button[@class="btn bg-[#0000FE] text-white hover:bg-[#0000FE]"]')

        // Toast
        this.toast = page.locator('[data-testid="toast-body"]').first();

        //Navigate to 100 day checklist 
        this.navigate100day = page.getByRole('tab', { name: '100-Days Checklist' });

        // //Add Form field
        this.addNewFormField = page.locator('//button[@class="bg-black hover:bg-[#474747] text-white px-4 py-2 rounded-lg text-base"]').nth(0);

        this.activityTitle100 = page.locator('//input[@id="formName"]')
        this.activityDescription100 = page.locator('//*[@data-placeholder="Placeholder Text"]');
        this.activitydURATION100 = page.locator('//*[@placeholder="Enter duration"]');
        this.smartActivityToggle = page.getByText('Smart Activity');
        this.selectDay = page.locator('select[name="activitydays"]');
        this.email = page.locator('//input[@placeholder="Enter email"]');
        this.subject = page.locator('//input[@placeholder="Enter subject"]');
        this.emailBody = page.locator('#body-scroll').getByRole('paragraph').filter({ hasText: /^$/ });
        this.saveActivity100 = page.locator('//button[@id="manage-activity-save"]');

        this.Open100day = page.locator('//*[@class="w-6 h-6 text-gray-800 dark:text-white"]').nth(0)
        this.editDay1 = page.locator('//*[@class="rounded text-slate-800 cursor-pointer text-sm font-medium px-2 py-2 inline-flex space-x-1 items-center tooltip"]').nth(0)
        this.addformfieldDay1 = page.locator('//button[@class="text-white text-sm w-fit justify-center bg-white py-4 px-4 rounded font-medium inline-flex space-x-1 items-center"]')
        this.day1Title = page.locator('//p[@data-placeholder="Placeholder Text"]').nth(0)
        this.day1Description = page.locator('#manage-activity-description').getByRole('paragraph').filter({ hasText: /^$/ })
        this.saveDay1 = page.locator('//button[@id="activity-task-save"]')

        // 100-Days Tag tab
        this.navigate100dayTagTab = page.locator('#tab-100-days-tag');
        this.addTagBtn          = page.getByRole('button', { name: 'Add Tag' });
        this.tagNameInput       = page.locator('input[placeholder*="tag" i], input[placeholder*="name" i], input[name*="tag" i]').first();
        this.tagDescInput       = page.locator('textarea[placeholder*="description" i], input[placeholder*="description" i]').first();
        this.tagSaveBtn         = page.locator('button[type="submit"][class*="ml-4"]').first();




    }
    watchForToast() {
        // Must be called BEFORE the triggering action
        return this.page.waitForSelector(
            '[data-testid="toast-body"], [data-testid="toast-content"]',
            { state: 'attached', timeout: 10000 }
        ).catch(() => null);
    }

    async resolveToast(toastPromise, label, expectedMsg) {
        const toastEl = await toastPromise;
        if (!toastEl) {
            // Navigation may have cleared the DOM — do a final check on current page state
            const fallback = await this.page.locator(
                '[data-testid="toast-body"], [data-testid="toast-content"]'
            ).first().textContent({ timeout: 3000 }).catch(() => null);

            if (fallback) {
                const msg = fallback.trim();
                console.log(`>>> Toast [${label}]: "${msg}"`);
                if (expectedMsg) expect(msg).toBe(expectedMsg);
                return msg;
            }

            console.warn(`>>> Toast [${label}]: not captured (brief/navigation)`);
            return null;
        }
        const msg = (await toastEl.textContent().catch(() => ''))?.trim();
        console.log(`>>> Toast [${label}]: "${msg}"`);
        if (expectedMsg) expect(msg).toBe(expectedMsg);
        return msg;
    }

    async selectActivityDay(dayLabel) {
        await this.selectDay.selectOption({ label: dayLabel });
    }

    async selectResponsibleRole() {
        await this.secondDropdown.selectOption({
            label: 'Director of agent services'
        });
    }

    async openChecklist() {
        await this.checklistLink.click();
        await expect(this.pageTitle).toBeVisible();
    }

    async createNewVersion() {
        // If R0 is already in In-design (2+ R0 cards), skip creating a new version
        const r0Cards = this.page.locator('div[data-testid^="checklist-card"]', { hasText: 'R0' });
        const count = await r0Cards.count();
        if (count > 1) {
            console.log('>>> R0 already in In-design — skipping create new version');
            return;
        }

        await this.createVersionBtn.dispatchEvent('click');
        await expect(this.confirmationModal).toBeVisible({ timeout: 8000 });
        // Overlay intercepts pointer events — dispatch click directly on the button
        await this.confirmYes.dispatchEvent('click');
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
        console.log('>>> New version created for R0');
    }

    async openROChecklist() {
        await this.roChecklistCard.click();
    }

    async addTask() {
        await this.addTaskBtn.scrollIntoViewIfNeeded();
        await expect(this.addTaskBtn).toBeVisible();
        await this.addTaskBtn.click();
    }

    async fillActivity() {
        const activityName = generateActivityName();
        const activityDesc = generateDescription();
        console.log(`>>> Activity name: "${activityName}"`);
        await this.activityTitle.fill(activityName);
        await this.activityDescription.fill(activityDesc);
        await this.activityDuration.fill('1');
        await this.firstDropdown.click();
        await this.selectRole.click();
        await this.selectResponsibleRole();
    }

    // async addFormField() {
    //     await this.addFormFieldBtn.click();
    //     await this.formFieldTitle.fill('Automation field title');
    //     await this.formFieldDescription.fill('Automation field description');
    //     await this.fieldTypeDropdown.selectOption('Yes/No');
    //     await this.saveFormFieldBtn.click();
    // }
    async addFormField() {
        await this.addFormFieldBtn.scrollIntoViewIfNeeded();
        await expect(this.addFormFieldBtn).toBeVisible();
        // Use dispatchEvent to bypass any overlay interception
        await this.addFormFieldBtn.dispatchEvent('click');
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        await this.page.waitForTimeout(2000);

        // Scroll to bottom so the new form field section is in view
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await this.page.waitForTimeout(500);

        // Try the specific container first; if not present fall back to last placeholder element
        const specificCount = await this.formFieldTitle.count();
        const titleLocator = specificCount > 0
            ? this.formFieldTitle
            : this.page.locator('[data-placeholder="Placeholder Text"]').last();

        await titleLocator.scrollIntoViewIfNeeded();
        await expect(titleLocator).toBeVisible({ timeout: 10000 });

        const fieldTitle = generateFieldTitle();
        console.log(`>>> Form field title: "${fieldTitle}"`);
        await titleLocator.click();
        await titleLocator.fill(fieldTitle);

        // Description — try specific, fallback to second-to-last placeholder
        const descCount = await this.formFieldDescription.count();
        const descLocator = descCount > 0
            ? this.formFieldDescription
            : this.page.locator('[data-placeholder="Placeholder Text"]').nth(-2);
        const descVisible = await descLocator.isVisible().catch(() => false);
        if (descVisible) {
            await descLocator.click();
            await descLocator.fill(generateDescription());
        }

        await this.fieldTypeDropdown.selectOption({ label: 'Yes/No' });

        await expect(this.saveFormFieldBtn).toBeEnabled();
        await this.saveFormFieldBtn.click();
        console.log('>>> Form field saved (1st save)');
    }


    async saveActivityAndPublish() {
        // 1st save — already done in addFormField() via saveFormFieldBtn
        // 2nd save — saves the activity and navigates back to checklist editing page
        await this.saveActivityBtn.scrollIntoViewIfNeeded();
        await expect(this.saveActivityBtn).toBeVisible({ timeout: 8000 });
        await this.saveActivityBtn.click();
        console.log('>>> Activity saved (2nd save)');

        // After 2nd save, navigate back to checklist editing page where Publish button appears
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.page.waitForTimeout(1500);

        await expect(this.publishChecklist).toBeVisible({ timeout: 20000 });
        await expect(this.publishChecklist).toBeEnabled();
        // Start polling for toast BEFORE clicking Publish — survives navigation, catches brief toasts
        const toastPoll1 = this.page.waitForFunction(() => {
            const el = document.querySelector('[data-testid="toast-body"], [data-testid="toast-content"]');
            return el && el.textContent.trim() ? el.textContent.trim() : null;
        }, null, { timeout: 20000, polling: 100 });

        await this.publishChecklist.click();
        console.log('>>> Publish clicked');
        await this.page.waitForTimeout(500);
        await this.confirmVersion.dispatchEvent('click');

        const toastHandle1 = await toastPoll1;
        const msg1 = await toastHandle1.jsonValue();
        console.log(`>>> Toast [Agent Onboarding Publish]: "${msg1}"`);
        expect(msg1).toBe('Playbook published successfully');
        console.log('>>> Agent Onboarding Checklist published and verified');
    }

    async navigateTo100Days() {
        await this.page.locator('#tab-100-days-checklist').click();
    }



    async createNewVersion100() {
        await this.createVersionBtn.dispatchEvent('click');
        await expect(this.confirmationModal).toBeVisible({ timeout: 8000 });
        await this.confirmYes.dispatchEvent('click');
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
        await expect(this.roChecklistCard).toBeVisible({ timeout: 30000 });
        await this.roChecklistCard.scrollIntoViewIfNeeded();
        await this.roChecklistCard.click();
        console.log('>>> 100-Day R0 checklist opened');
    }
    async newFormField() {
        const activityName = generate100DayActivityName();
        const activityDesc = generate100DayDescription();
        console.log(`>>> 100-Day activity: "${activityName}"`);
        await this.addNewFormField.click();
        await this.activityTitle100.fill(activityName);
        await this.activityDescription100.fill(activityDesc);
        await this.activitydURATION100.fill('1');
        await this.firstDropdown.click();
        await this.selectRole.click();
        await this.selectResponsibleRole();
    }

    async smartActivity() {
        const subject = generateSmartSubject();
        const body = generateSmartBody();
        console.log(`>>> Smart activity subject: "${subject}"`);
        await this.smartActivityToggle.dispatchEvent('click');
        await this.page.waitForTimeout(500);
        await this.selectActivityDay('Day 1');
        await this.email.fill('atishj@valueaddsofttech.com');
        await this.subject.fill(subject);
        await this.emailBody.fill(body);
        await this.saveActivity100.click();
    }

    async DayTask100() {

        await this.Open100day.click();
        await this.editDay1.click();
        await this.addformfieldDay1.click();
        const dayTaskTitle = generateDayTaskTitle();
        const dayTaskDesc = generate100DayDescription();
        console.log(`>>> Day 1 task title: "${dayTaskTitle}"`);
        await this.day1Title.click();
        await this.day1Title.fill(dayTaskTitle);
        await this.day1Description.click();
        await expect(this.day1Description).toBeVisible();
        await this.day1Description.scrollIntoViewIfNeeded();
        await this.day1Description.click();
        await this.day1Description.fill(dayTaskDesc);
        await this.fieldTypeDropdown.selectOption('Yes/No');
        // 1st save — form field
        await this.saveFormFieldBtn.dispatchEvent('click');
        console.log('>>> Day1 form field saved (1st save)');
        await this.page.waitForTimeout(1000);
        // 2nd save — activity (modal-backdrop may intercept, use dispatchEvent)
        await this.saveActivityBtn.scrollIntoViewIfNeeded();
        await this.saveActivityBtn.dispatchEvent('click');
        console.log('>>> Day1 activity saved (2nd save)');
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.page.waitForTimeout(2000);

        // Publish button — use :has-text since getByRole misses it on this page
        const publishBtn = this.page.locator(':has-text("Publish")').last();
        await publishBtn.waitFor({ state: 'visible', timeout: 20000 });
        // Start polling for toast BEFORE clicking Publish
        const toastPoll2 = this.page.waitForFunction(() => {
            const el = document.querySelector('[data-testid="toast-body"], [data-testid="toast-content"]');
            return el && el.textContent.trim() ? el.textContent.trim() : null;
        }, null, { timeout: 20000, polling: 100 });

        await publishBtn.dispatchEvent('click');
        await this.page.waitForTimeout(500);
        await this.confirmVersion.dispatchEvent('click');

        const toastHandle2 = await toastPoll2;
        const msg2 = await toastHandle2.jsonValue();
        console.log(`>>> Toast [100-Day Publish]: "${msg2}"`);
        expect(msg2).toBe('Playbook published successfully');
        console.log('>>> 100-Day Checklist published and verified');
    }

    async navigateTo100DayTag() {
        await this.navigate100dayTagTab.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(500);
        console.log('>>> Navigated to 100-Days Tag tab');
    }

    async create100DayTagActivity() {
        const tagName = generateTagActivityName();
        const tagDesc = generate100DayDescription();
        console.log(`>>> Tag name: "${tagName}"`);

        // Click Add Tag button
        await this.addTagBtn.waitFor({ state: 'visible', timeout: 10000 });
        await this.addTagBtn.click();
        await this.page.waitForTimeout(800);

        // Fill Tag Name
        await this.tagNameInput.waitFor({ state: 'visible', timeout: 8000 });
        await this.tagNameInput.fill(tagName);

        // Fill Description if visible
        const descVisible = await this.tagDescInput.isVisible().catch(() => false);
        if (descVisible) {
            await this.tagDescInput.fill(tagDesc);
        }

        // Save — drawer overlay intercepts pointer events, use dispatchEvent
        await this.tagSaveBtn.waitFor({ state: 'visible', timeout: 8000 });

        await this.tagSaveBtn.dispatchEvent('click');
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        console.log('>>> 100-Day Tag created and saved');
    }

};
