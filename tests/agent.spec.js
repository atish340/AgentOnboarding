const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../Pages/Login/Login');
const { MyProfilePage } = require('../Pages/Agent/myProfile');
const { AgentRosterPage } = require('../Pages/Agent/agentRoster');
const { DocumentPage } = require('../Pages/Agent/documentLibrary');
const { TrainingVideosPage } = require('../Pages/Agent/TrainingVideos');
const { FaqPage } = require('../Pages/Agent/FAQ');
const { HomeTasksPage } = require('../Pages/Agent/home');
const { TeamsPage } = require('../Pages/Agent/Teams');

const TestData = require('../TestData/agent.json');

test.describe('Agent', () => {

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

    test('agentMyProfile', async ({ page }) => {
        const myProfilePage = new MyProfilePage(page);
        await myProfilePage.navigateToMyProfile();
        await myProfilePage.verifyPageTitle();
        await myProfilePage.openDocuments();
        await page.bringToFront();
        await myProfilePage.closeDocument();
        await myProfilePage.editAddress();
        await myProfilePage.saveChanges();
    });

    test('agentRoster', async ({ page }) => {
        const agentRosterPage = new AgentRosterPage(page);
        await agentRosterPage.navigateToAgentRoster();
        await agentRosterPage.verifyPageTitle();
        await agentRosterPage.applyFilter();
        await agentRosterPage.searchByName(TestData.Roster.searchName);
        await agentRosterPage.verifySearchName(TestData.Roster.searchName);
        await agentRosterPage.downloadPdf();
        await agentRosterPage.viewAgentProfile();
    });

    test('Agent Documentfolder', async ({ page }) => {
        const marketCenter = new DocumentPage(page);
        await marketCenter.openMarketCenter();
        await marketCenter.openMCFolderAndDownload();
        await page.bringToFront();
        await marketCenter.openMyFolder();
        await marketCenter.addFolder(TestData.Documentfolder.folderName);
        await marketCenter.editFolderName(TestData.Documentfolder.editFolderName);
        await marketCenter.deleteFolder();
    });

    test('Training Videos', async ({ page }) => {
        const trainingPage = new TrainingVideosPage(page);
        await trainingPage.navigateToTrainingVideos();
        await trainingPage.openVideoAndReturnToMainPage();
        await trainingPage.markVideoComplete();
    });

    test('FAQ', async ({ page }) => {
        const faqPage = new FaqPage(page);
        await faqPage.navigateToFaq();
        await faqPage.verifyFaqPageTitle();
        await faqPage.expandFaqReadAndClose();
    });

    test('Home', async ({ page }) => {
        const homeTasks = new HomeTasksPage(page);
        await homeTasks.navigateToHome();
        await homeTasks.openCompletedTasks();
        await homeTasks.openTotalTasks();
        await homeTasks.openDay1();
        await homeTasks.clickAllCheckboxesSequentially();
    });

    test('teams', async ({ page }) => {
        const teamsPage = new TeamsPage(page);
        await teamsPage.navigateToTeams();
        await teamsPage.expandFirstTab();
        await teamsPage.searchTeam(TestData.teams.searchTeamName);
        await teamsPage.verifyTeamResult(TestData.teams.searchTeamName);
    });

});
