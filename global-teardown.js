const fs = require('fs');
const path = require('path');
const { generateReport } = require('./generate-report');

const RESULTS_PATH = path.join(__dirname, 'test-results', 'results.json');

async function waitForResultsFile(maxWaitMs = 5000, interval = 500) {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
        if (fs.existsSync(RESULTS_PATH)) return true;
        await new Promise(r => setTimeout(r, interval));
    }
    return false;
}

module.exports = async function globalTeardown() {
    try {
        await waitForResultsFile();
        generateReport();
    } catch (e) {
        console.warn('⚠️  Report generation failed:', e.message);
    }
};
