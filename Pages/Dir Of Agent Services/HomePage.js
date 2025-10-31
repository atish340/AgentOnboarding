await page.locator('//a[@href="/home"]').click();
await page.locator('//*[@class="flex-col pl-4 py-4 bg-white h-full min-w-full-[11.875rem] flex justify-between rounded-md border border-[#DCDCDC] hover:scale-105 ease-in-out duration-300 cursor-pointer"]').click();
await page.locator('//input[@placeholder="Search"]').fill('jaysingh');
this.serachresult = page.locator('//*[@id="68d10f77da2b59b4812ed1e7"]');
await expect(this.serachresult).toHaveText('jaysingh');
await page.locator('//*[@class="btn btn-sm btn-circle btn-ghost mt-4 mr-4"]').click();

await page.locator('//*[@class="flex justify-end text-3xl mr-2"]').nth(0).click();
this.onboardingTitle = page.locator('//*[@class="flex justify-end text-3xl mr-2"]').nth(0);
await expect(this.onboardingTitle).toHaveText('My Tasks (Onboarding)');

await page.locator('//*[@class="w-6 h-6 text-gray-800 dark:text-white"]').nth(1).click();
