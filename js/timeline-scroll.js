/**
 * Logic Tech — Interactive Horizontal Journey Timeline
 * Powered by GSAP & ScrollTrigger (adapted from components/ui/timeline.tsx)
 */
(function () {
  const section = document.getElementById("how-it-works") || document.getElementById("journey-timeline");
  const slider = document.getElementById("journeySlider");
  const mainLine = document.querySelector(".journey-main-line");

  if (!section || !slider || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const isMobile = window.innerWidth < 600;
  const slidePercent = isMobile ? -78 : -65;

  const stickyWrapper = document.querySelector(".journey-sticky-wrapper");

  // 1. Horizontal Scroll Scrub Timeline
  const mainTl = gsap.timeline({
    scrollTrigger: {
      trigger: stickyWrapper || section,
      start: "top 70px",
      end: () => `+=${section.offsetHeight - window.innerHeight}`,
      scrub: 1,
      pin: stickyWrapper || true,
      anticipatePin: 1,
    },
    defaults: { ease: "none" }
  });

  mainTl.to(slider, {
    xPercent: slidePercent,
  });

  // 2. Animate central journey line width
  if (mainLine) {
    gsap.to(mainLine, {
      width: "98%",
      ease: "none",
      scrollTrigger: {
        trigger: stickyWrapper || section,
        start: "top 70px",
        endTrigger: section,
        end: "bottom bottom",
        scrub: 1,
      }
    });
  }

  // 3. Animate individual milestone stems & dots
  const items = document.querySelectorAll(".journey-item");
  items.forEach((item, idx) => {
    const stem = item.querySelector(".journey-stem-top, .journey-stem-bottom");
    const dot = item.querySelector(".journey-stem-dot-top, .journey-stem-dot-bottom");
    const content = item.querySelector(".journey-content-wrap");

    if (stem && dot) {
      const isTop = stem.classList.contains("journey-stem-top");
      
      const itemTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: `${10 + idx * 12}% top`,
          end: `${22 + idx * 12}% top`,
          scrub: 0.5,
        }
      });

      itemTl
        .to(stem, { scaleY: 1, duration: 0.4, ease: "power1.out" })
        .to(dot, { scale: 1, duration: 0.3, ease: "back.out(2)" }, "<0.2")
        .fromTo(content, { opacity: 0.25, y: isTop ? 15 : -15 }, { opacity: 1, y: 0, duration: 0.4 }, "<");
    }
  });

  // Handle Resize
  window.addEventListener("resize", () => {
    ScrollTrigger.refresh();
  }, { passive: true });
})();
