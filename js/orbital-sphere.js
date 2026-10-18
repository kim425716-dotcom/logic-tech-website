/**
 * Logic Tech — 3D Orbital Sphere Background Engine
 * Three.js / Canvas Structure Flow: Violet Particle Synthesis Sphere,
 * Encrypted Orbital Rings, Luminous Data Nodes, and Interactive Mouse Inertia.
 */
(function () {
  const hero = document.getElementById("hero");
  if (!hero) return;

  // Create canvas container
  const canvasContainer = document.createElement("div");
  canvasContainer.className = "orbital-sphere-container";
  canvasContainer.setAttribute("aria-hidden", "true");

  const canvas = document.createElement("canvas");
  canvas.id = "orbitalSphereCanvas";
  canvasContainer.appendChild(canvas);

  // Insert before hero content
  const heroBg = hero.querySelector(".hero-bg");
  if (heroBg) {
    heroBg.appendChild(canvasContainer);
  } else {
    hero.insertBefore(canvasContainer, hero.firstChild);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;

  // Settings
  const sphereRadius = Math.min(window.innerWidth * 0.22, 220);
  const particleCount = window.innerWidth < 768 ? 480 : 850;
  let rotX = 0.2;
  let rotY = 0.4;
  let targetRotX = 0.2;
  let targetRotY = 0.4;
  let isVisible = true;
  let animFrameId = 0;

  // 1. Generate Fibonacci Sphere Particle Coordinates
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / particleCount);
    const theta = Math.sqrt(particleCount * Math.PI) * phi;
    const r = sphereRadius + (Math.random() - 0.5) * 14;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const isBright = Math.random() > 0.86;
    const isCyan = Math.random() > 0.92;
    particles.push({
      x,
      y,
      z,
      color: isCyan ? "#38bdf8" : isBright ? "#e9d5ff" : (i % 2 === 0 ? "#c084fc" : "#8b5cf6"),
      alpha: 0.25 + Math.random() * 0.7,
      size: isBright ? 2.5 : 1.2 + Math.random() * 1.2,
    });
  }

  // 2. Orbital Rings & Luminous Data Nodes
  const nodes = [];
  const rings = [
    { radius: sphereRadius * 1.35, tiltX: 0.45, tiltZ: -0.28, speed: 0.012 },
    { radius: sphereRadius * 1.6, tiltX: -0.52, tiltZ: 0.42, speed: -0.009 },
    { radius: sphereRadius * 1.82, tiltX: 0.88, tiltZ: 0.12, speed: 0.015 },
  ];

  rings.forEach((ring, rIdx) => {
    const nodeCount = 4 + rIdx * 2;
    for (let n = 0; n < nodeCount; n++) {
      nodes.push({
        ringIndex: rIdx,
        angle: (n / nodeCount) * Math.PI * 2,
        speed: ring.speed,
        radius: ring.radius,
        tiltX: ring.tiltX,
        tiltZ: ring.tiltZ,
        size: 3.5 + Math.random() * 1.8,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  });

  // Handle Resize
  function resize() {
    const rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Mouse Interaction with Inertia
  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const mouseY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    targetRotY = mouseX * 0.65;
    targetRotX = -mouseY * 0.65;
  }, { passive: true });

  hero.addEventListener("mouseleave", () => {
    targetRotX = 0.2;
    targetRotY = 0.4;
  });

  // Main Render Loop
  function render() {
    if (!isVisible) {
      animFrameId = 0;
      return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Inertia & Continuous Spin
    rotX += (targetRotX - rotX) * 0.045 + 0.0012;
    rotY += (targetRotY - rotY) * 0.045 + 0.0024;

    const cx = width / 2;
    const cy = Math.min(height * 0.36, 420);
    const fov = 460;

    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

    // 1. Central Ambient Glow
    const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, sphereRadius * 1.5);
    glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.18)");
    glowGrad.addColorStop(0.45, "rgba(124, 58, 237, 0.08)");
    glowGrad.addColorStop(1, "rgba(5, 3, 10, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, sphereRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Encrypted Orbital Rings
    rings.forEach((ring) => {
      ctx.save();
      ctx.beginPath();
      const segments = 100;
      let started = false;

      for (let s = 0; s <= segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        const rx = ring.radius * Math.cos(angle);
        const ry = 0;
        const rz = ring.radius * Math.sin(angle);

        // Ring tilt transformations
        const tCosX = Math.cos(ring.tiltX), tSinX = Math.sin(ring.tiltX);
        const tCosZ = Math.cos(ring.tiltZ), tSinZ = Math.sin(ring.tiltZ);

        const y1 = ry * tCosX - rz * tSinX;
        const z1 = ry * tSinX + rz * tCosX;
        const x2 = rx * tCosZ - y1 * tSinZ;
        const y2 = rx * tSinZ + y1 * tCosZ;

        // Space rotation
        const x3 = x2 * cosY + z1 * sinY;
        const z3 = -x2 * sinY + z1 * cosY;
        const y3 = y2 * cosX - z3 * sinX;
        const z4 = y2 * sinX + z3 * cosX;

        const scale = fov / (fov + z4);
        const px = cx + x3 * scale;
        const py = cy + y3 * scale;

        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.strokeStyle = "rgba(192, 132, 252, 0.22)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 7]);
      ctx.stroke();
      ctx.restore();
    });

    // 3. Project Particles & Data Nodes
    const renderList = [];

    particles.forEach((p) => {
      const x1 = p.x * cosY + p.z * sinY;
      const z1 = -p.x * sinY + p.z * cosY;
      const y2 = p.y * cosX - z1 * sinX;
      const z2 = p.y * sinX + z1 * cosX;

      const scale = fov / (fov + z2);
      const px = cx + x1 * scale;
      const py = cy + y2 * scale;
      const depthAlpha = Math.max(0.08, Math.min(1, (z2 + sphereRadius) / (sphereRadius * 2))) * p.alpha;

      renderList.push({
        px,
        py,
        pz: z2,
        size: Math.max(0.6, p.size * scale),
        color: p.color,
        alpha: depthAlpha,
      });
    });

    // 4. Update Ring Data Nodes
    const now = performance.now() * 0.003;
    nodes.forEach((node) => {
      node.angle += node.speed;
      const rx = node.radius * Math.cos(node.angle);
      const ry = 0;
      const rz = node.radius * Math.sin(node.angle);

      const tCosX = Math.cos(node.tiltX), tSinX = Math.sin(node.tiltX);
      const tCosZ = Math.cos(node.tiltZ), tSinZ = Math.sin(node.tiltZ);

      const y1 = ry * tCosX - rz * tSinX;
      const z1 = ry * tSinX + rz * tCosX;
      const x2 = rx * tCosZ - y1 * tSinZ;
      const y2 = rx * tSinZ + y1 * tCosZ;

      const x3 = x2 * cosY + z1 * sinY;
      const z3 = -x2 * sinY + z1 * cosY;
      const y3 = y2 * cosX - z3 * sinX;
      const z4 = y2 * sinX + z3 * cosX;

      const scale = fov / (fov + z4);
      const px = cx + x3 * scale;
      const py = cy + y3 * scale;
      const pulse = 0.75 + 0.25 * Math.sin(now + node.pulsePhase);

      renderList.push({
        px,
        py,
        pz: z4,
        size: node.size * scale * pulse,
        color: "#38bdf8",
        alpha: Math.min(1, Math.max(0.35, (z4 + 350) / 700)),
        isNode: true,
      });
    });

    // Depth sort (render farthest first)
    renderList.sort((a, b) => a.pz - b.pz);

    // Draw all elements
    renderList.forEach((item) => {
      ctx.save();
      ctx.globalAlpha = item.alpha;
      ctx.fillStyle = item.color;

      if (item.isNode) {
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(item.px, item.py, item.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(item.px, item.py, item.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(item.px, item.py, item.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    ctx.restore();
    animFrameId = requestAnimationFrame(render);
  }

  // IntersectionObserver to save GPU/CPU when scrolled past hero
  const observer = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible && !animFrameId) {
      animFrameId = requestAnimationFrame(render);
    }
  }, { threshold: 0.1 });

  observer.observe(hero);
  animFrameId = requestAnimationFrame(render);
})();
