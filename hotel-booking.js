const DATA_URL = './data/hotels.json';
const HISTORY_URL = './data/hotel-history.json';
const TARGET_KEY = 'travel-hotel-target-price-v1';
const HOTEL_KEY = 'travel-hotel-history-selected-v1';
const $ = id => document.getElementById(id);

function syncThemeUI() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const icon = dark ? '#i-sun' : '#i-moon';
  const label = dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    const use = button.querySelector('use');
    if (use) use.setAttribute('href', icon);
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  });
}

function setTheme(value) {
  document.documentElement.dataset.theme = value;
  localStorage.setItem('travel-theme', value);
  syncThemeUI();
}

document.documentElement.dataset.theme = localStorage.getItem('travel-theme') === 'dark' ? 'dark' : 'light';
document.querySelectorAll('[data-theme-toggle]').forEach(button => {
  button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
});
syncThemeUI();

const state = {
  data: null,
  history: [],
  query: '',
  sort: 'recommended',
  shortlistOnly: false,
  selectedHotelId: localStorage.getItem(HOTEL_KEY) || ''
};

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hotelPrice(item) {
  return finiteNumber(item?.rate_per_night?.amount);
}

function formatVnd(value) {
  const n = finiteNumber(value);
  if (n === null) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(n).replace('₫', 'đ');
}

function formatNumber(value) {
  const n = finiteNumber(value);
  return n === null ? '—' : new Intl.NumberFormat('vi-VN').format(n);
}

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date);
}

function relativeTime(value) {
  if (!value) return 'Chưa có';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return 'Chưa có';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function propertyById(id) {
  return state.data?.properties?.find(item => item.id === id) || null;
}

function priceDeltaText(delta) {
  const n = finiteNumber(delta);
  if (n === null) return { text: 'Chưa có lịch sử giá', cls: 'neutral' };
  if (n === 0) return { text: 'Không đổi', cls: 'neutral' };
  if (n < 0) return { text: `Giảm ${formatVnd(Math.abs(n))}`, cls: 'down' };
  return { text: `Tăng ${formatVnd(n)}`, cls: 'up' };
}

function comparePrice(a, b) {
  const left = hotelPrice(a);
  const right = hotelPrice(b);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function filteredProperties() {
  const list = [...(state.data?.properties || [])];
  const q = state.query.trim().toLowerCase();
  const filtered = list.filter(item => {
    if (state.shortlistOnly && !item.shortlisted) return false;
    if (!q) return true;
    return [item.name, item.description, item.hotel_class, ...(item.amenities || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  filtered.sort((a, b) => {
    if (state.sort === 'price') return comparePrice(a, b) || a.name.localeCompare(b.name);
    if (state.sort === 'rating') return (b.overall_rating || 0) - (a.overall_rating || 0) || comparePrice(a, b);
    if (state.sort === 'reviews') return (b.reviews || 0) - (a.reviews || 0) || comparePrice(a, b);
    if (a.shortlisted !== b.shortlisted) return a.shortlisted ? -1 : 1;
    return comparePrice(a, b) || (a.catalogue_fallback === b.catalogue_fallback ? 0 : a.catalogue_fallback ? 1 : -1) || a.name.localeCompare(b.name);
  });
  return filtered;
}

function hotelCard(item) {
  const amount = hotelPrice(item);
  const hasPrice = amount !== null;
  const delta = hasPrice ? priceDeltaText(item.price_delta) : { text: 'Google Hotels chưa trả giá', cls: 'neutral' };
  const sources = (item.price_sources || []).slice(0, 3).map(source =>
    `<span class="source-chip">${escapeHtml(source.source)} · ${formatVnd(source.rate_per_night?.amount)}</span>`
  ).join('');
  const rating = item.overall_rating
    ? `<span class="hotel-rating">★ ${item.overall_rating}${item.reviews ? ` · ${formatNumber(item.reviews)} đánh giá` : ''}</span>`
    : '<span class="hotel-rating muted">Chưa có điểm Google</span>';
  const website = item.website_url
    ? `<a class="btn sm secondary" href="${escapeHtml(item.website_url)}" target="_blank" rel="noopener">Website</a>`
    : '';
  const image = item.image_url
    ? `<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : '<div class="hotel-image-fallback">🏨</div>';
  const priceHtml = hasPrice
    ? `<strong>${formatVnd(amount)}</strong><span>/ phòng / đêm</span>`
    : '<strong>Chưa có giá</strong><span>đang chờ Google Hotels</span>';
  const groupEstimate = hasPrice
    ? `<div class="hotel-group-estimate"><span>Ước tính 3 phòng cho 6 người</span><strong>${formatVnd(item.estimated_three_rooms_amount)}</strong></div>`
    : '<div class="hotel-group-estimate"><span>Ước tính 3 phòng</span><strong>—</strong></div>';
  const historyButton = hasPrice
    ? `<button class="btn sm primary" data-history="${escapeHtml(item.id)}">Xem lịch sử giá</button>`
    : '<button class="btn sm secondary" type="button" disabled>Chưa có lịch sử giá</button>';
  const fallbackTag = item.catalogue_fallback ? '<span class="source-chip">Danh sách theo dõi</span>' : '';

  return `<article class="card hotel-card ${item.shortlisted ? 'shortlisted' : ''}">
    <div class="hotel-image">${image}${item.shortlisted ? '<span class="shortlist-badge">Đang theo dõi</span>' : ''}</div>
    <div class="hotel-card-body">
      <div class="hotel-title-row">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <div class="hotel-meta">${rating}${item.hotel_class ? `<span>${escapeHtml(item.hotel_class)}</span>` : ''}</div>
        </div>
        <div class="hotel-price">${priceHtml}<small class="price-delta ${delta.cls}">${delta.text}</small></div>
      </div>
      ${item.description ? `<p class="hotel-description">${escapeHtml(item.description)}</p>` : ''}
      ${groupEstimate}
      <div class="hotel-sources">${sources || fallbackTag || '<span class="source-chip">Google Hotels</span>'}</div>
      <div class="hotel-card-actions">${historyButton}${website}</div>
    </div>
  </article>`;
}

function renderResults() {
  const list = filteredProperties();
  $('hotelResults').innerHTML = list.length
    ? list.map(hotelCard).join('')
    : '<div class="card empty-state">Không có khách sạn phù hợp với bộ lọc hiện tại.</div>';

  const priced = list.filter(item => hotelPrice(item) !== null).length;
  $('resultCount').textContent = `${list.length} khách sạn · ${priced} có giá`;

  document.querySelectorAll('[data-history]').forEach(button => {
    button.addEventListener('click', () => {
      state.selectedHotelId = button.dataset.history;
      localStorage.setItem(HOTEL_KEY, state.selectedHotelId);
      renderHistoryControls();
      renderHistory();
      $('historySection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderSummary() {
  const properties = state.data?.properties || [];
  const priced = properties.filter(item => hotelPrice(item) !== null);
  const shortlist = properties.filter(item => item.shortlisted);
  const pricedShortlist = shortlist.filter(item => hotelPrice(item) !== null);
  const cheapest = [...priced].sort(comparePrice)[0] || null;
  const cheapestShort = [...pricedShortlist].sort(comparePrice)[0] || cheapest;

  $('cheapestPrice').textContent = cheapestShort ? formatVnd(hotelPrice(cheapestShort)) : '—';
  $('cheapestName').textContent = cheapestShort ? cheapestShort.name : (properties.length ? 'Chưa có giá live' : 'Chưa có dữ liệu');
  $('trackedCount').textContent = String(shortlist.length || properties.length);
  $('trackedMeta').textContent = shortlist.length ? `khách sạn trong shortlist · ${priced.length} có giá` : `${priced.length} khách sạn có giá`;
  $('updatedAgo').textContent = relativeTime(state.data?.generated_at);
  $('updatedAt').textContent = formatDateTime(state.data?.generated_at);
  $('groupEstimate').textContent = cheapestShort ? formatVnd(cheapestShort.estimated_three_rooms_amount) : '—';

  const target = finiteNumber(localStorage.getItem(TARGET_KEY));
  const alert = $('targetAlert');
  if (cheapestShort && target !== null && target > 0) {
    const current = hotelPrice(cheapestShort);
    if (current <= target) {
      alert.className = 'alert success';
      alert.textContent = `Đã đạt mục tiêu: ${formatVnd(current)} ≤ ${formatVnd(target)}.`;
    } else {
      alert.className = 'alert';
      alert.textContent = `Còn cao hơn mục tiêu ${formatVnd(current - target)}.`;
    }
  } else if (!priced.length) {
    alert.className = 'alert';
    alert.textContent = 'Danh sách khách sạn đã có; đang chờ Google Hotels trả giá live.';
  } else {
    alert.className = 'alert';
    alert.textContent = 'Đặt mục tiêu giá để so nhanh với lần cập nhật mới nhất.';
  }
}

function historyRowsFor(item) {
  if (!item) return [];
  return state.history
    .filter(row => row.trip_key === state.data?.search?.trip_key)
    .filter(row => row.property_id === item.id || row.name === item.name)
    .filter(row => finiteNumber(row.rate_per_night_amount) !== null)
    .slice(-90);
}

function renderHistoryControls() {
  const properties = (state.data?.properties || []).filter(item => hotelPrice(item) !== null);
  if (!properties.length) {
    state.selectedHotelId = '';
    $('historyHotel').innerHTML = '<option value="">Chưa có khách sạn có giá</option>';
    $('historyHotel').disabled = true;
    return;
  }
  $('historyHotel').disabled = false;
  if (!state.selectedHotelId || !properties.some(item => item.id === state.selectedHotelId)) {
    state.selectedHotelId = state.data?.cheapest_shortlisted_property_id || state.data?.cheapest_property_id || properties[0]?.id || '';
  }
  $('historyHotel').innerHTML = properties.map(item =>
    `<option value="${escapeHtml(item.id)}"${item.id === state.selectedHotelId ? ' selected' : ''}>${escapeHtml(item.name)}</option>`
  ).join('');
}

function renderHistory() {
  const item = propertyById(state.selectedHotelId);
  const rows = historyRowsFor(item);
  const svg = $('hotelPriceChart');
  if (!item || !rows.length) {
    svg.innerHTML = '';
    $('historyMeta').textContent = item ? 'Chưa có dữ liệu lịch sử cho khách sạn này.' : 'Chưa có khách sạn nào có giá để ghi lịch sử.';
    $('observedRange').textContent = '—';
    return;
  }

  const values = rows.map(row => Number(row.rate_per_night_amount));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 760;
  const height = 150;
  const padX = 18;
  const padY = 18;
  const span = Math.max(1, max - min);
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? width / 2 : padX + index * ((width - padX * 2) / (rows.length - 1));
    const y = height - padY - ((Number(row.rate_per_night_amount) - min) / span) * (height - padY * 2);
    return { x, y, row };
  });
  const polyline = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const circles = points.map(point =>
    `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3"><title>${formatDateTime(point.row.checked_at)} · ${formatVnd(point.row.rate_per_night_amount)}</title></circle>`
  ).join('');
  svg.innerHTML = `<polyline points="${polyline}" fill="none" vector-effect="non-scaling-stroke"></polyline>${circles}`;
  $('historyMeta').textContent = `${rows.length} lần ghi nhận · mới nhất ${formatVnd(values.at(-1))}`;
  $('observedRange').textContent = min === max ? formatVnd(min) : `${formatVnd(min)} – ${formatVnd(max)}`;
}

async function load() {
  try {
    const [dataResponse, historyResponse] = await Promise.all([
      fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' }),
      fetch(`${HISTORY_URL}?v=${Date.now()}`, { cache: 'no-store' })
    ]);
    if (!dataResponse.ok) throw new Error(`hotels.json HTTP ${dataResponse.status}`);
    state.data = await dataResponse.json();
    state.history = historyResponse.ok ? await historyResponse.json() : [];
    $('stayDates').textContent = `${state.data.search?.check_in_date || '19/10/2026'} → ${state.data.search?.check_out_date || '20/10/2026'}`;
    $('occupancyNote').textContent = `${state.data.search?.adults_per_room || 2} người lớn / phòng · ${state.data.search?.group_rooms_estimate || 3} phòng ước tính`;
    $('sourceLabel').textContent = state.data.source || 'Google Hotels';
    renderSummary();
    renderResults();
    renderHistoryControls();
    renderHistory();
  } catch (error) {
    console.error(error);
    $('hotelResults').innerHTML = `<div class="card empty-state">Không tải được dữ liệu khách sạn. Hãy chạy workflow cập nhật giá rồi thử lại.<br><small>${escapeHtml(error.message)}</small></div>`;
    $('updatedAgo').textContent = 'Lỗi dữ liệu';
  }
}

$('hotelSearch').addEventListener('input', event => {
  state.query = event.target.value;
  renderResults();
});
$('sortHotels').addEventListener('change', event => {
  state.sort = event.target.value;
  renderResults();
});
$('shortlistOnly').addEventListener('change', event => {
  state.shortlistOnly = event.target.checked;
  renderResults();
});
$('historyHotel').addEventListener('change', event => {
  state.selectedHotelId = event.target.value;
  localStorage.setItem(HOTEL_KEY, state.selectedHotelId);
  renderHistory();
});
$('saveTarget').addEventListener('click', () => {
  const value = Number(String($('targetPrice').value).replace(/[^\d]/g, ''));
  if (!Number.isFinite(value) || value <= 0) {
    $('targetAlert').className = 'alert danger';
    $('targetAlert').textContent = 'Nhập mục tiêu giá hợp lệ.';
    return;
  }
  localStorage.setItem(TARGET_KEY, String(value));
  $('targetPrice').value = formatNumber(value);
  renderSummary();
});

const savedTarget = finiteNumber(localStorage.getItem(TARGET_KEY));
if (savedTarget !== null && savedTarget > 0) $('targetPrice').value = formatNumber(savedTarget);
load();
