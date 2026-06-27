const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const TestData = require('../TestData/adminlogin.json');

function randomLetters(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const { LoginPage } = require('../Pages/Login');
const {
    DatabaseDashboard, UserSearchPage, SchedulerPage, ImportDataPage, ManageStaffPage, MarketCenterPage, ManageFormsPage, TopPerformersPage, FaqPage, EmailNotificationPage, DocumentLibraryPage,
} = require('../Pages/Admin Database Dashboard');

// Worker-scoped fixture: logs in ONCE per worker, reuses the same browser tab
// so sessionStorage (Admin auth) is preserved across all tests.
const test = base.extend({
    sharedPage: [async ({ browser }, use) => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();

        await page.goto('https://qa.procasaonboard.com/login');
        await page.waitForSelector('input[name=email]', { state: 'visible', timeout: 15000 });
        await page.fill('input[name=email]', TestData.validUser.email);
        await page.fill('input[name=password]', TestData.validUser.password);
        await page.waitForSelector('button[type=submit]:not([disabled])', { timeout: 15000 });
        await page.click('button[type=submit]');
        await page.waitForURL(url => !url.href.includes('/login'), { timeout: 60000 });
        console.log(`✓ Admin logged in once — URL: ${page.url()}`);

        await use(page);
        await ctx.close();
    }, { scope: 'worker' }],
});

test.describe('Admin Dashboard Tests', () => {

    test.beforeEach(async ({ sharedPage: page }) => {
        await page.goto(TestData.URL.url_2, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        // Wait for the dashboard page loader to finish so it doesn't block the next test
        try { await page.locator('div.absolute.bg-white.bg-opacity-60').first().waitFor({ state: 'visible', timeout: 2000 }); } catch { }
        await page.locator('div.absolute.bg-white.bg-opacity-60').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => { });
        await page.locator('div.absolute.bg-white.bg-opacity-60.z-10').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => { });
    });

    test.describe('User Search Tests', () => {
        test('search for a user', { timeout: 180000 }, async ({ sharedPage: page }) => {
            const userSearch = new UserSearchPage(page);

            await userSearch.searchUser(TestData.searchUser.name);

            await page.goto(TestData.URL.url_2);
            await userSearch.waitForLoader();

            await userSearch.openFilters();
            await userSearch.applyMarketCenterFilter(TestData.searchUser.marketCenter);

            await userSearch.clearFilters();
        });
    });

    test.describe('Scheduler Module', () => {
        test('create a new schedule', { timeout: 600000 }, async ({ sharedPage: page }) => {
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

    test('Import Data', { timeout: 360000 }, async ({ sharedPage: page }) => {
        const importDataPage = new ImportDataPage(page);
        const userSearch = new UserSearchPage(page);

        const templatePath = path.resolve('tests/uploadfiles/AOB_Import_Agent_Template_TAG_Market_Center.csv');
        const tempPath = path.resolve('tests/uploadfiles/temp_import.csv');
        const marketCenterValue = 'TAG Market Center';

        const firstName = randomLetters(Math.floor(Math.random() * 3) + 4);
        const lastName = randomLetters(Math.floor(Math.random() * 3) + 4);
        const email = `${firstName}${lastName}@yopmail.com`;
        console.log(`>>> Importing agent: "${firstName} ${lastName}" | email: ${email}`);

        const lines = fs.readFileSync(templatePath, 'utf8').replace(/\r/g, '').split('\n');
        const dataCols = lines[1].split(',');
        dataCols[0] = firstName;
        dataCols[1] = lastName;
        dataCols[2] = email;
        fs.writeFileSync(tempPath, lines[0] + '\n' + dataCols.join(',') + '\n', 'utf8');

        await importDataPage.importAgents(tempPath, marketCenterValue);

        await page.goto(TestData.URL.url_2);
        if (page.url().includes('/login')) {
            await page.fill('input[name=email]', TestData.validUser.email);
            await page.fill('input[name=password]', TestData.validUser.password);
            await page.click('button[type=submit]');
            await page.waitForURL(url => !url.href.includes('/login'), { timeout: 60000 });
        }

        await userSearch.waitForLoader();
        const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
        const displayName = `${cap(firstName)} ${cap(lastName)}`;
        await userSearch.searchUser(displayName);
    });

    test('managestaff MC', async ({ sharedPage: page }) => {
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

    test('Market Center Add', async ({ sharedPage: page }) => {
        const marketCenterPage = new MarketCenterPage(page);

        const mcName = randomLetters(Math.floor(Math.random() * 3) + 5);
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

        await marketCenterPage.openMarketCenterTab();
        await marketCenterPage.searchMarketCenter(mcName);
    });

    test('Add form field in Manage Forms', async ({ sharedPage: page }) => {
        const manageForms = new ManageFormsPage(page);

        const suffix = randomLetters(4);
        const recruitingField = `RecrutingTest_${suffix}`;
        const onboardField = `OnboardTest_${suffix}`;
        const marketingField = `MarketingTest_${suffix}`;
        const additionalField = `AdditionalTest_${suffix}`;
        const techSetUpField = `TechSetUpTest_${suffix}`;
        console.log(`>>> Form fields suffix: _${suffix}`);

        await manageForms.openManageForms();
        await manageForms.addFieldToAllForms(recruitingField, onboardField, marketingField, additionalField, techSetUpField);
    });

    test('Add Top Performer', async ({ sharedPage: page }) => {
        const topPerformersPage = new TopPerformersPage(page);
        await topPerformersPage.openTopPerformers();
        await topPerformersPage.addPerformer();
        await topPerformersPage.searchPerformer(TestData.TopPerformer.searchName);
    });

    test('Add FAQ', async ({ sharedPage: page }) => {
        const suffix = randomLetters(4);
        const picked = TestData.faqQA[Math.floor(Math.random() * TestData.faqQA.length)];
        const faqQuestion = `${picked.q} [${suffix}]`;
        const faqAnswer = picked.a;
        console.log(`>>> FAQ question: "${faqQuestion}"`);

        const faqPage = new FaqPage(page);
        await faqPage.openFaqTab();
        await faqPage.addFaq(faqQuestion, faqAnswer);
    });

    test('Add Email Notification Template', async ({ sharedPage: page }) => {
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
    });

    test('Document Library', async ({ sharedPage: page }) => {
        const folderName = `DocFolder_${randomLetters(5)}`;
        console.log(`>>> Creating folder: "${folderName}"`);
        const docLibrary = new DocumentLibraryPage(page);

        await docLibrary.openDocumentLibrary();
        await docLibrary.addNewFolder(folderName);
        await docLibrary.searchFolder(folderName);
        await docLibrary.deleteFolder();
    });

});
