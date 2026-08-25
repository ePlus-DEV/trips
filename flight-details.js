(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const time=v=>v?String(v).slice(11,16):'—';
  const dateLabel=v=>{if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(0,10);return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)};
  const isoDuration=v=>{const m=String(v||'').match(/PT(?:(\d+)H)?(?:(\d+)M)?/);if(!m)return v||'—';const h=Number(m[1]||0),min=Number(m[2]||0);return `${h?`${h} giờ`:''}${h&&min?' ':''}${min?`${min} phút`:''}`||'—'};
  const minutesLabel=n=>{n=Math.max(0,Math.round(Number(n)||0));return `${Math.floor(n/60)?`${Math.floor(n/60)} giờ`:''}${Math.floor(n/60)&&n%60?' ':''}${n%60?`${n%60} phút`:''}`||'0 phút'};
  const cabin=v=>String(v||'').toLowerCase()==='economy'?'Hạng phổ thông':(v||'Không có dữ liệu');
  const flightNos=o=>(o?.slices||[]).flatMap(s=>(s.segments||[]).map(x=>x.flight_number).filter(Boolean)).join(' · ');
  const firstSeg=o=>o?.slices?.[0]?.segments?.[0]||{};
  const lastSeg=o=>{const a=o?.slices?.[0]?.segments||[];return a[a.length-1]||{}};
  const isDirect=o=>o?.is_direct===true||Number(o?.stops)===0||(o?.slices||[]).every(s=>(s.segments||[]).length===1);
  const stopLabel=o=>isDirect(o)?'Bay thẳng':`${Number(o?.stops)||1} điểm dừng`;
  let DATA=null,scheduled=false;

  function offerForCard(card,routeId){
    const route=DATA?.routes?.find(r=>r.id===routeId);if(!route)return null;
    const no=card.querySelector('.offer-airline-copy span')?.textContent?.trim()||'';
    const times=card.querySelectorAll('.offer-time strong');
    const dep=times[0]?.textContent?.trim()||'',arr=times[times.length-1]?.textContent?.trim()||'';
    const airports=card.querySelectorAll('.offer-time span');
    const origin=airports[0]?.textContent?.trim()||'',dest=airports[airports.length-1]?.textContent?.trim()||'';
    return (route.offers||[]).find(o=>flightNos(o)===no&&time(firstSeg(o).departing_at)===dep&&time(lastSeg(o).arriving_at)===arr&&(o.slices?.[0]?.origin||firstSeg(o).origin)===origin&&(o.slices?.[0]?.destination||lastSeg(o).destination)===dest)
      ||(route.offers||[]).find(o=>flightNos(o)===no&&time(firstSeg(o).departing_at)===dep)
      ||(route.offers||[]).find(o=>flightNos(o)===no);
  }

  function segmentHtml(seg){
    const marketing=seg?.marketing_carrier?.name||'';
    const operating=seg?.operating_carrier?.name||'';
    const carrier=operating&&operating!==marketing?`${marketing||'Hãng bay'} · khai thác bởi ${operating}`:(marketing||operating||'Hãng bay');
    const meta=[isoDuration(seg.duration),seg.airplane,cabin(seg.travel_class)].filter(Boolean);
    return `<div class="segment-card"><div class="segment-head"><strong>${esc(seg.flight_number||'Chuyến bay')}</strong><span>${esc(carrier)}</span></div><div class="segment-route"><div class="segment-airport"><strong>${time(seg.departing_at)}</strong><b>${esc(seg.origin||'—')}</b><span>${dateLabel(seg.departing_at)}</span></div><div class="segment-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div><div class="segment-airport right"><strong>${time(seg.arriving_at)}</strong><b>${esc(seg.destination||'—')}</b><span>${dateLabel(seg.arriving_at)}</span></div></div><div class="segment-meta">${meta.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>`;
  }

  function layoverHtml(seg,next){
    if(!seg||!next)return'';
    const a=new Date(seg.arriving_at),b=new Date(next.departing_at),mins=(b-a)/60000;
    return `<div class="layover"><span>Đổi chuyến tại ${esc(seg.destination||next.origin||'sân bay nối chuyến')}</span>${Number.isFinite(mins)&&mins>=0?`<span>· Chờ ${minutesLabel(mins)}</span>`:''}</div>`;
  }

  function detailsHtml(o,id){
    const segments=o?.slices?.[0]?.segments||[],url=o.google_flights_url||'https://www.google.com/travel/flights';
    const total=o.total_duration_minutes?minutesLabel(o.total_duration_minutes):isoDuration(o?.slices?.[0]?.duration);
    const travelClass=cabin(segments[0]?.travel_class);
    const source=o.source||DATA?.source||'Google Flights';
    let timeline='';segments.forEach((seg,i)=>{timeline+=segmentHtml(seg);if(i<segments.length-1)timeline+=layoverHtml(seg,segments[i+1])});
    return `<div class="offer-details" id="${id}" hidden><div class="details-summary"><div class="details-summary-item"><span>Tổng thời gian</span><strong>${esc(total)}</strong></div><div class="details-summary-item"><span>Hành trình</span><strong>${esc(stopLabel(o))}</strong></div><div class="details-summary-item"><span>Hạng ghế</span><strong>${esc(travelClass)}</strong></div><div class="details-summary-item"><span>Nguồn dữ liệu</span><strong>${esc(source)}</strong></div></div><div class="segment-list">${timeline}</div><div class="details-actions"><p>Thông tin hiển thị theo dữ liệu Google Flights đã lưu. Hành lý, điều kiện đổi/hoàn và giá cuối cùng cần kiểm tra lại trước khi đặt.</p><a class="btn sm primary" href="${esc(url)}" target="_blank" rel="noopener">Mở Google Flights</a></div></div>`;
  }

  function attach(card,routeId,index){
    if(card.dataset.detailsReady==='1')return;
    const offer=offerForCard(card,routeId);if(!offer)return;
    card.dataset.detailsReady='1';
    const id=`flight-detail-${routeId}-${index}-${Math.random().toString(36).slice(2,7)}`;
    const foot=card.querySelector('.offer-foot');if(!foot)return;
    const btn=document.createElement('button');btn.type='button';btn.className='offer-details-toggle';btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls',id);btn.innerHTML=`<span>Chi tiết chuyến bay</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;foot.appendChild(btn);
    foot.insertAdjacentHTML('afterend',detailsHtml(offer,id));
    btn.addEventListener('click',()=>{
      const panel=document.getElementById(id),open=btn.getAttribute('aria-expanded')==='true';
      $$('.offer-details-toggle[aria-expanded="true"]').forEach(other=>{if(other===btn)return;other.setAttribute('aria-expanded','false');const p=document.getElementById(other.getAttribute('aria-controls'));if(p)p.hidden=true;const s=other.querySelector('span');if(s)s.textContent='Chi tiết chuyến bay'});
      btn.setAttribute('aria-expanded',String(!open));panel.hidden=open;btn.querySelector('span').textContent=open?'Chi tiết chuyến bay':'Ẩn chi tiết';
      if(!open&&window.innerWidth<821)setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
    });
  }

  function decorate(){scheduled=false;if(!DATA)return;$$('#results .route-group').forEach(group=>{const text=group.querySelector('.route-group-head strong')?.textContent||'',routeId=text.includes('Chiều đi')?'outbound':'return';$$('.flight-offer',group).forEach((card,i)=>attach(card,routeId,i))})}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(decorate)}
  async function init(){try{DATA=await fetch(`./data/flights.json?details=${Date.now()}`,{cache:'no-store'}).then(r=>r.json());schedule();const root=$('#results');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true})}catch(e){console.warn('Flight details unavailable',e)}}
  init();
})();
