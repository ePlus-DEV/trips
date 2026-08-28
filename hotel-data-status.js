(() => {
  const DATA_URL = './data/hotels.json';
  const $ = id => document.getElementById(id);

  function ensureStatusBox() {
    let box = $('hotelDataStatus');
    if (box) return box;
    const searchCard = document.querySelector('.hotel-search-card');
    if (!searchCard) return null;
    box = document.createElement('div');
    box.id = 'hotelDataStatus';
    box.className = 'hotel-note';
    box.style.marginTop = '-4px';
    box.style.marginBottom = '16px';
    searchCard.insertAdjacentElement('afterend', box);
    return box;
  }

  function applyPendingState(data) {
    const box = ensureStatusBox();
    if (box) box.innerHTML = '<strong>Dữ liệu khách sạn đang được cập nhật.</strong> Vui lòng quay lại sau ít phút.';

    if ($('discoveryMeta')) $('discoveryMeta').textContent = 'Đang cập nhật danh sách khách sạn';
    if ($('hotelResults')) $('hotelResults').innerHTML = '<div class="card empty-state">Danh sách khách sạn đang được cập nhật.</div>';
    if ($('resultCount')) $('resultCount').textContent = 'Đang cập nhật';
    if ($('cheapestPrice')) $('cheapestPrice').textContent = '—';
    if ($('cheapestName')) $('cheapestName').textContent = 'Chưa có dữ liệu giá';
    if ($('groupEstimate')) $('groupEstimate').textContent = '—';
    if ($('updatedAgo')) $('updatedAgo').textContent = 'Đang cập nhật';
    if ($('updatedAt')) $('updatedAt').textContent = '';
  }

  function applyLegacyWarning(data) {
    const properties = Array.isArray(data?.properties) ? data.properties : [];
    const legacy = properties.some(item => item?.catalogue_fallback || String(item?.id || '').startsWith('fallback:'));
    if (!legacy && data?.search?.query === 'Shanghai hotels') return false;
    const box = ensureStatusBox();
    if (box) box.innerHTML = '<strong>Dữ liệu đang được làm mới.</strong> Một số giá hoặc thông tin có thể chưa cập nhật.';
    return true;
  }

  async function init() {
    let data;
    try {
      const response = await fetch(`${DATA_URL}?guard=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      data = await response.json();
    } catch {
      return;
    }

    const pending = data?.status === 'pending_refresh' || data?.snapshot_state === 'preview_pending_refresh';
    if (!pending) {
      applyLegacyWarning(data);
      return;
    }

    const results = $('hotelResults');
    const meta = $('discoveryMeta');
    let done = false;
    const applyOnceMainRenderFinishes = () => {
      if (done) return;
      if (meta && /Đang tải/i.test(meta.textContent || '')) return;
      done = true;
      observer.disconnect();
      applyPendingState(data);
    };

    const observer = new MutationObserver(applyOnceMainRenderFinishes);
    if (results) observer.observe(results, { childList: true, subtree: true });
    if (meta) observer.observe(meta, { childList: true, characterData: true, subtree: true });

    setTimeout(applyOnceMainRenderFinishes, 150);
    setTimeout(() => {
      if (!done) {
        done = true;
        observer.disconnect();
        applyPendingState(data);
      }
    }, 1500);
  }

  init();

  const copyScript = document.createElement('script');
  copyScript.src = './hotel-ui-copy.js';
  document.head.appendChild(copyScript);
})();
