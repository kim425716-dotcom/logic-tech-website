/**
 * Logic Tech AI Concierge — Interactive Chatbox Widget
 * Features: Typewriter replies, smart follow-ups, lead capture, reactions,
 *           persistent session history, attention pulse, keyboard shortcuts.
 */
(function () {
  'use strict';

  if (document.getElementById('logicTechChatbox')) return;

  /* Quick Suggestion Sets */
  const INITIAL_CHIPS = [
    { label: '?? Services Overview',   prompt: 'What core services do you provide?' },
    { label: '?? Pricing & Rates',     prompt: 'What are your pricing models and rates?' },
    { label: '?? Delivery Timelines',  prompt: 'What is your typical project delivery timeline?' },
    { label: '?? NDA & IP Security',   prompt: 'How do you handle NDAs and intellectual property?' },
    { label: '?? Book a Consultation', prompt: 'How can I schedule a consultation with Dr. Brian Kimani?' },
  ];

  const FOLLOW_UP_MAP = {
    service:  ['?? How much does it cost?', '?? What are your timelines?', '?? See case studies'],
    price:    ['?? Request a custom quote', '?? What services are included?', '?? Book a call'],
    timeline: ['?? What services do you offer?', '?? Pricing details', '?? Contact the team'],
    brian:    ['?? Schedule a consultation', '?? Services overview', '?? About Logic Tech'],
    nda:      ['?? What else do you offer?', '?? Case Studies', '?? Contact Us'],
    contact:  ['?? Services overview', '?? Pricing details', '?? View case studies'],
    case:     ['?? Services overview', '?? Pricing & rates', '?? Book consultation'],
    default:  ['?? Services overview', '?? Pricing info', '?? Timelines', '?? Contact us'],
  };

  const FOLLOW_UP_PROMPTS = {
    '?? How much does it cost?':       'What are your pricing models and rates?',
    '?? What are your timelines?':     'What is your typical project delivery timeline?',
    '?? See case studies':             'Tell me about your portfolio and past projects',
    '?? Request a custom quote':       'I would like to request a customized proposal',
    '?? What services are included?':  'What core services do you provide?',
    '?? Book a call':                  'How can I schedule a consultation with Dr. Brian Kimani?',
    '?? Schedule a consultation':      'How can I schedule a consultation with Dr. Brian Kimani?',
    '?? Services overview':            'What core services do you provide?',
    '?? About Logic Tech':             'Tell me more about Logic Tech as a company',
    '?? What services do you offer?':  'What core services do you provide?',
    '?? Pricing details':              'What are your pricing models and rates?',
    '?? Contact the team':             'How can I contact Logic Tech?',
    '?? What else do you offer?':      'What core services do you provide?',
    '?? Case Studies':                 'Tell me about your portfolio and past projects',
    '?? Contact Us':                   'How can I contact Logic Tech?',
    '?? Pricing info':                 'What are your pricing models and rates?',
    '?? Timelines':                    'What is your typical project delivery timeline?',
    '?? Contact us':                   'How can I contact Logic Tech?',
    '?? Pricing & rates':              'What are your pricing models and rates?',
    '?? Book consultation':            'How can I schedule a consultation with Dr. Brian Kimani?',
    '?? View case studies':            'Tell me about your portfolio and past projects',
  };

  /* Inject Widget HTML */
  const chatboxHtml = `
    <div id="logicTechChatbox">
      <button class="chatbox-widget-toggle" id="chatboxToggle" aria-label="Open AI Chat">
        <span class="chatbox-toggle-badge" id="chatboxBadge"></span>
        <div class="chatbox-toggle-icon">
          <i class="fa-solid fa-comments" id="chatboxToggleIcon"></i>
        </div>
        <span id="chatboxToggleLabel">AI Assistant</span>
      </button>
      <div class="chatbox-window" id="chatboxWindow" role="dialog" aria-modal="true" aria-label="AI Concierge Chat">
        <div class="chatbox-header">
          <div class="chatbox-header-info">
            <div class="chatbox-bot-avatar"><i class="fa-solid fa-brain"></i></div>
            <div>
              <h4 class="chatbox-title">Logic Tech Concierge</h4>
              <div class="chatbox-status" id="chatboxStatus">Online &bull; Instant Answers</div>
            </div>
          </div>
          <div class="chatbox-actions">
            <button class="chatbox-action-btn" id="chatboxLeadBtn" title="Request a Callback"><i class="fa-solid fa-phone"></i></button>
            <button class="chatbox-action-btn" id="chatboxClearBtn" title="Reset Conversation"><i class="fa-solid fa-rotate-right"></i></button>
            <button class="chatbox-action-btn" id="chatboxCloseBtn" title="Minimize"><i class="fa-solid fa-chevron-down"></i></button>
          </div>
        </div>
        <div class="chatbox-lead-panel" id="chatboxLeadPanel" style="display:none;padding:1rem;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <i class="fa-solid fa-envelope-open-text" style="color:var(--amber,#a6813e)"></i>
            <strong style="font-size:0.9rem;">Request a Callback</strong>
          </div>
          <p style="font-size:0.78rem;color:var(--text-muted,#94a3b8);margin-bottom:0.75rem;">Leave your details and our solutions team will reach out within 24 hours.</p>
          <form id="chatboxLeadForm">
            <input type="text"  id="chatboxLeadName"  class="chatbox-lead-input" placeholder="Your full name" required />
            <input type="email" id="chatboxLeadEmail" class="chatbox-lead-input" placeholder="Work email address" required />
            <input type="tel"   id="chatboxLeadPhone" class="chatbox-lead-input" placeholder="Phone (optional)" />
            <textarea           id="chatboxLeadMsg"   class="chatbox-lead-input" placeholder="Brief project description..." rows="2" style="resize:none;"></textarea>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
              <button type="button" id="chatboxLeadCancel" style="flex:1;padding:0.5rem;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:0.8rem;">Cancel</button>
              <button type="submit" id="chatboxLeadSubmit" style="flex:2;padding:0.5rem;border-radius:8px;border:none;background:linear-gradient(135deg,#a6813e,#846328);color:#020617;cursor:pointer;font-weight:700;font-size:0.8rem;"><i class="fa-solid fa-paper-plane"></i> Send Request</button>
            </div>
          </form>
        </div>
        <div class="chatbox-body" id="chatboxBody"></div>
        <form class="chatbox-footer" id="chatboxForm">
          <input type="text" class="chatbox-input" id="chatboxInput" placeholder="Ask a question or describe your project..." maxlength="1000" autocomplete="off" />
          <button type="submit" class="chatbox-send-btn" id="chatboxSendBtn" aria-label="Send" disabled>
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = chatboxHtml;
  document.body.appendChild(container.firstElementChild);

  /* Element Refs */
  const toggleBtn   = document.getElementById('chatboxToggle');
  const toggleIcon  = document.getElementById('chatboxToggleIcon');
  const toggleLabel = document.getElementById('chatboxToggleLabel');
  const badgeEl     = document.getElementById('chatboxBadge');
  const windowEl    = document.getElementById('chatboxWindow');
  const closeBtn    = document.getElementById('chatboxCloseBtn');
  const clearBtn    = document.getElementById('chatboxClearBtn');
  const leadBtn     = document.getElementById('chatboxLeadBtn');
  const leadPanel   = document.getElementById('chatboxLeadPanel');
  const leadForm    = document.getElementById('chatboxLeadForm');
  const leadCancel  = document.getElementById('chatboxLeadCancel');
  const bodyEl      = document.getElementById('chatboxBody');
  const formEl      = document.getElementById('chatboxForm');
  const inputEl     = document.getElementById('chatboxInput');
  const sendBtn     = document.getElementById('chatboxSendBtn');
  const statusEl    = document.getElementById('chatboxStatus');

  let isSending = false;
  let isOpen = false;
  let unreadCount = 0;
  let sessionHistory = [];
  const SESSION_KEY = 'ltChatHistory_v2';

  /* Session */
  function saveHistory() {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionHistory)); } catch(_) {}
  }
  function loadHistory() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]'); } catch(_) { return []; }
  }

  /* Open / Close */
  function openChat() {
    isOpen = true;
    windowEl.classList.add('chatbox-open');
    toggleIcon.className = 'fa-solid fa-xmark';
    toggleLabel.textContent = 'Close';
    unreadCount = 0;
    badgeEl.style.display = 'none';
    scrollToBottom();
    setTimeout(() => inputEl.focus(), 300);
  }
  function closeChat() {
    isOpen = false;
    windowEl.classList.remove('chatbox-open');
    toggleIcon.className = 'fa-solid fa-comments';
    toggleLabel.textContent = 'AI Assistant';
    leadPanel.style.display = 'none';
  }
  toggleBtn.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closeChat(); });

  /* Unread badge */
  function bumpUnread() {
    if (!isOpen) {
      unreadCount++;
      badgeEl.style.display = 'block';
      badgeEl.setAttribute('data-count', unreadCount > 9 ? '9+' : String(unreadCount));
      toggleBtn.classList.add('chatbox-pulse');
      setTimeout(() => toggleBtn.classList.remove('chatbox-pulse'), 1200);
    }
  }

  /* Auto-prompt after 8s if no history */
  const stored = loadHistory();
  if (!stored.length) {
    setTimeout(() => { if (!isOpen) bumpUnread(); }, 8000);
  }

  /* Helpers */
  function scrollToBottom() { bodyEl.scrollTo({ top: bodyEl.scrollHeight, behavior: 'smooth' }); }
  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function escapeHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function formatMarkdown(t) {
    if (!t) return '';
    t = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    t = t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
    t = t.replace(/\*(.*?)\*/g,'<em>$1</em>');
    t = t.replace(/`(.*?)`/g,'<code>$1</code>');
    t = t.replace(/\[(.*?)\]\((.*?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
    return t;
  }
  function setStatus(text, color) {
    statusEl.textContent = text;
    statusEl.style.color = color || '#10b981';
  }
  function detectCategory(text) {
    const t = text.toLowerCase();
    if (t.includes('service')||t.includes('cloud')||t.includes('ai ')||t.includes('software')) return 'service';
    if (t.includes('price')||t.includes('cost')||t.includes('rate')||t.includes('budget')||t.includes('pricing')) return 'price';
    if (t.includes('timeline')||t.includes('week')||t.includes('delivery')||t.includes('duration')) return 'timeline';
    if (t.includes('brian')||t.includes('kimani')||t.includes('founder')||t.includes('architect')) return 'brian';
    if (t.includes('nda')||t.includes('ip ')||t.includes('confidential')||t.includes('intellectual')) return 'nda';
    if (t.includes('contact')||t.includes('email')||t.includes('phone')) return 'contact';
    if (t.includes('case')||t.includes('portfolio')||t.includes('fincore')||t.includes('afya')) return 'case';
    return 'default';
  }

  /* Append message */
  function appendMessage(sender, content, opts) {
    opts = opts || {};
    const msgEl = document.createElement('div');
    msgEl.className = 'chatbox-msg ' + sender;
    const contentEl = document.createElement('div');
    contentEl.className = 'chatbox-msg-content';
    if (sender === 'user') {
      contentEl.textContent = content;
    } else {
      contentEl.innerHTML = opts.raw ? formatMarkdown(content) : '';
    }
    const metaEl = document.createElement('div');
    metaEl.className = 'chatbox-msg-meta';
    const timeEl = document.createElement('span');
    timeEl.className = 'chatbox-msg-time';
    timeEl.textContent = opts.time || nowTime();
    metaEl.appendChild(timeEl);
    if (sender === 'bot' && !opts.noReaction) {
      const rw = document.createElement('div');
      rw.className = 'chatbox-reactions';
      ['??','??','??'].forEach(function(emoji) {
        const b = document.createElement('button');
        b.className = 'chatbox-react-btn';
        b.textContent = emoji;
        b.type = 'button';
        b.addEventListener('click', function() {
          rw.querySelectorAll('.chatbox-react-btn').forEach(function(x){ x.classList.remove('active'); });
          b.classList.add('active');
        });
        rw.appendChild(b);
      });
      metaEl.appendChild(rw);
    }
    msgEl.appendChild(contentEl);
    msgEl.appendChild(metaEl);
    bodyEl.appendChild(msgEl);
    scrollToBottom();
    return { msgEl: msgEl, contentEl: contentEl };
  }

  /* Typewriter (fade-in reveal) */
  function typewriterEffect(contentEl, html, onDone) {
    contentEl.innerHTML = html;
    contentEl.style.opacity = '0';
    contentEl.style.transform = 'translateY(6px)';
    requestAnimationFrame(function() {
      contentEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      contentEl.style.opacity = '1';
      contentEl.style.transform = 'translateY(0)';
      if (onDone) setTimeout(onDone, 380);
    });
  }

  /* Typing indicator */
  function showTyping() {
    var el = document.createElement('div');
    el.className = 'chatbox-typing'; el.id = 'chatboxTyping';
    el.innerHTML = '<span class="chatbox-dot"></span><span class="chatbox-dot"></span><span class="chatbox-dot"></span>';
    bodyEl.appendChild(el); scrollToBottom();
  }
  function hideTyping() {
    var el = document.getElementById('chatboxTyping');
    if (el) el.remove();
  }

  /* Chips */
  function renderChips(chips, promptMap) {
    var wrap = document.createElement('div');
    wrap.className = 'chatbox-quick-suggestions';
    var lbl = document.createElement('div');
    lbl.className = 'chatbox-quick-label';
    lbl.textContent = 'Quick replies';
    wrap.appendChild(lbl);
    var row = document.createElement('div');
    row.className = 'chatbox-chips-wrap';
    chips.forEach(function(chip) {
      var label  = typeof chip === 'string' ? chip : chip.label;
      var prompt = typeof chip === 'string' ? (promptMap ? promptMap[label] : label) : chip.prompt;
      var btn = document.createElement('button');
      btn.className = 'chatbox-chip';
      btn.textContent = label;
      btn.type = 'button';
      btn.addEventListener('click', function() {
        wrap.remove();
        inputEl.value = prompt || label;
        sendBtn.disabled = false;
        handleSend();
      });
      row.appendChild(btn);
    });
    wrap.appendChild(row);
    bodyEl.appendChild(wrap);
    scrollToBottom();
  }

  /* Initial greeting */
  function renderInitialGreeting() {
    var result = appendMessage('bot', '', { noReaction: true });
    typewriterEffect(
      result.contentEl,
      '\uD83D\uDC4B Hello! I\'m the <strong>Logic Tech AI Concierge</strong>.<br>How can we help architect, secure, or scale your technology today?',
      function() { renderChips(INITIAL_CHIPS); scrollToBottom(); }
    );
    sessionHistory.push({ sender: 'bot', content: 'greeting', time: nowTime() });
  }

  /* Restore or init */
  if (stored.length) {
    sessionHistory = stored;
    stored.forEach(function(m) {
      var result = appendMessage(m.sender, '', { raw: true, time: m.time });
      result.contentEl.innerHTML = m.sender === 'bot' ? formatMarkdown(m.content) : escapeHtml(m.content);
    });
    var lastBot = stored.slice().reverse().find(function(m){ return m.sender === 'bot' && m.content !== 'greeting'; });
    if (lastBot) {
      var cat = detectCategory(lastBot.content);
      renderChips(FOLLOW_UP_MAP[cat] || FOLLOW_UP_MAP.default, FOLLOW_UP_PROMPTS);
    }
  } else {
    renderInitialGreeting();
  }

  /* Input gating */
  inputEl.addEventListener('input', function() {
    sendBtn.disabled = !inputEl.value.trim();
  });

  /* Lead panel */
  leadBtn.addEventListener('click', function() {
    leadPanel.style.display = leadPanel.style.display !== 'none' ? 'none' : 'block';
    if (leadPanel.style.display === 'block') leadPanel.querySelector('input').focus();
  });
  leadCancel.addEventListener('click', function() { leadPanel.style.display = 'none'; });

  leadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    var name  = document.getElementById('chatboxLeadName').value.trim();
    var email = document.getElementById('chatboxLeadEmail').value.trim();
    var phone = document.getElementById('chatboxLeadPhone').value.trim();
    var msg   = document.getElementById('chatboxLeadMsg').value.trim();
    var submitBtn = document.getElementById('chatboxLeadSubmit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    try {
      var apiBase = window.location.port === '5500' ? 'http://localhost:8080' : '';
      var res = await fetch(apiBase + '/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name, email: email, phone: phone,
          company: 'via AI Chat', service: 'General Inquiry',
          budget: '', timeline: '',
          description: msg || 'Callback request via AI Concierge.',
          nda_required: false
        })
      });
      if (res.ok) {
        leadPanel.innerHTML = '<div style="text-align:center;padding:1.5rem 1rem;"><i class="fa-solid fa-circle-check" style="font-size:2rem;color:#10b981;margin-bottom:0.75rem;display:block;"></i><strong>Request received!</strong><p style="color:var(--text-muted,#94a3b8);font-size:0.82rem;margin:0.5rem 0 0.75rem;">We\'ll be in touch within 24 hours, ' + escapeHtml(name.split(' ')[0]) + '.</p><button id="chatboxLeadDone" type="button" style="padding:0.5rem 1.25rem;border-radius:8px;border:none;background:linear-gradient(135deg,#a6813e,#846328);color:#020617;cursor:pointer;font-weight:700;font-size:0.82rem;">Back to Chat</button></div>';
        document.getElementById('chatboxLeadDone').addEventListener('click', function() {
          leadPanel.style.display = 'none';
          var r = appendMessage('bot', '');
          typewriterEffect(r.contentEl, '\u2705 Your callback request is submitted. Our team will reach out within <strong>24 hours</strong>. Anything else I can help with?');
          renderChips(FOLLOW_UP_MAP.contact, FOLLOW_UP_PROMPTS);
        });
      } else { throw new Error('err'); }
    } catch(_) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Try Again';
    }
  });

  /* Reset */
  clearBtn.addEventListener('click', function() {
    bodyEl.innerHTML = '';
    sessionHistory = [];
    sessionStorage.removeItem(SESSION_KEY);
    leadPanel.style.display = 'none';
    renderInitialGreeting();
  });

  /* Send */
  async function handleSend() {
    var text = inputEl.value.trim();
    if (!text || isSending) return;
    isSending = true;
    inputEl.value = '';
    sendBtn.disabled = true;
    document.querySelectorAll('.chatbox-quick-suggestions').forEach(function(el){ el.remove(); });
    appendMessage('user', text);
    sessionHistory.push({ sender: 'user', content: text, time: nowTime() });
    saveHistory();
    showTyping();
    setStatus('Typing\u2026', '#a6813e');
    var minDelay = 900 + Math.min(text.length * 12, 1200);
    var t0 = Date.now();
    try {
      var apiBase = window.location.port === '5500' ? 'http://localhost:8080' : '';
      var response = await fetch(apiBase + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      var data = await response.json();
      var elapsed = Date.now() - t0;
      if (elapsed < minDelay) await new Promise(function(r){ setTimeout(r, minDelay - elapsed); });
      hideTyping();
      setStatus('Online \u2022 Instant Answers', '#10b981');
      var reply = (response.ok && data.reply)
        ? data.reply
        : "I'm having a brief moment of delay. Reach our team via our [Contact Form](contact.html) or email **contact@logictech.io**.";
      var result = appendMessage('bot', '');
      typewriterEffect(result.contentEl, formatMarkdown(reply), function() {
        var category = detectCategory(reply + ' ' + text);
        renderChips(FOLLOW_UP_MAP[category] || FOLLOW_UP_MAP.default, FOLLOW_UP_PROMPTS);
        scrollToBottom();
      });
      sessionHistory.push({ sender: 'bot', content: reply, time: nowTime() });
      saveHistory();
      bumpUnread();
    } catch(_) {
      hideTyping();
      setStatus('Online \u2022 Instant Answers', '#10b981');
      var fb = "Our team is ready! You can submit an inquiry on our [Contact Page](contact.html) or email **contact@logictech.io**.";
      var r = appendMessage('bot', '');
      typewriterEffect(r.contentEl, formatMarkdown(fb));
      renderChips(FOLLOW_UP_MAP.default, FOLLOW_UP_PROMPTS);
    } finally {
      isSending = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  formEl.addEventListener('submit', function(e) { e.preventDefault(); handleSend(); });
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) handleSend(); }
  });

})();
