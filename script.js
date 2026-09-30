const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");
const imageDialog = document.querySelector("#image-dialog");
const dialogImage = document.querySelector("#dialog-image");
const dialogCaption = document.querySelector("#dialog-caption");

function setMenu(open) {
  if (!menuToggle || !siteNav) return;

  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  siteNav.dataset.open = String(open);
  document.body.classList.toggle("menu-open", open);
}

menuToggle?.addEventListener("click", () => {
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && imageDialog?.open) {
    imageDialog.close();
    return;
  }

  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menuToggle.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) setMenu(false);
});

document.querySelectorAll("[data-lightbox]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    if (!imageDialog || !dialogImage || !dialogCaption) return;

    dialogImage.src = trigger.dataset.src ?? "";
    dialogImage.alt = trigger.dataset.alt ?? "프로젝트 이미지 확대 보기";
    dialogCaption.textContent = trigger.dataset.caption ?? "";
    imageDialog.showModal();
  });
});

document.querySelector("[data-dialog-close]")?.addEventListener("click", () => {
  imageDialog?.close();
});

imageDialog?.addEventListener("click", (event) => {
  if (event.target === imageDialog) imageDialog.close();
});

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
