const panel        = document.getElementById("slide-panel");
const recordPanel  = document.getElementById("record-panel");
const recordContent = document.getElementById("record-content");
const slideContent = document.getElementById("slide-content");
const navItems     = document.querySelectorAll(".nav-item");

// ---------------------- 공통 소비 데이터 (홈 + 통계 패널 공유) 만족도 추가됨.----------------------
// 한 달치 더미 (카테고리: 여가, 식비, 교통비, 기타)
const TX = [
  { date: '2025-10-10', cat: '여가', amount: 120000, score: 5 },
  { date: '2025-10-11', cat: '식비', amount: 21000, score: 3 },
  { date: '2025-10-12', cat: '교통비', amount: 18000, score: 2 },
  { date: '2025-10-13', cat: '기타', amount: 25000, score: 3 },
  { date: '2025-10-14', cat: '식비', amount: 33000, score: 5 },
  { date: '2025-10-15', cat: '여가', amount: 60000, score: 5 },
  { date: '2025-10-16', cat: '기타', amount: 15000, score: 4 },
  { date: '2025-10-17', cat: '식비', amount: 27000, score: 4 },
  { date: '2025-10-18', cat: '교통비', amount: 32000, score: 2 },
  { date: '2025-10-19', cat: '여가', amount: 45000, score: 5 },
  { date: '2025-10-20', cat: '여가', amount: 210000, score: 1 },
  { date: '2025-10-21', cat: '식비', amount: 42000, score: 3 },
  { date: '2025-10-22', cat: '교통비', amount: 26000, score: 3 },
  { date: '2025-10-23', cat: '기타', amount: 18000, score: 4 },
  { date: '2025-10-24', cat: '여가', amount: 58000, score: 5 },
  { date: '2025-10-25', cat: '식비', amount: 31000, score: 2 },
  { date: '2025-10-26', cat: '기타', amount: 22000, score: 1 },
  { date: '2025-10-27', cat: '교통비', amount: 35000, score: 1 },
  { date: '2025-10-28', cat: '식비', amount: 29000, score: 5 },
  { date: '2025-10-29', cat: '여가', amount: 76000, score: 4 },
  { date: '2025-10-30', cat: '여가', amount: 90000, score: 3 },
  { date: '2025-10-31', cat: '교통비', amount: 24000, score: 1 },
  { date: '2025-11-01', cat: '기타', amount: 20000, score: 2 },
  { date: '2025-11-02', cat: '식비', amount: 26000, score: 4 },
  { date: '2025-11-03', cat: '여가', amount: 54000, score: 5 },
  { date: '2025-11-04', cat: '교통비', amount: 21000, score: 1 },
  { date: '2025-11-05', cat: '식비', amount: 23000, score: 3 },
  { date: '2025-11-06', cat: '기타', amount: 17000, score: 2 },
  { date: '2025-11-07', cat: '교통비', amount: 20000, score: 1 },
  { date: '2025-11-08', cat: '여가', amount: 67000, score: 4 },
  { date: '2025-11-09', cat: '식비', amount: 28000, score: 5 },
  { date: '2025-11-10', cat: '기타', amount: 19000, score: 3 },
  { date: '2025-11-13', cat: '교통비', amount: 4000,  score: 1 },
  { date: '2025-11-13', cat: '여가',  amount: 1000,  score: 5 },
  { date: '2025-11-13', cat: '식비',  amount: 3000,  score: 4 },
  { date: '2025-11-13', cat: '기타',  amount: 3900,  score: 3 }
];

// 예산(더미)
const BUDGET = 850000;

function periodStart(period) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'day')  return d;
  if (period === 'week') return new Date(d - 6 * 86400000);
  return new Date(d - 29 * 86400000);
}

function aggregateByCategory(period = 'month') {
  const start = periodStart(period);
  const now = new Date();
  const sums = new Map();

  TX.forEach(t => {
    const td = new Date(t.date + 'T00:00:00');
    if (td >= start && td <= now) {
      sums.set(t.cat, (sums.get(t.cat) || 0) + t.amount);
    }
  });

  const labels = Array.from(sums.keys());
  const values = Array.from(sums.values());
  return { labels, values, total: values.reduce((a, b) => a + b, 0) };
}

// 지출 추가 시 사용
function addSpend(cat, amount, dateStr, score = null) {
  TX.push({ date: dateStr, cat, amount, score });
}

//차트 색상 추가용 코드
function generateColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = Math.round((i * 360) / count);
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  return colors;
}

// 최근 30일(오늘 포함) 일별 총합 집계
function aggregateByDayLast30() {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = [];
  const labels = [];
  const sums = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    days.push(d);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    labels.push(`${mm}.${dd}`);
    sums.push(0);
  }

  TX.forEach(t => {
    const td = new Date(t.date + 'T00:00:00');
    if (td >= days[0] && td <= base) {
      const diff = Math.round((td - days[0]) / 86400000);
      if (diff >= 0 && diff < sums.length) sums[diff] += t.amount;
    }
  });

  return { labels, sums };
}

let activeKey = null; //현재 열린 패널 (null/ stats / add / ai)

//각 패널별 내용들
function getPanelContent(key) {
  switch (key) {
    //----------- 통계 보기--------------
    case "stats":
      return `
        <!-- 카테고리별 소비 비율 -->
        <section class="panel-section stats-category">
          <div class="panel-section-title">카테고리별 소비 비율</div>

          <!-- 컨트롤: 기간/차트타입 (드롭다운) -->
          <div class="stats-controls">
            <!-- 기간 -->
            <div class="dropdown" data-type="period">
              <button class="dropdown-btn" aria-expanded="false">
                <span class="btn-text">월별</span>
                <span class="arrow">▾</span>
              </button>
              <ul class="dropdown-menu" hidden>
                <li data-value="month" class="active">월별</li>
                <li data-value="week">주별</li>
                <li data-value="day">일별</li>
              </ul>
            </div>

            <!-- 차트 타입 -->
            <div class="dropdown" data-type="chart">
              <button class="dropdown-btn" aria-expanded="false">
                <span class="btn-text">원형 차트</span>
                <span class="arrow">▾</span>
              </button>
              <ul class="dropdown-menu" hidden>
                <li data-value="doughnut" class="active">원형 차트</li>
                <li data-value="bar">막대 차트</li>
                <li data-value="line">꺾은선 차트</li>
              </ul>
            </div>
          </div>

          <!-- 차트 캔버스 -->
          <div class="chart-wrap">
            <canvas id="statsCategoryChart"></canvas>
          </div>
        </section>

        <!-- 일별 지출 -->
        <section class="panel-section stats-daily">
          <div class="panel-section-title">일별 총 지출</div>
          <div class="chart-wrap">
            <canvas id="statsDailyChart"></canvas>
          </div>
        </section>

        <!-- 만족도 그래프 -->
        <section class="panel-section stats-satisfaction">
          <div class="panel-section-title">만족도 그래프</div>
          <div class="chart-placeholder">차트 영역</div>
        </section>
      `;

    //------------지출 추가 (팀원 폼 + 만족도 버튼)---------------
    case "add":
      return `
        <header class="add-header">
          <h1>지출 추가</h1>
        </header>

        <form id="add-form" class="add-form">
          <!-- 상품명 -->
          <div class="add-field">
            <label class="add-label" for="add-name">상품명</label>
            <input
              id="add-name"
              type="text"
              class="add-input"
              placeholder="예: 아메리카노"
            />
          </div>

          <!-- 날짜 -->
          <div class="add-field add-field-inline">
            <label class="add-label" for="add-date">날짜</label>
            <div class="add-date-wrap">
              <input
                id="add-date"
                type="date"
                class="add-input"
              />
              <span class="add-date-hint">[직접 입력]</span>
            </div>
          </div>

          <!-- 금액 -->
          <div class="add-field">
            <label class="add-label" for="add-amount">금액</label>
            <div class="add-amount-row">
              <input
                id="add-amount"
                type="number"
                min="0"
                class="add-input"
                placeholder="0"
              />
              <button
                type="button"
                class="add-chip"
                id="btn-favorite-pick"
              >
                즐겨찾기에서 선택
              </button>
            </div>
          </div>

          <!-- 카테고리 -->
          <div class="add-field">
            <label class="add-label" for="add-category">카테고리</label>
            <select id="add-category" class="add-select">
              <option value="기타" selected>기타</option>
              <option value="여가">여가</option>
              <option value="식비">식비</option>
              <option value="교통비">교통비</option>
            </select>
          </div>

          <!-- 감정 태그 -->
          <div class="add-field">
            <label class="add-label" for="add-emotion">감정 태그</label>
            <select id="add-emotion" class="add-select">
              <option value="">미선택</option>
              <option value="행복">행복</option>
              <option value="스트레스">스트레스</option>
              <option value="무감정">무감정</option>
            </select>
          </div>

          <!-- 메모 -->
          <div class="add-field">
            <label class="add-label" for="add-memo">메모</label>
            <textarea
              id="add-memo"
              class="add-textarea"
              rows="4"
              placeholder="메모를 입력하세요"
            ></textarea>
          </div>

          <!-- 영수증 이미지 자동 입력 -->
          <div class="add-field add-receipt-row">
            <button type="button" class="add-receipt-btn">
              <span class="add-receipt-icon">📷</span>
              <span class="add-receipt-text">영수증 이미지로 자동입력</span>
            </button>
            <input
              id="add-receipt-input"
              type="file"
              accept="image/*"
              hidden
            />
          </div>

          <!-- 만족도 점수 -->
          <div class="add-field">
            <span class="add-label">만족도 점수</span>
            <div class="add-score-wrap" id="score-group">
              <button type="button" class="score-btn" data-score="1">1</button>
              <button type="button" class="score-btn" data-score="2">2</button>
              <button type="button" class="score-btn" data-score="3">3</button>
              <button type="button" class="score-btn" data-score="4">4</button>
              <button type="button" class="score-btn" data-score="5">5</button>
            </div>
            <input type="hidden" id="add-score" value="">
          </div>

          <!-- 버튼 -->
          <div class="add-actions">
            <button type="submit" class="add-submit">추가</button>
            <button type="button" class="add-cancel">취소</button>
          </div>
        </form>
      `;

    //-------------AI 리포트---------------
    case "ai":
      return `
        <h1>AI 리포트 패널 필요</h1>
      `;

    default:
      return `<div class="panel-header"><h1>패널</h1></div>`;
  }
}

//____________________________________________
// 패널 닫기
function closePanel() {
  panel.className = "slide-panel";
  activeKey = null;
  navItems.forEach((btn) => btn.classList.remove("active"));
}

// ================= 지출 추가 패널 초기화 =================
function initAddPanel() {
  const dateInput = document.getElementById("add-date");
  if (dateInput && !dateInput.value) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // 만족도 점수 버튼
  const scoreBtns = document.querySelectorAll(".score-btn");
  const hiddenScore = document.getElementById("add-score");
  scoreBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.score;
      hiddenScore.value = s;
      scoreBtns.forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  // 영수증 이미지 업로드 버튼
  const receiptBtn = document.querySelector(".add-receipt-btn");
  const receiptInput = document.getElementById("add-receipt-input");
  if (receiptBtn && receiptInput) {
    receiptBtn.addEventListener("click", () => receiptInput.click());
    receiptInput.addEventListener("change", () => {
      if (receiptInput.files && receiptInput.files[0]) {
        receiptBtn.classList.add("uploaded");
        const textSpan = receiptBtn.querySelector(".add-receipt-text");
        if (textSpan) textSpan.textContent = "이미지 선택 완료";
      }
    });
  }

  // 취소 버튼 -> 패널 닫기
  const cancelBtn = document.querySelector(".add-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closePanel();
    });
  }

  // 폼 submit -> TX에 추가
  const form = document.getElementById("add-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("add-name").value.trim();  // 현재는 TX에는 안 쓰지만 나중에 확장 가능
    const amountVal = document.getElementById("add-amount").value;
    const amount = Number(amountVal || 0);
    const date = document.getElementById("add-date").value;
    const cat = document.getElementById("add-category").value;
    const scoreVal = document.getElementById("add-score").value;
    const score = scoreVal ? Number(scoreVal) : null;

    if (!name || !amount || !date) {
      alert("상품명, 날짜, 금액을 모두 입력해주세요.");
      return;
    }

    // TX 에 score 포함해서 추가
    addSpend(cat, amount, date, score);

    alert("지출이 추가되었습니다.");
    renderHomeCategoryChart();

    // 패널 닫기
    closePanel();

    // 통계/지출 기록은 다음에 열 때 새 데이터 기준으로 그림
    // 홈화면 차트는 새로고침 시 반영
  });
}

//____________________________________________
//패널 열기 (통합 버전)
function openPanel(key, clickedBtn) {
  // 오른쪽 지출 기록 패널은 같이 닫기
  closeRecordPanel();

  //패널 내용 가져오기
  slideContent.innerHTML = getPanelContent(key);

  //패널에 고유 클래스 부여
  panel.className = `slide-panel open ${key}-panel`;

  //현재 활성 패널 기록
  activeKey = key;

  //내비게이션 버튼 active 표시
  navItems.forEach((btn) => {
    btn.classList.toggle("active", btn === clickedBtn);
  });

  if (key === "stats") {
    initStatsCategoryPanel();
    initStatsDailyPanel();
    initStatsSatisfactionPanel();
  }
  if (key === "add") {
    initAddPanel();
  }
}

//__________________________________________
// 버튼 클릭 이벤트
navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.key;
    if (activeKey === key) {
      closePanel();
    } else {
      openPanel(key, btn);
    }
  });
});

//------------감정 소비 카드----------
document.querySelectorAll('.emotion-card').forEach(card => {
  card.addEventListener('click', () => {
    alert(`${card.querySelector('p').textContent}`);
  });
});

// -------------"지출 기록 확인" 버튼 -> 오른쪽 슬라이드 열기
const spendDetailBtn = document.querySelector('.summary-card .small-btn');
if (spendDetailBtn) {
  spendDetailBtn.addEventListener('click', () => {
    openRecordPanel();
  });
}

//-----------------홈화면에 카테고리별 소비 비율 차트 -------------------
let homeChartRef = null;
//-----------------홈화면에 카테고리별 소비 비율 차트 -------------------
function renderHomeCategoryChart() {
  const canvas = document.getElementById("homeCategoryChart");
  if (!canvas || typeof Chart === "undefined") return;

  const { labels, values, total } = aggregateByCategory('month');
  const bgColors = generateColors(labels.length);
  const ctx = canvas.getContext("2d");

  // 기존 차트 있으면 제거
  if (homeChartRef) {
    homeChartRef.destroy();
    homeChartRef = null;
  }

  homeChartRef = new Chart(ctx, {
    type: "doughnut",
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
      cutout: "60%",
      plugins: {
        legend: { display: true, position: "right", labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw;
              const sum = ctx.dataset.data.reduce((a,b)=>a+b,0);
              const pct = ((v/sum)*100).toFixed(1);
              return `${ctx.label}: ${v.toLocaleString()}원 (${pct}%)`;
            }
          }
        }
      }
    }
  });

  const amountEl  = document.querySelector(".amount");
  const percentEl = document.querySelector(".point");
  if (amountEl)  amountEl.innerHTML = `${total.toLocaleString()}<span class="unit">원</span>`;
  if (percentEl) percentEl.textContent = `${((total / BUDGET) * 100).toFixed(1)}%`;

  // ---------------- 소비 요약 한 줄 갱신 ----------------
  const bubbleEl = document.querySelector('.chat-summary .bubble');
  if (bubbleEl) {
    const monthly = aggregateByCategory('month');
    if (monthly.values.length) {
      const maxIdx = monthly.values.reduce(
        (best, v, i, arr) => (v > arr[best] ? i : best),
        0
      );
      const topCat = monthly.labels[maxIdx];
      bubbleEl.textContent = `이번 달 ${topCat}에 대한 지출이 너무 높아요`;
    } else {
      bubbleEl.textContent = '이번 달 지출 데이터가 없습니다';
    }
  }
}

// 페이지 로드 시 한 번 실행
document.addEventListener('DOMContentLoaded', () => {
  renderHomeCategoryChart();
  setupRecordDeleteHandler();
});

// ------------------- 통계 패널: 카테고리별 소비 비율 ------------------------
let statsChartRef = null;

function initStatsCategoryPanel() {
  const canvas = document.getElementById("statsCategoryChart");
  if (!canvas || typeof Chart === "undefined") return;

  let currentType   = "doughnut"; // doughnut | bar | line
  let currentPeriod = "month";    // month | week | day

  const render = (type = currentType, period = currentPeriod) => {
    const { labels, values } = aggregateByCategory(period);
    if (!values.length || values.every(v => v === 0)) {
      const wrap = canvas.parentElement;
      wrap.style.position = 'relative';
      wrap.innerHTML = `
        <div style="
            position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
            font-size:13px; color:#666; background:#fafafa; border-radius:12px;
        ">
          선택한 기간에 데이터가 없습니다
        </div>`;
      return;
    } else {
      const wrap = canvas.parentElement;
      wrap.innerHTML = '';
      wrap.appendChild(canvas);
    }
    const bgColors = generateColors(labels.length);
    const ctx = canvas.getContext("2d");
    if (statsChartRef) statsChartRef.destroy();

    const base = {
      type,
      data: {
        labels,
        datasets: [{
          label: "지출 금액(원)",
          data: values,
          backgroundColor: bgColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: type === "doughnut", position: "right" },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw;
                const sum = values.reduce((a,b)=>a+b,0);
                const pct = sum ? ((v/sum)*100).toFixed(1) : 0;
                return `${ctx.label}: ${v.toLocaleString()}원 (${pct}%)`;
              }
            }
          }
        }
      }
    };

    if (type === "doughnut") base.options.cutout = "60%";
    if (type === "bar" || type === "line") {
      base.options.scales = {
        y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + "원" } }
      };
      if (type === "line") {
        base.data.datasets[0].borderColor = "#82b1ff";
        base.data.datasets[0].backgroundColor = "rgba(130,177,255,0.25)";
        base.data.datasets[0].fill = true;
        base.data.datasets[0].tension = 0.35;
        base.data.datasets[0].pointRadius = 4;
      } else {
        base.data.datasets[0].borderRadius = 6;
      }
    }

    statsChartRef = new Chart(ctx, base);
  };

  render();

  const dropdowns = document.querySelectorAll(".stats-category .dropdown");
  dropdowns.forEach(dd => {
    const btn   = dd.querySelector(".dropdown-btn");
    const menu  = dd.querySelector(".dropdown-menu");
    const label = btn.querySelector(".btn-text");

    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      menu.hidden = expanded;
    });

    menu.querySelectorAll("li").forEach(item => {
      item.addEventListener("click", () => {
        label.textContent = item.textContent;
        menu.querySelectorAll("li").forEach(li => li.classList.remove("active"));
        item.classList.add("active");
        btn.setAttribute("aria-expanded", "false");
        menu.hidden = true;

        if (dd.dataset.type === "chart") {
          currentType = item.dataset.value;           // doughnut | bar | line
        } else {
          const v = item.dataset.value;               // month | week | day
          currentPeriod = (v === "day") ? "day" : (v === "week") ? "week" : "month";
        }
        render(currentType, currentPeriod);
      });
    });

    document.addEventListener("click", (e) => {
      if (!dd.contains(e.target)) {
        btn.setAttribute("aria-expanded", "false");
        menu.hidden = true;
      }
    });
  });
}

// ------------------- 통계 패널: 일별 지출------------------- //
let statsDailyRef = null;

function initStatsDailyPanel() {
  const canvas = document.getElementById('statsDailyChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const { labels, sums } = aggregateByDayLast30();
  const ctx = canvas.getContext('2d');

  if (statsDailyRef) statsDailyRef.destroy();

  statsDailyRef = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '일별 지출',
        data: sums,
        borderWidth: 0,
        backgroundColor: '#555',
        barThickness: 4,
        borderRadius: 0,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {left: 10, right: 25 }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.label ?? '',
            label: (ctx) => `${ctx.raw.toLocaleString()}원`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            autoSkip: false,
            callback: (val, idx) => (idx % 5 === 0 ? labels[idx] : '')
          },
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        },
        y: {
          beginAtZero: true,
          grid: { display: false },
          ticks: { display: false }
        }
      }
    }
  });
}

//------------------------만족도 점수 계산-----------

function getSatisfactionColor(score) {
  if (score >= 4 && score <= 5) return '#00d84a';      // 밝은 초록
  if (score >= 3 && score < 4) return '#9ef01a';       // 연두빛 노랑
  if (score >= 2 && score < 3) return '#ffe45e';       // 노랑
  if (score >= 1 && score < 2) return '#ff5e57';       // 빨강
  return '#cccccc'; // score가 null 등일 때
}

function aggregateSatisfaction() {
  const sums = {};
  const counts = {};

  TX.forEach(t => {
    if (t.score == null) return; // 비어있으면 제외

    if (!sums[t.cat]) {
      sums[t.cat] = 0;
      counts[t.cat] = 0;
    }
    sums[t.cat] += t.score;
    counts[t.cat] += 1;
  });

  const labels = [];
  const values = [];
  const colors = [];

  Object.keys(sums).forEach(cat => {
    const avg = sums[cat] / counts[cat];
    labels.push(cat);
    values.push(Number(avg.toFixed(2)));
    colors.push(getSatisfactionColor(avg));
  });

  return { labels, values, colors };
}

let statsSatisfactionRef = null;

function initStatsSatisfactionPanel() {
  const container = document.querySelector('.stats-satisfaction .chart-placeholder');
  if (!container) return;

  container.innerHTML = ''; // placeholder 제거
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const { labels, values, colors } = aggregateSatisfaction();
  if (!labels.length) {
    container.innerHTML = `<div style="padding:20px; color:#777;">만족도 데이터가 없습니다</div>`;
    return;
  }

  const ctx = canvas.getContext('2d');
  if (statsSatisfactionRef) statsSatisfactionRef.destroy();

  statsSatisfactionRef = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '평균 만족도',
        data: values,
        backgroundColor: colors,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw.toFixed(1)}점`
          }
        }
      }
    }
  });
}

// ================== 지출 기록 패널 ==================

function closeRecordPanel() {
  if (!recordPanel) return;
  recordPanel.classList.remove('open');
}

// 지출 기록 패널 내용 렌더링
function renderRecordPanel() {
  if (!recordContent) return;

  const { total } = aggregateByCategory('month');
  const percent = ((total / BUDGET) * 100).toFixed(1);

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

  const monthTx = TX
    .map((t, idx) => ({ ...t, _idx: idx }))
    .filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d >= sixMonthsAgo && d <= now;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const listHtml = monthTx.length
    ? monthTx.map(t => {
        const [y, m, d] = t.date.split('-');
        return `
          <li class="record-item" data-idx="${t._idx}">
            <div class="record-date">${Number(m)}.${Number(d)}</div>
            <div class="record-main">
              <div class="record-title">${t.cat} 지출</div>
              <div class="record-amount-wrap">
                <span class="record-amount">${t.amount.toLocaleString()}원</span>
                <button type="button" class="record-delete" aria-label="삭제">🗑</button>
              </div>
            </div>
          </li>
        `;
      }).join('')
    : `<li class="record-empty">이번 달 지출 기록이 없습니다</li>`;

  recordContent.innerHTML = `
    <header class="record-header">
      <div class="record-left">
        <button class="record-back" type="button" aria-label="뒤로가기">〈</button>
        <div class="record-info">
          <p class="label">이번달 지출</p>
          <p class="record-total">${total.toLocaleString()}원</p>
        </div>
      </div>
      <div class="record-percent">예산 달성률 ${percent}%</div>
    </header>

    <section>
      <h2 class="record-section-title">지출 기록</h2>
      <ul class="record-list">
        ${listHtml}
      </ul>
    </section>
  `;

  // 뒤로가기 버튼 이벤트
  const backBtn = recordContent.querySelector('.record-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      closeRecordPanel();
    });
  }
}
function openRecordPanel() {
  renderRecordPanel();
  recordPanel.classList.add('open');
}

// 지출 기록 삭제
function setupRecordDeleteHandler() {
  if (!recordContent) return;

  recordContent.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.record-delete');
    if (!deleteBtn) return;

    const itemEl = deleteBtn.closest('.record-item');
    if (!itemEl) return;

    const idx = Number(itemEl.dataset.idx);
    if (Number.isNaN(idx)) return;

    const ok = window.confirm('이 지출 기록을 삭제할까요?');
    if (!ok) return;

    // TX에서 해당 항목 삭제
    TX.splice(idx, 1);

    // 홈 차트 & 요약 다시 계산
    renderHomeCategoryChart();

    // 지출 기록 패널 다시 렌더링
    renderRecordPanel();
  });
}