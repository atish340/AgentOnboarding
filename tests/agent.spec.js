const { test: base, expect } = require('@playwright/test');
const {
    MyProfilePage,
    AgentRosterPage,
    DocumentPage,
    TrainingVideosPage,
    FaqPage,
    HomeTasksPage,
    TeamsPage,
} = require('../Pages/Agent');

const TestData = require('../TestData/agent.json');

// Worker-scoped fixture: logs in ONCE per worker, reuses the same browser tab
// so sessionStorage (Agent auth) is preserved across all tests.
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
        console.log(`✓ Agent logged in once — URL: ${page.url()}`);

        await use(page);
        await ctx.close();
    }, { scope: 'worker' }],
});

test.describe('Agent', () => {

    test.beforeEach(async ({ sharedPage: page }) => {
        await page.goto('https://qa.procasaonboard.com/home', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
    });

    test('agentMyProfile', async ({ sharedPage: page }) => {
        const myProfilePage = new MyProfilePage(page);
        await myProfilePage.navigateToMyProfile();
        await myProfilePage.verifyPageTitle();
        await myProfilePage.openDocuments();
        await page.bringToFront();
        await myProfilePage.closeDocument();
        await myProfilePage.editAddress();
        await myProfilePage.saveChanges();
    });

    test('agentRoster', async ({ sharedPage: page }) => {
        const agentRosterPage = new AgentRosterPage(page);
        await agentRosterPage.navigateToAgentRoster();
        await agentRosterPage.verifyPageTitle();
        await agentRosterPage.applyFilter();
        await agentRosterPage.searchByName(TestData.Roster.searchName);
        await agentRosterPage.verifySearchName(TestData.Roster.searchName);
        await agentRosterPage.downloadPdf();
        await agentRosterPage.viewAgentProfile();
    });

    test('Agent Documentfolder', async ({ sharedPage: page }) => {
        const marketCenter = new DocumentPage(page);
        await marketCenter.openMarketCenter();
        await marketCenter.openMCFolderAndDownload();
        await page.bringToFront();
        await marketCenter.openMyFolder();
        await marketCenter.addFolder(TestData.Documentfolder.folderName);
        await marketCenter.editFolderName(TestData.Documentfolder.editFolderName);
        await marketCenter.deleteFolder();
    });

    test('Training Videos', async ({ sharedPage: page }) => {
        const trainingPage = new TrainingVideosPage(page);
        await trainingPage.navigateToTrainingVideos();
        await trainingPage.openVideoAndReturnToMainPage();
        await trainingPage.markVideoComplete();
    });

    test('FAQ', async ({ sharedPage: page }) => {
        const faqPage = new FaqPage(page);
        await faqPage.navigateToFaq();
        await faqPage.verifyFaqPageTitle();
        await faqPage.expandFaqReadAndClose();
    });

    test('Home', async ({ sharedPage: page }) => {
        const homeTasks = new HomeTasksPage(page);
        await homeTasks.navigateToHome();
        await homeTasks.openCompletedTasks();
        await homeTasks.openTotalTasks();
        await homeTasks.openDay1();
        await homeTasks.clickAllCheckboxesSequentially();
    });

    test('teams', async ({ sharedPage: page }) => {
        const teamsPage = new TeamsPage(page);
        await teamsPage.navigateToTeams();
        await teamsPage.expandFirstTab();
        await teamsPage.searchTeam(TestData.teams.searchTeamName);
        await teamsPage.verifyTeamResult(TestData.teams.searchTeamName);
    });

});
