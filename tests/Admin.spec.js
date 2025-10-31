const { test, expect } = require('@playwright/test');
const TestData = require('../TestData/adminlogin.json');
const { LoginPage } = require('../Pages/Login/Login');
const { DatabaseDashboard } = require('../Pages/Admin Database Dashboard/DatabaseDashboard');
import { UserSearchPage } from '../Pages/Admin Database Dashboard/UserSearchPage';
import { SchedulerPage } from '../Pages/Admin Database Dashboard/SchedulerPage';
import { ImportDataPage } from '../Pages/Admin Database Dashboard/ImportDataPage';
import { ManageStaffPage } from '../Pages/Admin Database Dashboard/ManageStaffPage';
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
        test('search for a user', async ({ page }) => {
            const userSearch = new UserSearchPage(page);

            // Search by name
            await userSearch.searchUser(TestData.searchUser.name);

            // Go back after search
            await page.goBack();

            // Open and apply filter
            await userSearch.openFilters();
            await userSearch.applyMarketCenterFilter(TestData.searchUser.marketCenter);

            // Clear filters
            await userSearch.clearFilters();
        });
    });

    test.describe('Scheduler Module', () => {
        test('create a new schedule', async ({ page }) => {
            const scheduler = new SchedulerPage(page);

            await scheduler.openScheduler();
            await scheduler.selectFilters();
            await scheduler.nextBtn.click();

            await scheduler.goToEventNamePage();

            await scheduler.fillEventDetails(
                TestData.scheduler.eventName,
                TestData.scheduler.zone,
                TestData.scheduler.time,
                TestData.scheduler.amPm,
                TestData.scheduler.eventEmail,
                TestData.scheduler.eventSubject,
                TestData.scheduler.eventBody,

            );

            await scheduler.sendSchedule();
        });
    });
    test('Import Data', async ({ page }) => {
        const importDataPage = new ImportDataPage(page);

        // Replace with your actual CSV file path and dropdown value
        const filePath = 'tests/uploadfiles/AOB_Import_Agent_Template_America.csv';
        const marketCenterValue = '67e3e41ddca49d01393d85d8';

        await importDataPage.importAgents(filePath, marketCenterValue);
    });

    test('managestaff MC', async ({ page }) => {
        const manageStaffPage = new ManageStaffPage(page);

        const firstName = TestData.Managestaff.firstName;
        const lastName = TestData.Managestaff.lastName;
        const email = TestData.Managestaff.email;

        await manageStaffPage.openManageStaff();
        await manageStaffPage.goToMCtab();
        await manageStaffPage.inviteAndVerify(firstName, lastName, email);
        await manageStaffPage.centralizedtabclick(TestData.Managestaff.memberName);

    });


    test('Market Center Add', async ({ page }) => {
        const marketCenterPage = new MarketCenterPage(page);

        await marketCenterPage.openMarketCenterTab();
        await marketCenterPage.searchMarketCenter(TestData.MarketCenter.searchMC);

        await marketCenterPage.addMarketCenter(TestData.MarketCenter.mcName, TestData.MarketCenter.mcId);
        await marketCenterPage.fillOwnerDetails(TestData.MarketCenter.firstName, TestData.MarketCenter.lastName, TestData.MarketCenter.email);
        await marketCenterPage.selectRoles();
        await marketCenterPage.saveMarketCenter();
    });

    test('Add form field in Manage Forms', async ({ page }) => {
        const manageForms = new ManageFormsPage(page);

        await manageForms.openManageForms();
        await manageForms.openRecruitingTab();
        await manageForms.addFormField('RecrutingTest');
        await manageForms.configureDropdowns();
        await manageForms.saveForm();
        await manageForms.openOnboardingform();
        await manageForms.addFormField1('OnboardTest');
        await manageForms.configureDropdowns();
        await manageForms.saveForm();
        await manageForms.openMarketingform();
        await manageForms.addFormField1('MarketingTest');
        await manageForms.configureDropdowns();
        await manageForms.saveForm();
        await manageForms.openAdditionalform();
        await manageForms.addFormField1('AdditionalTest');
        await manageForms.configureDropdowns();
        await manageForms.saveForm();
        await manageForms.openTechSetUpform();
        await manageForms.addFormField1('TechSetUpTest');
        await manageForms.configureDropdowns();
        await manageForms.saveForm();


    });

    test('Add Top Performer', async ({ page }) => {
        const topPerformersPage = new TopPerformersPage(page);
        await topPerformersPage.openTopPerformers();
        await topPerformersPage.addPerformer(TestData.TopPerformer.agentId);
        await topPerformersPage.searchPerformer(TestData);
    });

    test('Add FAQ', async ({ page }) => {
        const faqPage = new FaqPage(page);
        await faqPage.openFaqTab();
        await faqPage.addFaq(TestData.FAQ.question, TestData.FAQ.answer);
    });
    test('Add Email Notification Template', async ({ page }) => {
        const emailNotificationPage = new EmailNotificationPage(page);

        await emailNotificationPage.openEmailNotificationTab();
        await emailNotificationPage.addEmailTemplate(
            TestData.EmailNotification.templateName,
            TestData.EmailNotification.sendTo,
            TestData.EmailNotification.subject,
            TestData.EmailNotification.body
        );
        await emailNotificationPage.openInAppNotificationTab();

    })

    test('Document Library', async ({ page }) => {
        const docLibrary = new DocumentLibraryPage(page);

        await docLibrary.openDocumentLibrary();
        await docLibrary.addNewFolder(TestData.DocumentLibrary.folderName);
        await docLibrary.searchFolder(TestData.DocumentLibrary.folderName);
        await docLibrary.deleteFolder();
    });












});

