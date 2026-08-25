(()=>{
  const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const utf8=new TextEncoder();
  let DATA=null,scheduled=false;

  const concat=(...parts)=>{
    const total=parts.reduce((sum,p)=>sum+p.length,0),out=new Uint8Array(total);
    let offset=0;
    for(const p of parts){out.set(p,offset);offset+=p.length}
    return out;
  };
  const varint=value=>{
    let v=BigInt(value);
    if(v<0n)throw new Error('varint must be non-negative');
    const bytes=[];
    do{let b=Number(v&0x7fn);v>>=7n;if(v)b|=0x80;bytes.push(b)}while(v);
    return new Uint8Array(bytes);
  };
  const tag=(field,wire)=>varint((BigInt(field)<<3n)|BigInt(wire));
  const varintField=(field,value)=>concat(tag(field,0),varint(value));
  const lengthField=(field,payload)=>concat(tag(field,2),varint(payload.length),payload);
  const urlSafeBase64=bytes=>{
    let binary='';
    for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  };
  const flightNumbers=o=>(o?.slices||[]).flatMap(s=>(s.segments||[]).map(x=>x.flight_number).filter(Boolean)).join(' · ');
  const firstSeg=o=>o?.slices?.[0]?.segments?.[0]||{};
  const lastSeg=o=>{const a=o?.slices?.[0]?.segments||[];return a[a.length-1]||{}};
  const hhmm=v=>v?String(v).slice(11,16):'';

  function parseFlight(seg){
    const raw=String(seg?.flight_number||'').replace(/\s+/g,'').toUpperCase();
    const carrier=String(seg?.marketing_carrier?.iata_code||'').trim().toUpperCase()||raw.match(/^([A-Z0-9]{2})/)?.[1]||'';
    const number=carrier&&raw.startsWith(carrier)?raw.slice(carrier.length):raw.replace(/^([A-Z0-9]{2})/,'');
    return carrier&&number?{carrier,number}:null;
  }

  function buildExactUrl(offer){
    try{
      const slices=offer?.slices||[];
      if(!slices.length)throw new Error('missing slices');
      let segmentProtos=new Uint8Array(0);

      for(const slice of slices){
        const segments=slice?.segments||[];
        if(!segments.length)throw new Error('missing segments');
        let legsProto=new Uint8Array(0);

        for(const seg of segments){
          const flight=parseFlight(seg);
          const origin=String(seg?.origin||'').trim().toUpperCase();
          const destination=String(seg?.destination||'').trim().toUpperCase();
          const date=String(seg?.departing_at||'').slice(0,10);
          if(!flight||!origin||!destination||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('incomplete segment');
          const leg=concat(
            lengthField(1,utf8.encode(origin)),
            lengthField(2,utf8.encode(date)),
            lengthField(3,utf8.encode(destination)),
            lengthField(5,utf8.encode(flight.carrier)),
            lengthField(6,utf8.encode(flight.number))
          );
          legsProto=concat(legsProto,lengthField(4,leg));
        }

        const first=segments[0],last=segments[segments.length-1];
        const date=String(first.departing_at).slice(0,10);
        const origin=String(first.origin||slice.origin||'').trim().toUpperCase();
        const destination=String(last.destination||slice.destination||'').trim().toUpperCase();
        const segment=concat(
          lengthField(2,utf8.encode(date)),
          legsProto,
          lengthField(13,concat(varintField(1,1),lengthField(2,utf8.encode(origin)))),
          lengthField(14,concat(varintField(1,1),lengthField(2,utf8.encode(destination))))
        );
        segmentProtos=concat(segmentProtos,lengthField(3,segment));
      }

      const adults=Math.max(1,Number(DATA?.search?.passengers?.adults)||6);
      const infantsOnLap=Math.max(0,Number(DATA?.search?.passengers?.infantsOnLap)||1);
      let passengers=new Uint8Array(0);
      for(let i=0;i<adults;i++)passengers=concat(passengers,varintField(8,1));
      // Google Flights tfs passenger type 3 = infant on lap.
      for(let i=0;i<infantsOnLap;i++)passengers=concat(passengers,varintField(8,3));

      const maxU64=(1n<<64n)-1n;
      const payload=concat(
        varintField(1,28),
        varintField(2,2),
        segmentProtos,
        passengers,
        varintField(9,1),
        varintField(14,1),
        lengthField(16,varintField(1,maxU64)),
        varintField(19,2)
      );
      const token=urlSafeBase64(payload);
      const currency=encodeURIComponent(offer?.total_currency||DATA?.search?.currency||'VND');
      return {exact:true,url:`https://www.google.com/travel/flights/booking?tfs=${token}&hl=vi&gl=vn&curr=${currency}`};
    }catch(error){
      return {exact:false,url:offer?.google_flights_url||'https://www.google.com/travel/flights?hl=vi&gl=vn&curr=VND'};
    }
  }

  function findOffer(card,routeId){
    const route=DATA?.routes?.find(r=>r.id===routeId);
    if(!route)return null;
    const numbers=card.querySelector('.offer-airline-copy span')?.textContent?.trim()||'';
    const times=$$('.offer-time strong',card),airports=$$('.offer-time span',card);
    const departure=times[0]?.textContent?.trim()||'',arrival=times.at(-1)?.textContent?.trim()||'';
    const origin=airports[0]?.textContent?.trim()||'',destination=airports.at(-1)?.textContent?.trim()||'';
    return (route.offers||[]).find(o=>flightNumbers(o)===numbers&&hhmm(firstSeg(o).departing_at)===departure&&hhmm(lastSeg(o).arriving_at)===arrival&&(o.slices?.[0]?.origin||firstSeg(o).origin)===origin&&(o.slices?.[0]?.destination||lastSeg(o).destination)===destination)
      ||(route.offers||[]).find(o=>flightNumbers(o)===numbers&&hhmm(firstSeg(o).departing_at)===departure)
      ||(route.offers||[]).find(o=>flightNumbers(o)===numbers);
  }

  function updateLink(anchor,result){
    if(!anchor)return;
    anchor.href=result.url;
    anchor.dataset.exactFlightLink=result.exact?'true':'false';
    if(anchor.closest('.offer-fare'))anchor.textContent=result.exact?'Mở đúng chuyến':'Tìm trên Google Flights';
    else if(anchor.closest('.details-actions'))anchor.textContent=result.exact?'Mở đúng chuyến trên Google Flights':'Tìm trên Google Flights';
    anchor.title=result.exact?'Mở Google Flights với đúng itinerary đang xem':'Không đủ dữ liệu để khóa chính xác itinerary; mở trang tìm kiếm Google Flights';
  }

  function decorate(){
    scheduled=false;
    if(!DATA)return;
    $$('#results .route-group').forEach(group=>{
      const title=group.querySelector('.route-group-head strong')?.textContent||'';
      const routeId=title.includes('Chiều đi')?'outbound':'return';
      $$('.flight-offer',group).forEach(card=>{
        const offer=findOffer(card,routeId);
        if(!offer)return;
        const result=buildExactUrl(offer);
        updateLink(card.querySelector('.offer-fare a'),result);
        updateLink(card.querySelector('.details-actions a'),result);
      });
    });
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(decorate);
  }

  async function init(){
    try{
      DATA=await fetch(`./data/flights.json?deeplink=${Date.now()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()});
      decorate();
      const root=$('#results');
      if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
      window.TravelFlightLink={build:buildExactUrl};
    }catch(error){
      console.warn('Exact Google Flights deep-links unavailable',error);
    }
  }

  init();
})();
