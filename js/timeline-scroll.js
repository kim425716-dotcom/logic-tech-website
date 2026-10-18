/**
 * Logic Tech — Interactive Horizontal Journey Timeline
 * High-Contrast Symmetrical 6-Phase Engineering Lifecycle
 * Powered by GSAP & ScrollTrigger
 */
(function () {
  const section = document.getElementById("how-it-works") || document.getElementById("journey-timeline");
  const slider = document.getElementById("journeySlider");
  const mainLine = document.querySelector(".journey-main-line");
  const stickyWrapper = document.querySelector(".journey-sticky-wrapper");

  if (!section || !slider || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // 1. Horizontal Scroll Scrub Timeline
  const mainTl = gsap.timeline({
    scrollTrigger: {
      trigger: stickyWrapper || section,
      start: "top 70px",
      end: () => `+=${section.offsetHeight - window.innerHeight}`,
      scrub: 1,
      pin: stickyWrapper || true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
    defaults: { ease: "none" }
  });

  // Dynamically calculate horizontal distance to scroll completely to the end
  mainTl.to(slider, {
    x: () => -(slider.scrollWidth - window.innerWidth + 80),
  });

  // 2. Animate central horizon line width
  if (mainLine) {
    gsap.to(mainLine, {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: stickyWrapper || section,
        start: "top 70px",
        end: () => `+=${section.offsetHeight - window.innerHeight}`,
        scrub: 1,
      }
    });
  }

  // 3. Highlight milestones in chronological sequence (Phase 1 -> Phase 6)
  const items = Array.from(document.querySelectorAll(".journey-item"))
    .sort((a, b) => Number(a.dataset.phase || 0) - Number(b.dataset.phase || 0));

  items.forEach((item, idx) => {
    const isTop = item.closest(".journey-row-top") !== null;
    const card = item.querySelector(".journey-card");

    const startPercent = 5 + idx * 14;
    const endPercent = startPercent + 14;

    ScrollTrigger.create({
      trigger: stickyWrapper || section,
      start: () => `top+=${(section.offsetHeight - window.innerHeight) * (startPercent / 100)} 70px`,
      end: () => `top+=${(section.offsetHeight - window.innerHeight) * (endPercent / 100)} 70px`,
      onToggle: (self) => {
        if (self.isActive) {
          item.classList.add("is-active");
          if (card) gsap.to(card, { y: isTop ? -6 : 6, duration: 0.3, overwrite: "auto" });
        } else {
          item.classList.remove("is-active");
          if (card) gsap.to(card, { y: 0, duration: 0.3, overwrite: "auto" });
        }
      }
    });
  });

  // Handle Resize
  window.addEventListener("resize", () => {
    ScrollTrigger.refresh();
  }, { passive: true });
})();
