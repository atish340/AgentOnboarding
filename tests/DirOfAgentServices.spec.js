const { test: base, expect } = require('@playwright/test');

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
const { LoginPage } = require('../Pages/Login');
const {
    AddAgentPage, ManageAgentsPage, McStaffPage, TeamPage, TagPage, ManageFormsPage, EmailNotificationPage, TrainingNvideosPage, DashboardPage, AgentRosterPage, BulkTaskPage, HundredDayChecklistPage, DailySnapshotPage, DatabaseDashboardPage, DocumentLibraryPage, CalendarPage, ChecklistPage, AgentOnboardingPage,
} = require('../Pages/Dir Of Agent Services');

const TestData = require('../TestData/DirAgentServices.json');

// Worker-scoped fixture: logs in ONCE per worker, reuses the same browser tab
// for all tests so sessionStorage (where the app stores auth) is preserved.
// Named 'sharedPage' to avoid Playwright's built-in 'page' scope restriction.
const test = base.extend({
    sharedPage: [async ({ browser }, use) => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();

        await page.goto('https://qa.procasaonboard.com/login');
        await page.waitForSelector('input[name=email]', { state: 'visible', timeout: 15000 });
        await page.fill('input[name=email]', TestData.login.username);
        await page.fill('input[name=password]', TestData.login.password);
        await page.waitForSelector('button[type=submit]:not([disabled])', { timeout: 15000 });
        await page.click('button[type=submit]');
        await page.waitForURL(url => !url.href.includes('/login'), { timeout: 30000 });
        console.log('✓ Logged in once — sharing this tab for all tests');

        await use(page);

        await ctx.close();
    }, { scope: 'worker' }],
});

test.describe('DirectorofAgentServices', () => {

    test.beforeEach(async ({ sharedPage: page }) => {
        await page.goto('https://qa.procasaonboard.com/dashboard', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
    });

    test('Add New Agent', async ({ sharedPage: page }) => {
        test.setTimeout(120000); // 2 min for 1 agent
        const addAgentPage = new AddAgentPage(page);
        let lastFirstName;
        for (let i = 0; i < 1; i++) {
            console.log(`>>> Adding agent ${i + 1} of 1 (Unlicensed Staff)`);
            const { firstName } = await addAgentPage.addNewAgent();
            lastFirstName = firstName;
        }
        // verify last added agent exists
        const manageAgentsPage = new ManageAgentsPage(page);
        await manageAgentsPage.searchAndVerifyAgent_legacy(lastFirstName);
    });
    test.skip('Manage Agents', async ({ sharedPage: page }) => {
        test.setTimeout(1800000); // 30 min — full onboarding flow can take long for agents with many steps

        const manageAgentsPage = new ManageAgentsPage(page);
        const agentOnboardingPage = new AgentOnboardingPage(page);

        // Step 1: Navigate and verify page title + all tabs with counts
        await manageAgentsPage.navigateToManageAgents();
        await manageAgentsPage.verifyPageAndTabs();
        await manageAgentsPage.getAllTabCounts();

        // Step 2: Search for first agent and verify
        const firstAgent = await manageAgentsPage.getFirstAgentName();
        if (firstAgent) {
            await manageAgentsPage.searchAgent(firstAgent);
            await manageAgentsPage.verifySearchResults(firstAgent);
            await manageAgentsPage.clearSearch();
        }

        // Step 3: Find agent with 0% progress → click View Onboarding
        await agentOnboardingPage.clickViewOnboardingForZeroAgent();

        // Step 4: Verify 4 onboarding stages are visible
        await agentOnboardingPage.verifyOnboardingStages();

        // Step 5: Select "Don't Send" → Send & Next → verify email sent toast
        const emailSent = await agentOnboardingPage.selectDontSendAndProceed();
        if (emailSent) {
            await agentOnboardingPage.verifyEmailSentToast();
            await agentOnboardingPage.clickOnboardingFormStep();
        }

        // Step 6: Fill Onboarding Form (all mandatory fields) → save
        await agentOnboardingPage.clickFillOnboardingForm();
        await agentOnboardingPage.fillMandatoryFields();
        await agentOnboardingPage.saveOnboardingForm();

        // Step 7: Process remaining Pre-Onboarding steps
        // (includes Agent Documents Upload with sample PDF + all other activities)
        await agentOnboardingPage.processRemainingPreOnboardingSteps();

        // Step 8: Process Onboarding Activities (stage=1)
        // Command Profile (URL/Username/Password) + Marketing Form + Account Setup Checklist + Tech Set Up Form
        await agentOnboardingPage.processOnboardingActivities();

        // Step 8b: Process Account Setup (stage=2)
        await agentOnboardingPage.processAccountSetup();

        // Step 9: Go to Confirmation tab → Invite Agent → Allow → verify toast
        await agentOnboardingPage.clickConfirmationAndInviteAgent();

        // Step 10: Go back to Manage Agents → Completed tab → verify same agent is there
        await agentOnboardingPage.verifyAgentInCompletedTab();
    });

    test.skip('Agent Onboarding Flow', async ({ sharedPage: page }) => {
        test.setTimeout(600000); // 10 minutes — multiple onboarding steps
        const manageAgentsPage = new ManageAgentsPage(page);
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

        // Process remaining Pre-Onboarding steps (Agent Documents Upload + custom activities)
        await agentOnboardingPage.processRemainingPreOnboardingSteps();
    });

    test('Mc Staff', async ({ sharedPage: page }) => {
        const mcStaffPage = new McStaffPage(page);
        await mcStaffPage.navigateToMcStaff();
        await mcStaffPage.searchStaff('Cargo Mik');


    });

    test('Create Team', async ({ sharedPage: page }) => {
        const teamPage = new TeamPage(page);
        await teamPage.navigateToTeamPage();
        const teamName = await teamPage.createNewTeam({
            teamLeader: TestData.TeamDetails.teamLeader
        });
        await teamPage.searchAndVerifyTeam(teamName);
        await teamPage.openManageTeamAndAddMember();
    });
    test('Create Tag', async ({ sharedPage: page }) => {
        const tagPage = new TagPage(page);
        await tagPage.navigateToTags();
        const tagName = await tagPage.createTag();
        await tagPage.searchAndVerifyTag(tagName);
        await tagPage.addMemberToTag();
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


    test('Add Email Notification Template', async ({ sharedPage: page }) => {
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

    test('Training N Videos', async ({ sharedPage: page }) => {
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

    test('Dashboard', async ({ sharedPage: page }) => {
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

    test('Agent Roster', async ({ sharedPage: page }) => {
        const agentRosterPage = new AgentRosterPage(page);

        await agentRosterPage.navigateToAgentRosterPage();
        await agentRosterPage.downloadPDF();

        const agentName = await agentRosterPage.getFirstAgentName();

        await agentRosterPage.searchAndVerifyAgent(agentName);
        await agentRosterPage.clickAgentAndVerifyProfile(agentName);
    });

    test('Bulk Task', async ({ sharedPage: page }) => {
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

    test('100 Day Checklist', async ({ sharedPage: page }) => {
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

    test('Daily Snapshot', async ({ sharedPage: page }) => {
        const dailySnapshotPage = new DailySnapshotPage(page);

        await dailySnapshotPage.navigateToDailySnapshot();
        const count = await dailySnapshotPage.verifySnapshotListVisible();
        await dailySnapshotPage.clickRandomSnapshot(count);
    });

    test('Database Dashboard', async ({ sharedPage: page }) => {
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

    test('Document Library', async ({ sharedPage: page }) => {
        const folderName = `DocFolder_${randomLetters(5)}`;
        console.log(`>>> Creating folder: "${folderName}"`);
        const docLibrary = new DocumentLibraryPage(page);

        await docLibrary.navigateToDocumentLibrary();
        await docLibrary.addNewFolder(folderName);
        await docLibrary.searchFolder(folderName);
        await docLibrary.deleteFolder();
    });

    test('Calendar', async ({ sharedPage: page }) => {
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
    test('Checklist Creation Flow', async ({ sharedPage: page }) => {

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