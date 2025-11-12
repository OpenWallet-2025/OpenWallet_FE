const viewIntro   = document.getElementById("view-intro");
const viewLogin   = document.getElementById("view-login");
const viewSignup  = document.getElementById("view-signup");

const btnGoLogin  = document.getElementById("btn-go-login");
const btnGoSignup = document.getElementById("btn-go-signup");
const linkGoSignup= document.getElementById("link-go-signup");
const linkGoLogin = document.getElementById("link-go-login");
const cancelButtons = document.querySelectorAll(".btn-cancel");

// 로그인 / 회원가입 버튼
const btnLoginSubmit  = document.getElementById("btn-login-submit");
const btnSignupSubmit = document.getElementById("btn-signup-submit");


(function boot() {
  const session = getSession();
  if (session?.userId) {
    window.location.href = "HomeScreen.html";
    return;
  }
  showView(viewIntro);
})();

function showView(target) {
  [viewIntro, viewLogin, viewSignup].forEach(v => v.classList.remove("active"));
  target.classList.add("active");
}

// 로그인 / 회원가입
btnGoLogin.addEventListener("click", () => showView(viewLogin));
btnGoSignup.addEventListener("click", () => showView(viewSignup));
if (linkGoSignup) linkGoSignup.addEventListener("click", () => showView(viewSignup));
if (linkGoLogin)  linkGoLogin.addEventListener("click", () => showView(viewLogin));

// 취소
cancelButtons.forEach(btn => btn.addEventListener("click", () => showView(viewIntro)));


// 로컬 저장소 
const USERS_KEY   = "ow_users";    // [{ id, pwHash, createdAt }]
const SESSION_KEY = "ow_session";  // { userId, loginAt }

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) ?? [];
  } catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setSession(userId) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    userId, loginAt: Date.now()
  }));
}
function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch { return null; }
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}


async function sha256(text) {
  if (window.crypto?.subtle) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  return text;
}

// 회원가입
btnSignupSubmit.addEventListener("click", async () => {
  const id  = document.getElementById("signup-id").value.trim();
  const pw  = document.getElementById("signup-pw").value.trim();
  const pw2 = document.getElementById("signup-pw2").value.trim();

  // 간단 검증
  if (!id || !pw || !pw2) {
    alert("모든 항목을 입력해주세요.");
    return;
  }
  if (id.length < 3) {
    alert("아이디는 3자 이상이어야 합니다.");
    return;
  }
  if (pw !== pw2) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }
  if (pw.length < 4) {
    alert("비밀번호는 4자 이상이어야 합니다.");
    return;
  }

  const users = getUsers();
  const exists = users.some(u => u.id === id);
  if (exists) {
    alert("이미 존재하는 아이디입니다.");
    return;
  }

  const pwHash = await sha256(pw);
  users.push({ id, pwHash, createdAt: Date.now() });
  saveUsers(users);

  setSession(id);
  window.location.href = "HomeScreen.html";
});


// 로그인
btnLoginSubmit.addEventListener("click", async () => {
  const id = document.getElementById("login-id").value.trim();
  const pw = document.getElementById("login-pw").value.trim();

  if (!id || !pw) {
    alert("아이디와 비밀번호를 입력해주세요.");
    return;
  }

  const users = getUsers();
  const found = users.find(u => u.id === id);
  if (!found) {
    alert("존재하지 않는 아이디입니다.");
    return;
  }

  const pwHash = await sha256(pw);
  if (found.pwHash !== pwHash) {
    alert("비밀번호가 올바르지 않습니다.");
    return;
  }

  setSession(id);
  window.location.href = "HomeScreen.html";
});

