const { expect } = require('@playwright/test');
const zlib = require('zlib');
const fs = require('fs');
const os = require('os');
const path = require('path');

function randomTeamName(minLen = 4, maxLen = 7) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
    let name = '';
    for (let i = 0; i < len; i++) name += chars[Math.floor(Math.random() * chars.length)];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function crc32(buf) {
    const table = (() => {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            t[i] = c;
        }
        return t;
    })();
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateLogoPng() {
    const size = 64;
    const r = Math.floor(Math.random() * 180) + 40;
    const g = Math.floor(Math.random() * 180) + 40;
    const b = Math.floor(Math.random() * 180) + 40;

    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    const rows = [];
    for (let y = 0; y < size; y++) {
        const row = Buffer.alloc(1 + size * 3);
        row[0] = 0;
        for (let x = 0; x < size; x++) {
            row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
        }
        rows.push(row);
    }
    return Buffer.concat([
        signature,
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
        pngChunk('IEND', Buffer.alloc(0))
    ]);
}

exports.TeamPage = class TeamPage {
    constructor(page) {
        this.page = page;
        this.teamLink = page.locator('//a[@href="/teams"]');
        this.pageTitle = page.locator('//*[@class="text-black font-bold text-xl leading-7 text-left mb-5"]');
        this.createTeamButton = page.locator('//button[@class="ml-3 mr-1 py-1 px-4 rounded-lg app-blue bg-[#0000FE] hover:bg-[#0000F0] text-white font-semibold"]');
        this.teamModalTitle = page.locator('//h2[@class="text-xl font-bold ml-2"]');
        this.fileInput = page.locator('input[type="file"]').first();
        this.teamNameInput = page.locator('//input[@id="teamName"]');
        this.selectLeaderDropdown = page.locator('//select[@id="selectedLeader"]');
        this.createBtn = page.locator('//button[@class="btn-primary-blue ml-4 w-24"]');
        this.successToast = page.locator('[data-testid="toast-body"]').filter({ hasText: /team created successfully/i });
        this.searchInput = page.locator('//input[@placeholder="Search"]');
        // Add Team Members modal
        this.addMembersModal = page.locator('//div[.//*[normalize-space()="Add Team Members"]]').last();
        this.addMembersModalTitle = page.locator('//*[normalize-space()="Add Team Members"]').first();
        this.memberDropdownTrigger = page.locator('//*[normalize-space()="Select Member"]').first();
        this.memberOption = page.locator('//ul[@role="listbox"]//li | //div[@role="option"]').first();
        this.noMembersMsg = page.locator('//*[contains(text(),"No Members Available")]');
        // scoped Save inside the Add Team Members modal
        this.saveBtn = page.locator('//*[normalize-space()="Add Team Members"]/following::button[normalize-space()="Save"]').first();
    }

    async navigateToTeamPage() {
        await this.teamLink.click();
        await expect(this.pageTitle).toHaveText('Teams');
    }

    async createNewTeam({ teamLeader }) {
        const teamName = randomTeamName();
        console.log(`>>> Creating team: ${teamName}`);

        const logoPath = path.join(os.tmpdir(), `team-logo-${Date.now()}.png`);
        fs.writeFileSync(logoPath, generateLogoPng());

        await this.createTeamButton.click();
        await expect(this.teamModalTitle).toHaveText('Create Team');
        await this.fileInput.setInputFiles(logoPath);
        await this.teamNameInput.fill(teamName);
        await this.selectLeaderDropdown.selectOption({ label: teamLeader });
        await this.createBtn.click();

        try { fs.unlinkSync(logoPath); } catch {}

        // verify success toast
        await expect(this.successToast).toBeVisible({ timeout: 15000 });
        console.log(`>>> Toast: Team created successfully`);

        return teamName;
    }

    async searchAndVerifyTeam(teamName) {
        await this.searchInput.waitFor({ state: 'visible', timeout: 15000 });
        await this.searchInput.fill(teamName);
        const teamBadge = this.page.locator(`//*[normalize-space()="${teamName}"]`).first();
        await expect(teamBadge).toBeVisible({ timeout: 15000 });
        console.log(`>>> Team "${teamName}" confirmed in list`);
    }

    async openManageTeamAndAddMember() {
        // click Manage Team — opens "Add Team Members" modal
        const manageBtn = this.page.locator('//button[normalize-space()="Manage Team"]');
        await manageBtn.waitFor({ state: 'visible', timeout: 10000 });
        await manageBtn.click();

        // wait for modal to appear
        await this.addMembersModalTitle.waitFor({ state: 'visible', timeout: 10000 });
        console.log(`>>> Add Team Members modal open`);

        // click dropdown trigger to start loading members
        await this.memberDropdownTrigger.click();

        // wait for dropdown to fully load — either options appear or "No Members Available"
        await this.page.waitForFunction(() => {
            const noMembers = document.querySelector('*');
            const bodyText = document.body.innerText;
            return bodyText.includes('No Members Available') ||
                   document.querySelectorAll('[role="option"], [role="listbox"] li').length > 0;
        }, { timeout: 15000 });

        const noMembers = await this.noMembersMsg.isVisible().catch(() => false);
        if (noMembers) {
            console.log(`>>> No Members Available — saving without member`);
        } else {
            await this.memberOption.waitFor({ state: 'visible', timeout: 5000 });
            await this.memberOption.click();
            console.log(`>>> Member selected`);
        }

        await this.saveBtn.click({ force: true });
        console.log(`>>> Save clicked`);
    }
};
