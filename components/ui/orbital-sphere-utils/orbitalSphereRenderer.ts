export interface OrbitalSphereOptions {
  hue: number;
  particleCount: number;
  sphereRadius: number;
  rotationSpeedX: number;
  rotationSpeedY: number;
  ringCount: number;
  accentColor: string;
  glowColor: string;
}

export const ORBITAL_SPHERE_DEFAULTS: OrbitalSphereOptions = {
  hue: 0,
  particleCount: 850,
  sphereRadius: 180,
  rotationSpeedX: 0.0018,
  rotationSpeedY: 0.0028,
  ringCount: 3,
  accentColor: "#a855f7",
  glowColor: "#c084fc",
};

interface Particle {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  color: string;
  alpha: number;
  size: number;
}

interface RingNode {
  ringIndex: number;
  angle: number;
  speed: number;
  radius: number;
  tiltX: number;
  tiltZ: number;
  size: number;
  pulsePhase: number;
}

export function createOrbitalSphereRenderer(
  canvas: HTMLCanvasElement,
  getOptions: () => OrbitalSphereOptions
) {
  const ctx = canvas.getContext("2d");
  let width = canvas.width;
  let height = canvas.height;
  let rotX = 0.2;
  let rotY = 0.4;
  let targetRotX = 0.2;
  let targetRotY = 0.4;
  let mouseX = 0;
  let mouseY = 0;
  let isMouseOver = false;

  // Generate Fibonacci Sphere Particles
  const particles: Particle[] = [];
  const options = getOptions();
  const count = options.particleCount || 850;
  const sphereR = options.sphereRadius || 180;

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    const r = sphereR + (Math.random() - 0.5) * 12;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    // Violet to cyan gradation
    const isBright = Math.random() > 0.88;
    particles.push({
      x,
      y,
      z,
      baseRadius: r,
      color: isBright ? "#38bdf8" : i % 2 === 0 ? "#c084fc" : "#8b5cf6",
      alpha: 0.25 + Math.random() * 0.7,
      size: isBright ? 2.4 : 1.2 + Math.random() * 1.0,
    });
  }

  // Create Orbital Rings & Data Nodes
  const nodes: RingNode[] = [];
  const rings = [
    { radius: sphereR * 1.35, tiltX: 0.45, tiltZ: -0.25, speed: 0.012 },
    { radius: sphereR * 1.55, tiltX: -0.5, tiltZ: 0.4, speed: -0.009 },
    { radius: sphereR * 1.75, tiltX: 0.85, tiltZ: 0.1, speed: 0.016 },
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
        size: 3.5 + Math.random() * 1.5,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  });

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    mouseY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    targetRotY = mouseX * 0.7;
    targetRotX = -mouseY * 0.7;
    isMouseOver = true;
  };

  const onMouseLeave = () => {
    isMouseOver = false;
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);

  return {
    resize(w: number, h: number) {
      width = w;
      height = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    },

    render() {
      if (!ctx) return;
      const opt = getOptions();

      // Clear with slight trailing blend
      ctx.clearRect(0, 0, width, height);

      // Inertia smoothing
      rotX += (targetRotX - rotX) * 0.05 + opt.rotationSpeedX;
      rotY += (targetRotY - rotY) * 0.05 + opt.rotationSpeedY;

      const cx = width / 2;
      const cy = height / 2;
      const fov = 450;

      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

      // Render Central Ambient Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, opt.sphereRadius * 1.4);
      glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.18)");
      glowGrad.addColorStop(0.5, "rgba(124, 58, 237, 0.08)");
      glowGrad.addColorStop(1, "rgba(5, 3, 10, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, opt.sphereRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Project & Draw Orbital Rings
      rings.forEach((ring) => {
        ctx.save();
        ctx.beginPath();
        const segments = 90;
        let started = false;

        for (let s = 0; s <= segments; s++) {
          const angle = (s / segments) * Math.PI * 2;
          let rx = ring.radius * Math.cos(angle);
          let ry = 0;
          let rz = ring.radius * Math.sin(angle);

          // Ring tilt
          const tCosX = Math.cos(ring.tiltX), tSinX = Math.sin(ring.tiltX);
          const tCosZ = Math.cos(ring.tiltZ), tSinZ = Math.sin(ring.tiltZ);

          const y1 = ry * tCosX - rz * tSinX;
          const z1 = ry * tSinX + rz * tCosX;
          const x2 = rx * tCosZ - y1 * tSinZ;
          const y2 = rx * tSinZ + y1 * tCosZ;

          // Main rotation
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
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.restore();
      });

      // Sort and Draw Particles
      const renderList: { px: number; py: number; pz: number; size: number; color: string; alpha: number; isNode?: boolean }[] = [];

      particles.forEach((p) => {
        // Rotate around Y then X
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const scale = fov / (fov + z2);
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;
        const depthAlpha = Math.max(0.08, Math.min(1, (z2 + sphereR) / (sphereR * 2))) * p.alpha;

        renderList.push({
          px,
          py,
          pz: z2,
          size: Math.max(0.6, p.size * scale),
          color: p.color,
          alpha: depthAlpha,
        });
      });

      // Update & Add Ring Data Nodes
      const now = performance.now() * 0.003;
      nodes.forEach((node) => {
        node.angle += node.speed;
        let rx = node.radius * Math.cos(node.angle);
        let ry = 0;
        let rz = node.radius * Math.sin(node.angle);

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
        const pulse = 0.7 + 0.3 * Math.sin(now + node.pulsePhase);

        renderList.push({
          px,
          py,
          pz: z4,
          size: node.size * scale * pulse,
          color: "#38bdf8",
          alpha: Math.min(1, Math.max(0.3, (z4 + 300) / 600)),
          isNode: true,
        });
      });

      // Depth Sort (Back to Front)
      renderList.sort((a, b) => a.pz - b.pz);

      // Render sorted elements
      renderList.forEach((item) => {
        ctx.save();
        ctx.globalAlpha = item.alpha;
        ctx.fillStyle = item.color;

        if (item.isNode) {
          // Luminous halo around data nodes
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 10;
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
    },

    dispose() {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    },
  };
}
