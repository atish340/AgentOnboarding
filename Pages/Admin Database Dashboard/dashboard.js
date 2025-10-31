exports.dashboard =
    class DashboardPage {
        constructor(page) {
            this.page = page;
        }

        get title() {
            return this.page.locator('h2.inline-block');
        }

        get searchInput() {
            return this.page.locator('input[placeholder="Search Agent Name"]');
        }

        get scheduleReportButton() {
            return this.page.locator('button:has-text("Schedule Report")');
        }

        get exportButton() {
            return this.page.locator('button:has-text("Export")');
        }

        get importButton() {
            return this.page.locator('button:has-text("Import")');
        }

        get filterButton() {
            return this.page.locator('button.filter-button');
        }

        get agentTable() {
            return this.page.locator('table');
        }

        get viewFormsButtons() {
            return this.page.locator('button:has-text("View Forms")');
        }

        async verifyTitle() {
            await expect(this.title).toHaveText('Database Dashboard');
        }

        async enterSearchText(text) {
            await this.searchInput.fill(text);
        }

        async clickScheduleReport() {
            await this.scheduleReportButton.click();
        }

        async clickExport() {
            await this.exportButton.click();
        }

        async clickImport() {
            await this.importButton.click();
        }

        async clickFilter() {
            await this.filterButton.click();
        }

        async verifyAgentRecords() {
            const rows = await this.agentTable.locator('tbody tr').count();
            expect(rows).toBeGreaterThan(0);
        }

        async clickViewForms(index) {
            await this.viewFormsButtons.nth(index).click();
        }
    }
