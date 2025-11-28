/* =========================
   OpenWallet - app.js (통합본, 2025-11-29)
   ========================= */

/* ---- 전역 상수 ---- */
const API_BASE_URL = "http://localhost:8001";
const OCR_RECEIPT_URL = `${API_BASE_URL}/ocr-receipt`;
const TRENDS_SUMMARY_URL = `${API_BASE_URL}/trends/summary`;

/* ---- 데모 데이터/상수 ---- */
const TX = [
  { date: "2025-11-01", cat: "식비", amount: 26000 },
  { date: "2025-11-02", cat: "취미·문화생활", amount: 54000 },
  { date: "2025-11-03", cat: "교통비", amount: 21000 },
  { date: "2025-11-04", cat: "기타", amount: 17000 },
  { date: "2025-11-05", cat: "취미·문화생활", amount: 210000 },
  { date: "2025-11-06", cat: "식비", amount: 42000 },
  { date: "2025-11-07", cat: "교통비", amount: 20000 },
  { date: "2025-11-08", cat: "취미·문화생활", amount: 67000 },
  { date: "2025-11-09", cat: "식비", amount: 28000 }
];
const BUDGET = 850000;

const EMOTION_RATIO = { HAPPY:40, EXCITED:10, SAD:10, ANGRY:5, STRESSED:25, NEUTRAL:10 };
const EMOTION_LABELS = {
  HAPPY:"행복 소비", EXCITED:"들뜸 소비", SAD:"우울 소비",
  ANGRY:"화남 소비", STRESSED:"스트레스 소비", NEUTRAL:"무감정 소비"
};
const EMOTION_COMMENTS = {
  HAPPY:"기분 좋은 날, 작은 보상 소비가 많았어요. 예산 안에서 즐기는 행복 소비는 충분히 괜찮아요.",
  EXCITED:"새롭고 설레는 것들에 지출이 몰려 있어요. 계획된 들뜸 소비인지 한 번 체크해보면 좋아요.",
  SAD:"기분이 다운된 날에 위로를 위한 소비가 보이네요. 금액이 커지지 않도록만 가볍게 조절해봐요.",
  ANGRY:"화가 난 순간에 한 번에 크게 쓰는 패턴이 있어요. 상한선을 미리 정해두면 훨씬 안정적이에요.",
  STRESSED:"피로와 스트레스를 풀기 위한 지출이 반복되고 있어요. 휴식 루틴을 따로 만들어두는 것도 도움이 돼요.",
  NEUTRAL:"습관처럼 나가는 일상 지출이에요. 고정비 중 줄일 수 있는 항목이 있는지 살펴보면 좋아요."
};
const EMOTION_EMOJIS = { HAPPY:"😊", EXCITED:"🤩", SAD:"😢", ANGRY:"😡", STRESSED:"😣", NEUTRAL:"😐" };
const EMOTION_KEYS = ["HAPPY","EXCITED","SAD","ANGRY","STRESSED","NEUTRAL"];

const CATEGORY_EMOJI = { "식비":"☕", "취미·문화생활":"🎮", "교통비":"🚗", "기타":"🛍️" };
TX.forEach((t, i) => { t.emotion = EMOTION_KEYS[i % EMOTION_KEYS.length]; });

const CONSUMER_TYPES = {
  "식비": { label:"커피·간식러", badge:"☕", sub:"작은 행복을 자주 챙기는 타입이에요. 예산 안에서만 즐기면 오히려 좋은 루틴!" },
  "취미·문화생활": { label:"여가·취미파", badge:"✈️", sub:"경험과 콘텐츠에 아낌없이 투자하는 스타일이에요. 일정 한도를 정해두면 더 안정적이에요." },
  "교통비": { label:"이동많은러", badge:"🚗", sub:"이동이 잦은 시기네요. 정기권/패스를 활용하면 지출을 꽤 줄일 수 있어요." },
  "기타": { label:"즉흥소비러", badge:"🛍️", sub:"소소한 지출이 여기저기 흩어져 있어요. 한 번에 모아보면 패턴이 더 잘 보여요." }
};
const DEFAULT_CONSUMER_TYPE = { label:"균형잡힌", badge:"🧾", sub:"아직 뚜렷한 편향 없이 고르게 쓰고 있어요. 지금 밸런스를 유지해보는 건 어떨까요?" };

/* ---- 공통 엘리먼트 캐시 ---- */
const slidePanel   = document.getElementById("addPanel");
const slideContent = document.getElementById("addPanelContent");

/* ---- 유틸 ---- */
const clampText = (t, m) => t.length > m ? t.slice(0, m - 1) + "…" : t;
const generateColors = (count) => {
  const out = []; for (let i=0;i<count;i++){ const h=Math.round((i*360)/(count||1)); out.push(`hsl(${h},70%,60%)`);} return out;
};
const showToast = (msg) => {
  const toast = document.getElementById("toast");
  if(!toast) return;
  toast.textContent = clampText(msg, 60);
  toast.classList.add("show");
  clearTimeout(window.__owToastTimer);
  window.__owToastTimer = setTimeout(()=>toast.classList.remove("show"), 2500);
};
const escapeHtml = (s)=>String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const escapeAttr = (s)=>String(s).replace(/"/g,"&quot;");
const tryExtractHost = (u)=>{ try{ return new URL(u).host; }catch{ return null; } };

const aggregateByCategory = () => {
  const sums = new Map();
  TX.forEach(t => sums.set(t.cat, (sums.get(t.cat)||0) + t.amount));
  const labels = Array.from(sums.keys());
  const values = Array.from(sums.values());
  return { labels, values, total: values.reduce((a,b)=>a+b,0) };
};

/* ---- 소비자 타입 표시 ---- */
const updateConsumerType = (topCat) => {
  const info = CONSUMER_TYPES[topCat] || DEFAULT_CONSUMER_TYPE;
  const labelEl = document.getElementById("consumerLabel");
  const subEl   = document.getElementById("consumerSub");
  const badgeEl = document.getElementById("consumerBadge");
  const avatar  = document.querySelector(".consumer-avatar");
  if (labelEl) labelEl.textContent = info.label;
  if (subEl)   subEl.textContent   = info.sub;
  if (badgeEl) badgeEl.textContent = info.badge;
  if (avatar){ avatar.classList.remove("pop"); void avatar.offsetWidth; avatar.classList.add("pop"); }
};

/* ---- 캘린더 ---- */
let calendarOffset = 0;
const getMonthInfo = (offset) => {
  const base = new Date(); base.setHours(0,0,0,0); base.setMonth(base.getMonth()+offset);
  const year = base.getFullYear(); const month = base.getMonth();
  const first = new Date(year, month, 1);
  return { year, month, firstWeekday:first.getDay(), lastDate:new Date(year,month+1,0).getDate(), label:`${year}년 ${month+1}월` };
};
const renderCalendar = () => {
  const grid = document.getElementById("calendarGrid");
  const labelEl = document.getElementById("calMonthLabel");
  if (!grid || !labelEl) return;
  const info = getMonthInfo(calendarOffset);
  labelEl.textContent = info.label;

  const dayInfo = {};
  TX.forEach(t=>{
    const d = new Date(`${t.date}T00:00:00`);
    if (d.getFullYear()===info.year && d.getMonth()===info.month){
      const day = d.getDate();
      if(!dayInfo[day]) dayInfo[day] = { total:0, cats:{} };
      dayInfo[day].total += t.amount;
      dayInfo[day].cats[t.cat] = (dayInfo[day].cats[t.cat]||0) + t.amount;
    }
  });

  const today = new Date();
  const isSameMonth = today.getFullYear()===info.year && today.getMonth()===info.month;

  const cells = [];
  const totalCells = 42; let day = 1;
  for(let i=0;i<totalCells;i++){
    if (i < info.firstWeekday || day > info.lastDate){ cells.push('<div class="cal-cell"></div>'); continue; }
    const dInfo = dayInfo[day] || { total:0, cats:{} };
    const amt = dInfo.total;
    let cls = "cal-cell";
    if (isSameMonth && day===today.getDate()) cls += " today";
    if (amt>0){ cls += " has-spend"; if (amt>=100000) cls += " big-spend"; }
    const amtText = amt>0 ? `-${amt.toLocaleString()}` : "";
    const amtClass = amt>0 ? "cal-amount minus" : "cal-amount";

    let emoji = "";
    if (amt>0){
      let bestCat=null, bestVal=0;
      for (const cat in dInfo.cats){ if (dInfo.cats[cat]>bestVal){ bestVal=dInfo.cats[cat]; bestCat=cat; } }
      if (bestCat) emoji = CATEGORY_EMOJI[bestCat] || "💳";
    }
    const emojiHtml = emoji ? `<div class="cal-emoji">${emoji}</div>` : "";

    cells.push(
      `<div class="${cls}">
         <div class="cal-day">${day}</div>
         <div class="${amtClass}">${amtText}</div>
         ${emojiHtml}
       </div>`
    );
    day++;
  }
  grid.innerHTML = cells.join("");
};
const initCalendar = () => {
  const prevBtn = document.getElementById("calPrev");
  const nextBtn = document.getElementById("calNext");
  if (prevBtn) prevBtn.addEventListener("click", ()=>{ calendarOffset--; renderCalendar(); });
  if (nextBtn) nextBtn.addEventListener("click", ()=>{ calendarOffset++; renderCalendar(); });
  renderCalendar();
};

/* ---- 카테고리 도넛 ---- */
let homeChartRef = null;
const renderHomeCategoryChart = () => {
  const canvas = document.getElementById("homeCategoryChart");
  if (!canvas || typeof Chart === "undefined") return;
  const {labels, values, total} = aggregateByCategory();
  const ctx = canvas.getContext("2d");
  if (homeChartRef) homeChartRef.destroy();
  const bgColors = generateColors(labels.length);
  homeChartRef = new Chart(ctx, {
    type:"doughnut",
    data:{ labels, datasets:[{ data:values, borderWidth:0, backgroundColor:bgColors, hoverOffset:6 }] },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:"64%",
      plugins:{
        legend:{ display:false },
        tooltip:{ callbacks:{ label:(c)=>`${c.label}: ${c.raw.toLocaleString()}원 (${(c.raw / c.dataset.data.reduce((a,b)=>a+b,0) * 100).toFixed(1)}%)` } }
      }
    }
  });

  const amountEl = document.querySelector(".amount");
  const percentEl = document.querySelector(".point");
  if (amountEl) amountEl.innerHTML = `${total.toLocaleString()}<span class="unit">원</span>`;
  if (percentEl) percentEl.textContent = `${((total / BUDGET) * 100).toFixed(1)}%`;

  const remainingEl = document.querySelector(".remaining-amount");
  const remainingLabel = document.querySelector(".remaining-label");
  const barFill = document.querySelector(".budget-bar-fill");
  const remaining = BUDGET - total;
  if (remainingEl) remainingEl.textContent = `${Math.max(remaining,0).toLocaleString()}원`;
  if (remainingLabel) remainingLabel.style.color = remaining >= 0 ? "#e5e7eb" : "#fb7185";
  if (barFill){
    const ratio = total / BUDGET;
    barFill.style.width = `${Math.max(0, Math.min(ratio, 1.3)) * 100}%`;
  }

  const bubbleEl   = document.querySelector(".chat-summary .bubble");
  const topNameEl  = document.getElementById("cat-top-name");
  const topAmountEl= document.getElementById("cat-top-amount");
  const pillsEl    = document.getElementById("categoryPills");

  if (values.length){
    const maxIdx = values.reduce((best,v,i,arr)=> v>arr[best]?i:best, 0);
    const topCat = labels[maxIdx], topVal = values[maxIdx];
    if (bubbleEl) bubbleEl.textContent = clampText(`이번 달 ${topCat} 지출이 가장 높아요`, 40);
    if (topNameEl) topNameEl.textContent = topCat;
    if (topAmountEl) topAmountEl.textContent = `${topVal.toLocaleString()}원 (${((topVal/total)*100).toFixed(1)}%)`;
    updateConsumerType(topCat);
  }else{
    if (bubbleEl) bubbleEl.textContent = "이번 달 지출 데이터가 없습니다";
    if (topNameEl) topNameEl.textContent = "-";
    if (topAmountEl) topAmountEl.textContent = "-";
    updateConsumerType(null);
  }

  if (pillsEl){
    const pills = labels.map((label,i)=>{
      const value = values[i];
      const pct = total ? ((value/total)*100).toFixed(1) : 0;
      return `<div class="category-pill">
        <span class="category-pill-dot" style="background:${bgColors[i]}"></span>
        <span>${label}</span>
        <span class="category-pill-amount">${value.toLocaleString()}원 · ${pct}%</span>
      </div>`;
    });
    pillsEl.innerHTML = pills.join("");
  }
};

/* ---- 감정 차트/팝업 ---- */
let emotionChartRef = null;
const renderEmotionChart = () => {
  const canvas = document.getElementById("emotionChart");
  if (!canvas || typeof Chart === "undefined") return;
  const ctx = canvas.getContext("2d");
  const keys = Object.keys(EMOTION_RATIO);
  const labels = keys.map(k=>EMOTION_LABELS[k]||k);
  const values = keys.map(k=>EMOTION_RATIO[k]);
  if (emotionChartRef) emotionChartRef.destroy();
  emotionChartRef = new Chart(ctx, {
    type:"bar",
    data:{ labels, datasets:[{ data:values, backgroundColor:generateColors(values.length), borderWidth:0, borderRadius:6 }] },
    options:{
      indexAxis:"y", responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(c)=>`${c.raw}%` } } },
      scales:{ x:{ beginAtZero:true, max:100, ticks:{ callback:(v)=>`${v}%` }, grid:{display:false}}, y:{ grid:{display:false} } }
    }
  });
};
const updateEmotionDetail = (emotionKey, labelText, ratioText) => {
  const modal = document.getElementById("emotionModal"); if(!modal) return;
  const titleEl = document.getElementById("emotionModalTitle");
  const subEl   = document.getElementById("emotionModalSub");
  const commentEl = document.getElementById("emotionModalComment");
  const listEl  = document.getElementById("emotionModalList");
  const emojiEl = document.getElementById("emotionModalEmoji");
  const heroEmoji = document.getElementById("emotionHeroEmoji");
  const heroLabel = document.getElementById("emotionHeroLabel");

  const label = labelText || (emotionKey ? EMOTION_LABELS[emotionKey] : "");
  const ratio = ratioText || (emotionKey && EMOTION_RATIO[emotionKey]!=null ? `${EMOTION_RATIO[emotionKey]}%` : "-");
  const comment = emotionKey && EMOTION_COMMENTS[emotionKey] ? EMOTION_COMMENTS[emotionKey] : "이 감정에 해당하는 소비를 정리했어요.";

  if (titleEl) titleEl.textContent = label || "감정 소비 내역";
  if (subEl)   subEl.textContent   = `${ratio} · 감정 소비 내역`;
  if (commentEl) commentEl.textContent = comment;

  const emoji = EMOTION_EMOJIS[emotionKey] || "💳";
  if (emojiEl) emojiEl.textContent = emoji;
  if (heroEmoji) heroEmoji.textContent = emoji;
  if (heroLabel) heroLabel.textContent = label + (ratio!=="-" ? ` · ${ratio}` : "");

  if (listEl){
    const items = emotionKey ? TX.filter(t=>t.emotion===emotionKey) : [];
    if (!items.length){
      listEl.innerHTML = '<li class="emotion-detail-empty">아직 이 감정으로 기록된 지출이 없어요. (Demo)</li>';
    }else{
      listEl.innerHTML = items.map(t=>{
        const d=new Date(`${t.date}T00:00:00`), mm=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0");
        return `<li class="emotion-detail-item">
          <div class="emotion-detail-main"><span class="emotion-detail-cat">${t.cat}</span><span class="emotion-detail-amount">${t.amount.toLocaleString()}원</span></div>
          <div class="emotion-detail-sub">${mm}.${dd} · ${EMOTION_LABELS[t.emotion]||"감정 소비"}</div>
        </li>`;
      }).join("");
    }
  }
  modal.classList.add("show");
};

/* ---- 페이지 전환 ---- */
const switchPage = (pageId) => {
  const pages = document.querySelectorAll(".page");
  const navBtns = document.querySelectorAll(".bottom-nav-btn");
  pages.forEach(p=>p.classList.remove("active"));
  navBtns.forEach(b=>b.classList.remove("active"));
  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");
  navBtns.forEach(b=>{ if (b.dataset.page===pageId) b.classList.add("active"); });
};

/* ---- AI 리포트(데모) ---- */
const appendChatBubble = (who, text) => {
  const log = document.getElementById("reportChatLog"); if(!log) return;
  const row = document.createElement("div"); row.className = "chat-row " + (who==="me"?"me":"ai");
  const avatar = document.createElement("div"); avatar.className="chat-avatar"; avatar.textContent = who==="me"?"Me":"AI";
  const bubble = document.createElement("div"); bubble.className="chat-bubble " + (who==="me"?"me":"ai"); bubble.innerHTML = text.replace(/\n/g,"<br />");
  if (who==="me"){ row.appendChild(bubble); row.appendChild(avatar);} else { row.appendChild(avatar); row.appendChild(bubble); }
  log.appendChild(row); log.scrollTop = log.scrollHeight;
};
const handleReportQuestion = (q) => {
  if(!q.trim()) return; appendChatBubble("me", q);
  const {labels, values, total} = aggregateByCategory(); const percent = ((total/BUDGET)*100).toFixed(1);
  let answer="";
  if (q.includes("총 지출") || q.includes("요약")){
    answer = `이번 달 총 지출은 약 <b>${total.toLocaleString()}원</b>이에요.\n설정된 예산 ${BUDGET.toLocaleString()}원 기준으로 <b>예산 달성률 ${percent}%</b> 정도로 보이고,\n` +
      (percent>100 ? "예산을 약간 초과한 상태라서, 남은 기간에는 필수 지출 위주로 조절하는 걸 추천드려요." : "아직 예산 안에서 사용 중이라, 지금 페이스를 유지하면 무리 없이 마무리할 수 있을 것 같아요.");
  } else if (q.includes("카테고리") || q.includes("랭킹")){
    if (!values.length){ answer="아직 집계된 지출 데이터가 없어서 카테고리 랭킹을 만들 수 없어요. (Demo)"; }
    else {
      const sorted = labels.map((cat,i)=>({cat, v:values[i]})).sort((a,b)=>b.v-a.v);
      const lines = sorted.map((it,idx)=>`${idx+1}위 ${it.cat} · ${it.v.toLocaleString()}원 (${((it.v/total)*100).toFixed(1)}%)`).join("<br />");
      answer = `카테고리별 지출 순위는 다음과 같아요:<br /><br />${lines}<br /><br />상위 1~2개 카테고리는 예산을 따로 잡아서 관리하면 더 보기 편해져요.`;
    }
  } else if (q.includes("감정") || q.includes("기분")){
    answer = "현재 데모 데이터 기준으로, 감정 소비 비율은<br />" +
      Object.keys(EMOTION_RATIO).map(k=>`${EMOTION_LABELS[k]} ${EMOTION_RATIO[k]}%`).join(", ") +
      " 입니다.<br /><br />특히 <b>"+EMOTION_LABELS["STRESSED"]+"</b>와 <b>"+EMOTION_LABELS["HAPPY"]+
      "</b> 비중이 눈에 띄는데요,<br />스트레스 소비는 상한선을 정해두고, 행복 소비는 예산 안에서 이어갈 수 있도록 분리해서 관리해보면 좋아요.";
  } else {
    answer = "이 질문은 데모 모드라서 아주 자세한 분석은 어렵지만,\n실제 서비스에서는 질문 내용을 해석해서 <b>카테고리별 지출, 예산 초과 가능성, 감정 태그</b>를 종합해\n맞춤형 리포트를 생성할 예정이에요. 😊";
  }
  setTimeout(()=>appendChatBubble("ai", answer), 300);
};

/* ---- 지출 추가 패널 ---- */
const openAddPanel  = () => { if(!slidePanel||!slideContent) return; initAddPanel(); slidePanel.classList.add("show"); };
const closeAddPanel = () => { if(!slidePanel) return; slidePanel.classList.remove("show"); };

const initAddPanel = () => {
  const now = new Date(); const yyyy=String(now.getFullYear()); const mm=String(now.getMonth()+1).padStart(2,"0"); const dd=String(now.getDate()).padStart(2,"0");
  slideContent.innerHTML = `
    <header class="add-header"><h1>지출 추가</h1></header>
    <form id="add-form" class="add-form">
      <div class="add-field">
        <label class="add-label" for="add-name">항목명</label>
        <div class="add-name-row">
          <input id="add-name" class="add-input" type="text" placeholder="예: 아메리카노" />
          <button type="button" class="add-chip" id="add-chip-today">오늘</button>
        </div>
      </div>
      <div class="add-field">
        <label class="add-label">날짜</label>
        <div class="add-date-wrap">
          <input id="add-date-year" class="add-input add-input-date" maxlength="4" inputmode="numeric" />
          <span class="add-date-sep">-</span>
          <input id="add-date-month" class="add-input add-input-date" maxlength="2" inputmode="numeric" />
          <span class="add-date-sep">-</span>
          <input id="add-date-day" class="add-input add-input-date" maxlength="2" inputmode="numeric" />
          <button type="button" class="add-date-calendar-btn" id="btn-calendar">🗓️</button>
          <input id="add-date-native" type="date" class="add-date-native" />
        </div>
      </div>
      <div class="add-field">
        <label class="add-label" for="add-amount">금액</label>
        <div class="add-amount-row"><input id="add-amount" class="add-input" inputmode="numeric" placeholder="0" /></div>
      </div>
      <div class="add-field">
        <label class="add-label" for="add-category">카테고리</label>
        <div class="add-category-row">
          <select id="add-category" class="add-select">
            <option value="식비">식비</option><option value="생활">생활</option><option value="교통비">교통비</option>
            <option value="취미·문화생활">취미·문화생활</option><option value="기타">기타</option>
          </select>
        </div>
      </div>
      <div class="add-field">
        <label class="add-label" for="add-emotion">감정 태그</label>
        <select id="add-emotion" class="add-select">
          <option value="">미선택</option><option value="HAPPY">행복</option><option value="EXCITED">들뜸</option>
          <option value="SAD">우울</option><option value="ANGRY">화남</option><option value="STRESSED">스트레스</option><option value="NEUTRAL">무감정</option>
        </select>
      </div>
      <div class="add-field">
        <label class="add-label" for="add-memo">메모</label>
        <textarea id="add-memo" class="add-textarea" rows="3" placeholder="메모를 입력하세요"></textarea>
      </div>
      <div class="add-field">
        <button type="button" class="add-receipt-btn" id="btn-receipt"><span class="add-receipt-icon">📷</span><span class="add-receipt-text">영수증 이미지로 자동입력 (Demo)</span></button>
        <input id="add-receipt-input" type="file" accept="image/*" hidden />
      </div>
      <div class="add-field">
        <span class="add-label">만족도 점수</span>
        <div class="add-score-wrap" id="score-group">
          <button type="button" class="score-btn" data-score="1">1</button><button type="button" class="score-btn" data-score="2">2</button>
          <button type="button" class="score-btn" data-score="3">3</button><button type="button" class="score-btn" data-score="4">4</button>
          <button type="button" class="score-btn" data-score="5">5</button>
        </div>
        <input type="hidden" id="add-score" />
      </div>
      <div class="add-actions">
        <button type="submit" class="add-submit">추가</button>
        <button type="button" class="add-cancel">취소</button>
      </div>
    </form>
  `;

  // 폼 요소 캐시 (이름 재사용: 재선언 금지)
  const yearEl = document.getElementById("add-date-year");
  const monthEl= document.getElementById("add-date-month");
  const dayEl  = document.getElementById("add-date-day");
  const nativeDate = document.getElementById("add-date-native");
  const chipToday  = document.getElementById("add-chip-today");
  const btnCalendar= document.getElementById("btn-calendar");
  const form = document.getElementById("add-form");
  const cancelBtn  = form.querySelector(".add-cancel");
  const scoreGroup = document.getElementById("score-group");
  const scoreInput = document.getElementById("add-score");
  const receiptBtn = document.getElementById("btn-receipt");
  const receiptInput= document.getElementById("add-receipt-input");

  const now2 = new Date(); const yyyy2=String(now2.getFullYear()); const mm2=String(now2.getMonth()+1).padStart(2,"0"); const dd2=String(now2.getDate()).padStart(2,"0");
  if (yearEl && monthEl && dayEl){ yearEl.value=yyyy2; monthEl.value=mm2; dayEl.value=dd2; }
  if (nativeDate) nativeDate.value = `${yyyy2}-${mm2}-${dd2}`;

  if (chipToday && yearEl && monthEl && dayEl && nativeDate){
    chipToday.addEventListener("click", ()=>{
      const t=new Date(); const y=String(t.getFullYear()); const m=String(t.getMonth()+1).padStart(2,"0"); const d=String(t.getDate()).padStart(2,"0");
      yearEl.value=y; monthEl.value=m; dayEl.value=d; nativeDate.value=`${y}-${m}-${d}`;
    });
  }
  if (btnCalendar && nativeDate && yearEl && monthEl && dayEl){
    btnCalendar.addEventListener("click", ()=>{ nativeDate.showPicker && nativeDate.showPicker(); });
    nativeDate.addEventListener("change", ()=>{
      if(!nativeDate.value) return;
      const parts=nativeDate.value.split("-"); if(parts.length===3){ yearEl.value=parts[0]; monthEl.value=parts[1]; dayEl.value=parts[2]; }
    });
  }
  if (scoreGroup && scoreInput){
    const buttons = scoreGroup.querySelectorAll(".score-btn");
    buttons.forEach(b=>b.addEventListener("click", ()=>{
      buttons.forEach(x=>x.classList.remove("active")); b.classList.add("active"); scoreInput.value=b.getAttribute("data-score")||"";
    }));
  }

  if (receiptBtn && receiptInput){
    receiptBtn.addEventListener("click", ()=>receiptInput.click());
    receiptInput.addEventListener("change", async ()=>{
      if(!receiptInput.files || !receiptInput.files.length) return;
      const file = receiptInput.files[0];
      const memoInput = document.getElementById("add-memo");
      const formData = new FormData();
      formData.append("file", file);
      if (memoInput && memoInput.value) formData.append("memo", memoInput.value);
      try{
        showToast("영수증을 분석 중이에요...");
        const res = await fetch(OCR_RECEIPT_URL,{ method:"POST", body:formData });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json(); console.log("OCR result:", data);

        const nameInput   = document.getElementById("add-name");
        const amountInput = document.getElementById("add-amount");
        const memoField   = document.getElementById("add-memo");
        const catSelect   = document.getElementById("add-category");

        // 항목명 후보
        if (nameInput){
          let candidate = "";
          if (Array.isArray(data.items) && data.items.length>0){
            const first = data.items[0]; if (first && first.name) candidate = String(first.name).trim();
          }
          const looksLikeTime = (s)=>/^\s*\d{1,2}[:시]\d{1,2}/.test(s);
          const onlyDigitsAndSigns = (s)=>/^[0-9\s:.,\-+()]+$/.test(s);
          const tooShort = (s)=>s.length<=2;
          if (!candidate || looksLikeTime(candidate) || onlyDigitsAndSigns(candidate) || tooShort(candidate)){
            if (data.merchant) candidate = String(data.merchant).trim();
          }
          nameInput.value = candidate || "";
        }
        if (typeof data.amount==="number" && amountInput) amountInput.value = String(data.amount);

        if (data.suggested_category && catSelect){
          const opt = Array.from(catSelect.options).find(o=> o.value===data.suggested_category || o.text===data.suggested_category );
          if (opt) catSelect.value = opt.value;
        }
        if (data.date && yearEl && monthEl && dayEl && nativeDate){
          const [y,m,d] = String(data.date).split("-");
          if (y&&m&&d){ yearEl.value=y; monthEl.value=m.padStart(2,"0"); dayEl.value=d.padStart(2,"0"); nativeDate.value=`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
        }
        if (memoField && !memoField.value){
          if (Array.isArray(data.items) && data.items.length>0){
            const itemsText = data.items.map(it=>`${it.name||"항목"} ${it.price? it.price+"원":""}`).join(", ");
            memoField.value = `OCR 항목: ${itemsText}`;
          }else if (data.raw_text){
            memoField.value = data.raw_text.slice(0,120)+"...";
          }
        }
        showToast("영수증에서 내용을 불러왔어요. 확인 후 저장해 주세요!");
      }catch(err){
        console.error("OCR error:", err);
        showToast("영수증 분석 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      }finally{
        receiptInput.value = "";
      }
    });
  }

  if (cancelBtn){ cancelBtn.addEventListener("click", (e)=>{ e.preventDefault(); closeAddPanel(); }); }
  if (form){ form.addEventListener("submit", (e)=>{ e.preventDefault(); showToast("Demo: 지출이 추가되었다고 가정하고, 차트에 반영될 예정이에요."); closeAddPanel(); }); }
};

/* ---- 트렌드 페이지 ---- */
function renderList(list, ulId){
  const ul = document.getElementById(ulId);
  if(!ul) return;
  if(!Array.isArray(list) || !list.length){ ul.innerHTML = '<li class="trend-empty">데이터가 없습니다.</li>'; return; }
  ul.innerHTML = list.map(t=>`<li>${escapeHtml(String(t))}</li>`).join("");
}
function renderSources(urls){
  const ul = document.getElementById("trendSources");
  if(!ul) return;
  if(!Array.isArray(urls) || !urls.length){ ul.innerHTML = '<li class="trend-empty">출처가 없습니다.</li>'; return; }
  ul.innerHTML = urls.map(u=>{
    const safe = escapeAttr(u); const host = tryExtractHost(u);
    return `<li><a href="${safe}" target="_blank" rel="noopener noreferrer">${escapeHtml(host||u)}</a></li>`;
  }).join("");
}
function renderTrendSummary(s){
  const period = document.getElementById("trendPeriod");
  const model  = document.getElementById("trendModel");
  const kwEcho = document.getElementById("trendKeywordsEcho");
  if (period) period.textContent = `${s.period_start} ~ ${s.period_end}`;
  if (model)  model.textContent  = s.model || "";
  if (kwEcho) kwEcho.textContent = Array.isArray(s.keywords)? s.keywords.join(", "):"";
  renderList(s.bullets,"trendBullets");
  renderList(s.key_stats,"trendKeyStats");
  renderList(s.risks,"trendRisks");
  renderList(s.opportunities,"trendOpps");
  renderSources(s.sources);
}
async function runTrendSummary(params){
  const loadingEl = document.getElementById("trendLoading");
  const box = document.getElementById("trendSummaryBox");
  if (loadingEl) loadingEl.style.display = "inline-block";
  try{
    const res = await fetch(TRENDS_SUMMARY_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(params)
    });
    if(!res.ok){
      const text = await res.text();
      throw new Error(`HTTP ${res.status} - ${text}`);
    }
    const summary = await res.json();

    // ✅ 빈 데이터면 데모 유지 (요약 박스 닫기)
    const empty =
      (!summary.bullets || summary.bullets.length === 0) &&
      (!summary.key_stats || summary.key_stats.length === 0) &&
      (!summary.risks || summary.risks.length === 0) &&
      (!summary.opportunities || summary.opportunities.length === 0);

    if (empty) {
      console.log("⚠️ no trend data, keep demo HTML as-is");
      showToast("최근 트렌드 데이터가 부족해 데모 화면을 유지합니다.");
      if (box) box.style.display = "none";
      return;
    }

    renderTrendSummary(summary);
    if (box) box.style.display = "block";
  }catch(err){
    console.error("[trends] error:", err);
    showToast("트렌드 요약 중 오류가 발생했어요. 데모 화면을 유지합니다.");
    if (box) box.style.display = "none";
  }finally{
    if (loadingEl) loadingEl.style.display = "none";
  }
}
function initTrendPage(){
  const kw = document.getElementById("trendKeywords");
  const days = document.getElementById("trendDays");
  const max = document.getElementById("trendMax");
  const btn = document.getElementById("btnTrendRun");
  if (kw && !kw.value) kw.value = "카페 소비, 구독 다이어트, 근거리 여행";
  if (btn){
    btn.addEventListener("click", ()=>{
      const keywords = (kw?.value||"").split(",").map(s=>s.trim()).filter(Boolean);
      const d = parseInt(days?.value||"7",10);
      const m = parseInt(max?.value||"24",10);
      if(!keywords.length){ showToast("키워드를 1개 이상 입력해 주세요."); return; }
      runTrendSummary({ keywords, days: isNaN(d)?7:d, max_articles: isNaN(m)?24:m });
    });
  }
}

/* ---- 홈 초기화 ---- */
function initHome(){
  renderHomeCategoryChart();
  renderEmotionChart();
  initCalendar();

  const summaryView  = document.getElementById("summaryView");
  const calendarCard = document.getElementById("calendarCard");
  const tabBtns = document.querySelectorAll(".view-tab");
  if (summaryView && calendarCard && tabBtns.length){
    summaryView.style.display = "block";
    calendarCard.classList.remove("active");
    calendarCard.style.display = "none";
    tabBtns.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const view = btn.dataset.view;
        tabBtns.forEach(b=>b.classList.toggle("active", b===btn));
        if (view==="calendar"){ summaryView.style.display="none"; calendarCard.classList.add("active"); calendarCard.style.display="block"; }
        else { summaryView.style.display="block"; calendarCard.classList.remove("active"); calendarCard.style.display="none"; }
      });
    });
  }

  const recordOpenBtn = document.getElementById("btn-record-open");
  if (recordOpenBtn){
    recordOpenBtn.addEventListener("click", ()=>{
      const data = aggregateByCategory(); const total = data.total; const percent = ((total/BUDGET)*100).toFixed(1);
      showToast(`이번 달 지출 ${total.toLocaleString()}원 · 예산 달성률 ${percent}%`);
    });
  }

  const emotionCards = document.querySelectorAll(".emotion-card");
  const modal = document.getElementById("emotionModal");
  const modalClose = document.getElementById("emotionModalClose");
  emotionCards.forEach(card=>{
    card.addEventListener("click", ()=>{
      const key = card.getAttribute("data-emotion");
      const textEl = card.querySelector(".emotion-text p");
      const strongEl = card.querySelector(".emotion-text strong");
      const label = textEl ? textEl.textContent : (EMOTION_LABELS[key]||"");
      const ratio = strongEl ? strongEl.textContent : "";
      emotionCards.forEach(c=>c.classList.remove("active"));
      card.classList.add("active");
      updateEmotionDetail(key, label, ratio);
    });
  });
  if (modal && modalClose){
    modalClose.addEventListener("click", ()=>modal.classList.remove("show"));
    modal.addEventListener("click", (e)=>{ if (e.target===modal) modal.classList.remove("show"); });
    document.addEventListener("keydown", (e)=>{ if (e.key==="Escape"){ modal.classList.remove("show"); closeAddPanel(); }});
  }

  const addBtn = document.getElementById("btn-add");
  if (addBtn) addBtn.addEventListener("click", ()=>openAddPanel());
  if (slidePanel){
    slidePanel.addEventListener("click", (e)=>{ if (e.target===slidePanel) closeAddPanel(); });
  }

  const navBtns = document.querySelectorAll(".bottom-nav-btn");
  navBtns.forEach(btn=> btn.addEventListener("click", ()=> switchPage(btn.dataset.page) ));

  const input = document.getElementById("reportInput");
  const sendBtn = document.getElementById("reportSendBtn");
  const chips = document.querySelectorAll(".report-chip");
  if (sendBtn && input){
    sendBtn.addEventListener("click", ()=>{ handleReportQuestion(input.value); input.value=""; input.focus(); });
    input.addEventListener("keydown", (e)=>{ if (e.key==="Enter"){ handleReportQuestion(input.value); input.value=""; } });
  }
  chips.forEach(chip=> chip.addEventListener("click", ()=> handleReportQuestion(chip.getAttribute("data-q")||"") ));
}

/* ---- 스플래시 & 전체 초기화 ---- */
document.addEventListener("DOMContentLoaded", ()=>{
  const splash = document.getElementById("splash-screen");
  const appRoot = document.getElementById("app-root");

  // 스플래시 3초 후 페이드아웃
  setTimeout(()=>{
    if (splash) splash.classList.add("hide");
    if (appRoot) appRoot.style.opacity = "1";
    setTimeout(()=>{ if (splash && splash.parentNode) splash.parentNode.removeChild(splash); }, 700);
  }, 3000);

  // 페이지 초기화
  initHome();
  initTrendPage();
});
