const DATA_URL = './data/hotels.json';
const HISTORY_URL = './data/hotel-history.json';
const TARGET_KEY = 'travel-hotel-target-price-v1';
const HOTEL_KEY = 'travel-hotel-history-selected-v1';
const FAVORITES_KEY = 'travel-hotel-favorites-v1';
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
document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')));
syncThemeUI();

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}

const state = {
  data: null,
  history: [],
  query: '',
  sort: 'recommended',
  maxDistance: null,
  area: '',
  minPrice: null,
  maxPrice: null,
  minRating: null,
  minReviews: null,
  minStars: null,
  amenity: '',
  pricedOnly: false,
  favoritesOnly: false,
  favorites: loadFavorites(),
  selectedHotelId: localStorage.getItem(HOTEL_KEY) || ''
};

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function hotelPrice(item) { return finiteNumber(item?.rate_per_night?.amount); }
function hotelDistance(item) { return finiteNumber(item?.distance_from_anchor_km); }
function normalize(value = '') { return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function parseMoney(value) { const digits = String(value || '').replace(/[^0-9]/g, ''); return digits ? Number(digits) : null; }
function formatVnd(value) { const n = finiteNumber(value); return n === null ? '—' : new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n).replace('₫','đ'); }
function formatNumber(value) { const n = finiteNumber(value); return n === null ? '—' : new Intl.NumberFormat('vi-VN').format(n); }
function formatDistance(value) { const n = finiteNumber(value); return n === null ? 'Chưa rõ khoảng cách' : `${n.toLocaleString('vi-VN',{maximumFractionDigits:2})} km`; }
function formatDateTime(value) { if(!value)return'Chưa cập nhật';const d=new Date(value);if(Number.isNaN(d.getTime()))return value;return new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(d); }
function relativeTime(value) { if(!value)return'Chưa có';const then=new Date(value).getTime();if(!Number.isFinite(then))return'Chưa có';const m=Math.max(0,Math.round((Date.now()-then)/60000));if(m<60)return`${m} phút trước`;const h=Math.round(m/60);if(h<48)return`${h} giờ trước`;return`${Math.round(h/24)} ngày trước`; }
function escapeHtml(value='') { return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function propertyById(id) { return state.data?.properties?.find(item=>item.id===id)||null; }
function isFavorite(item) { return state.favorites.has(item.id); }
function persistFavorites() { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites])); }

function priceDeltaText(delta) {
  const n=finiteNumber(delta);
  if(n===null)return{text:'Chưa có lịch sử giá',cls:'neutral'};
  if(n===0)return{text:'Không đổi',cls:'neutral'};
  if(n<0)return{text:`Giảm ${formatVnd(Math.abs(n))}`,cls:'down'};
  return{text:`Tăng ${formatVnd(n)}`,cls:'up'};
}

function compareNullableNumber(a,b,{desc=false,nullLast=true}={}) {
  const left=finiteNumber(a),right=finiteNumber(b);
  if(left===null&&right===null)return 0;
  if(left===null)return nullLast?1:-1;
  if(right===null)return nullLast?-1:1;
  return desc?right-left:left-right;
}

function filteredProperties() {
  const q=normalize(state.query);
  const list=[...(state.data?.properties||[])].filter(item=>{
    const price=hotelPrice(item),distance=hotelDistance(item),rating=finiteNumber(item.overall_rating),reviews=finiteNumber(item.reviews),stars=finiteNumber(item.stars);
    if(state.favoritesOnly&&!isFavorite(item))return false;
    if(state.pricedOnly&&price===null)return false;
    if(state.maxDistance!==null&&(distance===null||distance>state.maxDistance))return false;
    if(state.area&&item.area!==state.area)return false;
    if(state.minPrice!==null&&(price===null||price<state.minPrice))return false;
    if(state.maxPrice!==null&&(price===null||price>state.maxPrice))return false;
    if(state.minRating!==null&&(rating===null||rating<state.minRating))return false;
    if(state.minReviews!==null&&(reviews===null||reviews<state.minReviews))return false;
    if(state.minStars!==null&&(stars===null||stars<state.minStars))return false;
    if(state.amenity&&!((item.amenities||[]).some(a=>normalize(a).includes(normalize(state.amenity)))))return false;
    if(q){
      const haystack=normalize([item.name,item.address,item.area,item.description,item.hotel_class,...(item.amenities||[])].filter(Boolean).join(' '));
      if(!haystack.includes(q))return false;
    }
    return true;
  });

  list.sort((a,b)=>{
    if(state.sort==='distance')return compareNullableNumber(a.distance_from_anchor_km,b.distance_from_anchor_km)||compareNullableNumber(a.rate_per_night?.amount,b.rate_per_night?.amount);
    if(state.sort==='price')return compareNullableNumber(a.rate_per_night?.amount,b.rate_per_night?.amount)||compareNullableNumber(a.distance_from_anchor_km,b.distance_from_anchor_km);
    if(state.sort==='rating')return compareNullableNumber(a.overall_rating,b.overall_rating,{desc:true})||compareNullableNumber(a.reviews,b.reviews,{desc:true});
    if(state.sort==='reviews')return compareNullableNumber(a.reviews,b.reviews,{desc:true})||compareNullableNumber(a.overall_rating,b.overall_rating,{desc:true});
    if(state.sort==='stars')return compareNullableNumber(a.stars,b.stars,{desc:true})||compareNullableNumber(a.overall_rating,b.overall_rating,{desc:true});
    if(isFavorite(a)!==isFavorite(b))return isFavorite(a)?-1:1;
    const pricedA=hotelPrice(a)!==null,pricedB=hotelPrice(b)!==null;
    if(pricedA!==pricedB)return pricedA?-1:1;
    return compareNullableNumber(a.distance_from_anchor_km,b.distance_from_anchor_km)||compareNullableNumber(a.overall_rating,b.overall_rating,{desc:true})||compareNullableNumber(a.rate_per_night?.amount,b.rate_per_night?.amount)||a.name.localeCompare(b.name);
  });
  return list;
}

function hotelCard(item) {
  const amount=hotelPrice(item),hasPrice=amount!==null,favorite=isFavorite(item);
  const delta=hasPrice?priceDeltaText(item.price_delta):{text:'Google Hotels chưa trả giá',cls:'neutral'};
  const sources=(item.price_sources||[]).slice(0,3).map(source=>`<span class="source-chip">${escapeHtml(source.source)} · ${formatVnd(source.rate_per_night?.amount)}</span>`).join('');
  const amenities=(item.amenities||[]).slice(0,4).map(value=>`<span class="amenity-chip">${escapeHtml(value)}</span>`).join('');
  const rating=item.overall_rating?`<span class="hotel-rating">★ ${item.overall_rating}${item.reviews?` · ${formatNumber(item.reviews)} review`:''}</span>`:'<span class="hotel-rating muted">Chưa có rating</span>';
  const distance=`<span class="hotel-distance">${formatDistance(item.distance_from_anchor_km)}</span>`;
  const area=item.area?`<span>${escapeHtml(item.area)}</span>`:'';
  const stars=item.stars?`<span>${item.stars} sao</span>`:'';
  const website=item.website_url?`<a class="btn sm secondary" href="${escapeHtml(item.website_url)}" target="_blank" rel="noopener">Website</a>`:'';
  const image=item.image_url?`<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="hotel-image-fallback">🏨</div>';
  const priceHtml=hasPrice?`<strong>${formatVnd(amount)}</strong><span>/ phòng / đêm</span>`:'<strong>Chưa có giá</strong><span>đang chờ Google Hotels</span>';
  const group=hasPrice?`<div class="hotel-group-estimate"><span>Ước tính 3 phòng cho 6 người</span><strong>${formatVnd(item.estimated_three_rooms_amount)}</strong></div>`:'<div class="hotel-group-estimate"><span>Ước tính 3 phòng</span><strong>—</strong></div>';
  const historyButton=hasPrice?`<button class="btn sm primary" data-history="${escapeHtml(item.id)}">Lịch sử giá</button>`:'<button class="btn sm secondary" type="button" disabled>Chưa có lịch sử</button>';
  return `<article class="card hotel-card ${favorite?'shortlisted':''}"><div class="hotel-image">${image}${favorite?'<span class="shortlist-badge">Đang quan tâm</span>':''}</div><div class="hotel-card-body"><div class="hotel-title-row"><div><h3>${escapeHtml(item.name)}</h3><div class="hotel-meta">${rating}${distance}${area}${stars}</div></div><div class="hotel-price">${priceHtml}<small class="price-delta ${delta.cls}">${delta.text}</small></div></div>${item.address?`<p class="hotel-address">${escapeHtml(item.address)}</p>`:''}${item.description?`<p class="hotel-description">${escapeHtml(item.description)}</p>`:''}${group}${amenities?`<div class="hotel-amenities">${amenities}</div>`:''}<div class="hotel-sources">${sources||'<span class="source-chip">Google Hotels</span>'}</div><div class="hotel-card-actions"><button class="btn sm secondary favorite-btn ${favorite?'active':''}" data-favorite="${escapeHtml(item.id)}">${favorite?'★ Đã quan tâm':'☆ Quan tâm'}</button>${historyButton}${website}</div></div></article>`;
}

function renderResults() {
  const list=filteredProperties();
  $('hotelResults').innerHTML=list.length?list.map(hotelCard).join(''):'<div class="card empty-state">Không có khách sạn phù hợp với bộ lọc hiện tại.<br>Thử xóa bớt điều kiện giá, khoảng cách hoặc rating.</div>';
  const priced=list.filter(item=>hotelPrice(item)!==null).length;
  $('resultCount').textContent=`${list.length} khách sạn · ${priced} có giá`;
  document.querySelectorAll('[data-favorite]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.favorite;
    if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);
    persistFavorites();renderSummary();renderResults();
  }));
  document.querySelectorAll('[data-history]').forEach(button=>button.addEventListener('click',()=>{
    state.selectedHotelId=button.dataset.history;localStorage.setItem(HOTEL_KEY,state.selectedHotelId);renderHistoryControls();renderHistory();$('historySection').scrollIntoView({behavior:'smooth',block:'start'});
  }));
}

function renderSummary() {
  const visible=filteredProperties(),priced=visible.filter(item=>hotelPrice(item)!==null);
  const cheapest=[...priced].sort((a,b)=>hotelPrice(a)-hotelPrice(b))[0]||null;
  $('cheapestPrice').textContent=cheapest?formatVnd(hotelPrice(cheapest)):'—';
  $('cheapestName').textContent=cheapest?cheapest.name:(visible.length?'Không có giá trong bộ lọc':'Không có kết quả');
  $('groupEstimate').textContent=cheapest?formatVnd(cheapest.estimated_three_rooms_amount):'—';
  $('trackedCount').textContent=String(state.favorites.size);
  $('trackedMeta').textContent=`khách sạn quan tâm · ${priced.length} kết quả có giá`;
  $('updatedAgo').textContent=relativeTime(state.data?.generated_at);
  $('updatedAt').textContent=formatDateTime(state.data?.generated_at);
  const target=finiteNumber(localStorage.getItem(TARGET_KEY)),alert=$('targetAlert');
  if(cheapest&&target!==null&&target>0){const current=hotelPrice(cheapest);if(current<=target){alert.className='alert success';alert.textContent=`Đã đạt mục tiêu: ${formatVnd(current)} ≤ ${formatVnd(target)}.`}else{alert.className='alert';alert.textContent=`Giá rẻ nhất đang cao hơn mục tiêu ${formatVnd(current-target)}.`}}else{alert.className='alert';alert.textContent='Đặt mục tiêu giá để so nhanh với kết quả đang lọc.'}
}

function populateFilters() {
  const properties=state.data?.properties||[];
  const areas=[...new Set(properties.map(item=>item.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  $('areaFilter').innerHTML='<option value="">Tất cả khu vực</option>'+areas.map(area=>`<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`).join('');
  const counts=new Map();
  properties.forEach(item=>(item.amenities||[]).forEach(a=>counts.set(a,(counts.get(a)||0)+1)));
  const amenities=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,30).map(([name])=>name);
  $('amenityFilter').innerHTML='<option value="">Tất cả tiện nghi</option>'+amenities.map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  const s=state.data?.search||{};
  $('discoveryMeta').textContent=`${s.pages_fetched||1}/${s.max_pages||1} trang API · ${s.raw_property_count??properties.length} kết quả thô · ${properties.length} khách sạn duy nhất`;
}

function historyRowsFor(item) { if(!item)return[];return state.history.filter(row=>row.trip_key===state.data?.search?.trip_key).filter(row=>row.property_id===item.id||row.name===item.name).filter(row=>finiteNumber(row.rate_per_night_amount)!==null).slice(-90); }
function renderHistoryControls() {
  const properties=(state.data?.properties||[]).filter(item=>hotelPrice(item)!==null);
  if(!properties.length){state.selectedHotelId='';$('historyHotel').innerHTML='<option value="">Chưa có khách sạn có giá</option>';$('historyHotel').disabled=true;return}
  $('historyHotel').disabled=false;
  if(!state.selectedHotelId||!properties.some(item=>item.id===state.selectedHotelId))state.selectedHotelId=state.data?.cheapest_property_id||properties[0]?.id||'';
  $('historyHotel').innerHTML=properties.map(item=>`<option value="${escapeHtml(item.id)}"${item.id===state.selectedHotelId?' selected':''}>${escapeHtml(item.name)}</option>`).join('');
}
function renderHistory() {
  const item=propertyById(state.selectedHotelId),rows=historyRowsFor(item),svg=$('hotelPriceChart');
  if(!item||!rows.length){svg.innerHTML='';$('historyMeta').textContent=item?'Chưa có dữ liệu lịch sử cho khách sạn này.':'Chưa có khách sạn nào có giá để ghi lịch sử.';$('observedRange').textContent='—';return}
  const values=rows.map(r=>Number(r.rate_per_night_amount)),min=Math.min(...values),max=Math.max(...values),width=760,height=150,padX=18,padY=18,span=Math.max(1,max-min);
  const points=rows.map((row,index)=>{const x=rows.length===1?width/2:padX+index*((width-padX*2)/(rows.length-1));const y=height-padY-((Number(row.rate_per_night_amount)-min)/span)*(height-padY*2);return{x,y,row}});
  const polyline=points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),circles=points.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"><title>${formatDateTime(p.row.checked_at)} · ${formatVnd(p.row.rate_per_night_amount)}</title></circle>`).join('');
  svg.innerHTML=`<polyline points="${polyline}" fill="none" vector-effect="non-scaling-stroke"></polyline>${circles}`;$('historyMeta').textContent=`${rows.length} lần ghi nhận · mới nhất ${formatVnd(values.at(-1))}`;$('observedRange').textContent=min===max?formatVnd(min):`${formatVnd(min)} – ${formatVnd(max)}`;
}

function applyFiltersFromUi() {
  state.query=$('hotelSearch').value;state.sort=$('sortHotels').value;state.maxDistance=finiteNumber($('maxDistance').value);state.area=$('areaFilter').value;state.minPrice=parseMoney($('minPrice').value);state.maxPrice=parseMoney($('maxPrice').value);state.minRating=finiteNumber($('minRating').value);state.minReviews=finiteNumber($('minReviews').value);state.minStars=finiteNumber($('minStars').value);state.amenity=$('amenityFilter').value;state.pricedOnly=$('pricedOnly').checked;state.favoritesOnly=$('shortlistOnly').checked;renderSummary();renderResults();
}

function bindFilters() {
  ['hotelSearch','minPrice','maxPrice'].forEach(id=>$(id).addEventListener('input',applyFiltersFromUi));
  ['sortHotels','maxDistance','areaFilter','minRating','minReviews','minStars','amenityFilter','pricedOnly','shortlistOnly'].forEach(id=>$(id).addEventListener('change',applyFiltersFromUi));
  $('clearHotelFilters').addEventListener('click',()=>{
    ['hotelSearch','minPrice','maxPrice'].forEach(id=>$(id).value='');
    ['maxDistance','areaFilter','minRating','minReviews','minStars','amenityFilter'].forEach(id=>$(id).value='');
    $('sortHotels').value='recommended';$('pricedOnly').checked=false;$('shortlistOnly').checked=false;applyFiltersFromUi();
  });
  ['minPrice','maxPrice'].forEach(id=>$(id).addEventListener('blur',()=>{const n=parseMoney($(id).value);$(id).value=n===null?'':formatNumber(n)}));
}

async function load() {
  try {
    const[dataResponse,historyResponse]=await Promise.all([fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-store'}),fetch(`${HISTORY_URL}?v=${Date.now()}`,{cache:'no-store'})]);
    if(!dataResponse.ok)throw new Error(`hotels.json HTTP ${dataResponse.status}`);
    state.data=await dataResponse.json();state.history=historyResponse.ok?await historyResponse.json():[];
    $('stayDates').textContent=`${state.data.search?.check_in_date||'2026-10-19'} → ${state.data.search?.check_out_date||'2026-10-20'}`;
    $('occupancyNote').textContent=`${state.data.search?.adults_per_room||2} người lớn / phòng · ${state.data.search?.group_rooms_estimate||3} phòng ước tính`;
    $('sourceLabel').textContent=state.data.source||'Google Hotels';
    populateFilters();renderSummary();renderResults();renderHistoryControls();renderHistory();
  } catch(error) {
    console.error(error);$('hotelResults').innerHTML=`<div class="card empty-state">Không tải được dữ liệu khách sạn.<br><small>${escapeHtml(error.message)}</small></div>`;$('updatedAgo').textContent='Lỗi dữ liệu';
  }
}

bindFilters();
$('historyHotel').addEventListener('change',event=>{state.selectedHotelId=event.target.value;localStorage.setItem(HOTEL_KEY,state.selectedHotelId);renderHistory()});
$('saveTarget').addEventListener('click',()=>{const value=parseMoney($('targetPrice').value);if(value===null||value<=0){$('targetAlert').className='alert danger';$('targetAlert').textContent='Nhập mục tiêu giá hợp lệ.';return}localStorage.setItem(TARGET_KEY,String(value));$('targetPrice').value=formatNumber(value);renderSummary()});
const savedTarget=finiteNumber(localStorage.getItem(TARGET_KEY));if(savedTarget!==null&&savedTarget>0)$('targetPrice').value=formatNumber(savedTarget);
load();
