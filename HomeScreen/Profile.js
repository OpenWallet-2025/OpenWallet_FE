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
