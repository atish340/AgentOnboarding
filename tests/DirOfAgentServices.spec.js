const { test, expect } = require('@playwright/test');

function randomLetters(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateVideoTitle() {
    const actions = ['Mastering', 'Understanding', 'Introduction to', 'Advanced Guide to', 'Getting Started with', 'Essentials of', 'Complete Guide to', 'Practical'];
    const topics = ['Real Estate Fundamentals', 'Agent Onboarding', 'Property Listings', 'Client Communication', 'Market Trends', 'Sales Strategies', 'Lead Generation', 'Contract Basics', 'Negotiation Skills', 'Home Buying Process'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    return `${action} ${topic} ${randomLetters(4)}`;
}

function generateTaskTitle() {
    const verbs = ['Complete', 'Submit', 'Review', 'Upload', 'Verify', 'Schedule', 'Confirm', 'Finalize'];
    const topics = ['Agent Onboarding Form', 'License Verification', 'Profile Setup', 'Orientation Documents', 'Contract Signing', 'MLS Registration', 'Background Check', 'Training Completion'];
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    return `${verb} ${topic} ${randomLetters(4)}`;
}
const { LoginPage } = require('../Pages/Login/Login');
const { AddAgentPage } = require('../Pages/Dir Of Agent Services/AddAgentPage');
const { ManageAgentsPage } = require('../Pages/Dir Of Agent Services/ManageAgentsPage');
const { McStaffPage } = require('../Pages/Dir Of Agent Services/McStaffPage');
const { TeamPage } = require('../Pages/Dir Of Agent Services/TeamPage');
const { TagPage } = require('../Pages/Dir Of Agent Services/TagPage');
const { ManageFormsPage } = require('../Pages/Dir Of Agent Services/ManageFormsPage');
const { EmailNotificationPage } = require('../Pages/Dir Of Agent Services/EmailNotification Page');
const { TrainingNvideosPage } = require('../Pages/Dir Of Agent Services/TrainingNvideosPage');
const { DashboardPage } = require('../Pages/Dir Of Agent Services/DashboardPage');
const { AgentRosterPage } = require('../Pages/Dir Of Agent Services/AgentRosterPage');
const { BulkTaskPage } = require('../Pages/Dir Of Agent Services/BulkTaskPage');
const { HundredDayChecklistPage } = require('../Pages/Dir Of Agent Services/HundredDayChecklistPage');
const { DailySnapshotPage } = require('../Pages/Dir Of Agent Services/DailySnapshotPage');
const { DatabaseDashboardPage } = require('../Pages/Dir Of Agent Services/DatabaseDashboardPage');
const { DocumentLibraryPage } = require('../Pages/Dir Of Agent Services/DocumentLibraryPage');
const { CalendarPage } = require('../Pages/Dir Of Agent Services/CalendarPage');
const { ChecklistPage } = require('../Pages/Dir Of Agent Services/ChecklistPage');
const { AgentOnboardingPage } = require('../Pages/Dir Of Agent Services/AgentOnboardingPage');

const TestData = require('../TestData/DirAgentServices.json');



test.describe('DirectorofAgentServices', () => {


    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.enterEmail(TestData.login.username);
        await loginPage.enterPassword(TestData.login.password);


        await Promise.all([
            page.waitForURL(/dashboard|home|profile/i),
            loginPage.clickLoginButton(),
        ]);

    });

    test('Add New Agent', async ({ page }) => {
        const addAgentPage = new AddAgentPage(page);
        const { firstName } = await addAgentPage.addNewAgent();

        // app auto-navigates to manageAgents after save — search to confirm
        const manageAgentsPage = new ManageAgentsPage(page);
        await manageAgentsPage.searchAndVerifyAgent_legacy(firstName);
    });
    test('Manage Agents', async ({ page }) => {
        const manageAgentsPage = new ManageAgentsPage(page);

        await manageAgentsPage.navigateToManageAgents();
        await manageAgentsPage.verifyPageAndTabs();

        // Verify agent counts per tab
        await manageAgentsPage.getAgentCountFromTab(manageAgentsPage.tabInitiated,    'Initiated');
        await manageAgentsPage.getAgentCountFromTab(manageAgentsPage.tabInProgress,   'In Progress');
        await manageAgentsPage.getAgentCountFromTab(manageAgentsPage.tabCompleted,    'Completed');
        await manageAgentsPage.getAgentCountFromTab(manageAgentsPage.tabCancelled,    'Cancelled');
        await manageAgentsPage.getAgentCountFromTab(manageAgentsPage.tabDisabled,     'Disabled');
        await manageAgentsPage.getAgentCountFromTab(manageAgentsPage.tab100Day,       '100-Day Checklist');
        await manageAgentsPage.getAgentCountFromTab(manageAgentsPage.tabPendingCreds, 'Pending Credentials');

        // Get first agent and search for them
        const firstAgent = await manageAgentsPage.getFirstAgentName();

        if (firstAgent) {
            await manageAgentsPage.searchAgent(firstAgent);
            await manageAgentsPage.verifySearchResults(firstAgent);

            // View Profile
            await manageAgentsPage.clickViewProfile(firstAgent);
            await manageAgentsPage.goBack();

            // View Onboarding
            await manageAgentsPage.searchAgent(firstAgent);
            await manageAgentsPage.clickViewOnboarding(firstAgent);
            await manageAgentsPage.goBack();
        }
    });

    test('Agent Onboarding Flow', async ({ page }) => {
        const manageAgentsPage    = new ManageAgentsPage(page);
        const agentOnboardingPage = new AgentOnboardingPage(page);

        // Navigate to Manage Agents, find fresh 0% agent and land on Onboarding Form step
        await manageAgentsPage.navigateToManageAgents();
        await agentOnboardingPage.clickViewOnboardingForZeroAgent();
        // ↑ leaves us on Pre-Onboarding → Onboarding Form step already

        // Verify 4 onboarding stages (tabs)
        await agentOnboardingPage.verifyOnboardingStages();

        // Select "Don't Send" → Send & Next → verify "Email sent successfully" toast
        const emailSent = await agentOnboardingPage.selectDontSendAndProceed();
        if (emailSent) {
            await agentOnboardingPage.verifyEmailSentToast();
            // Go back to Onboarding Form step to reveal "Fill Onboarding Form" button
            await agentOnboardingPage.clickOnboardingFormStep();
        }

        // Click "Fill Onboarding Form" → fill mandatory fields → save
        await agentOnboardingPage.clickFillOnboardingForm();
        await agentOnboardingPage.fillMandatoryFields();
        await agentOnboardingPage.saveOnboardingForm();
    });

    test('Mc Staff', async ({ page }) => {
        const mcStaffPage = new McStaffPage(page);
        await mcStaffPage.navigateToMcStaff();
        await mcStaffPage.searchStaff('Cargo Mik');


    });

    test('Create Team', async ({ page }) => {
        const teamPage = new TeamPage(page);
        await teamPage.navigateToTeamPage();
        const teamName = await teamPage.createNewTeam({
            teamLeader: TestData.TeamDetails.teamLeader
        });
        await teamPage.searchAndVerifyTeam(teamName);
        await teamPage.openManageTeamAndAddMember();
    });
    test('Create Tag', async ({ page }) => {
        const tagPage = new TagPage(page);
        await tagPage.navigateToTags();
        const tagName = await tagPage.createTag();
        await tagPage.searchAndVerifyTag(tagName);
        await tagPage.addMemberToTag();
    });

    test('Add form field in Manage Forms', async ({ page }) => {
        const manageForms = new ManageFormsPage(page);

        const suffix = randomLetters(4);
        const recruitingField = `RecrutingTest_${suffix}`;
        const onboardField = `OnboardTest_${suffix}`;
        const marketingField = `MarketingTest_${suffix}`;
        const additionalField = `AdditionalTest_${suffix}`;
        const techSetUpField = `TechSetUpTest_${suffix}`;
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
        const videoTitle = generateVideoTitle();
        console.log(`>>> Video title: "${videoTitle}"`);
        await trainingNvideos.navigateToTrainingNvideosPage();
        await trainingNvideos.addNewVideo({
            category: TestData.TrainingNvideosDetails.category,
            title: videoTitle,
            link: TestData.TrainingNvideosDetails.videoLink
        });

        await trainingNvideos.switchToAgentTab({
            title: videoTitle,
            link: TestData.TrainingNvideosDetails.videoLink
        });



    });

    test('Dashboard', async ({ page }) => {
        const dashboardPage = new DashboardPage(page);

        await dashboardPage.navigateToDashboard();
        await dashboardPage.verifyDashboardOpen();

        const filterOptions = await dashboardPage.getFilterOptions();
        console.log(`>>> Filter options found: ${JSON.stringify(filterOptions)}`);

        for (const option of filterOptions) {
            await dashboardPage.applyFilter(option);
        }

        await dashboardPage.downloadDashboard();
    });

    test('Agent Roster', async ({ page }) => {
        const agentRosterPage = new AgentRosterPage(page);

        await agentRosterPage.navigateToAgentRosterPage();
        await agentRosterPage.downloadPDF();

        const agentName = await agentRosterPage.getFirstAgentName();

        await agentRosterPage.searchAndVerifyAgent(agentName);
        await agentRosterPage.clickAgentAndVerifyProfile(agentName);
    });

    test('Bulk Task', async ({ page }) => {
        const bulkTaskPage = new BulkTaskPage(page);
        const taskTitle = generateTaskTitle();
        console.log(`>>> Task title: "${taskTitle}"`);

        await bulkTaskPage.navigateToBulkTask();
        await bulkTaskPage.selectAgents(2);
        await bulkTaskPage.selectFirstTag();
        await bulkTaskPage.setStartDateToToday();
        await bulkTaskPage.enterTitle(taskTitle);
        await bulkTaskPage.selectYesNoType();
        await bulkTaskPage.saveTask();
        await bulkTaskPage.verifySuccessToast();
    });

    test('100 Day Checklist', async ({ page }) => {
        const checklistPage = new HundredDayChecklistPage(page);

        await checklistPage.navigateToChecklist();

        // --- Tab 1: Agent's 100 Days Checklist ---
        console.log(">>> === Tab 1: Agent's 100 Days Checklist ===");
        const tab1Total = await checklistPage.clickAllCardsAndVerifyTotal();

        if (tab1Total > 0) {
            await checklistPage.expandFirstAgentCard();
            await checklistPage.clickViewTask();
            await checklistPage.returnToChecklist();
        } else {
            console.log('>>> No records in Tab 1, skipping expand/view task');
        }

        // --- Tab 2: Agent's Completed 100 Days Checklist ---
        console.log(">>> === Tab 2: Agent's Completed 100 Days Checklist ===");
        await checklistPage.switchToTab2();
        const tab2Total = await checklistPage.clickAllCardsAndVerifyTotal();

        if (tab2Total > 0) {
            await checklistPage.expandFirstAgentCard();
            await checklistPage.clickViewTask();
            await checklistPage.returnToChecklist();
        } else {
            console.log('>>> No records in Tab 2, skipping expand/view task');
        }
    });

    test('Daily Snapshot', async ({ page }) => {
        const dailySnapshotPage = new DailySnapshotPage(page);

        await dailySnapshotPage.navigateToDailySnapshot();
        const count = await dailySnapshotPage.verifySnapshotListVisible();
        await dailySnapshotPage.clickRandomSnapshot(count);
    });

    test('Database Dashboard', async ({ page }) => {
        const dbPage = new DatabaseDashboardPage(page);

        await dbPage.navigateToDatabaseDashboard();

        const agentName = await dbPage.getRandomAgentName();
        await dbPage.searchAgent(agentName);

        // clear search to get full list for checkbox selection
        await dbPage.searchInput.clear();
        await dbPage.searchInput.press('Enter');
        await dbPage.waitForLoader();
        await page.waitForTimeout(500);

        await dbPage.selectRandomAgents(3);
        await dbPage.exportWithTemplate();

        await dbPage.openScheduler();
        await dbPage.goToEventNamePage();
        await dbPage.fillAndSchedule();
    });

    test('Document Library', async ({ page }) => {
        const folderName = `DocFolder_${randomLetters(5)}`;
        console.log(`>>> Creating folder: "${folderName}"`);
        const docLibrary = new DocumentLibraryPage(page);

        await docLibrary.navigateToDocumentLibrary();
        await docLibrary.addNewFolder(folderName);
        await docLibrary.searchFolder(folderName);
        await docLibrary.deleteFolder();
    });

    test('Calendar', async ({ page }) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const len = Math.floor(Math.random() * 5) + 4; // 4-8 chars
        const eventTitle = Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const eventLink = `https://meet.example.com/${randomLetters(6)}`;
        const startHour = Math.floor(Math.random() * 11) + 1; // 1-11
        const startMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
        const startAmPm = Math.random() < 0.5 ? 'AM' : 'PM';
        console.log(`>>> Event: "${eventTitle}" | link: ${eventLink} | start: ${startHour}:${String(startMinute).padStart(2, '0')} ${startAmPm}`);

        const calendarPage = new CalendarPage(page);
        await calendarPage.navigateToCalendar();
        await calendarPage.clickCurrentDate();
        await calendarPage.fillEventForm(eventTitle, eventLink, startHour, startMinute, startAmPm);
        await calendarPage.submitEvent();
        await calendarPage.verifyEventAdded();
    });
    test('Checklist Creation Flow', async ({ page }) => {

        const checklist = new ChecklistPage(page);
        await checklist.openChecklist();
        await checklist.createNewVersion();
        await checklist.openROChecklist();
        await checklist.addTask();
        await checklist.fillActivity();
        await checklist.addFormField();
        await checklist.saveActivityAndPublish();
        await checklist.navigateTo100Days();
        await checklist.createNewVersion100();
        await checklist.newFormField();
        await checklist.smartActivity();
        await checklist.DayTask100();

        // 100-Days Tag
        await checklist.navigateTo100DayTag();
        await checklist.create100DayTagActivity();
    });

});