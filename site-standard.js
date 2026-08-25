(() => {
  'use strict';

  const LANGUAGE_KEY = 'travel-language';
  const MIGRATION_KEY = 'travel-language-vi-default-v1';
  const supported = new Set(['vi', 'en', 'zh', 'ja']);
  const needsVietnameseMigration = !localStorage.getItem(MIGRATION_KEY);

  if (needsVietnameseMigration) {
    localStorage.setItem(LANGUAGE_KEY, 'vi');
    localStorage.setItem(MIGRATION_KEY, '1');
  } else if (!localStorage.getItem(LANGUAGE_KEY)) {
    localStorage.setItem(LANGUAGE_KEY, 'vi');
  }

  const COPY = {
    vi: {
      title: 'Nhật ký du lịch · David',
      tripDate: '19–26/10/2026',
      flightSummary: 'Đi 19/10: TP.HCM → Thượng Hải · Về 26/10: Bắc Kinh → TP.HCM. Theo dõi giá Google Flights trước khi đặt vé.',
      returnText: 'Bay về TP.HCM ngày 26/10. Ưu tiên chuyến bay thẳng.',
      flightLabel: 'Giá vé',
      heroFlight: '✈ Theo dõi giá vé →',
      passportTitle: 'Trung Quốc · mùa thu 2026',
      dateLocale: 'vi-VN'
    },
    en: {
      title: "David's Travel Log",
      tripDate: '19–26 October 2026',
      flightSummary: 'Outbound 19 Oct: Ho Chi Minh City → Shanghai · Return 26 Oct: Beijing → Ho Chi Minh City. Track Google Flights prices before booking.',
      returnText: 'Return to Ho Chi Minh City on 26 Oct. Direct flights are preferred.',
      flightLabel: 'Flight prices',
      heroFlight: '✈ Watch flight prices →',
      passportTitle: 'China · autumn 2026',
      dateLocale: 'en-GB'
    },
    zh: {
      title: '旅行日志 · David',
      tripDate: '2026年10月19–26日',
      flightSummary: '去程 10月19日：胡志明市 → 上海 · 回程 10月26日：北京 → 胡志明市。预订前跟踪 Google Flights 价格。',
      returnText: '10月26日返回胡志明市，优先直飞航班。',
      flightLabel: '机票价格',
      heroFlight: '✈ 查看机票价格 →',
      passportTitle: '中国 · 2026年秋季',
      dateLocale: 'zh-CN'
    },
    ja: {
      title: '旅行ログ · David',
      tripDate: '2026年10月19–26日',
      flightSummary: '往路 10月19日：ホーチミン → 上海 · 復路 10月26日：北京 → ホーチミン。予約前に Google Flights の価格を確認します。',
      returnText: '10月26日にホーチミンへ帰国。直行便を優先します。',
      flightLabel: '航空券価格',
      heroFlight: '✈ 航空券価格を見る →',
      passportTitle: '中国 · 2026年秋',
      dateLocale: 'ja-JP'
    }
  };

  function currentLanguage() {
    const saved = localStorage.getItem(LANGUAGE_KEY) || 'vi';
    return supported.has(saved) ? saved : 'vi';
  }

  function applyTripCorrections() {
    const lang = currentLanguage();
    const copy = COPY[lang] || COPY.vi;
    document.title = copy.title;

    const tripDate = document.querySelector('.trip-date');
    if (tripDate) tripDate.textContent = copy.tripDate;

    const passportTitle = document.querySelector('.passport-title');
    if (passportTitle) passportTitle.textContent = copy.passportTitle;

    const today = document.getElementById('todayLabel');
    if (today) today.textContent = new Intl.DateTimeFormat(copy.dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

    const flightCard = [...document.querySelectorAll('#essentials .quick')].find(card => {
      const title = card.querySelector('h3')?.textContent?.trim() || '';
      return /Flights|Chuyến bay|航班|フライト/i.test(title);
    });
    if (flightCard) {
      const p = flightCard.querySelector('p');
      if (p) p.textContent = copy.flightSummary;
    }

    const lastDay = document.querySelector('#itinerary .day:last-child');
    if (lastDay) {
      const activities = lastDay.querySelectorAll('.activity');
      const last = activities[activities.length - 1];
      const text = last?.querySelector('span');
      if (text) text.textContent = copy.returnText;
    }

    const flightNav = document.querySelector('[data-flight-nav]');
    if (flightNav) flightNav.textContent = copy.flightLabel;
    const flightHero = document.querySelector('[data-flight-hero]');
    if (flightHero) flightHero.textContent = copy.heroFlight;
  }

  function finishMigration() {
    if (!needsVietnameseMigration) return;
    const picker = document.getElementById('languageSelect');
    if (picker && picker.value !== 'vi') {
      picker.value = 'vi';
      picker.dispatchEvent(new Event('change'));
    }
  }

  document.addEventListener('travel-language-change', () => queueMicrotask(applyTripCorrections));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => { finishMigration(); applyTripCorrections(); }, 0), { once: true });
  } else {
    setTimeout(() => { finishMigration(); applyTripCorrections(); }, 0);
  }
})();
