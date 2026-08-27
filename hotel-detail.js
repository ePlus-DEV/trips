(() => {
  const detailState = { properties: [], active: null, imageIndex: 0 };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function finiteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatVnd(value) {
    const number = finiteNumber(value);
    if (number === null) return 'Chưa có giá';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency', currency: 'VND', maximumFractionDigits: 0
    }).format(number).replace('₫', 'đ');
  }

  function formatNumber(value) {
    const number = finiteNumber(value);
    return number === null ? '—' : new Intl.NumberFormat('vi-VN').format(number);
  }

  function formatDistance(value) {
    const number = finiteNumber(value);
    return number === null ? 'Chưa rõ' : `${number.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km`;
  }

  function imageList(property) {
    const seen = new Set();
    const list = [];
    for (const item of Array.isArray(property?.images) ? property.images : []) {
      const src = item?.original_image || item?.thumbnail;
      if (!src || seen.has(src)) continue;
      seen.add(src);
      list.push({ src, thumb: item?.thumbnail || src });
    }
    if (property?.image_url && !seen.has(property.image_url)) {
      list.push({ src: property.image_url, thumb: property.image_url });
    }
    return list.slice(0, 12);
  }

  function getPropertyByName(name) {
    return detailState.properties.find(item => item.name === name) || null;
  }

  function ensureModal() {
    if (document.getElementById('hotelDetailBackdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'hotelDetailBackdrop';
    backdrop.className = 'hotel-detail-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="hotel-detail-modal" role="dialog" aria-modal="true" aria-labelledby="hotelDetailTitle">
        <header class="hotel-detail-header">
          <div><span class="hotel-kicker">Chi tiết khách sạn</span><h2 id="hotelDetailTitle">Khách sạn</h2></div>
          <button class="hotel-detail-close" type="button" aria-label="Đóng">×</button>
        </header>
        <div id="hotelDetailBody" class="hotel-detail-body"></div>
      </section>`;
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', event => {
      if (event.target === backdrop || event.target.closest('.hotel-detail-close')) closeDetail();
      const thumb = event.target.closest('[data-detail-image]');
      if (thumb) {
        detailState.imageIndex = Number(thumb.dataset.detailImage || 0);
        renderGalleryOnly();
      }
      if (event.target.closest('[data-gallery-prev]')) {
        const images = imageList(detailState.active);
        if (images.length) detailState.imageIndex = (detailState.imageIndex - 1 + images.length) % images.length;
        renderGalleryOnly();
      }
      if (event.target.closest('[data-gallery-next]')) {
        const images = imageList(detailState.active);
        if (images.length) detailState.imageIndex = (detailState.imageIndex + 1) % images.length;
        renderGalleryOnly();
      }
    });
  }

  function renderGallery(property) {
    const images = imageList(property);
    if (!images.length) {
      return `<div class="hotel-detail-no-photo">🏨<strong>Google Hotels chưa trả ảnh cho khách sạn này trong snapshot hiện tại.</strong><span>Thông tin chi tiết vẫn có thể xem bên dưới.</span></div>`;
    }
    detailState.imageIndex = Math.min(detailState.imageIndex, images.length - 1);
    const current = images[detailState.imageIndex];
    const controls = images.length > 1
      ? `<button class="gallery-arrow prev" data-gallery-prev aria-label="Ảnh trước">‹</button><button class="gallery-arrow next" data-gallery-next aria-label="Ảnh tiếp theo">›</button>`
      : '';
    const thumbs = images.map((image, index) => `
      <button class="hotel-detail-thumb ${index === detailState.imageIndex ? 'active' : ''}" data-detail-image="${index}" type="button">
        <img src="${escapeHtml(image.thumb)}" alt="Ảnh ${index + 1}" loading="lazy" referrerpolicy="no-referrer">
      </button>`).join('');
    return `<div class="hotel-detail-gallery-main"><img src="${escapeHtml(current.src)}" alt="${escapeHtml(property.name)}" referrerpolicy="no-referrer">${controls}<span class="gallery-count">${detailState.imageIndex + 1}/${images.length}</span></div><div class="hotel-detail-thumbs">${thumbs}</div>`;
  }

  function renderGalleryOnly() {
    if (!detailState.active) return;
    const target = document.getElementById('hotelDetailGallery');
    if (target) target.innerHTML = renderGallery(detailState.active);
  }

  function infoRow(label, value) {
    if (!value) return '';
    return `<div class="hotel-detail-info"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
  }

  function renderDetail(property) {
    const amount = finiteNumber(property?.rate_per_night?.amount);
    const rating = finiteNumber(property?.overall_rating);
    const reviews = finiteNumber(property?.reviews);
    const stars = finiteNumber(property?.stars);
    const amenities = (property?.amenities || []).map(item => `<span class="detail-chip">${escapeHtml(item)}</span>`).join('');
    const essentials = (property?.essential_info || []).map(item => {
      const text = typeof item === 'string' ? item : (item?.title || item?.name || item?.description || '');
      return text ? `<span class="detail-chip">${escapeHtml(text)}</span>` : '';
    }).join('');
    const nearby = (property?.nearby_places || []).map(place => {
      const transport = (place.transportations || []).map(item => [item.type, item.duration].filter(Boolean).join(' · ')).filter(Boolean).join(' / ');
      return `<li><strong>${escapeHtml(place.name)}</strong>${transport ? `<span>${escapeHtml(transport)}</span>` : ''}</li>`;
    }).join('');
    const sources = (property?.price_sources || []).map(source => {
      const label = `${source.source || 'Nguồn đặt phòng'} · ${formatVnd(source?.rate_per_night?.amount)}`;
      return source.link
        ? `<a class="detail-source" href="${escapeHtml(source.link)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`
        : `<span class="detail-source">${escapeHtml(label)}</span>`;
    }).join('');
    const phone = property?.phone
      ? `<a href="tel:${escapeHtml(String(property.phone).replace(/[^+0-9]/g, ''))}">${escapeHtml(property.phone)}</a>`
      : '';
    const website = property?.website_url
      ? `<a class="btn sm primary" href="${escapeHtml(property.website_url)}" target="_blank" rel="noopener">Mở trang khách sạn</a>`
      : '';

    document.getElementById('hotelDetailTitle').textContent = property.name;
    document.getElementById('hotelDetailBody').innerHTML = `
      <div id="hotelDetailGallery" class="hotel-detail-gallery">${renderGallery(property)}</div>
      <div class="hotel-detail-summary">
        <div><span>Giá hiện tại</span><strong>${formatVnd(amount)}</strong><small>${amount !== null ? '/ phòng / đêm · 2 người lớn' : 'Google Hotels chưa trả giá live'}</small></div>
        <div><span>Rating</span><strong>${rating !== null ? `★ ${rating}` : '—'}</strong><small>${reviews !== null ? `${formatNumber(reviews)} review` : 'Chưa có review'}</small></div>
        <div><span>Khoảng cách</span><strong>${formatDistance(property.distance_from_anchor_km)}</strong><small>từ 531 Jinling East Road</small></div>
        <div><span>Hạng</span><strong>${stars !== null ? `${stars} sao` : '—'}</strong><small>${escapeHtml(property.area || 'Chưa rõ khu vực')}</small></div>
      </div>
      ${property.description ? `<p class="hotel-detail-description">${escapeHtml(property.description)}</p>` : ''}
      <div class="hotel-detail-info-grid">
        ${infoRow('Địa chỉ', escapeHtml(property.address || ''))}
        ${infoRow('Điện thoại', phone)}
        ${infoRow('Check-in', escapeHtml(property.check_in_time || ''))}
        ${infoRow('Check-out', escapeHtml(property.check_out_time || ''))}
        ${infoRow('Khoảng giá thường gặp', escapeHtml(typeof property.typical_price_range === 'string' ? property.typical_price_range : ''))}
      </div>
      ${amenities || essentials ? `<section class="hotel-detail-section"><h3>Tiện nghi & thông tin</h3><div class="detail-chips">${amenities}${essentials}</div></section>` : ''}
      ${nearby ? `<section class="hotel-detail-section"><h3>Địa điểm gần đó</h3><ul class="hotel-nearby-list">${nearby}</ul></section>` : ''}
      ${sources ? `<section class="hotel-detail-section"><h3>Nguồn giá đang có</h3><div class="detail-sources">${sources}</div></section>` : ''}
      <footer class="hotel-detail-footer"><span>Gallery và chi tiết lấy từ snapshot Google Hotels hiện tại; mở modal không phát sinh thêm SerpApi request.</span>${website}</footer>`;
  }

  function openDetail(property) {
    ensureModal();
    detailState.active = property;
    detailState.imageIndex = 0;
    renderDetail(property);
    const backdrop = document.getElementById('hotelDetailBackdrop');
    backdrop.hidden = false;
    document.body.classList.add('hotel-detail-open');
    backdrop.querySelector('.hotel-detail-close')?.focus();
  }

  function closeDetail() {
    const backdrop = document.getElementById('hotelDetailBackdrop');
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove('hotel-detail-open');
    detailState.active = null;
  }

  function enhanceCards() {
    document.querySelectorAll('#hotelResults .hotel-card').forEach(card => {
      if (card.dataset.detailReady === 'true') return;
      const name = card.querySelector('h3')?.textContent?.trim();
      const property = getPropertyByName(name);
      const actions = card.querySelector('.hotel-card-actions');
      if (!property || !actions) return;
      const count = imageList(property).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn sm secondary hotel-detail-btn';
      button.dataset.hotelDetail = property.id;
      button.textContent = count ? `Chi tiết · ${count} ảnh` : 'Chi tiết';
      actions.insertBefore(button, actions.firstChild);
      card.dataset.detailReady = 'true';
    });
  }

  async function loadDetails() {
    try {
      const response = await fetch(`./data/hotels.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      detailState.properties = Array.isArray(data?.properties) ? data.properties : [];
      enhanceCards();
    } catch (error) {
      console.warn('Hotel detail data unavailable:', error);
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-hotel-detail]');
    if (!button) return;
    const property = detailState.properties.find(item => item.id === button.dataset.hotelDetail);
    if (property) openDetail(property);
  });

  document.addEventListener('keydown', event => {
    const backdrop = document.getElementById('hotelDetailBackdrop');
    if (!backdrop || backdrop.hidden) return;
    if (event.key === 'Escape') closeDetail();
    if (event.key === 'ArrowLeft') backdrop.querySelector('[data-gallery-prev]')?.click();
    if (event.key === 'ArrowRight') backdrop.querySelector('[data-gallery-next]')?.click();
  });

  const results = document.getElementById('hotelResults');
  if (results) new MutationObserver(enhanceCards).observe(results, { childList: true, subtree: true });
  ensureModal();
  loadDetails();
})();
