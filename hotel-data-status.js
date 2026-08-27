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
    if (box) {
      box.innerHTML = '⚠️ <strong>Chưa có snapshot live cho flow mới.</strong> Preview không dùng danh sách fallback giả. Sau khi merge, workflow Hotel sẽ tự discovery Google Hotels và ghi dữ liệu thật.';
    }

    if ($('discoveryMeta')) {
      const maxPages = Number(data?.search?.max_pages || 0);
      $('discoveryMeta').textContent = `0/${maxPages || '—'} trang API · chưa chạy live refresh`;
    }
    if ($('hotelResults')) {
      $('hotelResults').innerHTML = '<div class="card empty-state">Chưa có dữ liệu Google Hotels live.<br>Danh sách khách sạn sẽ xuất hiện sau lần workflow cập nhật đầu tiên.</div>';
    }
    if ($('resultCount')) $('resultCount').textContent = '0 khách sạn · chờ refresh';
    if ($('cheapestPrice')) $('cheapestPrice').textContent = '—';
    if ($('cheapestName')) $('cheapestName').textContent = 'Chưa có snapshot live';
    if ($('groupEstimate')) $('groupEstimate').textContent = '—';
    if ($('updatedAgo')) $('updatedAgo').textContent = 'Chưa chạy';
    if ($('updatedAt')) $('updatedAt').textContent = 'Workflow sẽ chạy sau khi merge';
  }

  function applyLegacyWarning(data) {
    const properties = Array.isArray(data?.properties) ? data.properties : [];
    const legacy = properties.some(item => item?.catalogue_fallback || String(item?.id || '').startsWith('fallback:'));
    if (!legacy && data?.search?.query === 'Shanghai hotels') return false;
    const box = ensureStatusBox();
    if (box) {
      box.innerHTML = '⚠️ <strong>Snapshot cũ.</strong> Dữ liệu này chưa được tạo từ discovery “Shanghai hotels”; không nên dùng để đánh giá giá hoặc khoảng cách.';
    }
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
})();
