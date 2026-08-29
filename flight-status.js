(()=>{
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  const syncThemeUI=()=>{
    const dark=document.documentElement.dataset.theme==='dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(button=>{
      const use=button.querySelector('use');
      if(use) use.setAttribute('href',dark?'#i-sun':'#i-moon');
      const label=dark?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối';
      button.setAttribute('aria-label',label);
      button.setAttribute('title',label);
    });
  };
  const setTheme=value=>{
    document.documentElement.dataset.theme=value;
    localStorage.setItem('travel-theme',value);
    syncThemeUI();
  };
  document.documentElement.dataset.theme=localStorage.getItem('travel-theme')==='dark'?'dark':'light';
  document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')));
  syncThemeUI();

  function formatIso(value,timeZone,options={}){
    if(!value) return '—';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('vi-VN',{
      timeZone,
      day:'2-digit',month:'2-digit',
      hour:'2-digit',minute:'2-digit',hour12:false,
      ...options
    }).format(date).replace(',', ' ·');
  }

  function formatDate(value){
    if(!value) return '—';
    const date=new Date(`${value}T12:00:00Z`);
    return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(date);
  }

  function formatChecked(value){
    if(!value) return 'Chưa kiểm tra live';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Ho_Chi_Minh'}).format(date);
  }

  function countdown(iso){
    const target=new Date(iso);
    const diff=target-Date.now();
    if(diff<=0) return 'Đã đến ngày bay';
    const days=Math.ceil(diff/86400000);
    return days===1?'Còn 1 ngày':`Còn ${days} ngày`;
  }

  function chosenTime(part){
    const value=part.actual||part.estimated||part.scheduled;
    const label=part.actual?'Thực tế':part.estimated?'Dự kiến':'Theo lịch';
    return {value,label};
  }

  function delayText(minutes){
    const n=Number(minutes||0);
    if(n>0) return `Trễ ${n} phút`;
    if(n<0) return `Sớm ${Math.abs(n)} phút`;
    return 'Chưa ghi nhận trễ';
  }

  function liveNote(flight){
    if(flight.status?.live){
      const update=flight.latest_update?` · ${esc(flight.latest_update)}`:'';
      return `<div class="status-note live">Đã có dữ liệu vận hành live${update}. Vẫn nên kiểm tra lại với hãng trước khi ra sân bay.</div>`;
    }
    const next=flight.next_live_check_at?formatIso(flight.next_live_check_at,'Asia/Ho_Chi_Minh',{year:'numeric'}):'gần ngày bay';
    return `<div class="status-note">Chưa có trạng thái vận hành live cho đúng ngày bay. Hệ thống đang dùng lịch đã xác nhận làm mốc; tự động bắt đầu kiểm tra live từ ${esc(next)}.</div>`;
  }

  function sourceLinks(flight){
    const links=[];
    if(flight.external_links?.google) links.push(`<a class="btn sm" href="${esc(flight.external_links.google)}" target="_blank" rel="noopener">Google status</a>`);
    if(flight.external_links?.airline) links.push(`<a class="btn sm" href="${esc(flight.external_links.airline)}" target="_blank" rel="noopener">Website hãng</a>`);
    for(const source of flight.provider_sources||[]){
      if(source.link) links.push(`<a class="btn sm" href="${esc(source.link)}" target="_blank" rel="noopener">${esc(source.name||'Nguồn live')}</a>`);
    }
    return links.join('');
  }

  function card(flight){
    const dep=chosenTime(flight.departure||{}),arr=chosenTime(flight.arrival||{});
    const depDisplay=formatIso(dep.value,flight.departure?.time_zone);
    const arrDisplay=formatIso(arr.value,flight.arrival?.time_zone);
    const depScheduled=formatIso(flight.departure?.scheduled,flight.departure?.time_zone);
    const arrScheduled=formatIso(flight.arrival?.scheduled,flight.arrival?.time_zone);
    const statusCode=flight.status?.code||'scheduled';
    return `<article class="card status-card">
      <div class="status-card-head">
        <div class="status-airline">
          <span class="status-airline-logo">${flight.airline_logo?`<img src="${esc(flight.airline_logo)}" alt="${esc(flight.airline)}">`:'✈'}</span>
          <div><strong>${esc(flight.display_flight_number||flight.flight_number)}</strong><span>${esc(flight.airline)} · ${esc(formatDate(flight.date))}</span></div>
        </div>
        <span class="status-badge ${esc(statusCode)}">${esc(flight.status?.label||'Theo lịch')}</span>
      </div>
      <div class="status-route">
        <div class="status-airport"><strong>${esc(flight.route?.origin)}</strong><span>${esc(flight.route?.origin_name)}</span></div>
        <div class="status-path"><small>${esc(countdown(flight.departure?.scheduled))}</small><div class="status-path-line"></div><small>${esc(flight.aircraft||'Máy bay chưa xác định')}</small></div>
        <div class="status-airport right"><strong>${esc(flight.route?.destination)}</strong><span>${esc(flight.route?.destination_name)}</span></div>
      </div>
      <div class="status-times">
        <div class="status-time"><span>KHỞI HÀNH · ${esc(dep.label)}</span><strong>${esc(depDisplay)}</strong><small>${dep.label==='Theo lịch'?'Giờ địa phương':`Theo lịch ${esc(depScheduled)}`}</small></div>
        <div class="status-time"><span>ĐẾN · ${esc(arr.label)}</span><strong>${esc(arrDisplay)}</strong><small>${arr.label==='Theo lịch'?'Giờ địa phương':`Theo lịch ${esc(arrScheduled)}`}</small></div>
      </div>
      <div class="status-live-grid">
        <div class="status-detail"><span>Terminal đi</span><strong>${esc(flight.departure?.terminal||'—')}</strong></div>
        <div class="status-detail"><span>Gate đi</span><strong>${esc(flight.departure?.gate||'—')}</strong></div>
        <div class="status-detail"><span>Terminal đến</span><strong>${esc(flight.arrival?.terminal||'—')}</strong></div>
        <div class="status-detail"><span>Độ trễ</span><strong>${esc(delayText(Math.max(Number(flight.departure?.delay_minutes||0),Number(flight.arrival?.delay_minutes||0))))}</strong></div>
      </div>
      ${liveNote(flight)}
      <div class="status-card-foot">${sourceLinks(flight)}<span class="status-source">Lịch gốc: ${esc(flight.schedule_source||'TravelLog')}<br>Live check: ${esc(formatChecked(flight.checked_at))}</span></div>
    </article>`;
  }

  async function load(){
    try{
      const response=await fetch(`./data/flight-status.json?t=${Date.now()}`,{cache:'no-store'});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const flights=Array.isArray(data.flights)?data.flights:[];
      $('#statusGrid').innerHTML=flights.length?flights.map(card).join(''):'<div class="card status-error">Chưa cấu hình chuyến bay cần theo dõi.</div>';
      $('#trackedCount').textContent=String(flights.length);
      $('#liveCount').textContent=String(flights.filter(f=>f.status?.live).length);
      $('#updatedAt').textContent=formatChecked(data.generated_at);
      $('#dataMode').textContent=data.live_mode?'Có dữ liệu live':'Đang dùng lịch gốc';
      $('#statusMessage').textContent=data.message||'Trạng thái sẽ được cập nhật gần ngày bay.';
    }catch(error){
      $('#statusGrid').innerHTML='<div class="card status-error">Không thể tải dữ liệu trạng thái chuyến bay. Hãy thử tải lại trang.</div>';
      $('#dataMode').textContent='Dữ liệu không khả dụng';
      console.error(error);
    }
  }

  load();
})();
