const fs   = require('fs');
const path = require('path');

// ── helpers ───────────────────────────────────────────────────────────────────

function categorizeFailure(status, error) {
    if (status === 'passed' || status === 'skipped') return null;
    const m = (error || '').toLowerCase();
    if (m.includes('timeout') || m.includes('timedout') || status === 'timedOut')
        return 'Functionality Issue';
    if (m.includes('locator') || m.includes('selector') || m.includes('getby') ||
        m.includes('waitfor') || m.includes('not found') || m.includes('strict mode') ||
        m.includes('element'))
        return 'Code Issue';
    return 'Unknown Issue';
}

function flattenTests(suites, parentTitle) {
    const out = [];
    for (const suite of (suites || [])) {
        const title = parentTitle ? `${parentTitle} › ${suite.title}` : suite.title;
        for (const spec of (suite.specs || [])) {
            for (const t of (spec.tests || [])) {
                const r      = (t.results || [])[0] || {};
                const status = r.status || 'unknown';
                const error  = r.error?.message || '';
                out.push({
                    title    : spec.title,
                    suite    : title,
                    status,
                    duration : r.duration || 0,
                    error,
                    category : categorizeFailure(status, error),
                });
            }
        }
        out.push(...flattenTests(suite.suites, title));
    }
    return out;
}

function ms(d) {
    if (d >= 60000) return (d / 60000).toFixed(1) + ' m';
    if (d >= 1000)  return (d / 1000).toFixed(1) + ' s';
    return d + ' ms';
}

function escHtml(s) {
    return (s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function statusBadge(status) {
    const map = {
        passed    : ['PASS',    'badge-pass'],
        failed    : ['FAIL',    'badge-fail'],
        timedOut  : ['TIMEOUT', 'badge-fail'],
        unexpected: ['FAIL',    'badge-fail'],
        skipped   : ['SKIP',    'badge-skip'],
    };
    const [label, cls] = map[status] || ['UNKNOWN', 'badge-skip'];
    return `<span class="badge ${cls}">${label}</span>`;
}

function categoryBadge(cat) {
    if (!cat) return '';
    const cls = cat === 'Code Issue' ? 'cat-code'
              : cat === 'Functionality Issue' ? 'cat-func'
              : 'cat-other';
    return `<span class="cat-badge ${cls}">${cat}</span>`;
}

// ── main ──────────────────────────────────────────────────────────────────────

function generateReport() {
    const resultsPath = path.join(__dirname, 'test-results', 'results.json');
    if (!fs.existsSync(resultsPath)) {
        console.warn('⚠️  generate-report: results.json not found — skipping report.');
        return;
    }

    const data     = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const tests    = flattenTests(data.suites);
    const stats    = data.stats || {};
    const passed   = tests.filter(t => t.status === 'passed').length;
    const failed   = tests.filter(t => ['failed','timedOut','unexpected'].includes(t.status)).length;
    const skipped  = tests.filter(t => t.status === 'skipped').length;
    const total    = tests.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const dur      = stats.duration ? (stats.duration / 1000).toFixed(1) + 's' : 'N/A';
    const startTime = stats.startTime
        ? new Date(stats.startTime).toLocaleString('en-IN')
        : new Date().toLocaleString('en-IN');

    const R   = 54;
    const C   = 2 * Math.PI * R;
    const arc = ((100 - passRate) / 100) * C;

    function testRows() {
        return tests.map((t, i) => {
            const rowCls  = t.status === 'passed' ? 'row-pass'
                          : t.status === 'skipped' ? 'row-skip' : 'row-fail';
            const errHtml = t.error
                ? `<div class="err-block"><pre>${escHtml(t.error.slice(0, 600))}${t.error.length > 600 ? '\n…' : ''}</pre></div>`
                : '';
            return `
        <tr class="test-row ${rowCls}" data-status="${t.status}" style="animation-delay:${i * 30}ms">
          <td class="td-num">${i + 1}</td>
          <td class="td-name">
            <div class="test-title">${escHtml(t.title)}</div>
            <div class="test-suite">${escHtml(t.suite)}</div>
            ${errHtml}
          </td>
          <td class="td-badge">${statusBadge(t.status)}</td>
          <td class="td-cat">${categoryBadge(t.category)}</td>
          <td class="td-dur">${ms(t.duration)}</td>
        </tr>`;
        }).join('');
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AOB Test Execution Report</title>
<style>
  :root {
    --pass : #22c55e; --fail : #ef4444; --skip : #f59e0b;
    --blue : #1e40af; --bg   : #f1f5f9; --card : #ffffff;
    --text : #1e293b; --muted: #64748b;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); }

  .header {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #2563eb 100%);
    color: #fff; padding: 32px 40px; display: flex; align-items: center; gap: 20px;
    box-shadow: 0 4px 20px #0002;
  }
  .header-logo { font-size: 2.4rem; }
  .header-info h1 { font-size: 1.7rem; font-weight: 700; letter-spacing: .5px; }
  .header-info p  { font-size: .85rem; opacity: .8; margin-top: 4px; }
  .header-meta { margin-left: auto; text-align: right; font-size: .82rem; opacity: .85; line-height: 1.8; }

  .summary { display: flex; gap: 20px; padding: 30px 40px 10px; flex-wrap: wrap; }
  .card {
    flex: 1; min-width: 160px; background: var(--card); border-radius: 16px;
    padding: 24px 20px; text-align: center; box-shadow: 0 2px 12px #0001;
    animation: slideUp .5s ease both;
  }
  .card:nth-child(1){animation-delay:.0s} .card:nth-child(2){animation-delay:.1s}
  .card:nth-child(3){animation-delay:.2s} .card:nth-child(4){animation-delay:.3s}
  .card-num   { font-size: 2.8rem; font-weight: 800; line-height: 1; }
  .card-label { font-size: .8rem; font-weight: 600; text-transform: uppercase;
                letter-spacing: 1px; color: var(--muted); margin-top: 6px; }
  .card-total .card-num { color: var(--blue); }
  .card-pass  .card-num { color: var(--pass);  }
  .card-fail  .card-num { color: var(--fail);  }
  .card-skip  .card-num { color: var(--skip);  }
  .card-total { border-top: 4px solid var(--blue); }
  .card-pass  { border-top: 4px solid var(--pass); }
  .card-fail  { border-top: 4px solid var(--fail); }
  .card-skip  { border-top: 4px solid var(--skip); }

  .donut-wrap {
    background: var(--card); border-radius: 16px; padding: 24px 30px;
    display: flex; align-items: center; gap: 30px; margin: 10px 40px;
    box-shadow: 0 2px 12px #0001; animation: slideUp .5s .4s ease both;
  }
  .donut svg { width: 130px; height: 130px; }
  .donut-bg  { fill: none; stroke: #e2e8f0; stroke-width: 12; }
  .donut-arc {
    fill: none; stroke: var(--pass); stroke-width: 12; stroke-linecap: round;
    stroke-dasharray: ${C}; stroke-dashoffset: ${C};
    transform: rotate(-90deg); transform-origin: 50% 50%;
    animation: donutFill 1.2s .6s ease forwards;
  }
  @keyframes donutFill { to { stroke-dashoffset: ${arc}; } }
  .donut-label { position: absolute; top:50%; left:50%; transform:translate(-50%,-50%);
                 text-align:center; font-weight:800; font-size:1.4rem; color:var(--text); }
  .donut-sub   { font-size:.65rem; color:var(--muted); font-weight:500; }
  .donut-svg-wrap { position: relative; }
  .donut-info h3 { font-size:1.2rem; font-weight:700; }
  .donut-info p  { font-size:.85rem; color:var(--muted); margin-top:4px; }
  .bar-wrap { margin-top:14px; background:#e2e8f0; border-radius:999px; height:10px; overflow:hidden; width:260px; }
  .bar-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,var(--pass),#16a34a);
              width:0; animation:barFill 1.2s .8s ease forwards; }
  @keyframes barFill { to { width:${passRate}%; } }

  .filters { display:flex; gap:10px; padding: 20px 40px 10px; flex-wrap:wrap; }
  .filter-btn {
    padding: 7px 18px; border-radius: 999px; border: 2px solid #cbd5e1;
    background: white; cursor: pointer; font-size: .82rem; font-weight: 600;
    color: var(--muted); transition: all .2s;
  }
  .filter-btn:hover, .filter-btn.active { border-color:var(--blue); color:var(--blue); background:#eff6ff; }
  .filter-btn.f-pass.active { border-color:var(--pass); color:var(--pass); background:#f0fdf4; }
  .filter-btn.f-fail.active { border-color:var(--fail); color:var(--fail); background:#fef2f2; }
  .filter-btn.f-skip.active { border-color:var(--skip); color:var(--skip); background:#fffbeb; }

  .table-wrap { margin: 10px 40px 40px; border-radius: 16px; overflow: hidden;
                box-shadow: 0 2px 12px #0001; background: var(--card); }
  table { width:100%; border-collapse:collapse; }
  thead tr { background: #1e3a8a; color: #fff; }
  thead th { padding: 14px 16px; text-align:left; font-size:.78rem;
             text-transform:uppercase; letter-spacing:.8px; font-weight:600; }
  .test-row { border-bottom: 1px solid #f1f5f9; animation: fadeIn .4s ease both; }
  .test-row:last-child { border-bottom: none; }
  .test-row:hover { background: #f8fafc; }
  .row-pass { border-left: 4px solid var(--pass); }
  .row-fail { border-left: 4px solid var(--fail); }
  .row-skip { border-left: 4px solid var(--skip); }
  .td-num  { padding:14px 12px; color:var(--muted); font-size:.78rem; font-weight:600; width:42px; }
  .td-name { padding:14px 16px; }
  .td-badge{ padding:14px 12px; white-space:nowrap; }
  .td-cat  { padding:14px 12px; }
  .td-dur  { padding:14px 16px; color:var(--muted); font-size:.82rem; white-space:nowrap; }
  .test-title { font-weight:600; font-size:.9rem; }
  .test-suite { font-size:.75rem; color:var(--muted); margin-top:2px; }
  .err-block  { margin-top:8px; background:#fef2f2; border-radius:8px; padding:8px 12px; }
  .err-block pre { font-size:.72rem; color:#b91c1c; white-space:pre-wrap; word-break:break-word; line-height:1.5; }

  .badge { display:inline-block; padding:3px 10px; border-radius:999px;
           font-size:.72rem; font-weight:700; letter-spacing:.5px; }
  .badge-pass { background:#dcfce7; color:#15803d; }
  .badge-fail { background:#fee2e2; color:#b91c1c; }
  .badge-skip { background:#fef9c3; color:#a16207; }
  .cat-badge { display:inline-block; padding:3px 9px; border-radius:6px; font-size:.7rem; font-weight:600; }
  .cat-code  { background:#dbeafe; color:#1d4ed8; }
  .cat-func  { background:#fee2e2; color:#b91c1c; }
  .cat-other { background:#f3e8ff; color:#7c3aed; }

  .footer { text-align:center; padding:20px; font-size:.78rem; color:var(--muted);
            border-top:1px solid #e2e8f0; }

  @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
</style>
</head>
<body>

<div class="header">
  <div class="header-logo">🏠</div>
  <div class="header-info">
    <h1>AOB — Agent Onboarding</h1>
    <p>Automated Test Execution Report &nbsp;|&nbsp; procasaonboard.com</p>
  </div>
  <div class="header-meta">
    <div>📅 &nbsp;${escHtml(startTime)}</div>
    <div>⏱ &nbsp;Duration: ${dur}</div>
    <div>🌐 &nbsp;Browser: Chromium</div>
    <div>🔗 &nbsp;Environment: QA</div>
  </div>
</div>

<div class="summary">
  <div class="card card-total">
    <div class="card-num" data-target="${total}">0</div>
    <div class="card-label">Total Tests</div>
  </div>
  <div class="card card-pass">
    <div class="card-num" data-target="${passed}">0</div>
    <div class="card-label">Passed</div>
  </div>
  <div class="card card-fail">
    <div class="card-num" data-target="${failed}">0</div>
    <div class="card-label">Failed</div>
  </div>
  <div class="card card-skip">
    <div class="card-num" data-target="${skipped}">0</div>
    <div class="card-label">Skipped</div>
  </div>
</div>

<div class="donut-wrap">
  <div class="donut">
    <div class="donut-svg-wrap">
      <svg viewBox="0 0 120 120">
        <circle class="donut-bg"  cx="60" cy="60" r="${R}"/>
        <circle class="donut-arc" cx="60" cy="60" r="${R}"/>
      </svg>
      <div class="donut-label">${passRate}%<div class="donut-sub">pass rate</div></div>
    </div>
  </div>
  <div class="donut-info">
    <h3>Test Execution Summary</h3>
    <p>${passed} of ${total} tests passed &nbsp;·&nbsp; ${failed} failed &nbsp;·&nbsp; ${skipped} skipped</p>
    <div class="bar-wrap"><div class="bar-fill"></div></div>
  </div>
</div>

<div class="filters">
  <button class="filter-btn active" onclick="filter(this,'all')">All (${total})</button>
  <button class="filter-btn f-pass" onclick="filter(this,'passed')">✅ Passed (${passed})</button>
  <button class="filter-btn f-fail" onclick="filter(this,'failed')">❌ Failed (${failed})</button>
  <button class="filter-btn f-skip" onclick="filter(this,'skipped')">⏭ Skipped (${skipped})</button>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Test Name &amp; Suite</th>
        <th>Status</th>
        <th>Failure Category</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>${testRows()}</tbody>
  </table>
</div>

<div class="footer">
  Generated by AOB Test Reporter &nbsp;·&nbsp; ${new Date().toLocaleString('en-IN')}
</div>

<script>
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = +el.dataset.target, step = Math.ceil(target / 30);
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur;
      if (cur >= target) clearInterval(t);
    }, 30);
  });
  function filter(btn, status) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.test-row').forEach(row => {
      const s = row.dataset.status;
      row.style.display = (status === 'all' ||
        (status === 'failed' && ['failed','timedOut','unexpected'].includes(s)) ||
        s === status) ? '' : 'none';
    });
  }
</script>
</body>
</html>`;

    const out = path.join(__dirname, 'aob-report.html');
    fs.writeFileSync(out, html, 'utf8');
    console.log(`\n✅  Report generated: ${out}\n`);
}

module.exports = { generateReport };

// Run directly when called via: node generate-report.js
if (require.main === module) {
    generateReport();
}
