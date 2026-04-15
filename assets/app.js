/* AI News Hub — homepage logic
 * Loads data/issues.json, renders the latest issue + archive grid,
 * and wires up search + month filtering.
 */

(function () {
  const DATA_URL = 'data/issues.json';

  const els = {
    latest:    document.getElementById('latest-issue'),
    grid:      document.getElementById('archive-grid'),
    search:    document.getElementById('search-input'),
    month:     document.getElementById('month-select'),
    stats:     document.getElementById('search-stats'),
    ticker:    document.getElementById('ticker-inner'),
    headerCount: document.getElementById('header-count'),
    headerDate:  document.getElementById('header-date'),
  };

  const THAI_MONTHS = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
  ];

  let allIssues = [];
  let filtered = [];

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function monthKey(iso) {
    if (!iso) return '';
    return iso.slice(0, 7); // YYYY-MM
  }

  function monthLabel(iso) {
    if (!iso) return '';
    const [y, m] = iso.split('-');
    const monthName = THAI_MONTHS[parseInt(m, 10) - 1] || '';
    const beYear = parseInt(y, 10) + 543;
    return `${monthName} ${beYear}`;
  }

  function renderLatest(issue) {
    if (!issue) {
      els.latest.innerHTML = '';
      return;
    }
    els.latest.innerHTML = `
      <div class="latest-card fu d1" onclick="location.href='${escapeHtml(issue.output_file)}'">
        <div class="latest-cover">
          <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="lg-${issue.id}" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#1a1a18"/>
                <stop offset="100%" stop-color="#050504"/>
              </linearGradient>
              <radialGradient id="lr-${issue.id}" cx="65%" cy="38%" r="55%">
                <stop offset="0%" stop-color="#c8230e" stop-opacity=".25"/>
                <stop offset="100%" stop-color="#0a0a08" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <rect width="800" height="500" fill="url(#lg-${issue.id})"/>
            <rect width="800" height="500" fill="url(#lr-${issue.id})"/>
            <circle cx="560" cy="200" r="50" fill="none" stroke="#e8a020" stroke-width="2" opacity=".55"/>
            <circle cx="560" cy="200" r="90" fill="none" stroke="#e8a020" stroke-width="1.4" opacity=".32"/>
            <circle cx="560" cy="200" r="135" fill="none" stroke="#e8a020" stroke-width="1" opacity=".18"/>
            <text x="40" y="60" fill="#c8230e" font-size="13" font-family="sans-serif" font-weight="800" letter-spacing="2" opacity=".75">LATEST · ${escapeHtml(issue.date_th)}</text>
          </svg>
          <span class="badge">ฉบับล่าสุด</span>
          <span class="issue-num">#${String(issue.id).padStart(2, '0')}</span>
        </div>
        <div class="latest-body">
          <div class="latest-meta">${escapeHtml(issue.edition || ('ฉบับที่ ' + issue.id))} · ${escapeHtml(issue.date_th)}${issue.week ? ' · สัปดาห์ที่ ' + issue.week : ''}</div>
          <h2 class="latest-headline">${escapeHtml(issue.hero_headline)}</h2>
          <p class="latest-excerpt">${escapeHtml(issue.hero_excerpt)}</p>
          <span class="latest-cta">อ่านฉบับนี้ →</span>
        </div>
      </div>
    `;
  }

  function renderArchive(items) {
    if (!items.length) {
      els.grid.innerHTML = `
        <div class="empty-state">
          <h3>ไม่พบฉบับที่ตรงกับเงื่อนไข</h3>
          <p>ลองล้างคำค้นหาหรือเลือก "ทุกเดือน" ดูครับ</p>
        </div>`;
      return;
    }
    els.grid.innerHTML = items.map((issue, idx) => {
      const delay = Math.min(4, (idx % 6) + 1);
      return `
      <article class="issue-card fu d${delay}" onclick="location.href='${escapeHtml(issue.output_file)}'">
        <div class="issue-card-cover">
          <svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="cg-${issue.id}" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#1a1a18"/>
                <stop offset="100%" stop-color="#0a0a08"/>
              </linearGradient>
            </defs>
            <rect width="640" height="360" fill="url(#cg-${issue.id})"/>
            <line x1="40" y1="60" x2="600" y2="60" stroke="#c8230e" stroke-width="3"/>
            <text x="40" y="100" fill="#e8a020" font-size="14" font-family="sans-serif" font-weight="800" letter-spacing="2">${escapeHtml(issue.date_th || '')}</text>
            <text x="40" y="130" fill="rgba(255,255,255,.45)" font-size="12" font-family="sans-serif">${escapeHtml(issue.edition || '')}</text>
          </svg>
          <span class="num">#${String(issue.id).padStart(2, '0')}</span>
          <span class="ribbon">ISSUE</span>
          ${issue.week ? `<span class="week-badge">สัปดาห์ ${issue.week}</span>` : ''}
        </div>
        <div class="issue-card-body">
          <div class="issue-card-meta">${escapeHtml(issue.edition || '')}</div>
          <h3 class="issue-card-headline">${escapeHtml(issue.hero_headline)}</h3>
          <p class="issue-card-excerpt">${escapeHtml(issue.hero_excerpt)}</p>
          <div class="issue-card-foot">
            <span><strong>${escapeHtml(issue.date_th || '')}</strong></span>
            <span>${issue.headline_count || (issue.headlines ? issue.headlines.length : 0)} หัวข่าว</span>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function applyFilters() {
    const q = (els.search.value || '').trim().toLowerCase();
    const month = els.month.value;

    filtered = allIssues.filter(issue => {
      if (month && monthKey(issue.date_iso) !== month) return false;
      if (!q) return true;
      const haystack = [
        issue.title, issue.hero_headline, issue.hero_excerpt,
        issue.edition, issue.date_th,
        ...(issue.headlines || []),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });

    renderArchive(filtered);
    if (els.stats) {
      els.stats.textContent = `${filtered.length} / ${allIssues.length} ฉบับ`;
    }
  }

  function buildMonthOptions() {
    const months = [...new Set(allIssues.map(i => monthKey(i.date_iso)).filter(Boolean))].sort().reverse();
    els.month.innerHTML = '<option value="">ทุกเดือน</option>' +
      months.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join('');
  }

  function buildTicker() {
    if (!els.ticker) return;
    const headlines = allIssues.flatMap(i => (i.headlines || []).slice(0, 2)).slice(0, 12);
    if (!headlines.length) return;
    const dup = [...headlines, ...headlines]; // duplicate for seamless loop
    els.ticker.innerHTML =
      '<span class="tlabel">UPDATE</span>' +
      dup.map(h => `<span>${escapeHtml(h)}</span><span>·</span>`).join('');
  }

  function setHeaderMeta() {
    if (els.headerCount) els.headerCount.textContent = `${allIssues.length} ฉบับ`;
    if (els.headerDate && allIssues[0]) els.headerDate.textContent = allIssues[0].date_th || '';
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('manifest fetch failed: ' + res.status);
      const data = await res.json();
      allIssues = (data.issues || []).slice();
      // Already sorted newest first by build.py, but enforce just in case
      allIssues.sort((a, b) => (b.date_iso || '').localeCompare(a.date_iso || '') || (b.id - a.id));

      setHeaderMeta();
      buildTicker();
      buildMonthOptions();
      renderLatest(allIssues[0]);
      applyFilters();
    } catch (err) {
      console.error(err);
      els.grid.innerHTML = `
        <div class="empty-state">
          <h3>โหลดข้อมูลไม่ได้</h3>
          <p>ถ้าเปิดไฟล์ตรง ๆ จาก Windows Explorer browser อาจ block fetch ลอง <code>python -m http.server</code> ในโฟลเดอร์นี้แล้วเปิด <code>http://localhost:8000</code> แทน หรือ deploy ขึ้น GitHub Pages</p>
        </div>`;
    }
  }

  els.search && els.search.addEventListener('input', applyFilters);
  els.month && els.month.addEventListener('change', applyFilters);

  init();
})();
