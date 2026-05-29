const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const TestData = require('../TestData/adminlogin.json');

function randomLetters(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
const { LoginPage } = require('../Pages/Login/Login');
const { DatabaseDashboard } = require('../Pages/Admin Database Dashboard/DatabaseDashboard');
const { UserSearchPage } = require('../Pages/Admin Database Dashboard/UserSearchPage');
const { SchedulerPage } = require('../Pages/Admin Database Dashboard/SchedulerPage');
const { ImportDataPage } = require('../Pages/Admin Database Dashboard/ImportDataPage');
const { ManageStaffPage } = require('../Pages/Admin Database Dashboard/ManageStaffPage');
const { MarketCenterPage } = require('../Pages/Admin Database Dashboard/MarketCenterPage');
const { ManageFormsPage } = require('../Pages/Admin Database Dashboard/ManageFormsPage');
const { TopPerformersPage } = require('../Pages/Admin Database Dashboard/TopPerformers');
const { FaqPage } = require('../Pages/Admin Database Dashboard/FaqPage');
const { EmailNotificationPage } = require('../Pages/Admin Database Dashboard/EmailNotificationPage');
const { DocumentLibraryPage } = require('../Pages/Admin Database Dashboard/DocumentLibraryPage');





test.describe('Admin Dashboard Tests', () => {
    let dashboard;

    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.enterEmail(TestData.validUser.email);
        await loginPage.enterPassword(TestData.validUser.password);


        await Promise.all([
            page.waitForURL(/dashboard|admin/i),
            loginPage.clickLoginButton(),
        ]);

        dashboard = new DatabaseDashboard(page);
    });
    test.describe('User Search Tests', () => {
        test('search for a user', { timeout: 180000 }, async ({ page }) => {
            const userSearch = new UserSearchPage(page);

            // Search by name
            await userSearch.searchUser(TestData.searchUser.name);

            // Navigate directly back to dashboard (goBack() is unreliable in this SPA)
            await page.goto(TestData.URL.url_2);
            await userSearch.waitForLoader();

            // Open and apply filter
            await userSearch.openFilters();
            await userSearch.applyMarketCenterFilter(TestData.searchUser.marketCenter);

            // Clear filters
            await userSearch.clearFilters();
        });
    });

    test.describe('Scheduler Module', () => {
        test('create a new schedule', { timeout: 600000 }, async ({ page }) => {
            const scheduler = new SchedulerPage(page);

            await scheduler.openScheduler();
            await scheduler.selectFilters();
            await scheduler.nextBtn.click();

            await scheduler.goToEventNamePage();

            const uniqueEventName = `${TestData.Schedular.eventName} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

            await scheduler.fillEventDetails(
                uniqueEventName,
                TestData.Schedular.zone,
                TestData.Schedular.time,
                TestData.Schedular.amPm,
                TestData.Schedular.eventEmail,
                TestData.Schedular.eventSubject,
                TestData.Schedular.eventBody,
            );

            await scheduler.sendSchedule();
        });
    });
    test('Import Data', { timeout: 360000 }, async ({ page }) => {
        const importDataPage = new ImportDataPage(page);
        const userSearch = new UserSearchPage(page);

        const templatePath = path.resolve('tests/uploadfiles/AOB_Import_Agent_Template_TAG_Market_Center.csv');
        const tempPath = path.resolve('tests/uploadfiles/temp_import.csv');
        const marketCenterValue = 'TAG Market Center';

        // Generate unique agent data each run
        const firstName = randomLetters(Math.floor(Math.random() * 3) + 4); // 4-6 chars
        const lastName = randomLetters(Math.floor(Math.random() * 3) + 4);
        const email = `${firstName}${lastName}@yopmail.com`;
        console.log(`>>> Importing agent: "${firstName} ${lastName}" | email: ${email}`);

        // Clone template data row, only swap the 3 identity fields.
        // Strip \r before splitting so Windows line endings don't corrupt the last column.
        const lines = fs.readFileSync(templatePath, 'utf8').replace(/\r/g, '').split('\n');
        const dataCols = lines[1].split(',');
        dataCols[0] = firstName;
        dataCols[1] = lastName;
        dataCols[2] = email;
        fs.writeFileSync(tempPath, lines[0] + '\n' + dataCols.join(',') + '\n', 'utf8');

        await importDataPage.importAgents(tempPath, marketCenterValue);

        // Navigate back to dashboard (re-login if session expired after import)
        await page.goto(TestData.URL.url_2);
        if (page.url().includes('/login')) {
            const loginPage = new LoginPage(page);
            await loginPage.enterEmail(TestData.validUser.email);
            await loginPage.enterPassword(TestData.validUser.password);
            await Promise.all([
                page.waitForURL(/dashboard|admin/i),
                loginPage.clickLoginButton(),
            ]);
        }

        // Search for the imported agent and verify presence
        await userSearch.waitForLoader();
        const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
        const displayName = `${cap(firstName)} ${cap(lastName)}`;
        await userSearch.searchUser(displayName);
    });

    test('managestaff MC', async ({ page }) => {
        const manageStaffPage = new ManageStaffPage(page);

        const firstName = randomLetters(Math.floor(Math.random() * 3) + 4);
        const lastName = randomLetters(Math.floor(Math.random() * 3) + 4);
        const email = `${firstName}${lastName}@yopmail.com`;
        console.log(`>>> Inviting staff: "${firstName} ${lastName}" | email: ${email}`);

        await manageStaffPage.openManageStaff();
        await manageStaffPage.goToMCtab();
        await manageStaffPage.inviteAndVerify(firstName, lastName, email);
        await manageStaffPage.centralizedtabclick(TestData.Managestaff.memberName);
    });


    test('Market Center Add', async ({ page }) => {
        const marketCenterPage = new MarketCenterPage(page);

        const mcName = randomLetters(Math.floor(Math.random() * 3) + 5); // 5-7 chars
        const firstName = randomLetters(Math.floor(Math.random() * 3) + 4);
        const lastName = randomLetters(Math.floor(Math.random() * 3) + 4);
        const email = `${firstName}${lastName}@yopmail.com`;
        console.log(`>>> MC Name: "${mcName}" | Owner: "${firstName} ${lastName}" | email: ${email}`);

        await marketCenterPage.openMarketCenterTab();
        await marketCenterPage.searchMarketCenter(TestData.MarketCenter.searchMC);

        await marketCenterPage.addMarketCenter(mcName, TestData.MarketCenter.mcId);
        await marketCenterPage.fillOwnerDetails(firstName, lastName, email);
        await marketCenterPage.selectRoles();
        await marketCenterPage.saveMarketCenter();

        // Navigate back to MC list and verify the new MC appears in search
        await marketCenterPage.openMarketCenterTab();
        await marketCenterPage.searchMarketCenter(mcName);
    });

    test('Add form field in Manage Forms', async ({ page }) => {
        const manageForms = new ManageFormsPage(page);

        const suffix = randomLetters(4);
        const recruitingField  = `RecrutingTest_${suffix}`;
        const onboardField     = `OnboardTest_${suffix}`;
        const marketingField   = `MarketingTest_${suffix}`;
        const additionalField  = `AdditionalTest_${suffix}`;
        const techSetUpField   = `TechSetUpTest_${suffix}`;
        console.log(`>>> Form fields suffix: _${suffix}`);

        await manageForms.openManageForms();
        await manageForms.openRecruitingTab();
        await manageForms.addFormField(recruitingField);
        await manageForms.configureDropdowns();
        await manageForms.saveForm();
        await manageForms.openOnboardingform();
        await manageForms.addFormField1(onboardField);
        await manageForms.configureDropdowns();
        await manageForms.saveForm();
        await manageForms.openMarketingform();
        await manageForms.addFormField1(marketingField);
        await manageForms.configureDropdowns();
        await manageForms.saveForm();
        await manageForms.openAdditionalform();
        await manageForms.addFormField1(additionalField);
        await manageForms.configureDropdowns();
        await manageForms.saveForm();
        await manageForms.openTechSetUpform();
        await manageForms.addFormField1(techSetUpField);
        await manageForms.configureDropdowns();
        await manageForms.saveForm();


    });

    test('Add Top Performer', async ({ page }) => {
        const topPerformersPage = new TopPerformersPage(page);
        await topPerformersPage.openTopPerformers();
        await topPerformersPage.addPerformer();
        await topPerformersPage.searchPerformer(TestData.TopPerformer.searchName);
    });

    test('Add FAQ', async ({ page }) => {
        const faqQA = [
            { q: 'What documents are required to complete agent onboarding?', a: 'Agents must submit a government-issued ID, real estate license, E&O insurance certificate, and a signed independent contractor agreement before activation.' },
            { q: 'How long does the agent onboarding process typically take?', a: 'The standard onboarding process takes 3–5 business days, provided all required documents are submitted and verified without issues.' },
            { q: 'What is the process for setting up MLS access during onboarding?', a: 'MLS access is provisioned after your license is verified. You will receive an email with credentials within 48 hours of completing the document submission step.' },
            { q: 'How do I complete my profile after joining the brokerage?', a: 'Log in to the portal, navigate to My Profile, upload your headshot, fill in your bio, and enter your contact details. A complete profile improves client trust.' },
            { q: 'What training is mandatory for newly onboarded agents?', a: 'All new agents must complete the compliance orientation, fair housing training, and the CRM platform walkthrough within the first 14 days of onboarding.' },
            { q: 'How do I get my business cards and marketing materials after onboarding?', a: 'Once onboarding is approved, submit your design request through the Marketing Portal. Standard business cards are ready within 5 business days.' },
            { q: 'What commission structure applies during the probation period?', a: 'During the first 90 days, new agents are on a 70/30 split. After completing the probation review, you move to the standard plan outlined in your agreement.' },
            { q: 'How do I connect my e-signature account during onboarding?', a: 'Go to Settings > Integrations and link your DocuSign or DotLoop account. This is required before you can send contracts through the platform.' },
            { q: 'Who is my point of contact if I have questions during onboarding?', a: 'Your assigned onboarding coordinator is your primary contact. Their details are in the welcome email. You can also reach the support team via the Help Desk.' },
            { q: 'When will I receive my agent ID and portal login credentials?', a: 'Your agent ID and portal credentials are emailed within 24 hours of submitting your completed onboarding package and passing the background check.' },
        ];
        const suffix = randomLetters(4);
        const picked = faqQA[Math.floor(Math.random() * faqQA.length)];
        const faqQuestion = `${picked.q} [${suffix}]`;
        const faqAnswer = picked.a;
        console.log(`>>> FAQ question: "${faqQuestion}"`);

        const faqPage = new FaqPage(page);
        await faqPage.openFaqTab();
        await faqPage.addFaq(faqQuestion, faqAnswer);
    });
    test('Add Email Notification Template', async ({ page }) => {
        const suffix = randomLetters(5);
        const templateName = `OnboardingTemplate_${suffix}`;
        const subject = `Agent Onboarding Welcome - ${suffix}`;

        const emailNotificationPage = new EmailNotificationPage(page);
        await emailNotificationPage.openEmailNotificationTab();
        await emailNotificationPage.addEmailTemplate(
            templateName,
            TestData.EmailNotification.sendTo,
            subject,
            TestData.EmailNotification.body
        );
        await emailNotificationPage.openInAppNotificationTab();
    })

    test('Document Library', async ({ page }) => {
        const folderName = `DocFolder_${randomLetters(5)}`;
        console.log(`>>> Creating folder: "${folderName}"`);
        const docLibrary = new DocumentLibraryPage(page);

        await docLibrary.openDocumentLibrary();
        await docLibrary.addNewFolder(folderName);
        await docLibrary.searchFolder(folderName);
        await docLibrary.deleteFolder();
    });












});

