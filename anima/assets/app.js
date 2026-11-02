(() => {
  "use strict";

  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-primary-nav]");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.dataset.open === "true";
      nav.dataset.open = String(!isOpen);
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });

    nav.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        nav.dataset.open = "false";
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  const featureStatus = document.querySelectorAll("[data-feature-status]");
  const config = window.ANIMA_TACTUS_CONFIG;

  for (const node of featureStatus) {
    const key = node.getAttribute("data-feature-status");
    if (!key || !config?.features || !(key in config.features)) {
      node.textContent = "не определено";
      continue;
    }
    node.textContent = config.features[key] ? "включено" : "выключено";
  }
})();
