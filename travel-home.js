(() => {
  'use strict';
  const PLAN_KEY = 'travellog-plans-preview-v1';
  const FAVORITE_KEY = 'travellog-favorites-v2';
  const THEME_KEY = 'travel-theme';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));

  function loadJson(key, fallback) {
    try { const data = JSON.parse(localStorage.getItem(key) || 'null'); return data === null ? fallback : data; }
    catch { return fallback; }
  }
  function storeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { showToast('Không thể lưu trên trình duyệt hiện tại.'); return false; }
  }
  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
  }
  let toastTimeout;
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => { toast.hidden = true; }, 3600);
  }
  const THEME = localStorage.getItem(THEME_KEY);
  if (THEME === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  $$('[data-toggle-theme]').forEach(button => button.addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch {}
  }));

  const searchToggle = $('#search-toggle'), searchBox = $('#search-box');
  const searchInput = $('#search-input'), cards = $$('.destination');
  function applySearch() {
    const term = normalize(searchInput.value);
    let found = 0;
    cards.forEach(card => {
      const match = normalize(card.getAttribute('data-searchable')).includes(term);
      card.classList.toggle('is-filtered', !match);
      if (match) found++;
    });
    $('#no-results').hidden = found > 0;
  }
  function closeSearch() {
    searchBox.hidden = true;
    searchToggle.setAttribute('aria-expanded', 'false');
    searchInput.value = '';
    applySearch();
  }
  searchToggle.addEventListener('click', () => {
    const open = searchBox.hidden;
    if (open) { searchBox.hidden = false; searchToggle.setAttribute('aria-expanded', 'true'); searchInput.focus(); }
    else closeSearch();
  });
  $('#search-close').addEventListener('click', closeSearch);
  searchInput.addEventListener('input', applySearch);
  searchInput.addEventListener('keydown', event => { if (event.key === 'Escape') { closeSearch(); searchToggle.focus(); } });

  let favorites = loadJson(FAVORITE_KEY, []);
  if (!Array.isArray(favorites)) favorites = [];
  const allowedFavorites = new Set(['hongkong','malaysia','japan']);
  favorites = [...new Set(favorites.filter(x => allowedFavorites.has(x)))];
  function renderFavorites() {
    $$('[data-favorite]').forEach(button => {
      const active = favorites.includes(button.dataset.favorite);
      button.setAttribute('aria-pressed', String(active));
      button.title = active ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích';
    });
    $('#fav-count').textContent = String(favorites.length);
  }
  $$('[data-favorite]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.favorite;
    favorites = favorites.includes(value) ? favorites.filter(x => x !== value) : [...favorites, value];
    storeJson(FAVORITE_KEY, favorites);
    renderFavorites();
  }));
  renderFavorites();

  const tripDialog = $('#trip-dialog'), ideaDialog = $('#idea-dialog');
  const form = $('#trip-form'), destinationInput = $('#trip-destination');
  const templates = {
    'Hong Kong': 'Gợi ý 5 ngày: Victoria Harbour → The Peak → Hong Kong Disneyland → Ngong Ping 360 → Mong Kok. Kiểm tra visa trước khi đặt.',
    'Malaysia': 'Gợi ý 6 ngày: Kuala Lumpur (Petronas, Batu Caves) → Putrajaya → Malacca → trở về Kuala Lumpur.',
    'Nhật Bản': 'Gợi ý 8 ngày: Osaka (2 ngày) → Kyoto (2 ngày) → Tokyo (4 ngày). Kiểm tra visa và phương án tàu trước khi đặt.'
  };
  function showTrip(destination = '', notes = '') {
    if (ideaDialog.open) ideaDialog.close();
    form.reset();
    destinationInput.value = destination;
    $('#trip-notes').value = notes;
    tripDialog.showModal();
    destinationInput.focus();
  }
  function showIdea() { ideaDialog.showModal(); }
  $$('[data-new-trip]').forEach(button => button.addEventListener('click', () => showTrip()));
  $('#new-trip-shortcut').addEventListener('click', () => showTrip());
  $$('[data-plan]').forEach(button => button.addEventListener('click', () => showTrip(button.dataset.plan)));
  $('#idea-trigger').addEventListener('click', showIdea);
  $$('[data-suggestion]').forEach(button => button.addEventListener('click', () => {
    const destination = button.dataset.suggestion;
    showTrip(destination, templates[destination] || '');
  }));
  $('[data-close-trip]').addEventListener('click', () => tripDialog.close());
  $('[data-close-idea]').addEventListener('click', () => ideaDialog.close());
  [tripDialog, ideaDialog].forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }));

  const rawPlans = loadJson(PLAN_KEY, []);
  let plans = Array.isArray(rawPlans) ? rawPlans.filter(plan => plan && typeof plan.destination === 'string').map(plan => ({
    id: String(plan.id || crypto.randomUUID()),
    destination: String(plan.destination).trim().slice(0, 80),
    date: typeof plan.date === 'string' ? plan.date : '',
    people: String(plan.people || plan.travelers || '').slice(0, 3),
    notes: String(plan.notes || plan.note || '').slice(0, 500)
  })).filter(plan => plan.destination).slice(0, 60) : [];

  function flagFor(name) {
    const n = normalize(name);
    if (n.includes('hong kong')) return '🇭🇰';
    if (n.includes('malaysia') || n.includes('kuala')) return '🇲🇾';
    if (n.includes('nhat') || n.includes('japan') || n.includes('tokyo') || n.includes('osaka')) return '🇯🇵';
    if (n.includes('trung quoc') || n.includes('china')) return '🇨🇳';
    return '🌍';
  }
  function renderPlans() {
    const list = $('#plan-list');
    list.replaceChildren();
    $('#empty-plans').hidden = plans.length > 0;
    $('#plan-counter').textContent = '(' + plans.length + ')';
    $('#sidebar-plan-count').textContent = String(plans.length);
    $('#rail-plan-count').textContent = String(plans.length);
    plans.forEach(plan => {
      const item = document.createElement('article');
      item.className = 'plan-item';
      const flag = document.createElement('span');
      flag.className = 'plan-flag';
      flag.textContent = flagFor(plan.destination);
      const label = document.createElement('div');
      label.className = 'plan-label';
      const title = document.createElement('b');
      title.textContent = plan.destination;
      const meta = document.createElement('small');
      const parts = ['Đang lên kế hoạch'];
      if (/^\d{4}-\d\d-\d\d$/.test(plan.date)) {
        const d = new Date(plan.date + 'T00:00:00');
        if (!Number.isNaN(d.getTime())) parts.push(d.toLocaleDateString('vi-VN'));
      }
      if (Number(plan.people) > 0) parts.push(plan.people + ' người');
      if (plan.notes) parts.push(plan.notes);
      meta.textContent = parts.join(' · ');
      label.append(title, meta);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'trash';
      remove.textContent = '×';
      remove.title = 'Xóa kế hoạch';
      remove.setAttribute('aria-label', 'Xóa kế hoạch ' + plan.destination);
      remove.addEventListener('click', () => {
        if (!confirm('Xóa kế hoạch ' + plan.destination + ' khỏi trình duyệt này?')) return;
        plans = plans.filter(current => current.id !== plan.id);
        storeJson(PLAN_KEY, plans);
        renderPlans();
        showToast('Đã xóa kế hoạch.');
      });
      item.append(flag, label, remove);
      list.append(item);
    });
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const destination = destinationInput.value.trim();
    if (!destination) return destinationInput.focus();
    if (plans.length >= 60) return showToast('Bản thử nghiệm hỗ trợ tối đa 60 kế hoạch.');
    const people = $('#trip-people').value;
    const record = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2),
      destination,
      date: $('#trip-date').value,
      people: Number(people) > 0 ? String(Number(people)) : '',
      notes: $('#trip-notes').value.trim()
    };
    plans.unshift(record);
    if (!storeJson(PLAN_KEY, plans)) {
      plans.shift();
      return;
    }
    renderPlans();
    tripDialog.close();
    $('#plans').scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Đã thêm kế hoạch ' + destination + '.');
  });
  renderPlans();

  // Make the currently selected section visible in the desktop and mobile navigation.
  $$('.side-nav a[href^="#"], .mobile-bar a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      const selector = link.closest('.mobile-bar') ? '.mobile-bar a' : '.side-nav a';
      $$(selector).forEach(other => other.classList.remove('active'));
      link.classList.add('active');
    });
  });
})();