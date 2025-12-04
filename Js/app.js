try {
  const loggedIn = localStorage.getItem("ow_logged_in") === "true";
  if (!loggedIn) {
    window.location.href = "login.html";
  }
} catch (e) {
  console.warn("localStorage 사용 불가", e);
}
/* =========================
   OpenWallet - app.js (통합본, 2025-11-29)
   ========================= */

/* ---- 전역 상수 ---- */
// 배포/공용 BE 주소 (지출, 트렌드, 리포트 등)
const API_BASE_URL = "http://openwallet2025.com/api";

// OCR만 로컬 FastAPI로 분리 (2025-11-30)
const OCR_API_BASE_URL = "http://openwallet2025.com/api";

const OCR_RECEIPT_URL    = `${OCR_API_BASE_URL}/ocr-receipt`;      //  로컬 fastapi
const TRENDS_SUMMARY_URL = `${API_BASE_URL}/trends/summary`;       // 서버
const CATEGORY_ENUM_TO_KR = {
      "FOOD": "식비",
      "LIVING": "생활",
      "TRANSPORT": "교통비",
      "HEALTH": "의료·건강",
      "CULTURE": "취미·문화생활",
      "EDUCATION": "교육·자기계발",
      "CLOTHING": "의류",
      "ETC": "기타",
      "SUBSCRIBE": "정기구독"
    };

const CATEGORY_KR_TO_ENUM = {
      "식비": "FOOD",
      "생활": "LIVING",
      "의료·건강": "HEALTH",
      "교육·자기계발": "EDUCATION",
      "의류": "CLOTHING",
      "교통비": "TRANSPORT",
      "취미·문화생활": "CULTURE",
      "기타": "ETC",
      "정기구독": "SUBSCRIBE"
    };

// Swagger에 정의된 엔드포인트 (실제 path는 Swagger 보고 수정!)
const TX_LIST_URL       = `${API_BASE_URL}/expenses`;   // GET /expenses
const TX_CREATE_URL     = `${API_BASE_URL}/expenses`;   // POST /expenses

// 아래 둘은 Swagger에 없으니 당장은 미사용/추후 구현
const MONTH_SUMMARY_URL = `${API_BASE_URL}/summary/monthly`;  // (백엔드에서 만들면 사용)
const REPORT_CHAT_URL   = `${API_BASE_URL}/report`;      // (AI 리포트용, 나중에)


/* ---- 데모 데이터/상수 ---- */
let TX = [
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

let ALL_TX = [];
let BUDGET = 850000;
// 🔹 프로필 localStorage 연동 (예산 공유용)
const PROFILE_STORAGE_KEY = "ow_profile";

// 차트 상태 (기간 / 타입)
let chartScope = "month";      // "month" | "week"
let chartType  = "doughnut";   // "doughnut" | "bar" | "line"

/** localStorage에서 프로필 예산 가져오기 */
function loadProfileBudget() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    if (typeof data.budget === "number") {
      return data.budget;
    }
    if (typeof data.budget === "string") {
      const n = parseInt(data.budget.replace(/[^0-9]/g, ""), 10);
      return isNaN(n) ? null : n;
    }
    return null;
  } catch (e) {
    console.error("[profile] budget load error:", e);
    return null;
  }
}

/** TX 기반 감정 비율 계산 (없으면 데모 값(EMOTION_RATIO) 사용) */
function calcEmotionStats() {
  const counts = {
    HAPPY: 0,
    EXCITED: 0,
    SAD: 0,
    ANGRY: 0,
    STRESSED: 0,
    NEUTRAL: 0,
  };
  let total = 0;

  TX.forEach((t) => {
    if (!t.emotion) return;
    if (!counts.hasOwnProperty(t.emotion)) return;
    const amt = typeof t.amount === "number" ? t.amount : 0;
    counts[t.emotion] += amt;
    total += amt;
  });

  const ratio = {};

  if (total > 0) {
    // 실제 데이터가 있으면 그걸로 퍼센트 계산
    Object.keys(counts).forEach((key) => {
      ratio[key] = Number(((counts[key] / total) * 100).toFixed(1));
    });
  } else {
    // 감정 데이터가 하나도 없으면, 데모 비율(EMOTION_RATIO) 사용
    Object.keys(counts).forEach((key) => {
      ratio[key] =
        typeof EMOTION_RATIO[key] === "number" ? EMOTION_RATIO[key] : 0;
    });
  }

  return ratio;
}

/* 감정 카드 업데이트 */
function renderEmotionCards() {
  const ratio = calcEmotionStats();

  document.querySelectorAll(".emotion-card").forEach(card => {
    const key = card.dataset.emotion;
    const strong = card.querySelector("strong");
    if (strong) strong.textContent = ratio[key] + "%";
  });
}

/* 만족도 계산 부분 */
function calcSatisfactionStats() {
  const counts = { 1:0, 2:0, 3:0, 4:0, 5:0 };

  TX.forEach(t => {
    const s = t.satisfaction;
    if (typeof s === "number" && s >= 1 && s <= 5) {
      counts[s] += 1;
    }
  });

  return counts;
}


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

const CATEGORY_EMOJI = {
  "식비": "🍚",          // FOOD
  "생활": "🏠",          // LIVING
  "교통비": "🚗",        // TRANSPORT
  "의료·건강": "⚕️",     // HEALTH
  "취미·문화생활": "🎨",  // CULTURE
  "교육·자기계발": "📘",  // EDUCATION
  "의류": "👕",          // CLOTHING
  "기타": "🛍️",          // ETC
  "정기구독": "🧾"        // SUBSCRIBE
};
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

/* 지출 기록 패널 (오버레이) */
let recordPanel = null;
let recordContent = null;

/* ---- 유틸 ---- */
/* =============== Swagger API 래퍼 ================== */
const API = {
  //=========================
  /** 이번 달 지출 목록 불러오기 */
  async getMonthlyTx(year, month) {
    const res = await fetch(TX_LIST_URL);
    if (!res.ok) throw new Error(`getMonthlyTx HTTP ${res.status}`);
    const all = await res.json();
    return Array.isArray(all) ? all : [];
  }
  //=======================
,

  /** 이번 달 요약(총 지출, 예산 등) 불러오기 */
  async getMonthSummary(year, month) {
    const url = `${MONTH_SUMMARY_URL}?year=${year}&month=${String(month).padStart(2, "0")}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`getMonthSummary HTTP ${res.status}`);
    return res.json();
  },

  /** 지출 한 건 저장 */
  async createTx(payload) {
    console.log("▶ POST /expenses payload =", payload);   // 디버그용
    const res = await fetch(TX_CREATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
    let errText = "";
    try {
      errText = await res.text();
    } catch (e) {
      // 아무 것도 못 읽을 수도 있음
    }
    console.error("❌ createTx fail:", res.status, errText);
    throw new Error(`createTx HTTP ${res.status} ${errText}`);
  }
    return res.json();
  },

  /** AI 리포트 질문 */
  async askReport(inputQuestion) {
    const bodyData = { start_date: "2025-11-01", end_date: "2025-12-31", question :inputQuestion}
    const res = await fetch(REPORT_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData), // ⚠️ Swagger에서 body 스키마 확인
    });
    if (!res.ok) throw new Error(`askReport HTTP ${res.status}`);
    return res.json();
  },


  /** 지출 한 건 삭제 */
  async deleteTx(id) {
    const url = `${TX_CREATE_URL}/${encodeURIComponent(id)}`; // /expenses/{id}
    const res = await fetch(url, { method: "DELETE" });

    if (!res.ok) {
      let errText = "";
      try {
        errText = await res.text();
      } catch (e) {}
      console.error("❌ deleteTx fail:", res.status, errText);
      throw new Error(`deleteTx HTTP ${res.status} ${errText}`);
    }
    return true;
  }
};
/*-----------*/

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

const aggregateByCategory = (txList) => {
  const source = Array.isArray(txList) ? txList : TX;
  const sums = new Map();
  source.forEach(t => {
    if (!t || !t.cat || typeof t.amount !== "number") return;
    sums.set(t.cat, (sums.get(t.cat) || 0) + t.amount);
  });

  const labels = Array.from(sums.keys());
  const values = Array.from(sums.values());
  const total  = values.reduce((a, b) => a + b, 0);

  return { labels, values, total };
};

/** ============== 서버에서 이번 달 지출 + 요약 불러와서 상태 갱신 ================*/
async function loadMonthlyData(year, month) {
  try {
    const [txList, summary] = await Promise.all([
      API.getMonthlyTx(year, month),
      API.getMonthSummary(year, month).catch(() => null),
    ]);

    if (Array.isArray(txList) && txList.length) {
      const mapped = txList.map((t) => {
        const catKr = CATEGORY_ENUM_TO_KR[t.category] || t.category || "기타";

        return {
          id: t.id,
          date: t.date,
          title: t.title || " ",
          cat: catKr,
          amount: t.price,
          emotion: t.emotion || "",
          memo: t.memo || "",
          satisfaction: t.satisfaction ?? null,
        };
      });

      // 전체 리스트는 ALL_TX에 저장
      ALL_TX = mapped;

      // 최근 31일만 TX에 반영
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 30); // 최근 31일

      TX = mapped.filter((t) => {
        if (!t.date) return false;
        let d = new Date(t.date);
        if (isNaN(d.getTime())) {
          d = new Date(`${t.date}T00:00:00`);
        }
        if (isNaN(d.getTime())) return false;
        return d >= start && d <= end;
      });

      // 최근 31일 안에 데이터가 하나도 없으면 전체 사용
      if (!TX.length) {
        TX = mapped;
      }
    } 
    else {
      console.log("⚠️ 서버에서 지출 내역이 비어 있어서 데모 TX 유지");
      ALL_TX = TX.slice();
    }

    // 예산 정보가 내려오면 BUDGET 업데이트
    if (summary && typeof summary.budget === "number") {
      BUDGET = summary.budget;
    }
  } catch (err) {
    console.error("loadMonthlyData error:", err);
    showToast("서버에서 데이터를 불러오지 못해서 데모 데이터를 사용합니다.");
    if (!ALL_TX.length) {
      ALL_TX = TX.slice();
    }
  } finally {
    // 항상 UI 다시 그리기
    renderHomeCategoryChart();
    renderEmotionChart();
    renderEmotionChart2();
    renderEmotionCards();
    renderCalendar();
  }
}


/* ==========*/

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
  const sourceTx = (ALL_TX && ALL_TX.length) ? ALL_TX : TX;

  sourceTx.forEach(t => {
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

  // 기간 필터 적용
  let dataTx = TX;
  if (chartScope === "week") {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const source = (ALL_TX && ALL_TX.length) ? ALL_TX : TX;
    dataTx = source.filter((t) => {
      if (!t || !t.date) return false;
      let d = new Date(t.date);
      if (isNaN(d.getTime())) {
        d = new Date(`${t.date}T00:00:00`);
      }
      if (isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });
  }

  const { labels, values, total } = aggregateByCategory(dataTx);

  const ctx = canvas.getContext("2d");
  if (homeChartRef) homeChartRef.destroy();

  const bgColors = generateColors(labels.length);

  homeChartRef = new Chart(ctx, {
    type: chartType,   // "doughnut" | "bar" | "line"
    data: {
      labels,
      datasets: [{
        data: values,
        borderWidth: 0,
        backgroundColor: bgColors,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: chartType === "doughnut" ? "64%" : 0,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) =>
              `${c.label}: ${c.raw.toLocaleString()}원 (` +
              `${(c.raw / c.dataset.data.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%)`
          }
        }
      },
      scales: (chartType === "doughnut")
        ? {}
        : {
            y: { beginAtZero: true },
            x: { beginAtZero: true }
          }
    }
  });

  // 월 전체 합계는 항상 전체 TX 기준
  const { total: monthTotal } = aggregateByCategory();

  const amountEl = document.querySelector(".amount");
  const percentEl = document.querySelector(".point");
  if (amountEl) {
    amountEl.innerHTML = `${monthTotal.toLocaleString()}<span class="unit">원</span>`;
  }
  if (percentEl) {
    const pct = BUDGET > 0 ? ((monthTotal / BUDGET) * 100).toFixed(1) : "0.0";
    percentEl.textContent = `${pct}%`;
  }

  const remainingEl = document.querySelector(".remaining-amount");
  const remainingLabel = document.querySelector(".remaining-label");
  const barFill = document.querySelector(".budget-bar-fill");
  const remaining = BUDGET - monthTotal;

  if (remainingEl) {
    remainingEl.textContent = `${Math.max(remaining, 0).toLocaleString()}원`;
  }
  if (remainingLabel) {
    remainingLabel.style.color = remaining >= 0 ? "#e5e7eb" : "#fb7185";
  }
  if (barFill) {
    const ratio = monthTotal / BUDGET;
    barFill.style.width = `${Math.max(0, Math.min(ratio, 1.3)) * 100}%`;
  }

  const bubbleEl   = document.querySelector(".chat-summary .bubble");
  const topNameEl  = document.getElementById("cat-top-name");
  const topAmountEl= document.getElementById("cat-top-amount");
  const pillsEl    = document.getElementById("categoryPills");

  const topBox =
    document.getElementById("top-category-box") ||
    document.querySelector(".top-category") ||
    (topNameEl && topNameEl.parentElement) ||
    null;

  if (values.length) {
    const maxIdx = values.reduce(
      (best, v, i, arr) => (v > arr[best] ? i : best),
      0
    );
    const topCat = labels[maxIdx];
    const topVal = values[maxIdx];
    if (bubbleEl) {
      const periodLabel = (chartScope === "week") ? "이번 주" : "이번 달";
      bubbleEl.textContent = clampText(
        `${periodLabel} ${topCat} 지출이 가장 높아요`,
        40
      );
    }

    updateConsumerType(topCat);

    // 원형 차트일 때만 TOP CATEGORY 표시
    if (chartType === "doughnut") {
      if (topBox) topBox.style.display = "";
      if (topNameEl) topNameEl.textContent = topCat;
      if (topAmountEl) {
        topAmountEl.textContent = `${topVal.toLocaleString()}원 (${(
          (topVal / total) *
          100
        ).toFixed(1)}%)`;
      }
    } else {
      if (topBox) topBox.style.display = "none";
    }
  } else {
    if (bubbleEl) bubbleEl.textContent = "이번 달 지출 데이터가 없습니다";
    updateConsumerType(null);

    if (chartType === "doughnut") {
      if (topBox) topBox.style.display = "";
      if (topNameEl) topNameEl.textContent = "-";
      if (topAmountEl) topAmountEl.textContent = "-";
    } else {
      if (topBox) topBox.style.display = "none";
    }
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

function initChartControls() {
  const scopeBtns = document.querySelectorAll(".chart-chip");
  scopeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      scopeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      chartScope = btn.dataset.scope || "month";
      renderHomeCategoryChart();
    });
  });

  // 타입 토글
  const typeBtns = document.querySelectorAll(".chart-type-btn");
  typeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      chartType = btn.dataset.type || "doughnut";
      renderHomeCategoryChart();
    });
  });
}

/* ---- 감정 차트/팝업 ---- */
// 감정 차트
let emotionChartRef = null;
const renderEmotionChart = () => {
  const canvas = document.getElementById("emotionChart");
  if (!canvas || typeof Chart === "undefined") return;

  const stats = calcEmotionStats();
  const keys = Object.keys(stats);
  const labels = keys.map(k => EMOTION_LABELS[k]);
  const values = keys.map(k => stats[k]);

  const ctx = canvas.getContext("2d");
  if (emotionChartRef) emotionChartRef.destroy();

  emotionChartRef = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: generateColors(values.length),
        borderWidth: 0,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend:{display:false} },
      scales: {
        x: { beginAtZero:true, max:100, ticks:{ callback:v => v + "%" } },
        y: { }
      }
    }
  });
};
// 만족도 차트 (emotionChart2)
let emotionChartRef2 = null;
const renderEmotionChart2 = () => {
  const canvas = document.getElementById("emotionChart2");
  if (!canvas || typeof Chart === "undefined") return;
  const stats = calcSatisfactionStats(); // {1:?,2:?,3:?,4:?,5:?}
  const labels = ["만족도 1", "만족도 2", "만족도 3", "만족도 4", "만족도 5"];
  const values = [stats[1], stats[2], stats[3], stats[4], stats[5]];
  const ctx = canvas.getContext("2d");
  if (emotionChartRef2) emotionChartRef2.destroy();
  emotionChartRef2 = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: generateColors(values.length),
        borderWidth: 0,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `${c.raw}회`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            font: { size: 12 }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: { size: 12 }
          }
        }
      }
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
  const stats = calcEmotionStats();
  const ratio = stats[emotionKey] + "%";
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


/* ================== 지출 기록 패널 ================== */

/** 필요하면 record-panel DOM을 생성하는 함수 */
function ensureRecordPanel() {
  if (recordPanel && recordContent) return;

  // 혹시 HTML에 이미 만들어둔 게 있다면 먼저 찾아봄
  recordPanel =
    document.getElementById("record-panel") ||
    document.getElementById("recordPanel");
  recordContent =
    document.getElementById("record-content") ||
    document.getElementById("recordContent");

  // 없다면 JS로 새로 만들어서 body에 붙임
  if (!recordPanel) {
    recordPanel = document.createElement("div");
    recordPanel.id = "record-panel";
    recordPanel.className = "record-panel";

    recordPanel.innerHTML = `
      <div class="record-panel-inner" id="record-content"></div>
    `;

    document.body.appendChild(recordPanel);
    recordContent = document.getElementById("record-content");
  }

  // 오버레이 바깥 클릭하면 닫기
  recordPanel.addEventListener("click", (e) => {
    if (e.target === recordPanel) {
      closeRecordPanel();
    }
  });
}

/** 날짜/시간 포맷 헬퍼 */
function formatDateTimeParts(dateStr) {
  if (!dateStr) return { date: "-", time: "-" };

  let d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    d = new Date(`${dateStr}T00:00:00`);
  }
  if (isNaN(d.getTime())) return { date: String(dateStr), time: "-" };

  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  const hh   = String(d.getHours()).padStart(2, "0");
  const mi   = String(d.getMinutes()).padStart(2, "0");

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${mi}`,
  };
}

/** 지출 기록 패널 내용 렌더링 */
function renderRecordPanel() {
  ensureRecordPanel();
  if (!recordContent) return;

  const total = TX.reduce((sum, t) => sum + (t.amount || 0), 0);
  const percent =
    BUDGET > 0 ? ((total / BUDGET) * 100).toFixed(1) : "0.0";

  if (!TX.length) {
    recordContent.innerHTML = `
      <header class="record-header">
        <h1>지출 기록</h1>
        <button type="button" class="record-close-btn" id="recordCloseBtn">닫기</button>
      </header>
      <section class="record-summary">
        <div class="record-summary-main">
          <span class="record-summary-label">이번 달 지출 합계</span>
          <span class="record-summary-amount">0원</span>
        </div>
        <div class="record-summary-sub">
          예산 ${BUDGET.toLocaleString()}원 대비 달성률
          <strong>0.0%</strong>
        </div>
      </section>
      <ul class="record-list">
        <li class="record-empty">아직 기록된 지출이 없습니다.</li>
      </ul>
    `;
  } else {
    const itemsHtml = TX
      .slice()
      .sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return db - da; // 최신순
      })
      .map((t) => {
        const { date } = formatDateTimeParts(t.date);
        const title = t.title || `${t.cat || "지출"} 소비`;
        const cat = t.cat || "-";
        const amount = (t.amount || 0).toLocaleString();
        const emoKey = t.emotion || "";
        const emoLabel = emoKey ? (EMOTION_LABELS[emoKey] || emoKey) : "";
        const emoEmoji = emoKey ? (EMOTION_EMOJIS[emoKey] || "") : "";
        const memo = t.memo ? escapeHtml(String(t.memo)) : "";
        const satisfaction = (t.satisfaction ?? null);

        return `
      <li class="record-item" data-id="${t.id ?? ""}">

        <!-- 날짜 -->
        <div class="record-item-date-only">${date}</div>

        <!-- 이름 / 가격 (+ 삭제 버튼) -->
        <div class="record-item-line">
          <span class="item-title">${escapeHtml(String(title))}</span>
          <div class="item-right">
            <span class="item-price">${amount}원</span>
            <button type="button" class="item-delete-btn" data-id="${t.id ?? ""}" aria-label="삭제">
              <img src="assets/delete.png" alt="삭제" class="item-delete-icon" />
            </button>
          </div>
        </div>

        <!-- 카테고리 / 감정 / 만족도 -->
        <div class="record-item-meta-line">
          <span class="item-cat">
            ${CATEGORY_EMOJI[cat] || "💳"} ${escapeHtml(String(cat))}
          </span>

          ${
            emoKey
              ? `<span class="item-emo">${emoEmoji} ${escapeHtml(emoLabel)}</span>`
              : ""
          }

          ${
            satisfaction != null
              ? `<span class="item-sat">만족도 ${satisfaction}/5</span>`
              : ""
          }
        </div>

        ${
          memo
            ? `<div class="record-item-memo-line">메모 내용: ${memo}</div>`
            : ""
        }

      </li>
    `;
      })
      .join("");

    recordContent.innerHTML = `
      <header class="record-header">
        <h1>지출 기록</h1>
        <button type="button" class="record-close-btn" id="recordCloseBtn">지출 기록 닫기</button>
      </header>
      <section class="record-summary">
        <div class="record-summary-main">
          <span class="record-summary-label">이번 달 지출 합계</span>
          <span class="record-summary-amount">${total.toLocaleString()}원</span>
        </div>
        <div class="record-summary-sub">
          예산 ${BUDGET.toLocaleString()}원 대비 달성률
          <strong>${percent}%</strong>
        </div>
      </section>
      <ul class="record-list">
        ${itemsHtml}
      </ul>
    `;
  }

  // 닫기 버튼
  const closeBtn = document.getElementById("recordCloseBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const panel = document.getElementById("record-panel");
      if (panel) panel.classList.remove("show");
    });
  }

  // 삭제 버튼(이벤트 위임) — 여러 번 등록되지 않게 플래그 사용
  if (!recordContent.__owDeleteBound) {
    recordContent.addEventListener("click", async (e) => {
      const btn = e.target.closest(".item-delete-btn");
      if (!btn) return;

      const id = btn.dataset.id;
      if (!id) {
        showToast("이 기록은 서버 ID가 없어 삭제할 수 없습니다.");
        return;
      }

      if (!confirm("이 지출 기록을 삭제할까요?")) return;

      try {
        await API.deleteTx(id);

        // 로컬 상태에서 제거
        TX = TX.filter((t) => String(t.id) !== String(id));

        // UI 다시 그림
        renderRecordPanel();
        renderHomeCategoryChart();
        renderEmotionChart();
        renderEmotionChart2();
        renderEmotionCards();
        renderCalendar();

        showToast("지출 기록이 삭제되었습니다.");
      } catch (err) {
        console.error("deleteTx error:", err);
        showToast("삭제 중 오류가 발생했습니다.");
      }
    });

    recordContent.__owDeleteBound = true;
  }
}

/** 패널 열기 */
function openRecordPanel() {
  ensureRecordPanel();
  renderRecordPanel();
  if (recordPanel) {
    recordPanel.classList.add("show");
  }
}

/** 패널 닫기 */
function closeRecordPanel() {
  if (!recordPanel) return;
  recordPanel.classList.remove("show");
}

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
  //===================================
  } else {
    // 나머지 질문들은 백엔드 AI 리포트 API에 위임
    const fallback = "서버 분석 중 오류가 나면, 이 메시지로 대체할 예정이에요. (데모 모드)";
    // 로딩 느낌만 간단히 표시 (선택)
    appendChatBubble("ai", "질문을 분석 중이에요… (서버 호출)");

    API.askReport(q)
      .then((res) => {
        // Swagger 응답 형식에 맞게 텍스트 꺼내기
        const raw =
          res.answer ||
          res.message ||
          res.text ||
          JSON.stringify(res, null, 2);

        // 서버 응답은 HTML 인젝션 위험 있으니 escape
        const safe = escapeHtml(String(raw));
        appendChatBubble("ai", safe);
      })
      .catch((err) => {
        console.error("askReport error:", err);
        appendChatBubble(
          "ai",
          fallback
        );
      });

    return; // 아래 setTimeout 실행 안 되게 여기서 종료
  }

  setTimeout(() => appendChatBubble("ai", answer), 300);
}
//==================================
;

/* ---- 지출 추가 패널 ---- */
const openAddPanel  = () => { if(!slidePanel||!slideContent) return; initAddPanel(); slidePanel.classList.add("show"); };
const closeAddPanel = () => { if(!slidePanel) return; slidePanel.classList.remove("show"); };

const initAddPanel = () =>{ 
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
            <option value="의료·건강">의료·건강</option><option value="교육·자기계발">교육·자기계발</option><option value="의류">의류</option>
            <option value="취미·문화생활">취미·문화생활</option><option value="기타">기타</option><option value="정기구독">정기구독</option>
          </select>
        </div>
        <!-- 정기 구독 힌트 -->
        <p id="subscribeHint"
           class="add-hint"
           style="display:none; margin-top:6px; font-size:12px; color:#9ca3af;">
        </p>
      </div>
      </div>
      <div class="add-field">
        <label class="add-label" for="add-emotion">감정 태그</label>
        <select id="add-emotion" class="add-select">
          <option value="NEUTRAL">무감정</option><option value="HAPPY">행복</option><option value="EXCITED">들뜸</option>
          <option value="SAD">우울</option><option value="ANGRY">화남</option><option value="STRESSED">스트레스</option>
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

  const catSelect      = document.getElementById("add-category");
  const subscribeHint  = document.getElementById("subscribeHint");

  function updateSubscribeHint() {
    if (!subscribeHint) return;

    // 정기구독이 아닐 땐 숨기기
    if (!catSelect || catSelect.value !== "정기구독") {
      subscribeHint.style.display = "none";
      subscribeHint.textContent = "";
      return;
    }

    // 날짜 값 읽기
    const y = yearEl?.value || "";
    const m = monthEl?.value || "";
    const d = dayEl?.value || "";

    if (!y || !m || !d) {
      // 날짜가 아직 완성 안 됐으면 기본 문구
      subscribeHint.textContent =
        "🔔 선택한 날짜를 기준으로 매달 소비 달력에 구독 결제가 표시돼요.";
    } else {
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      subscribeHint.textContent =
        `🔔 ${dateStr}을(를) 기준으로 매달 소비 달력에 구독 결제가 표시돼요.`;
    }

    subscribeHint.style.display = "block";
  }

  // 카테고리 바뀔 때
  if (catSelect) {
    catSelect.addEventListener("change", updateSubscribeHint);
  }

  // 날짜 바뀔 때도 다시 계산
  [yearEl, monthEl, dayEl, nativeDate].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", updateSubscribeHint);
    el.addEventListener("change", updateSubscribeHint);
  });

  // 초기 한 번 호출
  updateSubscribeHint();

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
  /*=========================*/
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameInput   = document.getElementById("add-name");
      const yearEl      = document.getElementById("add-date-year");
      const monthEl     = document.getElementById("add-date-month");
      const dayEl       = document.getElementById("add-date-day");
      const amountInput = document.getElementById("add-amount");
      const catSelect   = document.getElementById("add-category");
      const emoSelect   = document.getElementById("add-emotion");
      const memoInput   = document.getElementById("add-memo");
      const scoreInput  = document.getElementById("add-score");

      const name   = nameInput?.value?.trim() || "";
      const year   = yearEl?.value || "";
      const month  = monthEl?.value || "";
      const day    = dayEl?.value || "";
      const date   = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      const amount = parseInt((amountInput?.value || "0").replace(/[^0-9]/g, ""), 10) || 0;
      const catKr  = catSelect?.value || "기타";     // 한국어 값 ("식비" 등)
      const emotion= emoSelect?.value || null;
      const memo   = memoInput?.value?.trim() || "";
      const scoreRaw = scoreInput?.value || "";
      if (!scoreRaw) {
        showToast("만족도를 선택해주세요");
        return;
      }
      const score = parseInt(scoreRaw, 10);

      if (!year || !month || !day) {
        showToast("날짜를 입력해 주세요.");
        return;
      }
      if (!amount || amount <= 0) {
        showToast("금액을 0보다 크게 입력해 주세요.");
        return;
      }

      // ✅ 백엔드 ENUM으로 변환 (한국어 → 영어)
      const categoryEnum = CATEGORY_KR_TO_ENUM[catKr] || "ETC";

      // 🔹 Swagger POST /expenses 스펙에 맞게 body 구성
      const payload = {
        title: name,
        date,
        price: amount,
        category: categoryEnum,   // ✅ 이제 영어 ENUM으로 전송

        emotion: emotion,
        memo: memo,
        satisfaction: score
      };

      try {
        await API.createTx(payload);
        showToast("지출이 저장되었습니다.");
        closeAddPanel();

        // 방금 추가한 날짜 기준으로 다시 불러오기
        const d = new Date(`${date}T00:00:00`);
        await loadMonthlyData(d.getFullYear(), d.getMonth() + 1);
      } catch (err) {
        console.error("createTx error:", err);
        showToast("지출 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

/*=========================*/
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

    // 빈 데이터면 데모 유지 (요약 박스 닫기)
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
      runTrendSummary({ keywords, days: isNaN(d) ? 7 : d, max_articles: isNaN(m) ? 24 : m, model: "kakaocorp/kanana-1.5-2.1b-instruct-2505", db_path: "./openwallet_trends.db" });
    });
  }
}

/* ---- 홈 초기화 ---- */
async function initHome() {
  // 0) 프로필에서 예산 불러와서 BUDGET 덮어쓰기
  const profileBudget = loadProfileBudget();
  if (profileBudget != null && profileBudget > 0) {
    BUDGET = profileBudget;
    console.log("[profile] BUDGET synced from profile:", BUDGET);
  }

  // 1) 캘린더 버튼 이벤트 & 기본 렌더 설정
  initCalendar();

  // 2) 오늘 기준으로 서버 데이터(이번 달) 불러오기
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  await loadMonthlyData(y, m);
  initChartControls();

  // 3) 나머지 기존 initHome 내용 그대로 유지
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
        if (view==="calendar"){
          summaryView.style.display="none";
          calendarCard.classList.add("active");
          calendarCard.style.display="block";
        } else {
          summaryView.style.display="block";
          calendarCard.classList.remove("active");
          calendarCard.style.display="none";
        }
      });
    });
  }

    const recordOpenBtn = document.getElementById("btn-record-open");
    if (recordOpenBtn) {
      recordOpenBtn.addEventListener("click", () => {
        openRecordPanel();
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
    sendBtn.addEventListener("click", ()=>{
      handleReportQuestion(input.value);
      input.value="";
      input.focus();
    });
    input.addEventListener("keydown", (e)=>{
      if (e.key==="Enter"){
        e.preventDefault();
        handleReportQuestion(input.value);
        input.value="";
      }
    });
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
