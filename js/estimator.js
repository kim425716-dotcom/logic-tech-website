/**
 * Logic Tech — Architecture & Project Cost Estimator
 * ===================================================
 * Interactive calculator for Enterprise IT, Cloud, FinTech & Compliance.
 */

(function () {
  'use strict';

  // Exchange rate: 1 USD ~ 130 KES
  var KES_PER_USD = 130;

  // Base Data Model — 100% Aligned with Logic Tech 6 Core Service Pillars
  var PRACTICE_AREAS = {
    software: {
      name: 'Custom Software Engineering',
      baseKES: 750000,
      weeks: 6,
      stack: ['React / Next.js', 'Node.js / Python', 'PostgreSQL / NoSQL', 'GraphQL & REST APIs', 'Docker Containers'],
      compliance: ['Clean Architecture', 'Kenya ODPC Compliant']
    },
    cloud: {
      name: 'Cloud Architecture & DevOps',
      baseKES: 700000,
      weeks: 5,
      stack: ['AWS / Azure / GCP', 'Kubernetes (EKS/GKE)', 'Terraform IaC', 'GitHub Actions CI/CD', '99.99% High Availability'],
      compliance: ['ISO 27001 Aligned', 'SOC 2 Ready']
    },
    cybersecurity: {
      name: 'Cybersecurity & Compliance',
      baseKES: 600000,
      weeks: 4,
      stack: ['Burp Suite Pro', 'Nessus Pro Audits', 'Zero Trust IAM', 'Cloudflare WAF', 'SIEM & Wazuh Logging'],
      compliance: ['CBK Cybersecurity Guideline', 'ODPC Statutory Audit', 'ISO 27001']
    },
    'ai-data': {
      name: 'Data Engineering & AI Integration',
      baseKES: 850000,
      weeks: 6,
      stack: ['Python & PyTorch', 'Apache Kafka / Airflow', 'BigQuery / Snowflake', 'Enterprise LLM & RAG', 'Power BI Dashboards'],
      compliance: ['Enterprise AI Ethics', 'Data Residency Safeguards']
    },
    mobile: {
      name: 'Mobile App Development',
      baseKES: 650000,
      weeks: 6,
      stack: ['React Native / Flutter', 'Native Swift & Kotlin', 'M-Pesa / Stripe SDKs', 'Offline-First SQLite', 'App Store / Play Store'],
      compliance: ['OWASP Mobile Top 10', 'Biometric Authentication']
    },
    consulting: {
      name: 'Enterprise IT Consulting & Modernization',
      baseKES: 450000,
      weeks: 4,
      stack: ['Microservice Refactoring', 'Architecture Blueprints', 'Technical Due Diligence', 'Fractional CTO Advisory', 'Team Staffing'],
      compliance: ['Enterprise Scalability Audit', 'Debt Remediation Roadmap']
    }
  };

  var SCALE_TIERS = {
    starter: {
      name: 'Emerging / SME (< 25k MAU)',
      multiplier: 1.0,
      extraWeeks: 0,
      infra: 'Single-region containerized app with automated daily backups.'
    },
    growth: {
      name: 'Growth Enterprise (25k - 250k MAU)',
      multiplier: 1.45,
      extraWeeks: 2,
      infra: 'Multi-AZ cluster, Elastic Load Balancer, read replicas, Redis caching.'
    },
    regional: {
      name: 'High-Throughput Regional (250k - 1M MAU)',
      multiplier: 2.1,
      extraWeeks: 4,
      infra: 'Multi-Region active-passive failover, distributed cache, Kafka event streaming.'
    },
    mission: {
      name: 'Tier-1 Mission Critical (1M+ MAU)',
      multiplier: 3.0,
      extraWeeks: 6,
      infra: 'Active-Active geo-distributed, sub-millisecond latency, bank-grade encryption at rest/transit.'
    }
  };

  var ADDONS = {
    daraja: {
      name: 'Safaricom M-Pesa Daraja 3.0 & Payments',
      costKES: 250000,
      extraWeeks: 1,
      stack: ['Daraja 3.0 STK Push', 'B2C / C2B Ledger Engine', 'Webhook Signature Verifier']
    },
    ai_assistant: {
      name: 'Enterprise LLM, RAG & AI Copilot',
      costKES: 350000,
      extraWeeks: 1.5,
      stack: ['LangChain / LlamaIndex', 'Vector DB (pgvector / Pinecone)', 'Enterprise LLM API']
    },
    mobile_companion: {
      name: 'Native iOS & Android Companion App',
      costKES: 450000,
      extraWeeks: 2,
      stack: ['Flutter Cross-Platform', 'Push Notifications', 'Biometric Lock']
    },
    compliance: {
      name: 'CBK & ODPC Regulatory Compliance Audit Pack',
      costKES: 300000,
      extraWeeks: 1.5,
      stack: ['ODPC Data Protection Mapping', 'CBK Security Matrix', 'Pen-Test Certificate']
    },
    sso: {
      name: 'Enterprise SSO, Azure AD & MFA',
      costKES: 180000,
      extraWeeks: 1,
      stack: ['Azure AD / Okta', 'OAuth2 / OIDC', 'Biometric / TOTP']
    },
    redis: {
      name: 'Redis Sentinel Distributed Cache & Queues',
      costKES: 120000,
      extraWeeks: 0.5,
      stack: ['Redis Sentinel', 'Token Bucket Limiter', 'Pub/Sub Messaging']
    },
    cicd: {
      name: 'Automated CI/CD & Terraform IaC',
      costKES: 190000,
      extraWeeks: 1,
      stack: ['GitHub Actions / GitLab', 'Terraform AWS/Azure', 'Blue/Green Deployments']
    },
    sla24: {
      name: '24/7 Critical Response SRE & 15-Min SLA Retainer',
      costKES: 280000,
      extraWeeks: 0,
      stack: ['24/7 Dedicated SRE Callout', '99.99% Uptime Guarantee', 'PagerDuty Escalation']
    }
  };

  var VELOCITY = {
    sprint: {
      name: 'Sprint Delivery (Accelerated MVP)',
      multiplier: 1.15,
      timelineMultiplier: 0.75
    },
    standard: {
      name: 'Phased Enterprise Build (Recommended)',
      multiplier: 1.0,
      timelineMultiplier: 1.0
    },
    retainer: {
      name: 'Dedicated Architecture Pod (Ongoing)',
      multiplier: 1.25,
      timelineMultiplier: 1.3
    }
  };

  // State
  var state = {
    step: 1,
    currency: 'KES', // 'KES' or 'USD'
    practice: 'software',
    scale: 'growth',
    addons: ['daraja', 'compliance'],
    velocity: 'standard'
  };

  // DOM Elements
  var els = {};

  function init() {
    cacheElements();
    handleUrlServiceParam();
    bindEvents();
    renderStep();
    calculateEstimate();
  }

  function handleUrlServiceParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      var reqService = params.get('service');
      if (reqService) {
        reqService = reqService.toLowerCase().trim();
        if (reqService === 'data' || reqService === 'ai') reqService = 'ai-data';
        if (PRACTICE_AREAS[reqService]) {
          state.practice = reqService;
          // Synchronize selection in DOM
          document.querySelectorAll('[data-option="practice"]').forEach(function (c) {
            c.classList.toggle('selected', c.getAttribute('data-val') === reqService);
          });
          // Highlight with toast/badge if possible
          showServicePreselectedBadge(PRACTICE_AREAS[reqService].name);
        }
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }

  function showServicePreselectedBadge(serviceName) {
    var banner = document.getElementById('servicePreselectedBanner');
    if (banner) {
      banner.style.display = 'flex';
      var txt = document.getElementById('preselectedServiceName');
      if (txt) txt.textContent = serviceName;
    }
  }

  function cacheElements() {
    els.stepNavBtns = document.querySelectorAll('.step-nav-btn');
    els.stepPanels = document.querySelectorAll('.step-panel');
    els.currBtns = document.querySelectorAll('.curr-btn');
    els.priceRange = document.getElementById('estPriceRange');
    els.timelineText = document.getElementById('estTimeline');
    els.specPractice = document.getElementById('specPractice');
    els.specScale = document.getElementById('specScale');
    els.specAddons = document.getElementById('specAddons');
    els.specVelocity = document.getElementById('specVelocity');
    els.specStack = document.getElementById('specStack');
    els.btnPrev = document.getElementById('btnPrevStep');
    els.btnNext = document.getElementById('btnNextStep');
    els.leadForm = document.getElementById('estimateLeadForm');
    els.specSheet = document.getElementById('printSpecSheet');
  }

  function bindEvents() {
    // Step navigation buttons
    els.stepNavBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetStep = parseInt(btn.getAttribute('data-step'), 10);
        goToStep(targetStep);
      });
    });

    // Next / Previous buttons
    if (els.btnNext) {
      els.btnNext.addEventListener('click', function () {
        if (state.step < 4) goToStep(state.step + 1);
      });
    }
    if (els.btnPrev) {
      els.btnPrev.addEventListener('click', function () {
        if (state.step > 1) goToStep(state.step - 1);
      });
    }

    // Currency toggle
    els.currBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var curr = btn.getAttribute('data-curr');
        setCurrency(curr);
      });
    });

    // Option Cards: Practice (Step 1)
    document.querySelectorAll('[data-option="practice"]').forEach(function (card) {
      card.addEventListener('click', function () {
        document.querySelectorAll('[data-option="practice"]').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        state.practice = card.getAttribute('data-val');
        calculateEstimate();
      });
    });

    // Option Cards: Scale (Step 2)
    document.querySelectorAll('[data-option="scale"]').forEach(function (card) {
      card.addEventListener('click', function () {
        document.querySelectorAll('[data-option="scale"]').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        state.scale = card.getAttribute('data-val');
        calculateEstimate();
      });
    });

    // Option Cards: Add-ons (Step 3, Checkboxes)
    document.querySelectorAll('[data-option="addon"]').forEach(function (card) {
      card.addEventListener('click', function () {
        var val = card.getAttribute('data-val');
        var idx = state.addons.indexOf(val);
        if (idx > -1) {
          state.addons.splice(idx, 1);
          card.classList.remove('selected');
        } else {
          state.addons.push(val);
          card.classList.add('selected');
        }
        calculateEstimate();
      });
    });

    // Option Cards: Velocity (Step 4)
    document.querySelectorAll('[data-option="velocity"]').forEach(function (card) {
      card.addEventListener('click', function () {
        document.querySelectorAll('[data-option="velocity"]').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        state.velocity = card.getAttribute('data-val');
        calculateEstimate();
      });
    });

    // Submission Form
    if (els.leadForm) {
      els.leadForm.addEventListener('submit', handleFormSubmit);
    }
  }

  function goToStep(num) {
    if (num < 1 || num > 4) return;
    state.step = num;
    renderStep();
  }

  function renderStep() {
    // Update step tabs
    els.stepNavBtns.forEach(function (btn) {
      var stepNum = parseInt(btn.getAttribute('data-step'), 10);
      btn.classList.remove('active', 'completed');
      if (stepNum === state.step) {
        btn.classList.add('active');
      } else if (stepNum < state.step) {
        btn.classList.add('completed');
      }
    });

    // Update panels
    els.stepPanels.forEach(function (panel) {
      var stepNum = parseInt(panel.getAttribute('data-step'), 10);
      panel.classList.toggle('active', stepNum === state.step);
    });

    // Update navigation buttons
    if (els.btnPrev) {
      els.btnPrev.style.visibility = state.step === 1 ? 'hidden' : 'visible';
    }
    if (els.btnNext) {
      if (state.step === 4) {
        els.btnNext.style.display = 'none';
      } else {
        els.btnNext.style.display = 'inline-flex';
        els.btnNext.innerHTML = 'Continue to Step ' + (state.step + 1) + ' <i class="fa-solid fa-arrow-right"></i>';
      }
    }

    // Scroll smoothly to top of estimator if on mobile
    if (window.innerWidth < 768) {
      var topEl = document.querySelector('.estimator-wrapper');
      if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setCurrency(curr) {
    state.currency = curr;
    els.currBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-curr') === curr);
    });
    calculateEstimate();
  }

  function calculateEstimate() {
    var pData = PRACTICE_AREAS[state.practice] || PRACTICE_AREAS.cloud;
    var sData = SCALE_TIERS[state.scale] || SCALE_TIERS.growth;
    var vData = VELOCITY[state.velocity] || VELOCITY.standard;

    // Calculate addons cost and weeks
    var addonsTotalKES = 0;
    var addonsWeeks = 0;
    var combinedStack = [].concat(pData.stack);

    state.addons.forEach(function (aid) {
      var addon = ADDONS[aid];
      if (addon) {
        addonsTotalKES += addon.costKES;
        addonsWeeks += addon.extraWeeks;
        if (addon.stack) {
          addon.stack.forEach(function (st) {
            if (!combinedStack.includes(st)) combinedStack.push(st);
          });
        }
      }
    });

    // Formula: (Base * Scale Multiplier + Addons) * Velocity Multiplier
    var subtotalKES = (pData.baseKES * sData.multiplier) + addonsTotalKES;
    var finalBaseKES = subtotalKES * vData.multiplier;

    // Range: -10% to +20% for contingency
    var minKES = Math.round(finalBaseKES * 0.9 / 10000) * 10000;
    var maxKES = Math.round(finalBaseKES * 1.2 / 10000) * 10000;

    // Timeline calculation
    var rawWeeks = (pData.weeks + sData.extraWeeks + addonsWeeks) * vData.timelineMultiplier;
    var minWeeks = Math.max(3, Math.round(rawWeeks * 0.85));
    var maxWeeks = Math.round(rawWeeks * 1.15);

    // Format prices
    var formattedRange = '';
    if (state.currency === 'USD') {
      var minUSD = Math.round(minKES / KES_PER_USD / 100) * 100;
      var maxUSD = Math.round(maxKES / KES_PER_USD / 100) * 100;
      formattedRange = '$' + minUSD.toLocaleString() + ' – $' + maxUSD.toLocaleString();
    } else {
      formattedRange = 'KES ' + (minKES / 1000000 >= 1 ? (minKES / 1000000).toFixed(1) + 'M' : (minKES / 1000).toFixed(0) + 'k') +
        ' – ' + (maxKES / 1000000 >= 1 ? (maxKES / 1000000).toFixed(1) + 'M' : (maxKES / 1000).toFixed(0) + 'k');
    }

    // Update DOM
    if (els.priceRange) els.priceRange.textContent = formattedRange;
    if (els.timelineText) els.timelineText.textContent = minWeeks + ' – ' + maxWeeks + ' Weeks';

    if (els.specPractice) els.specPractice.textContent = pData.name;
    if (els.specScale) els.specScale.textContent = sData.name.split(' (')[0];
    if (els.specAddons) els.specAddons.textContent = state.addons.length + ' Enterprise Modules';
    if (els.specVelocity) els.specVelocity.textContent = vData.name.split(' (')[0];

    // Render Tech Stack chips
    if (els.specStack) {
      els.specStack.innerHTML = combinedStack.slice(0, 7).map(function (tech) {
        return '<span class="stack-tag">' + tech + '</span>';
      }).join('');
    }

    // Store current calculated summary on state for submission & printing
    state.summary = {
      priceRange: formattedRange,
      timeline: minWeeks + ' – ' + maxWeeks + ' Weeks',
      practiceName: pData.name,
      scaleName: sData.name,
      scaleInfra: sData.infra,
      addonsCount: state.addons.length,
      addonsList: state.addons.map(function (a) { return ADDONS[a] ? ADDONS[a].name : a; }),
      velocityName: vData.name,
      techStack: combinedStack
    };
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    var submitBtn = document.getElementById('btnSubmitEstimate');
    if (!submitBtn) return;

    var nameInput = document.getElementById('estLeadName');
    var emailInput = document.getElementById('estLeadEmail');
    var companyInput = document.getElementById('estLeadCompany');
    var phoneInput = document.getElementById('estLeadPhone');
    var notesInput = document.getElementById('estLeadNotes');
    var ndaCheckbox = document.getElementById('estLeadNda');

    var name = nameInput ? nameInput.value.trim() : '';
    var email = emailInput ? emailInput.value.trim() : '';
    var company = companyInput ? companyInput.value.trim() : '';
    var phone = phoneInput ? phoneInput.value.trim() : '';
    var notes = notesInput ? notesInput.value.trim() : '';
    var nda = ndaCheckbox ? ndaCheckbox.checked : false;

    if (!name || !email) {
      alert('Please provide your name and work email.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Architecture Specs...';

    // Format message
    var sm = state.summary;
    var messageBody = [
      '=== LOGIC TECH ARCHITECTURE ESTIMATOR SPEC SHEET ===',
      'Client: ' + name,
      'Company: ' + (company || 'Not provided'),
      'Phone / WhatsApp: ' + (phone || 'Not provided'),
      'NDA Requested: ' + (nda ? 'YES (Mutual NDA required before kickoff)' : 'Standard confidentiality'),
      '',
      '--- ARCHITECTURE & SCOPE SPECIFICATIONS ---',
      'Practice Area: ' + sm.practiceName,
      'Scale Tier: ' + sm.scaleName,
      'Infrastructure Footprint: ' + sm.scaleInfra,
      'Delivery Velocity: ' + sm.velocityName,
      'Estimated Timeline: ' + sm.timeline,
      'Estimated Investment Range: ' + sm.priceRange,
      '',
      'Selected Enterprise Modules (' + sm.addonsCount + '):',
      sm.addonsList.map(function (item) { return '  • ' + item; }).join('\n'),
      '',
      'Recommended Architecture & Stack:',
      sm.techStack.join(', '),
      '',
      'Client Requirements / Notes:',
      notes || 'No custom notes provided.'
    ].join('\n');

    var payload = {
      name: name,
      email: email,
      company: company,
      phone: phone,
      subject: '[ARCH ESTIMATE] ' + sm.practiceName + ' (' + sm.priceRange + ')',
      budget: sm.priceRange,
      message: messageBody,
      nda_requested: nda ? 1 : 0
    };

    try {
      var res = await fetch('http://localhost:8080/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      var data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed.');

      // Show success view
      renderSuccessState(data.id, name, company, email);
    } catch (err) {
      console.error(err);
      alert('Submission error: ' + (err.message || 'Unable to connect to the server. Please try again.'));
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Send Architecture Specs to Advisory Team <i class="fa-solid fa-paper-plane"></i>';
    }
  }

  function renderSuccessState(inquiryId, name, company, email) {
    var step4Panel = document.querySelector('.step-panel[data-step="4"]');
    if (!step4Panel) return;

    var sm = state.summary;
    var refNumber = 'LT-EST-' + (inquiryId || Math.floor(1000 + Math.random() * 9000));

    step4Panel.innerHTML = [
      '<div class="estimator-success animate-in">',
      '  <div class="estimator-success-icon"><i class="fa-solid fa-circle-check"></i></div>',
      '  <h2>Architecture Specs Transmitted Successfully!</h2>',
      '  <p style="color:var(--text-muted); max-width:540px; margin:0.5rem auto 1.5rem;">',
      '    Thank you, <strong>' + escapeHtml(name) + '</strong>. Your enterprise scope has been assigned reference <strong>#' + refNumber + '</strong>.',
      '    Our Solutions Engineering squad and Principal Architects will review your requirements and reach out at <strong>' + escapeHtml(email) + '</strong> within 1 business day.',
      '  </p>',
      '  <div style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">',
      '    <button class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> Print / Save Spec Sheet (PDF)</button>',
      '    <a href="index.html" class="btn btn-outline"><i class="fa-solid fa-house"></i> Return to Homepage</a>',
      '  </div>',
      '  <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; max-width:500px; margin:0 auto; text-align:left; font-size:0.85rem;">',
      '    <div style="font-weight:700; color:var(--amber); margin-bottom:0.5rem;">Snapshot Summary #' + refNumber + '</div>',
      '    <div><strong>Practice Area:</strong> ' + escapeHtml(sm.practiceName) + '</div>',
      '    <div><strong>Target Scale:</strong> ' + escapeHtml(sm.scaleName) + '</div>',
      '    <div><strong>Delivery Timeline:</strong> ' + escapeHtml(sm.timeline) + '</div>',
      '    <div><strong>Estimated Investment:</strong> ' + escapeHtml(sm.priceRange) + '</div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  // Self-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
