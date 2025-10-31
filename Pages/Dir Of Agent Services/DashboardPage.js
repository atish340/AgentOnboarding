import { expect } from '@playwright/test';
class DashboardPage {
    constructor(page) {
        this.page = page;
        this.dashboardlink = page.locator('//a[@href="/dashboard"]');
        this.downloadreport = page.locator('//button[@class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center h-10 mr-4"]');
        this.fromdate = page.locator('//*[@id="fromdate"]');

    }

    async AddAgent() {

        await this.dashboardlink.click();
        await this.downloadreport.click();


    }

}
module.exports = { DashboardPage };


