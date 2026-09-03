(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-nav]");

  const setHeaderState = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  // Rolagem de âncoras com duração fixa (não proporcional à distância):
  // o smooth-scroll nativo do navegador pode levar vários segundos numa
  // página longa. html.mk-js desliga o CSS smooth-scroll (ver media-kit.css)
  // e este handler assume, com o mesmo tempo pra pertinho ou pra longe.
  const SCROLL_DURATION_MS = 420;

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const scrollToTarget = (target) => {
    const headerOffset = header ? header.offsetHeight + 16 : 86;
    const startY = window.scrollY;
    const targetY = Math.max(
      0,
      target.getBoundingClientRect().top + startY - headerOffset
    );
    const distance = targetY - startY;

    if (reducedMotion.matches || Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      return;
    }

    const start = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / SCROLL_DURATION_MS);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const hash = link.getAttribute("href");
    if (!hash || hash.length < 2) return; // ignora href="#" puro
    link.addEventListener("click", (event) => {
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      scrollToTarget(target);
      history.pushState(null, "", hash);
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  const closeMenu = (returnFocus = false) => {
    if (!menuButton || !nav || !header) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Abrir menu");
    nav.classList.remove("is-open");
    header.classList.remove("is-open");
    document.body.style.removeProperty("overflow");
    if (returnFocus) menuButton.focus();
  };

  if (menuButton && nav && header) {
    menuButton.addEventListener("click", () => {
      const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(willOpen));
      menuButton.setAttribute("aria-label", willOpen ? "Fechar menu" : "Abrir menu");
      nav.classList.toggle("is-open", willOpen);
      header.classList.toggle("is-open", willOpen);
      document.body.style.overflow = willOpen ? "hidden" : "";
      if (willOpen) nav.querySelector("a")?.focus();
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        closeMenu(true);
      }
      if (event.key !== "Tab" || !nav.classList.contains("is-open")) return;

      const focusable = [menuButton, ...nav.querySelectorAll("a, button")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) closeMenu(false);
    });
  }

  const revealItems = document.querySelectorAll("[data-reveal]");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const counters = document.querySelectorAll("[data-counter]");
  const animateCounter = (element) => {
    if (element.dataset.animated === "true") return;
    element.dataset.animated = "true";
    const finalValue = Number(element.dataset.value);
    const finalDisplay = element.dataset.display || element.textContent.trim();
    if (!Number.isFinite(finalValue) || reducedMotion.matches) {
      element.textContent = finalDisplay;
      return;
    }

    const duration = 780;
    const start = performance.now();
    const formatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatter.format(Math.round(finalValue * eased));
      if (progress < 1) requestAnimationFrame(frame);
      else element.textContent = finalDisplay;
    };
    requestAnimationFrame(frame);
  };

  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(animateCounter);
  }

  const carousel = document.querySelector("[data-carousel]");
  const previousButton = document.querySelector('[data-carousel-button="previous"]');
  const nextButton = document.querySelector('[data-carousel-button="next"]');

  if (carousel && previousButton && nextButton) {
    const cardStep = () => {
      const card = carousel.querySelector(".mk-content-card");
      const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 18;
      return card ? card.getBoundingClientRect().width + gap : carousel.clientWidth * 0.85;
    };
    previousButton.addEventListener("click", () => {
      carousel.scrollBy({ left: -cardStep(), behavior: reducedMotion.matches ? "auto" : "smooth" });
    });
    nextButton.addEventListener("click", () => {
      carousel.scrollBy({ left: cardStep(), behavior: reducedMotion.matches ? "auto" : "smooth" });
    });
  }

  const copyButton = document.querySelector("[data-copy-email]");
  const copyStatus = document.querySelector("[data-copy-status]");
  const copyLabel = document.querySelector("[data-copy-label]");

  const legacyCopy = (value) => {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    textarea.remove();
    if (!success) throw new Error("copy unavailable");
  };

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const email = copyButton.dataset.copyEmail;
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(email);
        else legacyCopy(email);
        if (copyLabel) copyLabel.textContent = "copiado";
        if (copyStatus) copyStatus.textContent = "E-mail copiado para a área de transferência.";
        window.setTimeout(() => {
          if (copyLabel) copyLabel.textContent = "copiar";
          if (copyStatus) copyStatus.textContent = "";
        }, 2600);
      } catch (_error) {
        if (copyStatus) copyStatus.textContent = "Não foi possível copiar. Selecione o e-mail acima.";
      }
    });
  }
})();
