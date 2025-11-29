// Profile.js

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".toggle-group").forEach(group => {
    const buttons = group.querySelectorAll(".toggle-btn");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("toggle-btn-active"));
        btn.classList.add("toggle-btn-active");
      });
    });
  });
});

// Profile.js

const PROFILE_STORAGE_KEY = "ow_profile";

/**
 * 숫자를 1000단위 콤마로 포맷 (예: 850000 -> "850,000")
 */
function formatNumberWithComma(num) {
  if (num == null || isNaN(num)) return "0";
  return Number(num).toLocaleString();
}

/**
 * "850,000원" 같은 문자열을 숫자로 파싱
 */
function parseNumberFromText(text) {
  if (!text) return 0;
  return parseInt(String(text).replace(/[^0-9]/g, ""), 10) || 0;
}

/**
 * localStorage에서 프로필 불러오기
 */
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

/**
 * localStorage에 프로필 저장
 */
function saveProfileToStorage(profile) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("[profile] save error:", e);
  }
}

/**
 * 화면에 프로필 적용 (표시용 텍스트 바꾸기)
 */
function applyProfileToView(profile) {
  const nameSpan = document.getElementById("profileNameDisplay");
  const budgetSpan = document.getElementById("profileBudgetDisplay");
  const typeSpan = document.getElementById("profileTypeDisplay");

  if (nameSpan) nameSpan.textContent = profile.name || "사용자1";
  if (budgetSpan)
    budgetSpan.textContent = `${formatNumberWithComma(profile.budget)}원`;
  if (typeSpan) typeSpan.textContent = profile.type || "중도형 소비자";
}

/**
 * 폼에 값 채워넣기 (수정 버튼 클릭 시 호출)
 */
function fillEditForm(profile) {
  const nameInput = document.getElementById("profileNameInput");
  const budgetInput = document.getElementById("profileBudgetInput");
  const typeInput = document.getElementById("profileTypeInput");

  if (nameInput) nameInput.value = profile.name || "";
  if (budgetInput) budgetInput.value = profile.budget ?? "";
  if (typeInput) typeInput.value = profile.type || "";
}

document.addEventListener("DOMContentLoaded", () => {
  // 1) 토글 버튼 기존 기능 유지
  document.querySelectorAll(".toggle-group").forEach((group) => {
    const buttons = group.querySelectorAll(".toggle-btn");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("toggle-btn-active"));
        btn.classList.add("toggle-btn-active");
      });
    });
  });

  // 2) 프로필 표시/수정 관련 요소들
  const editBtn = document.getElementById("profileEditBtn");
  const editForm = document.getElementById("profileEditForm");
  const profileView = document.getElementById("profileView");
  const cancelBtn = document.getElementById("profileEditCancelBtn");

  // 3) 처음 로드 시 localStorage에서 값 읽어서 화면에 반영
  const currentProfile = loadProfileFromStorage();
  applyProfileToView(currentProfile);

  if (editBtn && editForm && profileView) {
    // ✔ 프로필 수정 버튼 클릭 시: 폼 열고 현재 값 채우기
    editBtn.addEventListener("click", () => {
      const freshProfile = loadProfileFromStorage();
      fillEditForm(freshProfile);

      profileView.style.display = "none";
      editForm.style.display = "block";
    });
  }

  if (cancelBtn && editForm && profileView) {
    // ✔ 취소 버튼: 폼 숨기고, 표시 모드로
    cancelBtn.addEventListener("click", () => {
      editForm.style.display = "none";
      profileView.style.display = "block";
    });
  }

  if (editForm) {
    // ✔ 저장(폼 submit): localStorage에 저장 + 화면 반영
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

      // 폼 닫고 다시 보기 모드로
      editForm.style.display = "none";
      if (profileView) profileView.style.display = "block";
    });
  }
});

