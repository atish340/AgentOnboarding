
// this.navigateToMyProfile = page.locator('//a[@href="/trainings-videos"]').click();
// this.openVideo = page.locator('//*[@class="absolute inset-0 flex justify-center pb-8"]').nth(0).click()  
// // here i want go my main page menas open video navigate to me on another tab  so i need to close the new tab and navigate to my old onbe 
// this.markComplete = page.locator('//*[@class="rounded-md bg-[#0000fe] text-white w-[120px]"]').nth(0).click()

const { expect } = require('@playwright/test');


class TrainingVideosPage {
    constructor(page) {
        this.page = page;

        // ===== LOCATORS (exactly as you gave) =====
        this.navigateToMyProfile = page.locator('//a[@href="/trainings-videos"]');
        this.openVideo = page
            .locator('//*[@class="absolute inset-0 flex justify-center pb-8"]')
            .nth(0);
        this.markComplete = page
            .locator('//*[@class="rounded-md bg-[#0000fe] text-white w-[120px]"]')
            .nth(0);
    }

    // ===== ACTIONS =====
    async navigateToTrainingVideos() {
        await this.navigateToMyProfile.click();
    }

    async openVideoAndReturnToMainPage() {
        const context = this.page.context();
        await this.openVideo.click();
        await this.page.waitForTimeout(2000);
        const pages = context.pages();
        for (const p of pages) {
            if (p !== this.page) {
                await p.close();
            }
        }
        await this.page.bringToFront();
    }

    async markVideoComplete() {
        // Only mark complete if an incomplete video button is available
        const isVisible = await this.markComplete.isVisible({ timeout: 5000 }).catch(() => false);
        if (isVisible) {
            await this.markComplete.click();
        } else {
            console.log('>>> No incomplete video found — skipping markVideoComplete');
        }
    }
}

module.exports = { TrainingVideosPage };