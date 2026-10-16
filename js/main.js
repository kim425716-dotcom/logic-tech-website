/* =============================================
   LOGIC TECH — JavaScript
   ============================================= */

/* ---- API Configuration ---- */
if (typeof window.apiFetch !== 'function') {
  const API_BASE = window.location.port === '5500' ? 'http://localhost:8080' : '';
  window.apiFetch = function apiFetch(path, opts = {}) {
    return fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
  };
}
var apiFetch = window.apiFetch;

/* ---- Smooth scroll offset for fixed navbar ---- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;
    try {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 72;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
        // close mobile menu
        document.getElementById('mobileMenu')?.classList.remove('open');
        document.getElementById('menuIcon')?.classList.replace('fa-xmark', 'fa-bars');
      }
    } catch (err) {
      // ignore invalid selector
    }
  });
});

/* ---- Mobile menu toggle ---- */
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const menuIcon = document.getElementById('menuIcon');

mobileMenuBtn?.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  menuIcon.classList.toggle('fa-bars', !isOpen);
  menuIcon.classList.toggle('fa-xmark', isOpen);
});

/* ---- Theme toggle ---- */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const body = document.body;

function applyTheme(dark) {
  // Signal transition start — CSS uses this to suppress jank on complex elements
  body.classList.add('is-theme-transitioning');
  if (dark) {
    body.classList.add('dark');
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
  } else {
    body.classList.remove('dark');
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
  }
  try {
    localStorage.setItem('logictech-theme', dark ? 'dark' : 'light');
    localStorage.setItem('lt-theme', dark ? 'dark' : 'light');
  } catch (e) {}
  // Remove flag after transition completes
  setTimeout(() => body.classList.remove('is-theme-transitioning'), 420);
}


const savedTheme = localStorage.getItem('logictech-theme') || localStorage.getItem('lt-theme');
applyTheme(savedTheme === 'dark');

themeToggle?.addEventListener('click', () => {
  applyTheme(!body.classList.contains('dark'));
});

/* ---- Intersection Observer for scroll animations ---- */
const scrollEls = document.querySelectorAll('.animate-on-scroll');
const obs = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 60);
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

scrollEls.forEach(el => obs.observe(el));

/* ---- Navbar scroll shadow ---- */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (navbar) {
    navbar.style.boxShadow = window.scrollY > 10
      ? '0 4px 30px rgba(0,0,0,0.4)'
      : 'none';
  }
});

/* ---- Update footer year ---- */
const footerYear = document.getElementById('footerYear');
if (footerYear) footerYear.textContent = `© ${new Date().getFullYear()} Logic Tech. All rights reserved.`;

/* ---- Toast notifications ---- */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ---- Testimonials data ---- */
const testimonials = [
  { name: 'Alice Wanjiku', role: 'CTO @ FinanceHub Kenya', text: 'Logic Tech transformed our banking platform. Their cloud migration cut costs by 40% and improved uptime to 99.99%. Absolutely world-class engineering.', stars: 5 },
  { name: 'David Ochieng', role: 'VP Engineering @ RetailMax', text: 'The custom ERP system they built handles millions of transactions daily without a hiccup. Their team understands enterprise needs like no other.', stars: 5 },
  { name: 'Sarah Mitchell', role: 'Head of IT @ GlobalInsure', text: 'Outstanding cybersecurity audit. They identified critical vulnerabilities and implemented a zero-trust architecture that passed our SOC 2 compliance.', stars: 5 },
  { name: 'James Kariuki', role: 'CEO @ AgriTech Africa', text: 'From mobile app to data analytics pipeline, Logic Tech delivered everything on time and under budget. Their communication throughout was exceptional.', stars: 5 },
  { name: 'Priya Sharma', role: 'Director @ CloudFirst Solutions', text: 'Our AWS infrastructure is now automated and self-healing. Logic Tech\'s DevOps team saved us 60 hours of manual work every month.', stars: 5 },
  { name: 'Michael Torres', role: 'CIO @ MediCare Systems', text: 'HIPAA-compliant platform delivered in 3 months. Logic Tech\'s attention to security and regulatory detail is unmatched in the industry.', stars: 5 },
  { name: 'Amina Hassan', role: 'Founder @ EduTech East Africa', text: 'Our e-learning platform now serves 50,000 students. The React Native app they built has a 4.8 star rating on both app stores.', stars: 5 },
  { name: 'Robert Ndungu', role: 'MD @ PropertyPro Kenya', text: 'Incredible real estate marketplace built from scratch. The team\'s full-stack expertise and clean code quality exceeded our expectations completely.', stars: 5 },
];

function buildTestimonialCard(t) {
  const initials = t.name.split(' ').map(n => n[0]).join('').toUpperCase();
  return `
    <div class="testimonial-card">
      <div class="tcard-stars">${'★'.repeat(t.stars)}</div>
      <p class="tcard-text">"${t.text}"</p>
      <div class="tcard-author">
        <div class="tcard-avatar">
          <img src="https://i.pravatar.cc/80?u=${encodeURIComponent(t.name)}" alt="${t.name}" onerror="this.parentElement.textContent='${initials}'" />
        </div>
        <div>
          <p class="tcard-name">${t.name}</p>
          <p class="tcard-role">${t.role}</p>
        </div>
      </div>
    </div>
  `;
}

const marqueeTrack = document.getElementById('marqueeTrack');
if (marqueeTrack) {
  const doubled = [...testimonials, ...testimonials];
  marqueeTrack.innerHTML = doubled.map(buildTestimonialCard).join('');
}

/* ---- Comprehensive FAQ Data ---- */
let faqs = [
  // General & Onboarding
  {
    category: 'general',
    q: 'How do I get started with Logic Tech?',
    a: 'Simply fill out the contact form or click "Get Started Free" to submit your project requirements. A Senior Solutions Architect will reach out within 24 hours to schedule a 30-minute discovery call and review your architectural needs.'
  },
  {
    category: 'general',
    q: 'How quickly can a dedicated team start on our project?',
    a: 'For project-based engagements, we typically kick off Sprint 0 within 5 to 7 business days of scope approval. For dedicated squad augmentations, developers can be integrated into your Slack and Jira environments in as little as 3 to 5 business days.'
  },
  {
    category: 'general',
    q: 'How do you handle daily communication and timezone differences?',
    a: 'Every client has direct Slack or Microsoft Teams access to their engineering team. We establish a guaranteed 4-hour daily overlap with your primary timezone (EST, GMT, or EAT), conduct daily async standups, and host bi-weekly sprint demo calls.'
  },
  {
    category: 'general',
    q: 'Can you work alongside our in-house developers?',
    a: 'Yes. Over 60% of our engagements are hybrid staff augmentation. Our senior engineers integrate directly into your Git workflows, follow your coding standards, participate in peer code reviews, and report to your VP of Engineering or Tech Lead.'
  },

  // Technical & Engineering
  {
    category: 'technical',
    q: 'What technologies and frameworks does Logic Tech specialize in?',
    a: 'We work across the modern enterprise stack: Frontend (React, Next.js 14, Vue, TypeScript), Backend (Node.js, Python/FastAPI/Django, Go, Java Spring Boot), Mobile (React Native, Flutter, Swift, Kotlin), Cloud & DevOps (AWS, GCP, Azure, Kubernetes, Terraform, Docker), and Databases (PostgreSQL, MongoDB, Redis, Snowflake).'
  },
  {
    category: 'technical',
    q: 'Can you modernize or refactor our legacy codebase?',
    a: 'Absolutely. We specialize in brownfield development and legacy migration. We conduct automated security and architectural audits, untangle monolithic code into event-driven microservices, improve unit test coverage, and modernize databases with zero user downtime.'
  },
  {
    category: 'technical',
    q: 'What are your engineering quality and testing standards?',
    a: 'All code adheres to strict clean architecture principles and must pass automated CI/CD linting, SonarQube static analysis, and a minimum of 85% automated test coverage (unit, integration, and end-to-end testing with Cypress/Playwright) prior to merging.'
  },
  {
    category: 'technical',
    q: 'Do you help with database migration and optimization?',
    a: 'Yes. We design schema optimizations, establish read replicas, implement Redis caching layers, and perform zero-downtime database migrations between on-premise servers and managed cloud databases like AWS RDS or Google Cloud SQL.'
  },
  {
    category: 'technical',
    q: 'How do you incorporate Artificial Intelligence and Machine Learning?',
    a: 'We build custom AI integrations including enterprise LLM wrappers, vector databases (Pinecone, pgvector), retrieval-augmented generation (RAG) pipelines, automated document analysis, and predictive business intelligence models.'
  },

  // Security, IP & Compliance
  {
    category: 'security',
    q: 'Who owns the intellectual property (IP) of the software created?',
    a: 'You do. 100%. All source code, design assets, database schemas, and intellectual property are exclusively owned by you from the moment they are committed. We sign an explicit IP Assignment Agreement before work commences.'
  },
  {
    category: 'security',
    q: 'Do you sign Non-Disclosure Agreements (NDAs)?',
    a: 'Yes. We enforce bilateral NDAs before reviewing any proprietary specifications, confidential diagrams, or business models. All staff members and engineers are legally bound by strict confidentiality terms.'
  },
  {
    category: 'security',
    q: 'Are your development practices SOC 2 and ISO compliant?',
    a: 'Yes. Our development workflows follow ISO 27001 and SOC 2 Type II controls. We utilize multi-factor authentication (MFA), role-based access control (RBAC), end-to-end encrypted storage, and automated dependency vulnerability scanning (Snyk/Dependabot).'
  },
  {
    category: 'security',
    q: 'Do you perform security penetration testing?',
    a: 'Yes. Prior to production cutover, our certified ethical hackers perform OWASP Top 10 vulnerability assessments, white-box and black-box penetration tests, and API security stress testing, providing a signed compliance remediation report.'
  },
  {
    category: 'security',
    q: 'Where is our code stored during development?',
    a: 'Code is pushed directly to your organization’s private GitHub, GitLab, or Bitbucket repositories from Day 1. We do not store proprietary source code on personal machines or unmanaged local drives.'
  },

  // Pricing & Contracts
  {
    category: 'pricing',
    q: 'How are project payments structured?',
    a: 'For fixed-scope projects, we utilize milestone-tied billing (e.g., 30% initial deposit, 35% mid-sprint milestone, 35% final user acceptance & production deployment). For dedicated squads, we bill on a predictable monthly retainer.'
  },
  {
    category: 'pricing',
    q: 'Are there any hidden costs or surprise invoices?',
    a: 'None. All contracts feature transparent itemized scopes, fixed milestone caps, and clearly defined deliverables. Cloud hosting fees (e.g., AWS/GCP bills) and third-party SaaS subscriptions are paid directly by your company.'
  },
  {
    category: 'pricing',
    q: 'What happens if project requirements change mid-development?',
    a: 'We embrace Agile change management. If new features or scope adjustments are requested, your Project Manager will estimate the required sprint hours and provide a clear Change Order approval before any work begins.'
  },
  {
    category: 'pricing',
    q: 'What currencies and payment methods do you accept?',
    a: 'We accept payments in USD, EUR, GBP, and KES via international wire transfer (SWIFT), Stripe, ACH, and corporate card.'
  },

  // Support & SLAs
  {
    category: 'support',
    q: 'Do you provide a warranty after the project is launched?',
    a: 'Yes. Every project includes an ironclad 60-day post-launch warranty where our engineering team resolves any bugs or regression issues related to the delivered scope free of charge.'
  },
  {
    category: 'support',
    q: 'What ongoing maintenance and SLA options do you offer?',
    a: 'We offer flexible 24/7 Managed Services & SLA tiers including guaranteed 15-minute emergency incident response, continuous OS and security patching, automated server health monitoring, and proactive cloud cost optimization.'
  },
  {
    category: 'support',
    q: 'Will you train our internal engineering and support team?',
    a: 'Yes. During Phase 6 Handover, we provide comprehensive technical documentation, architecture walkthrough recordings, and live training sessions for your internal DevOps and engineering team.'
  },
  {
    category: 'support',
    q: 'Can we scale our dedicated engineering team up or down?',
    a: 'Yes. Dedicated squad sizes can be adjusted up or down with a standard 30-day notice, allowing you to scale engineering capacity to match your funding rounds and product roadmap.'
  }
];

function buildFAQItem(faq, idx) {
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
  return `
    <div class="faq-item" data-idx="${idx}" data-category="${escapeHtml(faq.category)}">
      <button class="faq-q" onclick="toggleFAQ(${idx})">
        <span>${escapeHtml(faq.q)}</span>
        <i class="fa-solid fa-chevron-down"></i>
      </button>
      <div class="faq-a"><p>${escapeHtml(faq.a)}</p></div>
    </div>
  `;
}

const faqList = document.getElementById('faqList');
const faqSearch = document.getElementById('faqSearch');
const faqCategories = document.getElementById('faqCategories');
let currentCategory = 'all';

function renderFAQs() {
  if (!faqList) return;
  const searchVal = faqSearch ? faqSearch.value.toLowerCase().trim() : '';

  const filtered = faqs.filter(f => {
    const matchesCategory = currentCategory === 'all' || f.category === currentCategory;
    const matchesSearch = !searchVal || f.q.toLowerCase().includes(searchVal) || f.a.toLowerCase().includes(searchVal);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    faqList.innerHTML = `<div class="faq-empty"><p><i class="fa-solid fa-circle-exclamation" style="margin-right:0.5rem;color:var(--amber);"></i> No questions found matching your criteria. Try adjusting your search term or category filter.</p></div>`;
    return;
  }

  faqList.innerHTML = filtered.map((f, i) => buildFAQItem(f, i)).join('');
  // open first item
  const first = faqList.querySelector('.faq-item');
  if (first) first.classList.add('open');
}

function toggleFAQ(idx) {
  const items = faqList?.querySelectorAll('.faq-item');
  if (!items) return;
  items.forEach((item, i) => {
    if (i === idx) item.classList.toggle('open');
    else item.classList.remove('open');
  });
}

// Category filter pills click
if (faqCategories) {
  faqCategories.querySelectorAll('.faq-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      faqCategories.querySelectorAll('.faq-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-category') || 'all';
      renderFAQs();
    });
  });
}

if (faqSearch) {
  faqSearch.addEventListener('input', () => {
    renderFAQs();
  });
}

renderFAQs();

if (faqList) {
  apiFetch('/api/faqs')
    .then(response => {
      if (!response.ok) throw new Error('FAQ service is unavailable.');
      return response.json();
    })
    .then(items => {
      faqs = items;
      renderFAQs();
    })
    .catch(() => {
      faqList.innerHTML = '<div class="faq-empty"><p>FAQs could not be loaded. Please refresh the page or contact us directly.</p></div>';
    });
}

/* ---- Contact form ---- */
const contactForm = document.getElementById('contactForm');
const contactSuccess = document.getElementById('contactSuccess');
const contactSubmit = document.getElementById('contactSubmit');

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(contactForm);
  const name = data.get('name');
  const email = data.get('email');
  const message = data.get('message');

  if (!name || !email || !message) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  contactSubmit.textContent = 'Sending...';
  contactSubmit.disabled = true;

  try {
    const response = await apiFetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(data.entries()))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your inquiry could not be sent.');
    contactForm.classList.add('hidden');
    contactSuccess.classList.remove('hidden');
    showToast('Message sent successfully!', 'success');
  } catch (error) {
    showToast(error.message || 'The server could not be reached. Please try again.', 'error');
    contactSubmit.innerHTML = 'Send Project Inquiry <i class="fa-solid fa-paper-plane"></i>';
    contactSubmit.disabled = false;
  }
});

function resetContact() {
  contactSuccess?.classList.add('hidden');
  contactForm?.classList.remove('hidden');
  contactForm?.reset();
  if (contactSubmit) {
    contactSubmit.innerHTML = 'Send Project Inquiry <i class="fa-solid fa-paper-plane"></i>';
    contactSubmit.disabled = false;
  }
}
window.resetContact = resetContact;

/* ---- Scroll progress bar ---- */
(function() {
  var bar = document.createElement('div');
  bar.id = 'ltScrollProgress';
  document.body.prepend(bar);
  window.addEventListener('scroll', function() {
    var scrolled = window.scrollY;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
  }, { passive: true });
})();

/* ---- Active nav link highlight ---- */
(function() {
  var current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function(a) {
    var href = a.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

/* ---- Pricing Tabs ---- */
(function () {
  var tabs = document.querySelectorAll('.pricing-tab');
  if (!tabs.length) return;

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var targetId = tab.getAttribute('data-target');
      var targetPanel = document.getElementById(targetId);
      if (!targetPanel) return;

      // Deactivate all tabs & panels
      tabs.forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.pricing-panel').forEach(function (p) {
        p.classList.remove('active');
      });

      // Activate clicked tab and target panel
      tab.classList.add('active');
      targetPanel.classList.add('active');

      // Smooth scroll to keep panel in view on mobile
      if (window.innerWidth < 768) {
        targetPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
})();

/* ---- Category Filter Pills ---- */
(function () {
  var pills = document.querySelectorAll('.cat-pill');
  if (!pills.length) return;

  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var filter = pill.getAttribute('data-filter');

      // Update active pill state
      pills.forEach(function (p) { p.classList.remove('active'); });
      pill.classList.add('active');

      var cards = document.querySelectorAll('.cat-card');
      if (filter === 'all') {
        cards.forEach(function (c) { c.classList.remove('filtered-out'); });
      } else {
        cards.forEach(function (c) {
          if (c.getAttribute('data-cat') === filter) {
            c.classList.remove('filtered-out');
            c.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            c.classList.add('filtered-out');
          }
        });
      }
    });
  });
})();

