// Js/login.js
function showToast(message) {
  const toast = document.getElementById("auth-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function switchPanel(target) {
  const tabs = document.querySelectorAll(".auth-tab");
  const panels = document.querySelectorAll(".auth-form-panel");

  tabs.forEach((t) =>
    t.classList.toggle("active", t.dataset.target === target)
  );
  panels.forEach((p) =>
    p.classList.toggle("active", p.id === `panel-${target}`)
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const linkGoSignup = document.getElementById("link-go-signup");
  const linkGoLogin = document.getElementById("link-go-login");

  const btnLoginSubmit = document.getElementById("btn-login-submit");
  const btnSignupSubmit = document.getElementById("btn-signup-submit");

  const loginId = document.getElementById("login-id");
  const loginPw = document.getElementById("login-pw");

  const signupPw = document.getElementById("signup-pw");
  const signupPw2 = document.getElementById("signup-pw2");
  const signupNote = document.getElementById("signup-note");

  // 탭 전환
  if (tabLogin) tabLogin.addEventListener("click", () => switchPanel("login"));
  if (tabSignup) tabSignup.addEventListener("click", () => switchPanel("signup"));

  // 아래 링크로도 전환
  if (linkGoSignup)
    linkGoSignup.addEventListener("click", () => switchPanel("signup"));
  if (linkGoLogin)
    linkGoLogin.addEventListener("click", () => switchPanel("login"));

  // 로그인 클릭 (데모: 플래그 저장 후 index.html로 이동)
  if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener("click", () => {
      const id = loginId ? loginId.value.trim() : "";
      const pw = loginPw ? loginPw.value.trim() : "";

      if (!id || !pw) {
        showToast("아이디와 비밀번호를 모두 입력해 주세요.");
        return;
      }

      // TODO: 나중에 실제 API 호출 자리
      try {
        localStorage.setItem("ow_logged_in", "true");
      } catch (e) {
        console.warn("localStorage 사용 불가", e);
      }

      window.location.href = "index.html";
    });
  }

  // 회원가입 비밀번호 체크
  if (signupPw && signupPw2 && signupNote) {
    const checkPw = () => {
      const pw1 = signupPw.value.trim();
      const pw2 = signupPw2.value.trim();

      if (!pw1 && !pw2) {
        signupNote.textContent = "";
        signupNote.className = "form-note";
        return;
      }

      if (pw1.length < 8) {
        signupNote.textContent = "비밀번호는 8자 이상으로 설정해 주세요.";
        signupNote.className = "form-note error";
        return;
      }

      if (pw1 !== pw2) {
        signupNote.textContent = "비밀번호가 일치하지 않습니다.";
        signupNote.className = "form-note error";
        return;
      }

      signupNote.textContent = "좋아요! 비밀번호가 안전하게 설정되었어요.";
      signupNote.className = "form-note ok";
    };

    signupPw.addEventListener("input", checkPw);
    signupPw2.addEventListener("input", checkPw);
  }

  // 회원가입 클릭 (데모: 그냥 로그인 탭으로)
  if (btnSignupSubmit) {
    btnSignupSubmit.addEventListener("click", () => {
      showToast("회원가입 정보가 저장된다고 가정하고, 로그인 화면으로 이동합니다.");
      switchPanel("login");
    });
  }
});
