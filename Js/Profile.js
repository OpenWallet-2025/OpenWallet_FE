// Profile.js

// ---------------- 공통 토글 버튼 ----------------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".toggle-group").forEach((group) => {
    const buttons = group.querySelectorAll(".toggle-btn");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("toggle-btn-active"));
        btn.classList.add("toggle-btn-active");
      });
    });
  });
});

// ---------------- 프로필 상수/유틸 ----------------
const PROFILE_STORAGE_KEY = "ow_profile";

const CATEGORY_KR_TO_ENUM = {
  "식비": "FOOD",
  "생활": "LIVING",
  "교통비": "TRANSPORT",
  "의료·건강": "HEALTH",
  "취미·문화생활": "CULTURE",
  "교육·자기계발": "EDUCATION",
  "의류": "CLOTHING",
  "기타": "ETC",
};

const CATEGORY_ENUM_TO_KR = {
  FOOD: "식비",
  LIVING: "생활",
  TRANSPORT: "교통비",
  HEALTH: "의료·건강",
  CULTURE: "취미·문화생활",
  EDUCATION: "교육·자기계발",
  CLOTHING: "의류",
  ETC: "기타",
  SUBSCRIBE: "정기지출", // ← 나중에 정기지출 API 쓸 때 대비용. 싫으면 이 줄도 삭제 가능.
};

/** 숫자를 1000단위 콤마로 포맷 (예: 850000 -> "850,000") */
function formatNumberWithComma(num) {
  if (num == null || isNaN(num)) return "0";
  return Number(num).toLocaleString();
}

/** "850,000원" 같은 문자열을 숫자로 파싱 */
function parseNumberFromText(text) {
  if (!text) return 0;
  return parseInt(String(text).replace(/[^0-9]/g, ""), 10) || 0;
}

/** localStorage에서 프로필 불러오기 */
function loadProfileFromStorage() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      // 기본값
      return {
        name: "사용자1",
        budget: 850000,
        type: "중도형 소비자",
      };
    }
    const data = JSON.parse(raw);
    return {
      name: data.name || "사용자1",
      budget:
        typeof data.budget === "number"
          ? data.budget
          : parseNumberFromText(data.budget),
      type: data.type || "중도형 소비자",
    };
  } catch (e) {
    console.error("[profile] load error:", e);
    return {
      name: "사용자1",
      budget: 850000,
      type: "중도형 소비자",
    };
  }
}

/** localStorage에 프로필 저장 */
function saveProfileToStorage(profile) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("[profile] save error:", e);
  }
}

/** 화면에 프로필 적용 (표시용 텍스트 바꾸기) */
function applyProfileToView(profile) {
  const nameSpan = document.getElementById("profileNameDisplay");
  const budgetSpan = document.getElementById("profileBudgetDisplay");
  const typeSpan = document.getElementById("profileTypeDisplay");

  if (nameSpan) nameSpan.textContent = profile.name || "사용자1";
  if (budgetSpan)
    budgetSpan.textContent = `${formatNumberWithComma(profile.budget)}원`;
  if (typeSpan) typeSpan.textContent = profile.type || "중도형 소비자";
}

/** 폼에 값 채워넣기 (수정 버튼 클릭 시 호출) */
function fillEditForm(profile) {
  const nameInput = document.getElementById("profileNameInput");
  const budgetInput = document.getElementById("profileBudgetInput");
  const typeInput = document.getElementById("profileTypeInput");

  if (nameInput) nameInput.value = profile.name || "";
  if (budgetInput) budgetInput.value = profile.budget ?? "";
  if (typeInput) typeInput.value = profile.type || "";
}

// ---------------- 프로필 표시/수정 로직 ----------------
document.addEventListener("DOMContentLoaded", () => {
  const editBtn = document.getElementById("profileEditBtn");
  const editForm = document.getElementById("profileEditForm");
  const profileView = document.getElementById("profileView");
  const cancelBtn = document.getElementById("profileEditCancelBtn");

  // 처음 로드 시 localStorage에서 값 읽어서 화면에 반영
  const currentProfile = loadProfileFromStorage();
  applyProfileToView(currentProfile);

  if (editBtn && editForm && profileView) {
    editBtn.addEventListener("click", () => {
      const freshProfile = loadProfileFromStorage();
      fillEditForm(freshProfile);

      profileView.style.display = "none";
      editForm.style.display = "block";
    });
  }

  if (cancelBtn && editForm && profileView) {
    cancelBtn.addEventListener("click", () => {
      editForm.style.display = "none";
      profileView.style.display = "block";
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("profileNameInput");
      const budgetInput = document.getElementById("profileBudgetInput");
      const typeInput = document.getElementById("profileTypeInput");

      const name = nameInput?.value?.trim() || "사용자1";
      const budget = budgetInput
        ? parseInt(budgetInput.value || "0", 10) || 0
        : 0;
      const type = typeInput?.value?.trim() || "중도형 소비자";

      const newProfile = { name, budget, type };
      saveProfileToStorage(newProfile);
      applyProfileToView(newProfile);

      editForm.style.display = "none";
      if (profileView) profileView.style.display = "block";
    });
  }
});

// ---------------- 지출 패널 공통 ----------------
function openAddPanel(contentHTML = "") {
  const backdrop = document.getElementById("addPanel");
  const contentBox = document.getElementById("addPanelContent");

  if (!backdrop || !contentBox) return;

  contentBox.innerHTML = contentHTML;
  backdrop.classList.add("show");
}

function closeAddPanel() {
  const backdrop = document.getElementById("addPanel");
  if (backdrop) backdrop.classList.remove("show");
}

// 배경 클릭 시 패널 닫기
document.addEventListener("click", (e) => {
  if (e.target.id === "addPanel") {
    closeAddPanel();
  }
});

// ---------------- 즐겨찾기 목록 불러오기 ----------------
async function loadFavoritesToView() {
  const favSection = document.querySelectorAll(".profile-section")[2];
  if (!favSection) return;

  const listEl = favSection.querySelector(".favorite-list");
  if (!listEl) return;

  // 기존 목록 비우기
  listEl.innerHTML = "";

  try {
    const res = await fetch("http://openwallet2025.com/api/favorite");
    if (!res.ok) throw new Error("API 응답 오류");

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      listEl.innerHTML = `
        <li class="favorite-item">
          <p class="favorite-name">등록된 즐겨찾기가 없습니다.</p>
        </li>
      `;
      return;
    }

    data.forEach((item) => {
      const title = item.title || "이름 없음";
      const priceNum = Number(item.price || 0);
      const catKr = CATEGORY_ENUM_TO_KR[item.category] || "기타";

      const li = document.createElement("li");
      li.className = "favorite-item";

      li.innerHTML = `
        <div class="favorite-left">
          <p class="favorite-name">상품명: ${title}</p>
          <p class="favorite-meta">금액: ${formatNumberWithComma(
            priceNum
          )}원, 카테고리: ${catKr}</p>
        </div>

        <button class="favorite-delete-btn" data-id="${item.id}">
          <img src="img/delete.png" class="favorite-delete-icon">
        </button>
      `;

      listEl.appendChild(li);
    });

    // 삭제 버튼 이벤트 (항목별 쓰레기통)
    document.querySelectorAll(".favorite-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        if (!id) return;

        const html = `
          <header class="add-header">
            <h1>즐겨찾기 삭제</h1>
          </header>

          <div class="add-form">
            <p style="font-size:14px; margin-bottom:16px;">
              선택한 즐겨찾기 항목을 삭제하시겠습니까?
            </p>

            <div class="add-actions">
              <button type="button" class="add-submit" id="favDeleteYes">삭제</button>
              <button type="button" class="add-cancel" id="favDeleteNo">취소</button>
            </div>
          </div>
        `;

        openAddPanel(html);

        document
          .getElementById("favDeleteNo")
          .addEventListener("click", () => {
            closeAddPanel();
          });

        document
          .getElementById("favDeleteYes")
          .addEventListener("click", async () => {
            try {
              const res = await fetch(
                `http://openwallet2025.com/api/favorite/${id}`,
                {
                  method: "DELETE",
                }
              );

              if (!res.ok) throw new Error("삭제 실패");

              closeAddPanel();
              loadFavoritesToView();
            } catch (err) {
              alert("삭제 실패: " + err.message);
            }
          });
      });
    });
  } catch (err) {
    console.error("즐겨찾기 로딩 오류:", err);
  }
}

// ---------------- 즐겨찾기 추가 버튼 ----------------
document.addEventListener("DOMContentLoaded", () => {
  const favSection = document.querySelectorAll(".profile-section")[2];
  if (!favSection) return;

  const favAddBtn = favSection.querySelectorAll(".text-icon-btn")[0];

  // 페이지 들어오자마자 즐겨찾기 목록 불러오기
  loadFavoritesToView();

  // ---- 즐겨찾기 추가 ----
  if (favAddBtn) {
    favAddBtn.addEventListener("click", () => {
      const html = `
        <header class="add-header">
          <h1>즐겨찾기 추가</h1>
        </header>

        <form id="favAddForm" class="add-form">
          <div class="add-field">
            <label class="add-label" for="favName">항목명</label>
            <div class="add-name-row">
              <input id="favName" class="add-input" type="text" placeholder="예: 아메리카노" />
            </div>
          </div>

          <div class="add-field">
            <label class="add-label" for="favPrice">금액</label>
            <div class="add-amount-row">
              <input id="favPrice" class="add-input" inputmode="numeric" placeholder="0" />
            </div>
          </div>

          <div class="add-field">
            <label class="add-label" for="favCategory">카테고리</label>
            <div class="add-category-row">
              <select id="favCategory" class="add-select">
                <option value="식비">식비</option>
                <option value="생활">생활</option>
                <option value="교통비">교통비</option>
                <option value="의료·건강">의료·건강</option>
                <option value="교육·자기계발">교육·자기계발</option>
                <option value="의류">의류</option>
                <option value="취미·문화생활">취미·문화생활</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          <div class="add-actions">
            <button type="submit" class="add-submit">추가</button>
            <button type="button" class="add-cancel" id="favAddCancel">취소</button>
          </div>
        </form>
      `;

      openAddPanel(html);

      const form = document.getElementById("favAddForm");
      const cancelBtn = document.getElementById("favAddCancel");

      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          closeAddPanel();
        });
      }

      if (!form) return;

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("favName").value.trim();
        const price = Number(
          document.getElementById("favPrice").value || 0
        );
        const catKr = document.getElementById("favCategory").value.trim();
        const catEnum = CATEGORY_KR_TO_ENUM[catKr];

        if (!name || !catEnum) {
          alert("상품명과 카테고리를 입력하세요.");
          return;
        }

        if (price <= 0) {
          alert("금액은 0원보다 커야 합니다.");
          return;
        }

        try {
          const res = await fetch("http://openwallet2025.com/api/favorite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: name,
              price: price,
              category: catEnum,
            }),
          });

          if (!res.ok) throw new Error("API 오류");

          alert("즐겨찾기에 추가되었습니다!");
          closeAddPanel();

          await loadFavoritesToView();
        } catch (err) {
          alert("추가 실패: " + err.message);
        }
      });
    });
  }
});
