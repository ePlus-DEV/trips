(() => {
  const DATA_URL = './data/hotels.json';
  const $ = id => document.getElementById(id);
  let data = null;

  function text(selector, value) {
    const node = document.querySelector(selector);
    if (node && node.textContent !== value) node.textContent = value;
  }

  function replaceText(root, from, to) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.nodeValue.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
    });
  }

  function formatCount(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? new Intl.NumberFormat('vi-VN').format(n) : '0';
  }

  function applyStaticCopy() {
    text('.hotel-heading .hotel-kicker', 'Khách sạn');
    text('.hotel-heading h1', 'Khách sạn tại Shanghai');
    text('.hotel-heading p', 'So sánh giá, vị trí và đánh giá cho đêm 19–20/10/2026. Khoảng cách được tính từ 531 Jinling East Road để bạn dễ chọn nơi lưu trú phù hợp.');
    text('.hotel-results-head .hotel-kicker', 'Danh sách');
    text('.hotel-results-head h2', 'Khách sạn phù hợp');

    const note = document.querySelector('.hotel-note:not(#hotelDataStatus)');
    if (note) note.textContent = 'Giá hiển thị dành cho 2 người lớn/phòng và có thể thay đổi theo hạng phòng, thuế, phí hoặc tình trạng phòng tại thời điểm đặt.';

    text('.hotel-history .hotel-kicker', 'Theo dõi giá');
    text('.hotel-history h2', 'Lịch sử giá');
    const historyMeta = $('historyMeta');
    if (historyMeta && /workflow|lần ghi nhận|Mỗi điểm/i.test(historyMeta.textContent || '')) historyMeta.textContent = 'Theo dõi biến động giá của khách sạn đã chọn.';

    const targetCard = document.querySelector('.hotel-target-card > p');
    if (targetCard) targetCard.textContent = 'Đặt mức giá mong muốn để dễ theo dõi.';

    const groupStat = [...document.querySelectorAll('.hotel-stat')].find(card => /Ước tính 3 phòng/i.test(card.textContent || ''));
    if (groupStat) {
      const label = groupStat.querySelector('span');
      const hint = groupStat.querySelector('small');
      if (label) label.textContent = 'Tổng 3 phòng';
      if (hint) hint.textContent = '6 người lớn';
    }
  }

  function applyDynamicCopy() {
    const properties = Array.isArray(data?.properties) ? data.properties : [];
    const search = data?.search || {};
    const meta = $('discoveryMeta');
    if (meta && data && data.status !== 'pending_refresh') {
      const visible = Number(search.displayed_property_count ?? properties.length ?? 0);
      const priced = Number(search.priced_property_count ?? 0);
      meta.textContent = `${formatCount(visible)} khách sạn · ${formatCount(priced)} có giá`;
    }

    const results = $('hotelResults');
    if (results) {
      replaceText(results, 'Google Hotels chưa trả giá', 'Chưa có giá');
      replaceText(results, 'đang chờ Google Hotels', 'Tạm chưa có giá');
      replaceText(results, 'Chưa có rating', 'Chưa có đánh giá');
      replaceText(results, ' review', ' đánh giá');
      replaceText(results, 'Ước tính 3 phòng cho 6 người', '3 phòng / 6 người');
    }

    const detail = document.getElementById('hotelDetailBackdrop');
    if (detail) {
      replaceText(detail, 'Google Hotels chưa trả ảnh cho khách sạn này trong snapshot hiện tại.', 'Hiện chưa có ảnh cho khách sạn này.');
      replaceText(detail, 'Thông tin chi tiết vẫn có thể xem bên dưới.', 'Bạn vẫn có thể xem thông tin khách sạn bên dưới.');
      replaceText(detail, 'Google Hotels chưa trả giá live', 'Tạm chưa có giá');
      replaceText(detail, ' review', ' đánh giá');
      replaceText(detail, 'Gallery và chi tiết lấy từ snapshot Google Hotels hiện tại; mở modal không phát sinh thêm SerpApi request.', 'Thông tin và hình ảnh được cập nhật từ nguồn dữ liệu khách sạn hiện có.');
      replaceText(detail, 'Nguồn giá đang có', 'Giá từ các nguồn');
    }
  }

  function professionalStatusCopy() {
    const box = $('hotelDataStatus');
    if (!box) return;
    const raw = box.textContent || '';
    if (/Chưa có snapshot live|flow mới|workflow Hotel|fallback giả|chưa chạy live refresh/i.test(raw)) {
      box.innerHTML = '<strong>Dữ liệu khách sạn đang được cập nhật.</strong> Vui lòng quay lại sau ít phút.';
    } else if (/Snapshot cũ|discovery/i.test(raw)) {
      box.innerHTML = '<strong>Dữ liệu đang được làm mới.</strong> Một số giá hoặc thông tin có thể chưa cập nhật.';
    }
  }

  function applyAll() {
    applyStaticCopy();
    applyDynamicCopy();
    professionalStatusCopy();
  }

  async function loadData() {
    try {
      const response = await fetch(`${DATA_URL}?copy=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) data = await response.json();
    } catch {}
    applyAll();
  }

  const observer = new MutationObserver(() => applyAll());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  applyAll();
  loadData();
})();
