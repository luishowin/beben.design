/* ══════════════════════════════════════════════
   Sprite — AI Site Guide Widget  (v3)
   Drop-in JS module. No dependencies.

   NOTE: this file runs in the browser on the website.
   It is NOT the Cloudflare Worker. The file to paste into
   the Cloudflare editor is cloudflare-worker/sprite-proxy.js.

   v3 changes:
     - Injects its own DOM: pages only need sprite.css + sprite.js,
       no widget markup to copy around.
     - Optional live LLM brain via SPRITE_CONFIG.apiUrl (a proxy
       that holds the API key — never put the key in this file).
       Falls back to the built-in pattern engine when unset or down.
     - Conversation history persists in sessionStorage, so the chat
       follows the visitor from page to page.
     - LLM replies may contain markdown links; only site-internal,
       wa.me, mailto and tel links are rendered as anchors.
═══════════════════════════════════════════════ */

const SPRITE_CONFIG = {
  /* The deployed proxy that holds the Fireworks key (see
     cloudflare-worker/README.md). Set to '' to run fully offline on
     the built-in pattern engine; any proxy failure also falls back. */
  apiUrl: 'https://sprite-proxy.howin329.workers.dev',
  maxHistory: 12,
};

const SpriteChat = (() => {
  let isOpen = false;
  let ttsEnabled = false;
  let isRecording = false;
  let recognition = null;
  let blinkInterval = null;
  let pillRevealed = false;
  let conversationMood = 0;
  let apiWarned = false;

  const HISTORY_KEY = 'sprite-history-v1';

  const pillTexts = [
    "Hey, need help?",
    "Ask me anything!",
    "I know this site well.",
    "Curious? Click me!",
    "Need directions?",
  ];

  // ── Widget DOM ──
  // Injected once per page so no page has to carry the markup.

  const WIDGET_HTML =
    '<div class="sprite-pill" id="spritePill" onclick="SpriteChat.open()">' +
      '<div class="sprite-character" data-emotion="happy">' +
        '<div class="sprite-body">' +
          '<div class="sprite-eyes">' +
            '<div class="sprite-eye"><div class="sprite-brow"></div></div>' +
            '<div class="sprite-eye"><div class="sprite-brow"></div></div>' +
          '</div>' +
          '<div class="sprite-mouth"></div>' +
        '</div>' +
      '</div>' +
      '<span class="pill-text">Hey, need help?</span>' +
    '</div>' +
    '<div class="sprite-panel" id="spritePanel">' +
      '<div class="panel-header">' +
        '<div class="panel-banner" id="panelBanner"></div>' +
        '<button class="panel-close" onclick="SpriteChat.close()" aria-label="Minimize">&minus;</button>' +
        '<div class="panel-identity">' +
          '<div class="sprite-character large" id="panelSprite" data-emotion="happy">' +
            '<div class="sprite-body">' +
              '<div class="sprite-eyes">' +
                '<div class="sprite-eye"><div class="sprite-brow"></div></div>' +
                '<div class="sprite-eye"><div class="sprite-brow"></div></div>' +
              '</div>' +
              '<div class="sprite-mouth"></div>' +
            '</div>' +
          '</div>' +
          '<div class="panel-identity-info">' +
            '<span class="sprite-name">Sprite</span>' +
            '<div class="sprite-status" id="spriteStatus" data-status="online">' +
              '<span class="status-dot"></span>' +
              '<span class="status-text">online</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="chat-area" id="chatArea"></div>' +
      '<div class="quick-chips" id="quickChips"></div>' +
      '<div class="chat-input-area">' +
        '<input class="chat-input" id="chatInput" type="text" placeholder="Ask me anything..." autocomplete="off">' +
        '<button class="input-btn" id="ttsToggle" onclick="SpriteChat.toggleTTS()" title="Toggle voice output">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>' +
        '</button>' +
        '<button class="input-btn" id="micBtn" onclick="SpriteChat.toggleMic()" title="Voice input">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' +
        '</button>' +
        '<button class="input-btn send-btn" onclick="SpriteChat.send()" title="Send">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';

  function injectWidget() {
    if (document.getElementById('sprite-widget')) return;
    var root = document.createElement('div');
    root.id = 'sprite-widget';
    root.innerHTML = WIDGET_HTML;
    document.body.appendChild(root);
  }

  // ── Conversation history (survives page navigation) ──

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(HISTORY_KEY);
      var h = raw ? JSON.parse(raw) : [];
      return Array.isArray(h) ? h : [];
    } catch (e) { return []; }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-SPRITE_CONFIG.maxHistory)));
    } catch (e) { /* storage unavailable: chat still works, just not across pages */ }
  }

  function pushHistory(role, content) {
    var h = loadHistory();
    h.push({ role: role, content: String(content).slice(0, 1000) });
    saveHistory(h);
  }

  // ── Sentiment Engine ──

  const sentimentWords = {
    positive: { words: /\b(thanks?|thank you|great|awesome|cool|love|nice|perfect|amazing|good|yes|sure|okay|help|please)\b/i, weight: 1 },
    negative: { words: /\b(bad|hate|terrible|awful|worst|ugh|annoying|stupid|broken|sucks|wrong|no|don't|can't|won't)\b/i, weight: -1 },
    frustrated: { words: /\b(frustrated|angry|mad|furious|ridiculous|waste|useless|impossible)\b/i, weight: -2 },
    enthusiastic: { words: /\b(wow|incredible|fantastic|brilliant|excited|yay|hooray|omg|whoa)\b/i, weight: 2 },
  };

  function analyzeSentiment(text) {
    let shift = 0;
    for (const cat of Object.values(sentimentWords)) {
      if (cat.words.test(text)) shift += cat.weight;
    }
    conversationMood = Math.max(-3, Math.min(3, conversationMood + shift));
    if (Math.abs(conversationMood) > 1) {
      conversationMood += conversationMood > 0 ? -0.3 : 0.3;
    }
  }

  function moodToEmotion() {
    if (conversationMood >= 2.5) return 'excited';
    if (conversationMood >= 1) return 'happy';
    if (conversationMood <= -2.5) return 'angry';
    if (conversationMood <= -1.5) return 'sad';
    if (conversationMood <= -0.5) return 'guessing';
    return 'idle';
  }

  // ── Status ──

  function setStatus(status) {
    const el = document.getElementById('spriteStatus');
    if (!el) return;
    el.setAttribute('data-status', status);
    const labels = { online: 'Online', waiting: 'Waiting', offline: 'Offline' };
    el.querySelector('.status-text').textContent = (labels[status] || status).toLowerCase();
  }

  // ── Seasonal Banner ──
  // Absolute paths: the widget renders on every page depth.

  const seasonalBanners = {
    holidays: [
      { name: 'new-year',    month: 1,  dayStart: 1,  dayEnd: 3,   image: '/assets/images/banners/new-year.jpg' },
      { name: 'valentines',  month: 2,  dayStart: 12, dayEnd: 15,  image: '/assets/images/banners/valentines.jpg' },
      { name: 'easter',      month: 3,  dayStart: 20, dayEnd: 31,  image: '/assets/images/banners/easter.jpg' },
      { name: 'halloween',   month: 10, dayStart: 25, dayEnd: 31,  image: '/assets/images/banners/halloween.jpg' },
      { name: 'christmas',   month: 12, dayStart: 15, dayEnd: 31,  image: '/assets/images/banners/christmas.jpg' },
    ],
    seasons: {
      spring: '/assets/images/banners/spring.jpg',
      summer: '/assets/images/sprite-profile-banner.jpg',
      autumn: '/assets/images/banners/autumn.jpg',
      winter: '/assets/images/banners/winter.jpg',
    }
  };

  function getSeasonalBanner() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    for (const h of seasonalBanners.holidays) {
      if (month === h.month && day >= h.dayStart && day <= h.dayEnd) return h.image;
    }
    if (month >= 3 && month <= 5) return seasonalBanners.seasons.spring;
    if (month >= 6 && month <= 8) return seasonalBanners.seasons.summer;
    if (month >= 9 && month <= 11) return seasonalBanners.seasons.autumn;
    return seasonalBanners.seasons.winter;
  }

  function applyBanner() {
    const banner = document.getElementById('panelBanner');
    if (!banner) return;
    banner.style.backgroundImage = 'url(' + getSeasonalBanner() + ')';
  }

  // ── Dialogues (offline fallback engine) ──

  const dialogues = {
    greetings: {
      patterns: [/^(hey|hello|hi|howdy|yo|sup|hiya|hola|greetings)/i],
      responses: [
        { text: "Hey there! I'm Sprite, your guide around this site. What are you looking for?", emotion: "waving" },
        { text: "Hello! Nice to meet you. I know every corner of this site -- try me!", emotion: "happy" },
        { text: "Hi! I'm basically the concierge here. Where can I point you?", emotion: "happy" },
        { text: "Yo! What's good? Need help finding something?", emotion: "waving" },
      ]
    },
    studio: {
      patterns: [/\b(beben|this (site|studio|company|place)|the studio|what is this)\b/i],
      responses: [
        { text: "Beben Design is a design-led digital product studio in Westlands, Nairobi. Research first, pixels second: UX research, UI design, brand identity, and front-end builds. Get the full picture at <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('services')\">Services</span> or see the <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('work')\">Work</span>.", emotion: "happy" },
        { text: "You're at the home of Beben Design, a small studio that puts design logic before the first line of code. Websites, brands, UX research, product strategy. Want to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">start a conversation</span>?", emotion: "happy" },
      ]
    },
    services: {
      patterns: [/\b(services?|what do you (do|offer)|capabilities|help with)\b/i],
      responses: [
        { text: "We do a bunch of cool stuff! Websites, Mobile UI, UX Research, AI Integration, HMI, Desktop Apps, and Rebranding. Want me to take you to the <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('services')\">Services page</span>?", emotion: "excited" },
        { text: "Great question! The studio covers everything from web design to AI integration. Check out the full list at <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('services')\">Services</span>!", emotion: "happy" },
      ]
    },
    work: {
      patterns: [/\b(work|portfolio|projects?|case stud|showcase|examples?)\b/i],
      responses: [
        { text: "The 'Thinking in Pixels' section is where the real stuff lives -- case studies showing the thinking behind each design. Let me take you to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('work')\">Work</span>!", emotion: "excited" },
        { text: "Want to see some work? Every project here is a case study in validation. Jump to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('work')\">Thinking in Pixels</span>!", emotion: "happy" },
      ]
    },
    contact: {
      patterns: [/\b(contact|reach|email|talk|hire|get in touch|start|project)\b/i],
      responses: [
        { text: "Love the enthusiasm! Head to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">Contact</span> or just email hello.beben.design@gmail.com. No aggressive sales pitch -- just a real conversation.", emotion: "happy" },
        { text: "Ready to chat? There's a project form on the <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">Contact page</span>. The team is super approachable!", emotion: "waving" },
      ]
    },
    pricing: {
      patterns: [/\b(price|pricing|cost|how much|budget|afford|expensive|cheap|rate)\b/i],
      responses: [
        { text: "Simple static websites start at $99 USD, but it depends on complexity. The team gives transparent, line-item quotes -- no surprises. Want to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">reach out</span> for a quote?", emotion: "happy" },
        { text: "Pricing is honest and transparent here. Starts at $99 for static sites, scales with complexity. Best to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">get in touch</span> for a real number!", emotion: "happy" },
      ]
    },
    about: {
      patterns: [/\b(who are you|what are you|about you|your name|sprite|tell me about)\b/i],
      responses: [
        { text: "I'm Sprite! A little AI guide built to help you navigate this site. Think of me as the friendly face of beben.design -- I know all the pages, services, and even a few secrets.", emotion: "waving" },
        { text: "I'm your pixel-powered guide! Born right here in the Thinking in Pixels lab. I can help you find things, answer questions, or just hang out.", emotion: "happy" },
      ]
    },
    process: {
      patterns: [/\b(process|how (do you|does it) work|workflow|methodology|steps)\b/i],
      responses: [
        { text: "The studio follows a 6-step process: Requirement Analysis, Ideation, Prototyping, Responsive Analysis, Testing and QA, then Maintenance. Want to see it? <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('process')\">Jump to Process</span>!", emotion: "happy" },
      ]
    },
    tools: {
      patterns: [/\b(tools?|framework|tech|stack|react|html|css|framer|wordpress)\b/i],
      responses: [
        { text: "Two answers! The studio builds with HTML/CSS, React JS, Framer, and WordPress. And there's also a page of free browser <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('tools')\">Tools</span> you can use right now -- like the QR code generator.", emotion: "happy" },
      ]
    },
    shop: {
      patterns: [/\b(shop|store|buy|products?|templates?|ui kits?)\b/i],
      responses: [
        { text: "The <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('shop')\">Shop</span> is launching in 2026 -- UI kits, templates, icon sets, and print assets. You can join the waitlist to get first access!", emotion: "excited" },
      ]
    },
    faq: {
      patterns: [/\b(faq|frequently asked|questions?|common)\b/i],
      responses: [
        { text: "There's a whole FAQ section with answers on pricing, startups, redesigns, and AI usage. <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('faq')\">Jump to FAQ</span>!", emotion: "happy" },
      ]
    },
    joke: {
      patterns: [/\b(joke|funny|laugh|humor|make me laugh|tell me a)\b/i],
      responses: [
        { text: "Why do designers love dark mode? Because they've already been through enough light!", emotion: "dancing", chips: ["Tell another!", "Back to business"] },
        { text: "How many designers does it take to change a lightbulb? -- Does it HAVE to be a lightbulb?", emotion: "dancing", chips: ["One more!", "Okay okay"] },
        { text: "A front-end dev walks into a bar -- but the padding is off so they stand 40px to the left.", emotion: "dancing", chips: ["Another!", "You're ridiculous"] },
        { text: "CSS is like dating. Nothing works until you use !important.", emotion: "dancing" },
      ]
    },
    dance: {
      patterns: [/\b(dance|party|celebrate|move|groove|boogie)\b/i],
      responses: [
        { text: "You asked for it!", emotion: "dancing" },
        { text: "DANCE BREAK!", emotion: "dancing" },
      ]
    },
    secret: {
      patterns: [/\b(secret|easter egg|hidden|surprise|magic)\b/i],
      responses: [
        { text: "Ooh, you found me out! Here's a secret: try saying 'dance' and watch what happens...", emotion: "surprised" },
        { text: "Psst... the best secret about this studio? They put as much thought into things you'll never see as the things you will. Now THAT'S craft.", emotion: "surprised" },
      ]
    },
    thanks: {
      patterns: [/\b(thanks?|thank you|thx|cheers|appreciate|helpful)\b/i],
      responses: [
        { text: "You're welcome! That made my little pixel heart glow.", emotion: "happy" },
        { text: "Happy to help! I'll be right here if you need me. Just click the pill!", emotion: "happy" },
      ]
    },
    goodbye: {
      patterns: [/\b(bye|goodbye|see ya|later|cya|gotta go|peace)\b/i],
      responses: [
        { text: "See you around! I'll be floating down here if you need me.", emotion: "waving" },
        { text: "Later! Come back anytime -- I don't sleep. Perks of being made of pixels!", emotion: "waving" },
      ]
    },
    startup: {
      patterns: [/\b(startup|early.?stage|mvp|launch|new company|founder)\b/i],
      responses: [
        { text: "Startups are a sweet spot here! The studio helps find your 'Minimum Viable Design' to launch quickly and professionally. Want to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">start a conversation</span>?", emotion: "excited" },
      ]
    },
    redesign: {
      patterns: [/\b(redesign|rebuild|revamp|update|refresh|redo|improve)\b/i],
      responses: [
        { text: "Absolutely! They start with a UX audit to find what's actually broken -- no painting over functional issues. Want to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">discuss your project</span>?", emotion: "happy" },
      ]
    },
    nairobi: {
      patterns: [/\b(nairobi|kenya|location|where|based|africa)\b/i],
      responses: [
        { text: "The studio is based in Westlands, Nairobi -- coordinates 1 deg 16'S 36 deg 48'E to be exact! But they work with teams globally.", emotion: "happy" },
      ]
    },
    bored: {
      patterns: [/\b(bored|boring|meh|whatever|nothing|idk|dunno)\b/i],
      responses: [
        { text: "Bored? Let me fix that. Ask me for a joke, a secret, or dare me to dance.", emotion: "bored", chips: ["Tell me a joke", "Got any secrets?", "Dance!"] },
        { text: "I feel that. How about I show you something cool? The case studies are pretty interesting.", emotion: "bored", chips: ["Show me work", "Tell me a joke"] },
      ]
    },
    frustration: {
      patterns: [/\b(frustrated|can't find|where is|lost|confused|stuck|help me)\b/i],
      responses: [
        { text: "No worries, I've got you. Tell me what you're looking for and I'll point you right to it.", emotion: "guessing", chips: ["Services", "Work", "Contact", "Pricing"] },
        { text: "I can see you're trying to find something -- here are the main sections. Which one?", emotion: "guessing", chips: ["Services", "Portfolio", "Get in touch"] },
      ]
    },
    compliment: {
      patterns: [/\b(cute|adorable|cool|awesome|great site|love this|beautiful|nice design)\b/i],
      responses: [
        { text: "Aw, thank you! I'll pass that along to the team. They put a lot of heart into this.", emotion: "excited" },
        { text: "You just made my day! The folks behind this site really care about the details.", emotion: "happy" },
      ]
    },
    demo: {
      patterns: [/\b(demo|live|preview|engagement|running)\b/i],
      responses: [
        { text: "There's a live-style preview of how a project moves through research, iteration, and build. <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('demo')\">Check it out</span>!", emotion: "excited" },
      ]
    },
    industries: {
      patterns: [/\b(industr|ecommerce|automotive|healthcare|real estate|retail|agriculture)\b/i],
      responses: [
        { text: "The studio works across Ecommerce, Automotive, Healthcare, Recreation, Real Estate, Retail, and Agriculture. <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('industries')\">See the full list</span>!", emotion: "happy" },
      ]
    },
  };

  const fallbacks = [
    { text: "Hmm, I'm not sure about that one! But I can help you find Services, Work, Contact info, or Pricing. What sounds good?", emotion: "guessing", chips: ["Services", "Work", "Contact", "Pricing"] },
    { text: "That's a great question, but it's a bit outside my training data! Try asking about the studio's services, work, or how to get in touch.", emotion: "thinking", chips: ["What do you offer?", "Show me work", "Get in touch"] },
    { text: "I wish I knew! I'm best at navigating this site and answering questions about the studio. Want to try one of these?", emotion: "guessing", chips: ["Services", "Portfolio", "Pricing", "Contact"] },
  ];

  // ── Page awareness ──

  function currentPage() {
    return {
      path: window.location.pathname,
      title: (document.title || '').slice(0, 120),
    };
  }

  function pageChips() {
    var p = window.location.pathname;
    if (p.indexOf('/services') === 0) return ["What's the process?", "Pricing", "Start a project"];
    if (p.indexOf('/shop') === 0)     return ["When does the shop open?", "What's coming?", "Services"];
    if (p.indexOf('/tools') === 0)    return ["What can the tools do?", "Services", "Tell me a joke"];
    if (p.indexOf('/contact') === 0)  return ["Pricing", "How long do projects take?", "Show me work"];
    if (p.indexOf('/work') === 0 || p.indexOf('/sprite') === 0 || p.indexOf('/kilimo-pal') === 0 ||
        p.indexOf('/trek-watch') === 0 || p.indexOf('/rev-log') === 0)
      return ["Tell me about the projects", "Services", "Start a project"];
    return ["Services", "Work", "Pricing", "Tell me a joke"];
  }

  // ── Init ──

  function init() {
    injectWidget();

    const input = document.getElementById('chatInput');
    if (!input) return;
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const mic = document.getElementById('micBtn');
      if (mic) mic.style.display = 'none';
    }

    startBlink();
    rotatePillText();
    initScrollTrigger();
    applyBanner();
  }

  // ── Scroll Trigger ──

  function initScrollTrigger() {
    var triggerSection = document.getElementById('services') || document.querySelector('.section--soft');
    if (!triggerSection) { revealPill(); return; }
    var observer = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && !pillRevealed) {
          revealPill();
          observer.disconnect();
        }
      }
    }, { threshold: 0.3 });
    observer.observe(triggerSection);
  }

  function revealPill() {
    pillRevealed = true;
    document.getElementById('spritePill').classList.add('visible');
  }

  // ── Blink & Pill Text ──

  function startBlink() {
    var blink = function() {
      document.querySelectorAll('#sprite-widget .sprite-eye').forEach(function(eye) {
        eye.classList.add('blink');
        setTimeout(function() { eye.classList.remove('blink'); }, 150);
      });
    };
    blinkInterval = setInterval(blink, 3000 + Math.random() * 2000);
  }

  function rotatePillText() {
    var idx = 0;
    setInterval(function() {
      idx = (idx + 1) % pillTexts.length;
      var el = document.querySelector('.pill-text');
      if (el && !isOpen) {
        el.style.opacity = '0';
        setTimeout(function() { el.textContent = pillTexts[idx]; el.style.opacity = '1'; }, 200);
      }
    }, 5000);
  }

  // ── Emotions ──

  function setEmotion(emotion, duration) {
    document.querySelectorAll('#sprite-widget .sprite-character').forEach(function(s) {
      s.setAttribute('data-emotion', emotion);
    });
    if (duration) {
      setTimeout(function() {
        var resting = moodToEmotion();
        document.querySelectorAll('#sprite-widget .sprite-character').forEach(function(s) {
          s.setAttribute('data-emotion', resting);
        });
      }, duration);
    }
  }

  // ── Panel ──

  function open() {
    isOpen = true;
    document.getElementById('spritePill').classList.add('hidden');
    document.getElementById('spritePanel').classList.add('open');
    if (document.getElementById('chatArea').children.length === 0) {
      var history = loadHistory();
      if (history.length > 0) {
        // The conversation followed the visitor from another page.
        history.forEach(function(m) {
          if (m.role === 'user') addMessage(escapeHtml(m.content), 'user', true);
          else addMessage(renderSpriteText(m.content), 'sprite', true);
        });
        setEmotion('happy', 2000);
      } else {
        setEmotion('waving', 2500);
        addMessage("Hey there! I'm Sprite -- your little guide around this site. Ask me anything or pick a topic below!", 'sprite', true);
        showChips(pageChips());
      }
    }
    setTimeout(function() { document.getElementById('chatInput').focus(); }, 350);
  }

  function close() {
    isOpen = false;
    document.getElementById('spritePanel').classList.remove('open');
    setTimeout(function() {
      var pill = document.getElementById('spritePill');
      pill.classList.remove('hidden');
      pill.classList.add('visible');
    }, 300);
  }

  // ── Messages ──

  // isHtml: sprite messages arrive pre-rendered (trusted local strings
  // or LLM output already sanitised through renderSpriteText).
  function addMessage(text, sender, isHtml) {
    var area = document.getElementById('chatArea');
    var msg = document.createElement('div');
    msg.className = 'chat-msg ' + sender;
    if (sender === 'sprite') {
      msg.innerHTML =
        '<div class="msg-avatar"><div class="mini-eyes"><div class="mini-eye"></div><div class="mini-eye"></div></div></div>' +
        '<div class="msg-bubble">' + text + '</div>';
    } else {
      msg.innerHTML = '<div class="msg-bubble">' + (isHtml ? text : escapeHtml(text)) + '</div>';
    }
    area.appendChild(msg);
    area.scrollTop = area.scrollHeight;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Render an LLM reply: escape everything, then turn allowlisted
  // markdown links into real anchors. Live links, no script injection.
  function isAllowedUrl(url) {
    if (/^\//.test(url)) return true;                                  // site-relative
    if (/^https:\/\/(www\.)?beben\.design(\/|$)/i.test(url)) return true;
    if (/^https:\/\/wa\.me\/\d+$/i.test(url)) return true;
    if (/^mailto:[^\s"<>]+$/i.test(url)) return true;
    if (/^tel:\+?[\d\s]+$/i.test(url)) return true;
    return false;
  }

  function renderSpriteText(raw) {
    var text = escapeHtml(String(raw));
    // markdown links: [label](url)
    text = text.replace(/\[([^\]]{1,80})\]\(([^)\s]{1,200})\)/g, function(m, label, url) {
      if (!isAllowedUrl(url)) return label;
      var external = /^https:\/\/wa\.me/i.test(url);
      return '<a class="nav-link-inline" href="' + url + '"' +
             (external ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
    });
    // bare site paths the model may emit without markdown, e.g. /services/
    text = text.replace(/(^|\s)(\/(?:services|tools|shop|work|contact|sprite|kilimo-pal|trek-watch|rev-log|legal|privacy|credits)\/)(?=[\s.,!?)]|$)/g,
      '$1<a class="nav-link-inline" href="$2">$2</a>');
    // bare WhatsApp URLs become tappable too
    text = text.replace(/(^|\s)(https:\/\/wa\.me\/\d+)(?=[\s.,!?)]|$)/g,
      '$1<a class="nav-link-inline" href="$2" target="_blank" rel="noopener">WhatsApp</a>');
    return text.replace(/\n/g, '<br>');
  }

  function showTyping() {
    setStatus('waiting');
    var area = document.getElementById('chatArea');
    var indicator = document.createElement('div');
    indicator.className = 'chat-msg sprite';
    indicator.id = 'typingIndicator';
    indicator.innerHTML =
      '<div class="msg-avatar"><div class="mini-eyes"><div class="mini-eye"></div><div class="mini-eye"></div></div></div>' +
      '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
    area.appendChild(indicator);
    area.scrollTop = area.scrollHeight;
    setEmotion('thinking');
  }

  function hideTyping() {
    var el = document.getElementById('typingIndicator');
    if (el) el.remove();
    setStatus('online');
  }

  function showChips(labels) {
    var container = document.getElementById('quickChips');
    container.innerHTML = '';
    labels.forEach(function(label) {
      var btn = document.createElement('button');
      btn.className = 'quick-chip';
      btn.textContent = label;
      btn.onclick = function() {
        container.innerHTML = '';
        addMessage(label, 'user');
        processInput(label);
      };
      container.appendChild(btn);
    });
  }

  // ── Response Engine (offline fallback) ──

  function getResponse(input) {
    var lower = input.toLowerCase().trim();
    for (var key in dialogues) {
      var category = dialogues[key];
      for (var i = 0; i < category.patterns.length; i++) {
        if (category.patterns[i].test(lower)) {
          return category.responses[Math.floor(Math.random() * category.responses.length)];
        }
      }
    }
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  function respondLocally(text) {
    var delay = 800 + Math.random() * 700;
    setTimeout(function() {
      hideTyping();
      var response = getResponse(text);
      var dur = (response.emotion === 'dancing' || response.emotion === 'excited') ? 3000 : 2000;
      setEmotion(response.emotion, dur);
      addMessage(response.text, 'sprite', true);
      pushHistory('assistant', response.text.replace(/<[^>]*>/g, ''));
      if (response.chips) {
        showChips(response.chips);
      } else {
        document.getElementById('quickChips').innerHTML = '';
      }
      if (ttsEnabled) speak(response.text);
    }, delay);
  }

  // ── Response Engine (live LLM via proxy) ──

  function respondViaApi(text) {
    var payload = {
      messages: loadHistory(),
      page: currentPage(),
    };
    fetch(SPRITE_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function(r) {
        if (!r.ok) throw new Error('proxy returned ' + r.status);
        return r.json();
      })
      .then(function(data) {
        var reply = (data && data.reply) ? String(data.reply).trim() : '';
        if (!reply) throw new Error('empty reply');
        hideTyping();
        setEmotion('talking', 2000);
        addMessage(renderSpriteText(reply), 'sprite', true);
        pushHistory('assistant', reply);
        document.getElementById('quickChips').innerHTML = '';
        if (ttsEnabled) speak(reply);
      })
      .catch(function(err) {
        if (!apiWarned) {
          apiWarned = true;
          console.warn('[Sprite] Live brain unreachable, using built-in answers:', err.message);
        }
        respondLocally(text);
      });
  }

  function processInput(text) {
    analyzeSentiment(text);
    pushHistory('user', text);
    showTyping();
    if (SPRITE_CONFIG.apiUrl) {
      respondViaApi(text);
    } else {
      respondLocally(text);
    }
  }

  function send() {
    var input = document.getElementById('chatInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    document.getElementById('quickChips').innerHTML = '';
    addMessage(text, 'user');
    processInput(text);
  }

  // ── TTS ──

  function speak(html) {
    var text = html.replace(/<[^>]*>/g, '');
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.3;
    utter.onstart = function() { setEmotion('talking'); };
    utter.onend = function() { setEmotion(moodToEmotion()); };
    window.speechSynthesis.speak(utter);
  }

  function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    var btn = document.getElementById('ttsToggle');
    btn.classList.toggle('active', ttsEnabled);
    btn.title = ttsEnabled ? 'Voice output ON' : 'Voice output OFF';
  }

  // ── Mic ──

  function toggleMic() {
    if (isRecording) { stopRecording(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = function(e) {
      document.getElementById('chatInput').value = e.results[0][0].transcript;
      send();
      stopRecording();
    };
    recognition.onerror = function() { stopRecording(); };
    recognition.onend = function() { stopRecording(); };
    recognition.start();
    isRecording = true;
    document.getElementById('micBtn').classList.add('recording');
    setEmotion('surprised');
  }

  function stopRecording() {
    if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
    isRecording = false;
    document.getElementById('micBtn').classList.remove('recording');
    setEmotion(moodToEmotion());
  }

  // ── Navigation ──
  // Scrolls when the target section exists on this page; otherwise
  // jumps to the right page (homepage sections get a /#hash).

  const sectionUrls = {
    services: '/services/', tools: '/tools/', shop: '/shop/',
    work: '/work/', contact: '/contact/',
  };

  function navigateTo(sectionId) {
    var el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setEmotion('happy');
      setTimeout(function() {
        addMessage("Here you go! Take a look around.", 'sprite', true);
      }, 600);
      return;
    }
    window.location.href = sectionUrls[sectionId] || ('/#' + sectionId);
  }

  document.addEventListener('DOMContentLoaded', init);

  return { open: open, close: close, send: send, toggleTTS: toggleTTS, toggleMic: toggleMic, navigateTo: navigateTo, setStatus: setStatus };
})();

/* Explicit global: the injected widget's inline onclick handlers and
   external tooling reach SpriteChat via window, which a top-level
   `const` alone does not guarantee. */
window.SpriteChat = SpriteChat;
