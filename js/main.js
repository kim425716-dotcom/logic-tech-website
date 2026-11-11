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
const isDark = savedTheme ? savedTheme === 'dark' : true;
applyTheme(isDark);

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
  { name: 'Lead Principal Designer', role: 'Silk & Stone Interiors', text: 'Logic Tech transformed our digital presence into a luxury experience that matches the precision of our architectural designs. Inquiries from high-net-worth homeowners and commercial developers tripled within the first two months.', stars: 5 },
  { name: 'Creative Director', role: 'WDI Studios Kenya', text: 'The custom studio platform Logic Tech engineered completely streamlined how our clients discover our furnishings and finishes. The material catalog and quote estimator took our sales process to a whole new level.', stars: 5 },
  { name: 'Alice Wanjiku', role: 'CTO @ FinanceHub Kenya', text: 'Logic Tech delivered an event-driven cloud architecture that improved our platform uptime to 99.99%. Absolutely world-class engineering and speed.', stars: 5 },
  { name: 'David Ochieng', role: 'VP Engineering @ RetailMax', text: 'The custom inventory platform they built handles high transaction loads without a hiccup. Their team understands modern web scale.', stars: 5 },
  { name: 'Sarah Mitchell', role: 'Head of IT @ GlobalInsure', text: 'Outstanding security audit. They identified critical vulnerabilities and implemented zero-trust access controls that passed compliance effortlessly.', stars: 5 },
  { name: 'James Kariuki', role: 'CEO @ AgriTech Africa', text: 'From mobile app to real-time analytics, Logic Tech delivered everything on time and with incredible sprint velocity. Communication was exceptional.', stars: 5 },
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

/* ═════════════════════════════════════════════════════════════════════
   EVERY SERVICE INTERACTIVE ENQUIRY SYSTEM
   ═════════════════════════════════════════════════════════════════════ */
(function () {
  function ensureServiceModal() {
    if (document.getElementById('serviceEnquiryModal')) return;

    var modalHtml = `
      <div id="serviceEnquiryModal" class="service-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="serviceEnquiryTitle">
        <div class="service-modal-backdrop" onclick="closeServiceEnquiry()"></div>
        <div class="service-modal-card">
          <div class="service-modal-header">
            <div class="service-modal-badge"><i class="fa-solid fa-paper-plane"></i> Direct Project Inquiry</div>
            <button type="button" class="service-modal-close" onclick="closeServiceEnquiry()" aria-label="Close modal">&times;</button>
          </div>
          
          <div class="service-modal-hero">
            <h3 id="serviceEnquiryTitle">Enterprise Service</h3>
            <p id="serviceEnquiryCategory" class="service-modal-category">Core Capability</p>
            <div id="serviceEnquiryDesc" class="service-modal-desc">Technical engineering, deployment, and SLA support.</div>
          </div>

          <form id="serviceEnquiryForm" onsubmit="handleServiceEnquirySubmit(event)">
            <input type="hidden" id="serviceEnquirySubject" name="subject" value="" />
            
            <div class="service-form-grid">
              <div class="service-form-group">
                <label for="serviceEnquiryName">Full Name *</label>
                <div class="service-input-wrap">
                  <i class="fa-solid fa-user"></i>
                  <input type="text" id="serviceEnquiryName" name="name" required placeholder="e.g. John Doe" />
                </div>
              </div>

              <div class="service-form-group">
                <label for="serviceEnquiryEmail">Work Email *</label>
                <div class="service-input-wrap">
                  <i class="fa-solid fa-envelope"></i>
                  <input type="email" id="serviceEnquiryEmail" name="email" required placeholder="john@company.com" />
                </div>
              </div>
            </div>

            <div class="service-form-grid">
              <div class="service-form-group">
                <label for="serviceEnquiryPhone">Phone / WhatsApp</label>
                <div class="service-input-wrap">
                  <i class="fa-solid fa-phone"></i>
                  <input type="tel" id="serviceEnquiryPhone" name="phone" placeholder="0702 588 886 / +254..." />
                </div>
              </div>

              <div class="service-form-group">
                <label for="serviceEnquiryBudget">Estimated Budget Range</label>
                <div class="service-input-wrap">
                  <i class="fa-solid fa-coins"></i>
                  <select id="serviceEnquiryBudget" name="budget">
                    <option value="Flexible Budget (Open to Recommendations)">Flexible Budget</option>
                    <option value="Under KSh 50,000">Under KSh 50,000 (Starter)</option>
                    <option value="KSh 50,000 – 150,000">KSh 50,000 – 150,000 (Standard)</option>
                    <option value="KSh 150,000 – 250,000">KSh 150,000 – 250,000 (Growth)</option>
                    <option value="KSh 250,000+ (Larger Projects)">KSh 250,000+ (Enterprise)</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="service-form-group">
              <label for="serviceEnquiryMessage">Project Scope &amp; Technical Requirements *</label>
              <textarea id="serviceEnquiryMessage" name="message" rows="3" required placeholder="Tell us about your project requirements, deliverables, or desired milestones..."></textarea>
            </div>

            <div class="service-modal-actions">
              <button type="submit" class="btn btn-primary btn-lg service-submit-btn" id="serviceEnquirySubmitBtn">
                <span>Send Project Inquiry</span> <i class="fa-solid fa-paper-plane"></i>
              </button>
              <a id="serviceEnquiryWhatsAppBtn" href="#" target="_blank" class="btn btn-outline btn-lg service-wa-btn">
                <i class="fa-brands fa-whatsapp" style="color:#25d366;"></i> <span>WhatsApp Concierge</span>
              </a>
            </div>

            <div class="service-modal-footer-meta">
              <span class="service-modal-sla"><i class="fa-solid fa-shield-halved"></i> 24-hr Response SLA &bull; Confidential &amp; Protected</span>
              <a id="serviceEnquiryFullPageLink" href="contact.html" class="service-modal-fullpage-link">Open Full Contact Page &rarr;</a>
            </div>
          </form>

          <div id="serviceEnquirySuccess" class="service-modal-success" style="display:none;">
            <div class="service-success-icon"><i class="fa-solid fa-circle-check"></i></div>
            <h4>Inquiry Received!</h4>
            <p id="serviceSuccessText">Our solutions architect squad has received your request and will get back to you within 24 hours with architectural scoping and pricing.</p>
            <div class="service-success-actions">
              <button type="button" class="btn btn-primary" onclick="closeServiceEnquiry()">Done</button>
              <a id="serviceSuccessWhatsApp" href="#" target="_blank" class="btn btn-outline" style="border-color:rgba(37,211,102,0.4); color:#86efac;">
                <i class="fa-brands fa-whatsapp" style="color:#25d366;"></i> Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function openServiceEnquiry(serviceName, serviceDesc, serviceCategory) {
    ensureServiceModal();
    var modal = document.getElementById('serviceEnquiryModal');
    var form = document.getElementById('serviceEnquiryForm');
    var success = document.getElementById('serviceEnquirySuccess');
    var titleEl = document.getElementById('serviceEnquiryTitle');
    var catEl = document.getElementById('serviceEnquiryCategory');
    var descEl = document.getElementById('serviceEnquiryDesc');
    var subjectInput = document.getElementById('serviceEnquirySubject');
    var msgInput = document.getElementById('serviceEnquiryMessage');
    var waBtn = document.getElementById('serviceEnquiryWhatsAppBtn');
    var fullLink = document.getElementById('serviceEnquiryFullPageLink');

    var name = (serviceName || 'Custom Technology Solution').trim();
    var cat = (serviceCategory || 'Enterprise Service Pillar').trim();
    var desc = (serviceDesc || 'Enterprise engineering, deployment, and SLA support.').trim();

    titleEl.textContent = name;
    catEl.textContent = cat;
    descEl.textContent = desc;
    subjectInput.value = name + ' (' + cat + ')';
    
    msgInput.value = 'Hello Logic Tech team,\n\nI would like to inquire about your ' + name + ' service. Please share details on technical scope, estimated delivery timeline, and pricing.\n\nThank you.';

    var waMsg = encodeURIComponent('Hi Logic Tech, I would like to make an inquiry regarding: ' + name);
    waBtn.href = 'https://wa.me/254702588886?text=' + waMsg;

    fullLink.href = 'contact.html?service=' + encodeURIComponent(name) + '&category=' + encodeURIComponent(cat);

    // Reset form view
    form.style.display = 'block';
    success.style.display = 'none';
    var submitBtn = document.getElementById('serviceEnquirySubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Send Project Inquiry</span> <i class="fa-solid fa-paper-plane"></i>';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(function () {
      var nameInput = document.getElementById('serviceEnquiryName');
      if (nameInput) nameInput.focus();
    }, 150);
  }
  window.openServiceEnquiry = openServiceEnquiry;

  function closeServiceEnquiry() {
    var modal = document.getElementById('serviceEnquiryModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
  window.closeServiceEnquiry = closeServiceEnquiry;

  async function handleServiceEnquirySubmit(e) {
    e.preventDefault();
    var form = document.getElementById('serviceEnquiryForm');
    var submitBtn = document.getElementById('serviceEnquirySubmitBtn');
    var success = document.getElementById('serviceEnquirySuccess');
    var title = document.getElementById('serviceEnquiryTitle')?.textContent || 'this service';

    var data = new FormData(form);
    var payload = Object.fromEntries(data.entries());

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Inquiry...';

    try {
      var res = await apiFetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit inquiry.');

      form.style.display = 'none';
      success.style.display = 'block';
      
      var succText = document.getElementById('serviceSuccessText');
      if (succText) {
        succText.innerHTML = 'Our solutions architect squad has received your request regarding <strong>' + title + '</strong> and will get back to you within 24 hours with architectural scoping and pricing.';
      }

      var waSuccess = document.getElementById('serviceSuccessWhatsApp');
      if (waSuccess) {
        var waMsg = encodeURIComponent('Hi Logic Tech, I just submitted an inquiry on logictech.co.ke regarding: ' + title);
        waSuccess.href = 'https://wa.me/254702588886?text=' + waMsg;
      }

      if (typeof showToast === 'function') {
        showToast('Inquiry for ' + title + ' sent successfully!', 'success');
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast(err.message || 'Error submitting inquiry. Please try again.', 'error');
      } else {
        alert(err.message || 'Error submitting inquiry.');
      }
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Send Project Inquiry</span> <i class="fa-solid fa-paper-plane"></i>';
    }
  }
  window.handleServiceEnquirySubmit = handleServiceEnquirySubmit;

  // Escape key closes modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeServiceEnquiry();
  });

  // Attach interactive click behavior to all service items and service cards across DOM
  function initServiceClickHandlers() {
    // 1. All 190+ catalog service items
    var items = document.querySelectorAll('.service-item');
    items.forEach(function (item) {
      if (item.dataset.enquiryBound) return;
      item.dataset.enquiryBound = 'true';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');

      var h4 = item.querySelector('h4');
      var p = item.querySelector('p');
      var serviceName = h4 ? h4.textContent.replace(/^✦\s*/, '').trim() : 'Service';
      item.setAttribute('aria-label', 'Send inquiry for ' + serviceName);

      // Add visual affordance pill if not already there
      if (!item.querySelector('.service-item-cta')) {
        var cta = document.createElement('span');
        cta.className = 'service-item-cta';
        cta.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enquire &rarr;';
        item.appendChild(cta);
      }

      var catCard = item.closest('.cat-card');
      var catTitle = catCard ? (catCard.querySelector('.cat-title-wrap h3')?.textContent || catCard.querySelector('.cat-code')?.textContent || 'Solutions') : 'Services';

      function trigger(e) {
        e.preventDefault();
        openServiceEnquiry(serviceName, p ? p.textContent : '', catTitle);
      }

      item.addEventListener('click', trigger);
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          trigger(e);
        }
      });
    });

    // 2. Core Service Pillars (.service-card) in services.html & index.html
    var cards = document.querySelectorAll('.service-card');
    cards.forEach(function (card) {
      if (card.dataset.enquiryBound) return;
      card.dataset.enquiryBound = 'true';

      var h3 = card.querySelector('h3');
      var p = card.querySelector('p');
      var serviceName = h3 ? h3.textContent.trim() : 'Core Service';

      // If there's an action container, add a direct Enquire button
      var actions = card.querySelector('.service-card-actions');
      if (actions && !actions.querySelector('.service-card-enquire-btn')) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'service-card-enquire-btn';
        btn.title = 'Send direct inquiry for ' + serviceName;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enquire';
        btn.style.cssText = 'display:inline-flex; align-items:center; gap:0.4rem; font-size:0.8rem; font-weight:700; color:#c9a45c; background:rgba(201,164,92,0.12); border:1px solid rgba(201,164,92,0.3); border-radius:8px; padding:0.4rem 0.75rem; cursor:pointer; transition:all 0.2s ease;';
        btn.onmouseover = function() { this.style.background = 'rgba(201,164,92,0.25)'; this.style.color = '#fff'; };
        btn.onmouseout = function() { this.style.background = 'rgba(201,164,92,0.12)'; this.style.color = '#c9a45c'; };
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          openServiceEnquiry(serviceName, p ? p.textContent : '', 'Core Pillar');
        });
        actions.prepend(btn);
      }

      // Also on services.html where buttons are full width
      var existingBtn = card.querySelector('a.btn[href*="estimator.html"]');
      if (existingBtn && !card.querySelector('.pillar-enquire-row')) {
        var row = document.createElement('div');
        row.className = 'pillar-enquire-row';
        row.style.cssText = 'display:flex; gap:0.5rem; margin-top:0.75rem;';
        row.innerHTML = `
          <button type="button" class="btn btn-primary btn-sm" style="flex:1; justify-content:center;">
            <i class="fa-solid fa-paper-plane"></i> Send Enquiry &rarr;
          </button>
        `;
        row.querySelector('button').addEventListener('click', function(e) {
          e.preventDefault();
          openServiceEnquiry(serviceName, p ? p.textContent : '', 'Core Pillar');
        });
        existingBtn.parentNode.insertBefore(row, existingBtn.nextSibling);
      }
    });
  }

  // Auto-init on DOMContentLoaded or immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServiceClickHandlers);
  } else {
    initServiceClickHandlers();
  }

  // 3. Pre-fill contact.html if arrived with ?service=...
  if (window.location.pathname.endsWith('contact.html') || window.location.pathname.endsWith('contact')) {
    var params = new URLSearchParams(window.location.search);
    var serviceParam = params.get('service') || params.get('subject');
    if (serviceParam) {
      var select = document.querySelector('select[name="subject"]');
      if (select) {
        var found = false;
        for (var i = 0; i < select.options.length; i++) {
          if (select.options[i].value.toLowerCase().includes(serviceParam.toLowerCase()) ||
              serviceParam.toLowerCase().includes(select.options[i].value.toLowerCase())) {
            select.selectedIndex = i;
            found = true;
            break;
          }
        }
        if (!found) {
          var opt = document.createElement('option');
          opt.value = serviceParam;
          opt.textContent = serviceParam + ' (Custom Service Inquiry)';
          opt.selected = true;
          select.prepend(opt);
        }
      }

      var textarea = document.querySelector('textarea[name="message"]');
      if (textarea && (!textarea.value || textarea.value.trim() === '')) {
        textarea.value = 'Hello Logic Tech team,\n\nI would like to inquire about your ' + serviceParam + ' service. Please provide project timelines, technical scope details, and pricing.\n\nThank you.';
      }

      var form = document.getElementById('contactForm');
      if (form) {
        var alertBox = document.createElement('div');
        alertBox.style.cssText = 'background:rgba(201,164,92,0.12); border:1px solid rgba(201,164,92,0.4); border-radius:10px; padding:0.85rem 1.25rem; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.75rem; color:#f8fafc; font-size:0.875rem;';
        alertBox.innerHTML = '<i class="fa-solid fa-paper-plane" style="color:#c9a45c; font-size:1.1rem;"></i> <div>Direct Inquiry: <strong>' + serviceParam + '</strong> &mdash; form pre-filled below.</div>';
        form.prepend(alertBox);

        setTimeout(function() {
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }
})();

