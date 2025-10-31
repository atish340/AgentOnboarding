const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../Pages/Login/Login');
const { AddAgentPage } = require('../Pages/Dir Of Agent Services/AddAgentPage');
const { McStaffPage } = require('../Pages/Dir Of Agent Services/McStaffPage');
const { TeamPage } = require('../Pages/Dir Of Agent Services/TeamPage');
const { TagPage } = require('../Pages/Dir Of Agent Services/TagPage');
const { ManageFormsPage } = require('../Pages/Dir Of Agent Services/ManageFormsPage');
const { EmailNotificationPage } = require('../Pages/Dir Of Agent Services/EmailNotification Page');
const { TrainingNvideosPage } = require('../Pages/Dir Of Agent Services/TrainingNvideosPage');

const TestData = require('../TestData/DirAgentServices.json');



test.describe('DirectorofAgentServices', () => {


    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.enterEmail(TestData.login.username);
        await loginPage.enterPassword(TestData.login.password);


        await Promise.all([

            loginPage.clickLoginButton(),
        ]);

    });

    test('Add New Agent', async ({ page }) => {
        const addAgentPage = new AddAgentPage(page);
        await addAgentPage.addNewAgent({
            firstName: TestData.AgentDetails.firstName,
            lastName: TestData.AgentDetails.lastName,
            email: TestData.AgentDetails.email,
            phone: TestData.AgentDetails.phone


        })

    });
    test('Mc Staff', async ({ page }) => {
        const mcStaffPage = new McStaffPage(page);
        await mcStaffPage.navigateToMcStaff();
        await mcStaffPage.searchStaff('Cargo Mik');


    });

    test('Create Team', async ({ page }) => {
        const teamPage = new TeamPage(page);
        await teamPage.navigateToTeamPage();
        await teamPage.createNewTeam({
            teamName: TestData.TeamDetails.teamName,
            teamLeader: TestData.TeamDetails.teamLeader

        })



    });

    test('Create Tag', async ({ page }) => {
        const tagPage = new TagPage(page);
        await tagPage.tagLink.click();
        await expect(tagPage.pageTitle).toHaveText('Tags');
        await tagPage.createTagButton.click();
        await expect(tagPage.tagTitle).toHaveText('Create Tag');
        await tagPage.tagNameInput.fill('NewTag2024');
        await tagPage.create.click();
        await tagPage.addMemberButton.click();
        // Add further steps as needed
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

    test('Training N Videos', async ({ page }) => {
        const trainingNvideos = new TrainingNvideosPage(page);
        await trainingNvideos.navigateToTrainingNvideosPage();
        await trainingNvideos.addNewVideo({
            category: TestData.TrainingNvideosDetails.category,
            title: TestData.TrainingNvideosDetails.title,
            link: TestData.TrainingNvideosDetails.videoLink
        });

        await trainingNvideos.switchToAgentTab();



    });





});