const { generateReport } = require('./generate-report');

module.exports = async function globalTeardown() {
    try {
        generateReport();
    } catch (e) {
        console.warn('⚠️  Report generation failed:', e.message);
    }
};
