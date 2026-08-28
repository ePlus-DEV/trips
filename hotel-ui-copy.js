(() => {
  const DATA_URL = './data/hotels.json';
  const $ = id => document.getElementById(id);
  let data = null;

  function setText(node, value) {
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
    setText(document.querySelector('.hotel-heading .hotel-kicker'), 'Khách sạn');
    setText(document.querySelector('.hotel-heading h1'), 'Khách sạn tại Shanghai');
    setText(document.querySelector('.hotel-heading p'), 'So sánh giá, vị trí và đánh giá cho đêm 19–20/10/2026. Khoảng cách được tính từ 531 Jinling East Road để bạn dễ chọn nơi lưu trú phù hợp.');
    setText(document.querySelector('.hotel-results-head .hotel-kicker'), 'Danh sách');
    setText(document.querySelector('.hotel-results-head h2'), 'Khách sạn phù hợp');

    const note = document.querySelector('.hotel-note:not(#hotelDataStatus)');
    setText(note, 'Giá hiển thị dành cho 2 người lớn/phòng và có thể thay đổi theo hạng phòng, thuế, phí hoặc tình trạng phòng tại thời điểm đặt.');

    setText(document.querySelector('.hotel-history .hotel-kicker'), 'Theo dõi giá');
    setText(document.querySelector('.hotel-history h2'), 'Lịch sử giá');

    const historyMeta = $('historyMeta');
    if (historyMeta && /workflow|lần ghi nhận|Mỗi điểm/i.test(historyMeta.textContent || '')) {
      setText(historyMeta, 'Theo dõi biến động giá của khách sạn đã chọn.');
    }

    const targetCard = document.querySelector('.hotel-target-card > p');
    setText(targetCard, 'Đặt mức giá mong muốn để dễ theo dõi.');

    const groupStat = [...document.querySelectorAll('.hotel-stat')].find(card => /Ước tính 3 phòng|Tổng 3 phòng/i.test(card.textContent || ''));
    if (groupStat) {
      setText(groupStat.querySelector('span'), 'Tổng 3 phòng');
      setText(groupStat.querySelector('small'), '6 người lớn');
    }
  }

  function applyResultCopy() {
    const results = $('hotelResults');
    if (!results) return;
    replaceText(results, 'Google Hotels chưa trả giá', 'Chưa có giá');
    replaceText(results, 'đang chờ Google Hotels', 'Tạm chưa có giá');
    replaceText(results, 'Chưa có rating', 'Chưa có đánh giá');
    replaceText(results, ' review', ' đánh giá');
    replaceText(results, 'Ước tính 3 phòng cho 6 người', '3 phòng / 6 người');
  }

  function applyDetailCopy() {
    const detail = document.getElementById('hotelDetailBackdrop');
    if (!detail) return;
    replaceText(detail, 'Google Hotels chưa trả ảnh cho khách sạn này trong snapshot hiện tại.', 'Hiện chưa có ảnh cho khách sạn này.');
    replaceText(detail, 'Thông tin chi tiết vẫn có thể xem bên dưới.', 'Bạn vẫn có thể xem thông tin khách sạn bên dưới.');
    replaceText(detail, 'Google Hotels chưa trả giá live', 'Tạm chưa có giá');
    replaceText(detail, ' review', ' đánh giá');
    replaceText(detail, 'Gallery và chi tiết lấy từ snapshot Google Hotels hiện tại; mở modal không phát sinh thêm SerpApi request.', 'Thông tin và hình ảnh được cập nhật từ nguồn dữ liệu khách sạn hiện có.');
    replaceText(detail, 'Nguồn giá đang có', 'Giá từ các nguồn');
  }

  function applyDataCopy() {
    if (!data || data.status === 'pending_refresh') return;
    const properties = Array.isArray(data.properties) ? data.properties : [];
    const search = data.search || {};
    const visible = Number(search.displayed_property_count ?? properties.length ?? 0);
    const priced = Number(search.priced_property_count ?? 0);
    const value = `${formatCount(visible)} khách sạn · ${formatCount(priced)} có giá`;
    setText($('discoveryMeta'), value);
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

  async function loadData() {
    try {
      const response = await fetch(`${DATA_URL}?copy=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) data = await response.json();
    } catch {}
    applyDataCopy();
    professionalStatusCopy();
  }

  applyStaticCopy();
  applyResultCopy();
  applyDetailCopy();
  loadData();

  const results = $('hotelResults');
  if (results) {
    const resultsObserver = new MutationObserver(() => {
      resultsObserver.disconnect();
      applyResultCopy();
      resultsObserver.observe(results, { childList: true });
    });
    resultsObserver.observe(results, { childList: true });
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-hotel-detail]')) {
      setTimeout(applyDetailCopy, 0);
    }
  });

  setTimeout(() => {
    applyStaticCopy();
    applyResultCopy();
    applyDetailCopy();
    applyDataCopy();
    professionalStatusCopy();
  }, 300);
})();
