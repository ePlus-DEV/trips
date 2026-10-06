(() => {
  'use strict';

  const theme = localStorage.getItem('travel-theme');
  if (theme) document.documentElement.dataset.theme = theme;

  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      const next = dark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('travel-theme', next);
    });
  });

  const money = value => new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + ' đ';
  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function renderOption(option) {
    const features = (option.features || []).map(feature => '<li>' + escapeHtml(feature) + '</li>').join('');
    return `
      <article class="card provider-card ${escapeHtml(option.tone || '')}">
        <div class="provider-accent"></div>
        <div class="provider-body">
          <div class="provider-top">
            <div class="provider-title">
              <span class="provider-rank">#${escapeHtml(option.rank)} · SIM vật lý</span>
              <h3>${escapeHtml(option.name)}</h3>
              <p>${escapeHtml(option.network)}</p>
            </div>
            <div class="provider-price">
              <span>Giá tham khảo</span>
              <strong>${escapeHtml(option.price_display)}</strong>
            </div>
          </div>
          <span class="provider-badge">${escapeHtml(option.badge)}</span>
          <ul class="provider-features">${features}</ul>
          <div class="provider-caution">${escapeHtml(option.caution)}</div>
          <div class="provider-actions">
            <small>Giá từ ${money(option.price_from_vnd)} · kiểm tra đúng biến thể</small>
            <a class="btn sm" href="${escapeHtml(option.url)}" target="_blank" rel="noopener noreferrer">Mở nhà bán ↗</a>
          </div>
        </div>
      </article>
    `;
  }

  fetch('./data/sim-options.json?t=' + Date.now(), { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('SIM data unavailable');
      return response.json();
    })
    .then(data => {
      const grid = document.getElementById('providerGrid');
      grid.innerHTML = [...(data.options || [])]
        .sort((a, b) => Number(a.rank) - Number(b.rank))
        .map(renderOption)
        .join('');

      const updated = document.getElementById('lastUpdated');
      if (updated && data.updated_at) {
        const parts = String(data.updated_at).split('-');
        updated.textContent = 'Dữ liệu giá cập nhật: ' + [parts[2], parts[1], parts[0]].join('/');
      }
    })
    .catch(() => {
      const grid = document.getElementById('providerGrid');
      grid.innerHTML = '<div class="card loading-card">Không tải được dữ liệu SIM. Mở lại trang khi có mạng hoặc xem tài liệu trong repo.</div>';
    });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
