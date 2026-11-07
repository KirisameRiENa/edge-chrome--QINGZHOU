/* ============================================================
   清昼 · 起始页逻辑
   设计约束：无框架、无网络请求、无后台脚本、无 requestAnimationFrame 循环。
   全局只有一个 setTimeout 负责分钟跳变，其余全部事件驱动。
   ============================================================ */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const t = (key, params) => QZI18N.t(key, params);

  // 静态文案先填一遍，避免非中文环境下闪一帧原文
  QZI18N.apply();

  // 静态文案先填一遍，避免非中文环境下闪一帧原文
  QZI18N.apply();

  /* ---------------- 偏好存储（localStorage：同步、零权限） ---------------- */
  const PREFIX = 'qz.';
  const read = (key, fallback) => {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(PREFIX + key, value);
      return true;
    } catch (e) {
      /* 隐私模式或配额不足时写入失败，不影响其余功能 */
      return false;
    }
  };

  /* ---------------- 搜索引擎 ---------------- */
  // 引擎的 url 统一是带 %s 的模板，内置与自定义走同一条路
  const ENGINES = [
    { id: 'baidu', name: '百度', mark: '#2a37c4', url: 'https://www.baidu.com/s?wd=%s' },
    { id: 'bing', name: '必应', mark: '#0b8a8a', url: 'https://cn.bing.com/search?q=%s' },
    { id: 'google', name: 'Google', mark: '#4285f4', url: 'https://www.google.com/search?q=%s' },
    { id: 'sogou', name: '搜狗', mark: '#f26b1d', url: 'https://www.sogou.com/web?query=%s' },
    { id: 'so', name: '360', mark: '#12a55a', url: 'https://www.so.com/s?q=%s' },
    { id: 'ddg', name: 'DuckDuckGo', mark: '#de5833', url: 'https://duckduckgo.com/?q=%s' },
  ];

  function readMyEngines() {
    try {
      const list = JSON.parse(localStorage.getItem(PREFIX + 'engines') || '[]');
      if (!Array.isArray(list)) return [];
      return list.filter((e) => e && e.id && e.name && typeof e.url === 'string' && e.url.indexOf('%s') >= 0);
    } catch (e) {
      return [];
    }
  }

  let myEngines = readMyEngines();

  const allEngines = () => ENGINES.concat(myEngines);
  const engineById = (id) => allEngines().find((e) => e.id === id) || ENGINES[0];
  const engineLabel = (engine) => {
    const key = 'engine.' + engine.id;
    const label = t(key);
    return label === key ? engine.name : label;
  };

  const HEX_RE = /^#[0-9a-f]{6}$/i;
  const DEFAULT_CUSTOM = { bg: '#f6f4ef', accent: '#76921f' };

  function readCustom() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFIX + 'custom') || 'null');
      if (saved && HEX_RE.test(saved.bg) && HEX_RE.test(saved.accent)) {
        return { bg: saved.bg, accent: saved.accent };
      }
    } catch (e) {
      /* 数据损坏就回落到默认 */
    }
    return { ...DEFAULT_CUSTOM };
  }

  const state = {
    theme: read('theme', 'auto'), // auto | light | dark
    engine: engineById(read('engine', 'baidu')).id,
    palette: read('palette', 'paper'), // 预设 id 或 'custom'
    custom: readCustom(),
    progress: read('progress', 'day'), // day | week | month | year
    name: read('name', ''),
    wall: read('wall', ''), // 压缩后的 data URL
    wallBlur: Number(read('wallBlur', '0')) || 0,
    glass: Math.min(95, Math.max(0, Number(read('glass', '44')) || 44)),
    bmView: read('bmView', 'list'), // list | grid
    sort: read('sort', 'default'), // default | name | host
    dockPinned: read('dockPinned', 'off') === 'on', // dock 只显示置顶项
  };

  // 两个浮层的开关状态，提前声明，供双方的互斥逻辑互相引用
  let panelOpen = false;
  let histOpen = false;

  /* ---------------- 元素引用 ---------------- */
  const html = document.documentElement;
  const themeBtn = $('#themeBtn');
  const panelBtn = $('#panelBtn');
  const panel = $('#panel');
  const panelClose = $('#panelClose');
  const segButtons = Array.from(document.querySelectorAll('#seg [data-mode]'));
  const enginesEl = $('#engines');
  const swatchesEl = $('#swatches');
  const customBox = $('#customBox');
  const cBg = $('#cBg');
  const cAccent = $('#cAccent');
  const hexBg = $('#hexBg');
  const hexAccent = $('#hexAccent');
  const greetName = $('#greetName');
  const segProgress = $('#segProgress');
  const nameInput = $('#nameInput');
  const bgPick = $('#bgPick');
  const bgClear = $('#bgClear');
  const bgHint = $('#bgHint');
  const bgBlur = $('#bgBlur');
  const bgBlurVal = $('#bgBlurVal');
  const bgFile = $('#bgFile');
  const engineBtn = $('#engineBtn');
  const langBtn = $('#langBtn');
  const langMenu = $('#langMenu');
  const langItems = Array.from(langMenu.querySelectorAll('[data-lang]'));
  const engineDot = $('#engineDot');
  const engineName = $('#engineName');
  const form = $('#searchForm');
  const input = $('#q');
  const hint = $('#hint');
  const searchwrap = $('.searchwrap');
  const hist = $('#hist');
  const histList = $('#histList');
  const histClear = $('#histClear');
  const el = {
    clock: $('#clock'),
    hh: $('#hh'),
    mm: $('#mm'),
    date: $('#date'),
    weekday: $('#weekday'),
    greet: $('#greet'),
    fill: $('#dayFill'),
    label: $('#dayLabel'),
    track: $('#dayTrack'),
  };

  /* ============================================================
     主题
     ============================================================ */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const resolvedTheme = (mode = state.theme) =>
    mode === 'dark' || (mode === 'auto' && mq.matches) ? 'dark' : 'light';

  function applyTheme() {
    const theme = resolvedTheme();
    html.dataset.theme = theme;
    const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark');
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
    segButtons.forEach((btn) =>
      btn.setAttribute('aria-checked', String(btn.dataset.mode === state.theme))
    );
    applyPalette();
    paintSwatches();
  }

  function setThemeMode(mode) {
    state.theme = mode;
    write('theme', mode);
    applyTheme();
  }

  // 顶栏按钮：在浅/深之间直接切换（会覆盖"自动"）
  themeBtn.addEventListener('click', () => setThemeMode(resolvedTheme() === 'dark' ? 'light' : 'dark'));

  segButtons.forEach((btn) => btn.addEventListener('click', () => setThemeMode(btn.dataset.mode)));

  // 自动模式下跟随系统切换
  mq.addEventListener('change', () => {
    if (state.theme === 'auto') applyTheme();
  });

  /* ============================================================
     语言切换
     ============================================================ */
  let langOpen = false;

  function setLangMenu(open) {
    if (open === langOpen) return;
    langOpen = open;
    langBtn.setAttribute('aria-expanded', String(open));
    langMenu.classList.toggle('is-open', open);
  }

  function syncLang() {
    langBtn.textContent = QZI18N.SHORT[QZI18N.lang];
    langItems.forEach((btn) =>
      btn.setAttribute('aria-checked', String(btn.dataset.lang === QZI18N.lang))
    );
  }

  langBtn.addEventListener('click', () => setLangMenu(!langOpen));

  langItems.forEach((btn) =>
    btn.addEventListener('click', () => {
      QZI18N.set(btn.dataset.lang);
      setLangMenu(false);
      langBtn.focus();
    })
  );

  document.addEventListener('pointerdown', (event) => {
    if (!langOpen) return;
    if (langMenu.contains(event.target) || langBtn.contains(event.target)) return;
    setLangMenu(false);
  });

  // 换语言：静态文案由 i18n 统一刷新，动态部分在这里重画
  QZI18N.onChange(() => {
    syncLang();
    buildFormatters();
    lastMinute = -1;
    paintTime();
    updateHint();
    applyTheme();
    paintEngines();
    syncWallControls();
    syncProgressButtons();
    renderDockRow();
    dockBtn.title = dockOpen ? t('dock.close') : t('dock.open');
    if (dockOpen) renderPanel();
  });

  /* ============================================================
     配色主题
     预设只给「底色 + 强调色」，其余（表面、柔和底、焦点环）由 CSS 的
     color-mix 自动派生。自定义配色需要按亮度反推文字色，所以走内联变量。
     ============================================================ */
  const PRESETS = [
    { id: 'paper', name: '纸', light: ['#f6f4ef', '#76921f'], dark: ['#121110', '#c6e04f'] },
    { id: 'mist', name: '雾蓝', light: ['#eef2f8', '#3b6fd4'], dark: ['#0e1218', '#7fa8ff'] },
    { id: 'teal', name: '青', light: ['#ecf3f3', '#2f7f86'], dark: ['#0c1213', '#6fd0d8'] },
    { id: 'sage', name: '苔绿', light: ['#eff3ea', '#5a8a3c'], dark: ['#101410', '#9ccf6a'] },
    { id: 'sand', name: '沙', light: ['#f7f2e2', '#a3811a'], dark: ['#14120b', '#e2c25c'] },
    { id: 'clay', name: '陶土', light: ['#f7f0e9', '#ad6034'], dark: ['#141110', '#e59d6a'] },
    { id: 'rose', name: '绯', light: ['#f8eef0', '#b34a63'], dark: ['#150f11', '#f08fa5'] },
  ];

  const CUSTOM_VARS = [
    '--bg',
    '--accent',
    '--text',
    '--muted',
    '--faint',
    '--line',
    '--line-strong',
    '--surface',
  ];

  const parseHex = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
  const toHex = (rgb) =>
    '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, t) => {
    const pa = parseHex(a);
    const pb = parseHex(b);
    return toHex(pa.map((v, i) => v + (pb[i] - v) * t));
  };
  const rgbaHex = (h, a) => {
    const [r, g, b] = parseHex(h);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  const relLum = (h) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const [r, g, b] = parseHex(h);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  /** 自定义配色在深色模式下的「暗化 + 提亮」版本，保证同一套色在两种模式下都成立 */
  function customColors(dark) {
    const { bg, accent } = state.custom;
    if (!dark) return { bg, accent };
    return { bg: mixHex(bg, '#0a0a0a', 0.92), accent: mixHex(accent, '#ffffff', 0.38) };
  }

  function applyPalette() {
    html.dataset.palette = state.palette;

    if (state.palette !== 'custom') {
      CUSTOM_VARS.forEach((v) => html.style.removeProperty(v));
      html.style.removeProperty('color-scheme');
      return;
    }

    const dark = resolvedTheme() === 'dark';
    const { bg, accent } = customColors(dark);
    // 底色的明暗决定墨色，避免用户选到深色底时文字看不清
    const lightInk = relLum(bg) < 0.32;
    const ink = lightInk ? '#efeadf' : '#1b1917';

    html.style.setProperty('--bg', bg);
    html.style.setProperty('--accent', accent);
    html.style.setProperty('--text', ink);
    html.style.setProperty('--muted', mixHex(bg, ink, lightInk ? 0.58 : 0.62));
    html.style.setProperty('--faint', mixHex(bg, ink, 0.34));
    html.style.setProperty('--line', rgbaHex(ink, 0.1));
    html.style.setProperty('--line-strong', rgbaHex(ink, 0.2));
    html.style.setProperty('--surface', mixHex(bg, '#ffffff', lightInk ? 0.06 : 0.72));
    html.style.colorScheme = lightInk ? 'dark' : 'light';
  }

  const CHECK_BADGE =
    '<svg class="swatch__check" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="11" fill="var(--text)"/>' +
    '<path d="M6.8 12.3l3.3 3.3L17.2 8.5" fill="none" stroke="var(--bg)" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const PENCIL =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 20h3.6L19 8.6a2 2 0 0 0-2.8-2.8L4.8 17.2 4 20Z"/><path d="m14.4 7.4 2.8 2.8"/></svg>';

  function paintSwatches() {
    const dark = resolvedTheme() === 'dark';

    const cells = PRESETS.map((preset) => {
      const [bg, accent] = dark ? preset.dark : preset.light;
      const name = t('palette.' + preset.id);
      return `<button class="swatch" type="button" role="radio" data-palette="${preset.id}"
        aria-checked="${state.palette === preset.id}" title="${escapeHtml(name)}">
        <span class="swatch__disc" style="--c1:${bg};--c2:${accent}">${CHECK_BADGE}</span>
        <span class="swatch__name">${escapeHtml(name)}</span>
      </button>`;
    });

    cells.push(`<button class="swatch" type="button" role="radio" data-palette="custom"
      aria-checked="${state.palette === 'custom'}" title="自定义配色">
      <span class="swatch__disc swatch__disc--custom" style="--c1:${state.custom.bg};--c2:${state.custom.accent}">${PENCIL}</span>
      <span class="swatch__name">${escapeHtml(t('settings.custom'))}</span>
    </button>`);

    swatchesEl.innerHTML = cells.join('');
  }

  function syncCustomBox() {
    const on = state.palette === 'custom';
    customBox.hidden = !on;
    if (!on) return;
    cBg.value = state.custom.bg;
    cAccent.value = state.custom.accent;
    hexBg.textContent = state.custom.bg.toUpperCase();
    hexAccent.textContent = state.custom.accent.toUpperCase();
  }

  function setPalette(id) {
    // 色卡会整组重绘，键盘操作时需要把焦点搬回同一个格子；
    // 鼠标点击则不主动抢焦点，免得凭空出现一圈焦点描边。
    const hadFocus = swatchesEl.contains(document.activeElement);
    state.palette = id;
    write('palette', id);
    applyPalette();
    paintSwatches();
    syncCustomBox();
    if (hadFocus) {
      const btn = swatchesEl.querySelector(`[data-palette="${id}"]`);
      if (btn) btn.focus();
    }
  }

  swatchesEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-palette]');
    if (btn) setPalette(btn.dataset.palette);
  });

  function onCustomInput(which, inputEl) {
    if (!HEX_RE.test(inputEl.value)) return;
    state.custom[which] = inputEl.value;
    hexBg.textContent = state.custom.bg.toUpperCase();
    hexAccent.textContent = state.custom.accent.toUpperCase();
    applyPalette();
  }

  cBg.addEventListener('input', () => onCustomInput('bg', cBg));
  cAccent.addEventListener('input', () => onCustomInput('accent', cAccent));
  // 拖动取色时只在落点写入存储，避免高频 localStorage 写入
  [cBg, cAccent].forEach((el) => {
    el.addEventListener('change', () => {
      write('custom', JSON.stringify(state.custom));
      paintSwatches();
    });
  });

  wireRadioKeys(swatchesEl, '.swatch', true);

  /* ============================================================
     背景图 / 进度单位 / 称呼
     ============================================================ */

  /** 把用户选的图压到 1600px 以内再存，localStorage 放得下 */
  function shrinkImage(file, done) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height) || 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => done('');
      img.src = String(reader.result);
    };
    reader.onerror = () => done('');
    reader.readAsDataURL(file);
  }

  function syncWallControls() {
    const on = Boolean(state.wall);
    bgBlur.disabled = !on;
    bgBlur.value = String(state.wallBlur);
    bgBlurVal.textContent = String(state.wallBlur);
    bgClear.hidden = !on;
    bgHint.textContent = on ? t('settings.set') : t('settings.defaultPaper');
  }

  function applyWall() {
    const on = Boolean(state.wall);
    html.classList.toggle('has-wall', on);
    if (on) {
      html.style.setProperty('--wall-img', 'url("' + state.wall + '")');
      html.style.setProperty('--wall-blur', state.wallBlur + 'px');
    } else {
      html.style.removeProperty('--wall-img');
      html.style.setProperty('--wall-blur', '0px');
    }
    syncWallControls();
  }

  bgPick.addEventListener('click', () => bgFile.click());

  bgFile.addEventListener('change', () => {
    const file = bgFile.files && bgFile.files[0];
    if (!file) return;
    bgHint.textContent = t('settings.processing');

    shrinkImage(file, (dataUrl) => {
      bgFile.value = '';
      if (!dataUrl) {
        bgHint.textContent = t('settings.bgBad');
        return;
      }
      const before = { wall: state.wall, blur: state.wallBlur };
      state.wall = dataUrl;
      const saved = write('wall', dataUrl);
      if (!saved) {
        // 配额不够：原样还原，不把页面搞坏
        state.wall = before.wall;
        state.wallBlur = before.blur;
        bgHint.textContent = t('settings.bgBig');
        return;
      }
      // 首次设图给一个克制的默认模糊，免得照片抢戏
      if (!state.wallBlur) {
        state.wallBlur = 8;
        write('wallBlur', '8');
      }
      applyWall();
    });
  });

  bgClear.addEventListener('click', () => {
    state.wall = '';
    state.wallBlur = 0;
    write('wall', '');
    write('wallBlur', '0');
    applyWall();
  });

  // 拖动时只改变量，松手才落盘
  bgBlur.addEventListener('input', () => {
    state.wallBlur = Number(bgBlur.value) || 0;
    bgBlurVal.textContent = String(state.wallBlur);
    html.style.setProperty('--wall-blur', state.wallBlur + 'px');
  });
  bgBlur.addEventListener('change', () => write('wallBlur', String(state.wallBlur)));

  /* ---------- 进度单位 ---------- */
  const progressButtons = Array.from(segProgress.querySelectorAll('[data-unit]'));

  function syncProgressButtons() {
    progressButtons.forEach((btn) =>
      btn.setAttribute('aria-checked', String(btn.dataset.unit === state.progress))
    );
  }

  progressButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (state.progress === btn.dataset.unit) return;
      state.progress = btn.dataset.unit;
      write('progress', state.progress);
      syncProgressButtons();
      lastMinute = -1; // 换了周期要立刻重画
      paintTime();
    })
  );

  wireRadioKeys(segProgress, '[data-unit]', true);

  /* ---------- 称呼 ---------- */
  nameInput.addEventListener('input', () => {
    state.name = nameInput.value.trim().slice(0, 12);
    greetName.textContent = state.name ? '，' + state.name : '';
    write('name', state.name);
  });

  /* ============================================================
     时间：只在分钟跳变时写 DOM
     ============================================================ */
  let fmtDate;
  let fmtWeekday;

  /** 日期用 Intl 按当前语言格式化，不用手写月份表 */
  function buildFormatters() {
    const tag = QZI18N.TAG[QZI18N.lang];
    fmtDate = new Intl.DateTimeFormat(tag, { year: 'numeric', month: 'long', day: 'numeric' });
    fmtWeekday = new Intl.DateTimeFormat(tag, { weekday: 'long' });
  }
  const pad2 = (n) => (n < 10 ? '0' + n : String(n));

  const greetKeyFor = (h) => {
    if (h < 5) return 'greet.late';
    if (h < 9) return 'greet.early';
    if (h < 12) return 'greet.morning';
    if (h < 14) return 'greet.noon';
    if (h < 18) return 'greet.afternoon';
    if (h < 23) return 'greet.evening';
    return 'greet.late';
  };

  let lastMinute = -1;
  let timer = 0;

  const DAY_MS = 86400000;

  /** 当前时间在所选周期（日/周/月/年）里的位置，0–1 */
  function progressRatio(now) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (state.progress === 'week') {
      const mondayFirst = (midnight.getDay() + 6) % 7; // 周一记 0
      return (mondayFirst * DAY_MS + (now - midnight)) / (7 * DAY_MS);
    }
    if (state.progress === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return ((midnight.getDate() - 1) * DAY_MS + (now - midnight)) / (daysInMonth * DAY_MS);
    }
    if (state.progress === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return (now - start) / (end - start);
    }
    return (now - midnight) / DAY_MS;
  }

  function paintTime() {
    const now = new Date();
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();

    if (minuteOfDay !== lastMinute) {
      lastMinute = minuteOfDay;
      el.hh.textContent = pad2(now.getHours());
      el.mm.textContent = pad2(now.getMinutes());
      el.clock.setAttribute('aria-label', t('clock.now', { time: pad2(now.getHours()) + ':' + pad2(now.getMinutes()) }));
      el.date.textContent = fmtDate.format(now);
      el.weekday.textContent = fmtWeekday.format(now);
      el.greet.textContent = t(greetKeyFor(now.getHours()));
      greetName.textContent = state.name ? t('greet.sep') + state.name : '';

      // 进度：按设置在日/周/月/年之间切换，保留一位小数
      const pct = Math.round(progressRatio(now) * 1000) / 10;
      el.fill.style.width = pct + '%';
      el.label.textContent = t('progress.text', { unit: t('progress.' + state.progress), pct });
      el.track.setAttribute('aria-valuenow', String(pct));
    }
  }

  function scheduleTick() {
    clearTimeout(timer);
    const now = new Date();
    // 对齐到下一分钟，避免每秒唤醒
    const wait = 60000 - now.getSeconds() * 1000 - now.getMilliseconds() + 200;
    timer = setTimeout(() => {
      paintTime();
      scheduleTick();
    }, wait);
  }

  // 后台标签页的定时器会被节流，切回前台时补一次
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastMinute = -1;
      paintTime();
      scheduleTick();
    }
  });

  /* ============================================================
     搜索 / 直接打开网址
     ============================================================ */
  const SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
  const LOCAL_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;
  const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/|$)/;
  const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}(:\d+)?([/?#].*)?$/i;

  /** 判断输入是否是一个网址；是则返回可跳转的完整 URL，否则返回 null */
  function asUrl(raw) {
    const value = raw.trim();
    if (!value || /\s/.test(value)) return null;
    if (SCHEME_RE.test(value)) return value;
    if (LOCAL_RE.test(value)) return 'http://' + value;
    if (IPV4_RE.test(value)) return 'http://' + value;
    if (DOMAIN_RE.test(value)) return 'https://' + value;
    return null;
  }

  function updateHint() {
    const isUrl = Boolean(asUrl(input.value));
    hint.textContent = isUrl ? t('search.open') : t('search.go');
    hint.classList.toggle('is-url', isUrl);
  }

  /* 统一的跳转入口：表单提交与历史条目共用 */
  function go(raw) {
    const value = String(raw).trim();
    if (!value) {
      input.focus();
      return;
    }
    const direct = asUrl(value);
    pushHistory(value, direct ? 'url' : 'search');
    // location.assign 会在当前标签页内跳转，符合"从新标签页出发"的预期
    const engine = engineById(state.engine);
    window.location.assign(direct || engine.url.replace('%s', encodeURIComponent(value)));
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    go(input.value);
  });

  /* ============================================================
     搜索历史
     只存本地，最多 HISTORY_MAX 条；点搜索框浮出，输入即过滤。
     ============================================================ */
  const HISTORY_MAX = 8;
  const HISTORY_KEY = PREFIX + 'history';
  const escapeHtml = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function readHistory() {
    try {
      const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (!Array.isArray(list)) return [];
      return list
        .filter((it) => it && typeof it.q === 'string' && it.q)
        .slice(0, HISTORY_MAX)
        .map((it) => ({ q: it.q, kind: it.kind === 'url' ? 'url' : 'search' }));
    } catch (e) {
      return [];
    }
  }

  let history = readHistory();

  function pushHistory(q, kind) {
    history = [{ q, kind }, ...history.filter((it) => it.q !== q)].slice(0, HISTORY_MAX);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      /* 隐私模式写不进去时，至少本次会话内可用 */
    }
  }

  const ICON_SEARCH =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4.5 4.5"/></svg>';
  const ICON_LINK =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  const ICON_X =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function renderHistory(list) {
    histList.innerHTML = list
      .map(
        (it) => `<li class="hist__item">
        <button class="hist__main" type="button" data-q="${escapeHtml(it.q)}">
          <span class="hist__icon" aria-hidden="true">${it.kind === 'url' ? ICON_LINK : ICON_SEARCH}</span>
          <span class="hist__text">${escapeHtml(it.q)}</span>
        </button>
        <button class="hist__del" type="button" data-del="${escapeHtml(it.q)}" aria-label="删除这条历史">
          ${ICON_X}
        </button>
      </li>`
      )
      .join('');
  }

  /* 当前输入对应的可见条目：输入网址时不出历史，输入文字时做包含匹配 */
  function visibleHistory() {
    if (asUrl(input.value)) return [];
    const keyword = input.value.trim().toLowerCase();
    if (!keyword) return history;
    return history.filter((it) => it.q.toLowerCase().includes(keyword));
  }

  /* 面板贴着搜索框向下展开，高度按剩余视口算，避免压住底栏或溢出屏幕 */
  function fitHistory() {
    const top = hist.getBoundingClientRect().top;
    const space = window.innerHeight - top - 20;
    hist.style.maxHeight = Math.round(Math.max(140, Math.min(420, space))) + 'px';
    // 内容超出时才需要底部渐隐，否则会误伤最后一行
    hist.classList.toggle('is-scroll', hist.scrollHeight > hist.clientHeight + 1);
  }

  function openHistory() {
    const list = visibleHistory();
    if (!list.length) {
      closeHistory();
      return;
    }
    renderHistory(list);
    if (histOpen) return;
    if (panelOpen) setPanel(false);
    histOpen = true;
    hist.hidden = false;
    fitHistory();
    requestAnimationFrame(() => hist.classList.add('is-open'));
  }

  function closeHistory() {
    if (!histOpen) return;
    histOpen = false;
    hist.classList.remove('is-open');
    setTimeout(() => {
      if (!histOpen) hist.hidden = true;
    }, 260);
  }

  // 首帧的 autofocus 不算"用户点击"，避免每次开新标签页都弹出一层历史
  let interacted = false;
  setTimeout(() => {
    interacted = true;
  }, 400);

  input.addEventListener('focus', () => {
    if (interacted) openHistory();
  });
  input.addEventListener('click', openHistory);
  input.addEventListener('input', () => {
    updateHint();
    if (document.activeElement === input) openHistory();
  });

  hist.addEventListener('click', (event) => {
    const del = event.target.closest('[data-del]');
    if (del) {
      history = history.filter((it) => it.q !== del.dataset.del);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch (e) {
        /* 忽略 */
      }
      const rest = visibleHistory();
      if (rest.length) {
        renderHistory(rest);
        fitHistory();
      } else {
        closeHistory();
      }
      return;
    }

    const main = event.target.closest('.hist__main');
    if (main) go(main.dataset.q);
  });

  histClear.addEventListener('click', () => {
    history = [];
    try {
      localStorage.setItem(HISTORY_KEY, '[]');
    } catch (e) {
      /* 忽略 */
    }
    histList.innerHTML = '';
    closeHistory();
    input.focus();
  });

  // 方向键在历史条目间移动，Esc 回到输入框
  hist.addEventListener('keydown', (event) => {
    const items = Array.from(histList.querySelectorAll('.hist__main'));
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeHistory();
      input.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = items[(index + step + items.length) % items.length];
    if (next) next.focus();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && histOpen) {
      const first = histList.querySelector('.hist__main');
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (histOpen) fitHistory();
  });

  // 点到搜索区以外、或焦点离开搜索区，就收起
  document.addEventListener('pointerdown', (event) => {
    if (!searchwrap.contains(event.target)) closeHistory();
  });
  document.addEventListener('focusin', (event) => {
    if (!searchwrap.contains(event.target)) closeHistory();
  });

  /* ============================================================
     收藏夹 dock
     数据在 scripts/store.js；这里只负责底栏那条 dock 与上方面板。
     ============================================================ */
  const bottomEl = $('#bottom');
  const dockBtn = $('#dockBtn');
  const dockScrim = $('#dockScrim');
  const dockRow = $('#dockRow');
  const dockPanel = $('#dockPanel');
  const dockClose = $('#dockClose');
  const bmCount = $('#bmCount');
  const bmNote = $('#bmNote');
  const bmTabs = $('#bmTabs');
  const bmBody = $('#bmBody');
  const bmImport = $('#bmImport');
  const bmFile = $('#bmFile');
  const bmFolderList = $('#bmFolderList');
  const bmSearch = $('#bmSearch');
  const bmAddFolder = $('#bmAddFolder');
  const bmRenameFolder = $('#bmRenameFolder');
  const bmDeleteFolder = $('#bmDeleteFolder');
  const bmView = $('#bmView');
  const bmExport = $('#bmExport');
  const bmSort = $('#bmSort');
  const sortMenu = $('#sortMenu');
  const glassRange = $('#glassRange');
  const glassVal = $('#glassVal');
  const dockPinnedSwitch = $('#dockPinnedSwitch');
  const engineForm = $('#engineForm');
  const engineNameInput = $('#engineNameInput');
  const engineUrlInput = $('#engineUrlInput');
  const engineErr = $('#engineErr');
  const engineSave = $('#engineSave');
  const engineCancel = $('#engineCancel');

  const DOCK_MAX = 9; // dock 条上最多露出的条目数，其余进面板

  let bmItems = QZStore.list();
  let bmTab = 'all';
  let bmQuery = '';
  let folderEdit = null; // { mode:'new'|'rename', target, value }
  let dockOpen = false;
  let dockHover = false;
  let noteTimer = 0;

  // 拖动排序的状态。放在这里而不是拖动逻辑那一段，
  // 是因为 syncDockClass() 要用到 dragEl 判断「是否正在拖」。
  let dragEl = null;
  let dragBox = null;
  let dragIds = ''; // 拖起那一刻的顺序，用来判断这一次到底有没有挪动
  let dragPoint = null; // 拖动中最后一次的指针位置，松手后用来判断鼠标还在不在底栏上

  const ICON_PIN =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M9.2 3.6h5.6l-.9 5.8 3.6 3.6H6.5l3.6-3.6-.9-5.8Z"/><path d="M12 13v7.4"/></svg>';

  const ICON_PENCIL =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 20h3.6L19 8.6a2 2 0 0 0-2.8-2.8L4.8 17.2 4 20Z"/><path d="m14.4 7.4 2.8 2.8"/></svg>';

  /** 有内嵌图标就画图标，否则用首字母兜底（绝不为图标发网络请求） */
  function iconHtml(item, kind) {
    if (item.icon) {
      return `<img class="${kind}__icon" src="${item.icon}" alt="" loading="lazy" decoding="async">`;
    }
    const ch = (item.title || '?').trim().charAt(0).toUpperCase();
    return `<span class="mark" aria-hidden="true">${escapeHtml(ch)}</span>`;
  }

  /** 排序：置顶永远在最前；默认顺序下置顶组内按置顶时间倒序 */
  function sortItems(list) {
    const arr = list.slice();
    const locale = QZI18N.TAG[QZI18N.lang];

    if (state.sort === 'name') {
      arr.sort((a, b) => a.title.localeCompare(b.title, locale));
    } else if (state.sort === 'host') {
      arr.sort((a, b) => {
        const diff = QZStore.hostOf(a.url).localeCompare(QZStore.hostOf(b.url), locale);
        return diff || a.title.localeCompare(b.title, locale);
      });
    }

    // 置顶组永远浮在最前，组内保持 base 顺序（默认顺序＝存储顺序＝拖出来的顺序）。
    // 这里必须是稳定排序：以前按置顶时间重排，拖动置顶项会被立刻打回原样。
    arr.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0));
    return arr;
  }

  /** 默认分类按语言显示，其余分类名是用户数据，原样输出 */
  const folderLabel = (name) =>
    !name || name === QZStore.DEFAULT_FOLDER ? t('folders.default') : name;

  function syncDockClass() {
    // 正在拖动时一律算展开。拖拽开始浏览器会补 pointerleave，
    // 只看 hover 的话整条 dock 会在手底下塌回进度条（排序还在生效，只是看不见）
    bottomEl.classList.toggle('is-dock', dockHover || dockOpen || dragEl !== null);
  }

  function renderDockRow() {
    // 开关打开时 dock 只留置顶项；面板始终显示全部，方便随时补置顶
    const list = state.dockPinned ? bmItems.filter((it) => it.pin) : bmItems;

    if (!list.length) {
      dockRow.innerHTML =
        `<button class="dk dk--empty" type="button" data-act="open">${escapeHtml(
          state.dockPinned ? t('dock.nonePinned') : t('dock.emptyDock')
        )}</button>`;
      return;
    }

    const chips = sortItems(list)
      .slice(0, DOCK_MAX)
      .map(
        (it) =>
          `<a class="dk${state.bmView === 'grid' ? ' dk--icon' : ''}" data-chip data-id="${it.id}" ` +
          `data-pinned="${it.pin ? 1 : 0}" draggable="true" ` +
          `href="${escapeHtml(it.url)}" title="${escapeHtml(it.title)}">` +
          `${iconHtml(it, 'dk')}<span class="dk__text">${escapeHtml(it.title)}</span></a>`
      )
      .join('');

    dockRow.innerHTML =
      chips +
      `<button class="dk dk--more" type="button" data-act="open" aria-label="${escapeHtml(t('dock.expand'))}">…</button>`;

    fitDockRow(list.length);
  }

  /**
   * 按真实宽度裁剪 dock 条：放不下的条目直接不渲染，末尾留一个省略号。
   * 比横向滚动更干净——不会出现半截图标被切断。
   */
  function fitDockRow(total) {
    const more = dockRow.querySelector('.dk--more');
    if (!more) return;

    let removed = 0;
    for (let guard = 0; guard < DOCK_MAX && dockRow.scrollWidth > dockRow.clientWidth + 1; guard += 1) {
      const chips = dockRow.querySelectorAll('.dk[data-chip]');
      if (chips.length <= 1) break;
      chips[chips.length - 1].remove();
      removed += 1;
    }

    // 本来就不超长时不必显示省略号
    more.hidden = removed === 0 && total <= DOCK_MAX;
  }

  function cardHtml(item) {
    return (
      `<div class="bm${state.bmView === 'grid' ? ' bm--tile' : ''}` +
      `${item.pin ? ' bm--pinned' : ''}" data-id="${item.id}" data-pinned="${item.pin ? 1 : 0}" ` +
      'draggable="true">' +
      `<a class="bm__link" href="${escapeHtml(item.url)}" title="${escapeHtml(item.title)}">` +
      iconHtml(item, 'bm') +
      '<span class="bm__text">' +
      `<span class="bm__title">${escapeHtml(item.title)}</span>` +
      `<span class="bm__host">${escapeHtml(QZStore.hostOf(item.url))}</span>` +
      '</span></a>' +
      '<div class="bm__acts">' +
      `<button class="bm__act bm__act--pin" type="button" data-pin="${item.id}" ` +
      `aria-pressed="${Boolean(item.pin)}" aria-label="${escapeHtml(
        item.pin ? t('dock.unpin') : t('dock.pin')
      )}">${ICON_PIN}</button>` +
      `<button class="bm__act bm__act--edit" type="button" data-edit="${item.id}" ` +
      `aria-label="${escapeHtml(t('edit.edit'))}">${ICON_PENCIL}</button>` +
      `<button class="bm__act" type="button" data-del="${item.id}" ` +
      `aria-label="${escapeHtml(t('edit.del'))}">${ICON_X}</button>` +
      '</div></div>'
    );
  }

  /** 编辑态：卡片原地展开成一行表单 */
  function startEdit(id) {
    const item = bmItems.find((it) => it.id === id);
    const card = bmBody.querySelector(`.bm[data-id="${id}"]`);
    if (!item || !card) return;

    const field = (label, name, value, max) =>
      `<label class="edit__row"><span class="edit__label">${label}</span>` +
      `<input class="edit__input" name="${name}" value="${escapeHtml(value)}" ` +
      `maxlength="${max}"${name === 'folder' ? ' list="bmFolderList" autocomplete="off"' : ''}></label>`;

    card.classList.add('bm--editing');
    // 编辑态里要能选文字，不能让整张卡片把拖动抢走
    card.removeAttribute('draggable');
    card.innerHTML =
      `<form class="edit" data-id="${item.id}">` +
      field(t('edit.title'), 'title', item.title, 160) +
      field(t('edit.url'), 'url', item.url, 1000) +
      field(t('edit.folder'), 'folder', folderLabel(item.folder), 40) +
      '<div class="edit__foot">' +
      '<span class="edit__err" data-err></span>' +
      `<button class="edit__cancel" type="button" data-cancel>${escapeHtml(t('edit.cancel'))}</button>` +
      `<button class="edit__save" type="submit">${escapeHtml(t('edit.save'))}</button>` +
      '</div></form>';

    const first = card.querySelector('.edit__input');
    if (first) {
      first.focus();
      first.select();
    }
  }

  function renderPanel() {
    const folders = QZStore.folders();
    if (bmTab !== 'all' && folders.indexOf(bmTab) === -1) bmTab = 'all';

    const query = bmQuery.trim().toLowerCase();
    const searching = query.length > 0;

    // 编辑时可以选已有分类，也可以直接敲一个新分类
    bmFolderList.innerHTML = folders
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join('');

    const tabs = [{ id: 'all', label: t('dock.all'), n: bmItems.length }];
    folders.forEach((name) => {
      tabs.push({
        id: name,
        label: folderLabel(name),
        n: bmItems.filter((it) => (it.folder || QZStore.DEFAULT_FOLDER) === name).length,
      });
    });

    const tabHtml = tabs
      .map((tab) => {
        if (folderEdit && folderEdit.mode === 'rename' && folderEdit.target === tab.id) {
          return `<input class="tab__input" id="bmTabInput" type="text" maxlength="40" value="${escapeHtml(folderEdit.value)}">`;
        }
        return (
          `<button class="tab" type="button" role="tab" data-tab="${escapeHtml(tab.id)}" ` +
          `aria-selected="${tab.id === bmTab}">${escapeHtml(tab.label)}` +
          `<span class="tab__n">${tab.n}</span></button>`
        );
      })
      .join('');

    bmTabs.innerHTML =
      tabHtml +
      (folderEdit && folderEdit.mode === 'new'
        ? `<input class="tab__input" id="bmTabInput" type="text" maxlength="40" placeholder="${escapeHtml(t('dock.folderPh'))}">`
        : '');

    const canEditFolder = bmTab !== 'all' && !searching;
    bmRenameFolder.hidden = !canEditFolder;
    bmDeleteFolder.hidden = !canEditFolder;

    const list = sortItems(
      searching
        ? bmItems.filter((it) => (it.title + ' ' + it.url).toLowerCase().indexOf(query) >= 0)
        : bmTab === 'all'
          ? bmItems
          : bmItems.filter((it) => (it.folder || QZStore.DEFAULT_FOLDER) === bmTab)
    );

    bmCount.textContent = searching ? `${list.length}/${bmItems.length}` : String(bmItems.length);
    dockPanel.classList.toggle('is-searching', searching);

    bmBody.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : `<div class="dockpanel__empty"><span>${escapeHtml(
          searching ? t('dock.noMatch') : t('dock.empty')
        )}</span>` +
        (searching
          ? ''
          : `<button class="ghostbtn" type="button" data-act="import">${escapeHtml(
              t('dock.emptyImport')
            )}</button>`) +
        '</div>';

    const input = bmTabs.querySelector('#bmTabInput');
    if (input) {
      input.focus();
      input.select();
    }
  }

  function setDock(open) {
    if (open === dockOpen) return;
    dockOpen = open;
    dockPanel.classList.toggle('is-open', open);
    dockScrim.classList.toggle('is-on', open);
    dockBtn.setAttribute('aria-expanded', String(open));
    dockBtn.title = open ? t('dock.close') : t('dock.open');

    if (open) {
      bmItems = QZStore.list();
      renderPanel();
    } else {
      bmQuery = '';
      bmSearch.value = '';
      folderEdit = null;
      dockPanel.classList.remove('is-searching');
    }
    syncDockClass();
  }

  function refreshBookmarks() {
    bmItems = QZStore.list();
    renderDockRow();
    if (dockOpen) renderPanel();
  }

  function showNote(text) {
    clearTimeout(noteTimer);
    bmNote.textContent = text;
    bmNote.classList.add('is-on');
    noteTimer = setTimeout(() => {
      bmNote.classList.remove('is-on');
      bmNote.textContent = '';
    }, 3600);
  }

  /* ---------- 拖动排序：dock 与面板共用一套 ---------- */
  // 做法是边拖边改 DOM 顺序，松手时把可见顺序整体写回存储。
  // 比「算落点再插入」干净：用户看到的位置就是最终位置，不用猜。
  // 拖动状态（dragEl 等）声明在上面 dock 那一段，供 syncDockClass() 使用。

  const dragGroupOf = (el) => (el.dataset.pinned === '1' ? 'pin' : 'plain');

  /**
   * 松手时按落点重算底栏的展开态：落在底栏上就留着，拖到别处就收起。
   * 拖动期间它是被 dragEl 顶住的（见 syncDockClass）。
   */
  function unlockDockHover() {
    if (dragPoint) {
      const rect = bottomEl.getBoundingClientRect();
      dockHover =
        dragPoint.x >= rect.left &&
        dragPoint.x <= rect.right &&
        dragPoint.y >= rect.top &&
        dragPoint.y <= rect.bottom;
    }
    syncDockClass();
  }

  /** 指针是否已越过目标元素的中线——决定插到它前面还是后面，也防止两边来回抖 */
  function pastMid(event, el, axis) {
    const rect = el.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;
    const stretch = typeof axis === 'function' ? axis() : axis;
    if (stretch === 'x') return event.clientX > midX;
    if (stretch === 'y') return event.clientY > midY;
    // 网格视图：按偏得多的那个方向判断，斜着拖也不会乱跳
    return Math.abs(event.clientX - midX) > Math.abs(event.clientY - midY)
      ? event.clientX > midX
      : event.clientY > midY;
  }

  function commitDrag(box, selector) {
    const el = dragEl;
    const startIds = dragIds;
    dragEl = null;
    dragBox = null;
    dragIds = '';
    if (el) el.classList.remove('is-dragging');
    unlockDockHover();

    const ids = Array.from(box.children)
      .filter((child) => child.matches(selector))
      .map((child) => child.dataset.id)
      .filter(Boolean);
    if (ids.length < 2) return;

    // 拖了一圈又放回原处：不写存储、不重绘，也不改排序方式。
    // 注意这里比的是「拖起时」的 DOM 顺序——按名称排序时界面顺序本来就不等于存储顺序。
    if (startIds && ids.join() === startIds) return;

    if (QZStore.reorder(ids).status !== 'ok') return;

    // 按名称/网站排序时拖动＝改成手动顺序：只在这一刻切，空拖一下不会改变排序方式
    if (state.sort !== 'default') {
      state.sort = 'default';
      write('sort', state.sort);
      syncSortMenu();
      showNote(t('dock.manual'));
    }
    refreshBookmarks();
  }

  function bindDragSort(box, selector, axis) {
    const listIn = () => Array.from(box.children).filter((el) => el.matches(selector));

    box.addEventListener('dragstart', (event) => {
      const el = event.target.closest(selector);
      if (!el || el.classList.contains('bm--editing')) return;

      dragEl = el;
      dragBox = box;
      dragIds = listIn()
        .map((node) => node.dataset.id)
        .filter(Boolean)
        .join();
      dragPoint = { x: event.clientX, y: event.clientY };
      el.classList.add('is-dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        // 不写点东西的话，Chrome 会把 <a> 的地址当成拖拽数据
        try {
          event.dataTransfer.setData('text/plain', el.dataset.id || '');
        } catch (e) {
          /* 个别环境禁止自定义拖拽数据，只影响拖拽，不影响排序 */
        }
      }
    });

    box.addEventListener('dragover', (event) => {
      if (!dragEl || dragBox !== box) return;
      const over = event.target.closest(selector);
      if (!over) return;

      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      if (over === dragEl) return;
      // 置顶组与普通组不互相穿插：置顶就是永远在前，拖过去也只会掉回原位
      if (dragGroupOf(over) !== dragGroupOf(dragEl)) return;

      const arr = listIn();
      const from = arr.indexOf(dragEl);
      const to = arr.indexOf(over);
      if (from < 0 || to < 0) return;

      const forward = from < to;
      if (forward === pastMid(event, over, axis)) {
        box.insertBefore(dragEl, forward ? over.nextElementSibling : over);
      }
    });

    box.addEventListener('drop', (event) => {
      if (!dragEl || dragBox !== box) return;
      event.preventDefault();
      commitDrag(box, selector);
    });

    // dragend 一定会触发（含中途按 Esc 取消），兜底清理状态
    box.addEventListener('dragend', () => {
      if (dragEl && dragBox === box) commitDrag(box, selector);
    });
  }

  // 拖拽期间吞掉文档级默认行为，免得把收藏当成链接甩进页面里触发跳转
  document.addEventListener('dragover', (event) => {
    if (!dragEl) return;
    dragPoint = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    if (dragEl) event.preventDefault();
  });

  bindDragSort(dockRow, '.dk[data-chip]', 'x');
  bindDragSort(bmBody, '.bm', () => (state.bmView === 'grid' ? 'xy' : 'y'));

  // 从 dock 里拖起时把展开态挂回来：
  // 无论 pointerleave 抢在 dragstart 前面还是后面，这里都兜住一次
  dockRow.addEventListener('dragstart', () => {
    dockHover = true;
    syncDockClass();
  });

  /* ---------- 交互 ---------- */

  dockBtn.addEventListener('click', () => setDock(!dockOpen));
  dockClose.addEventListener('click', () => setDock(false));

  bottomEl.addEventListener('pointerenter', () => {
    // 拖动中不刷新：重渲染会把正在拖的那个节点换掉，拖拽会断
    if (dragEl) return;
    dockHover = true;
    // 每次浮出都重读一次存储：别的标签页或弹窗可能刚加过收藏
    refreshBookmarks();
    syncDockClass();
  });

  bottomEl.addEventListener('pointerleave', () => {
    dockHover = false;
    // 拖拽开始时浏览器会补一个 pointerleave，但此时 dragEl 顶着，dock 不会塌
    syncDockClass();
  });

  dockRow.addEventListener('click', (event) => {
    if (!event.target.closest('[data-act="open"]')) return;
    event.preventDefault();
    setDock(true);
  });

  bmTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]');
    if (!tab) return;
    if (bmQuery) {
      bmQuery = '';
      bmSearch.value = '';
    }
    bmTab = tab.dataset.tab;
    folderEdit = null;
    renderPanel();
  });

  /* ---------- 顶部搜索 ---------- */
  bmSearch.addEventListener('input', () => {
    bmQuery = bmSearch.value;
    if (folderEdit) folderEdit = null;
    renderPanel();
  });

  bmSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    if (!bmSearch.value) return;
    bmSearch.value = '';
    bmQuery = '';
    renderPanel();
  });

  /* ---------- 分类：新建 / 重命名 / 删除 ---------- */
  function commitFolderEdit(value) {
    if (!folderEdit) return;

    const raw = String(value || '').trim();
    if (!raw) {
      folderEdit = null;
      renderPanel();
      return;
    }

    const wasNew = folderEdit.mode === 'new';
    const name = raw === t('folders.default') ? QZStore.DEFAULT_FOLDER : raw;
    const result = wasNew ? QZStore.addFolder(name) : QZStore.renameFolder(folderEdit.target, name);

    if (result.status === 'duplicate') {
      showNote(t('dock.folderDup'));
      return; // 留着输入框让用户改
    }
    if (result.status !== 'ok' && result.status !== 'same') {
      folderEdit = null;
      renderPanel();
      return;
    }

    if (result.status === 'ok') bmTab = name;
    folderEdit = null;
    refreshBookmarks();
    if (result.status === 'ok') showNote(wasNew ? t('dock.folderAdded') : t('dock.folderRenamed'));
  }

  bmAddFolder.addEventListener('click', () => {
    folderEdit = { mode: 'new', target: '', value: '' };
    if (bmQuery) {
      bmQuery = '';
      bmSearch.value = '';
    }
    renderPanel();
  });

  bmRenameFolder.addEventListener('click', () => {
    if (bmTab === 'all') return;
    folderEdit = { mode: 'rename', target: bmTab, value: folderLabel(bmTab) };
    renderPanel();
  });

  bmDeleteFolder.addEventListener('click', () => {
    if (bmTab === 'all') return;
    const result = QZStore.removeFolder(bmTab);
    bmTab = 'all';
    folderEdit = null;
    refreshBookmarks();
    showNote(result.moved ? t('dock.folderRemoved', { n: result.moved }) : t('dock.folderDeleted'));
  });

  // 行内输入框：回车提交、Esc 取消、失焦放弃
  bmTabs.addEventListener('keydown', (event) => {
    if (event.target.id !== 'bmTabInput') return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitFolderEdit(event.target.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      folderEdit = null;
      renderPanel();
    }
  });

  bmTabs.addEventListener('focusout', (event) => {
    if (event.target.id !== 'bmTabInput') return;
    setTimeout(() => {
      if (!folderEdit) return;
      if (!bmTabs.contains(document.activeElement)) {
        folderEdit = null;
        renderPanel();
      }
    }, 0);
  });

  bmBody.addEventListener('click', (event) => {
    const pin = event.target.closest('[data-pin]');
    if (pin) {
      event.preventDefault();
      const result = QZStore.togglePin(pin.dataset.pin);
      if (result.status === 'ok') {
        refreshBookmarks();
        showNote(result.pinned ? t('dock.pinned') : t('dock.unpinned'));
      }
      return;
    }

    const edit = event.target.closest('[data-edit]');
    if (edit) {
      event.preventDefault();
      startEdit(edit.dataset.edit);
      return;
    }

    const del = event.target.closest('[data-del]');
    if (del) {
      event.preventDefault();
      QZStore.remove(del.dataset.del);
      refreshBookmarks();
      showNote(t('dock.deleted'));
      return;
    }

    if (event.target.closest('[data-cancel]')) {
      renderPanel();
      return;
    }

    if (event.target.closest('[data-act="import"]')) bmFile.click();
  });

  // 保存编辑：标题 / 网址 / 分类都可以改，网址会重新判重
  bmBody.addEventListener('submit', (event) => {
    const form = event.target.closest('.edit');
    if (!form) return;
    event.preventDefault();

    const data = new FormData(form);
    const result = QZStore.update(form.dataset.id, {
      title: String(data.get('title') || ''),
      url: String(data.get('url') || ''),
      folder: (() => {
        const raw = String(data.get('folder') || '').trim();
        return raw === t('folders.default') ? QZStore.DEFAULT_FOLDER : raw;
      })(),
    });

    if (result.status === 'ok') {
      refreshBookmarks();
      showNote(t('dock.saved'));
      return;
    }

    const err = form.querySelector('[data-err]');
    if (err) {
      err.textContent =
        result.status === 'duplicate' ? t('edit.dup') : t('edit.bad');
    }
  });

  // 编辑态里按 Esc 只退编辑，不收起整个面板
  bmBody.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!bmBody.querySelector('.edit')) return;
    event.preventDefault();
    event.stopPropagation();
    renderPanel();
  });

  bmImport.addEventListener('click', () => bmFile.click());

  bmFile.addEventListener('change', () => {
    const file = bmFile.files && bmFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = QZStore.importHtml(String(reader.result));
      bmItems = QZStore.list();
      renderDockRow();
      renderPanel();
      if (!result.total) {
        showNote(t('import.fail'));
      } else if (result.saved === 'no-icon') {
        showNote(t('import.added', { n: result.added }) + t('import.noIcon'));
      } else {
        showNote(
          result.added
            ? t('import.added', { n: result.added }) +
                (result.dup ? t('import.dup', { n: result.dup }) : '')
            : t('import.all')
        );
      }
      bmFile.value = '';
    };
    reader.readAsText(file, 'utf-8');
  });

  window.addEventListener('resize', () => {
    if (bottomEl.classList.contains('is-dock')) renderDockRow();
  });

  // 别的标签页（工具栏弹窗）改了收藏夹，这里跟着刷新
  QZStore.onChange(refreshBookmarks);

  // 点面板和底栏以外的地方、或按 Esc，收起收藏夹
  document.addEventListener('pointerdown', (event) => {
    if (!dockOpen) return;
    if (dockPanel.contains(event.target) || bottomEl.contains(event.target)) return;
    setDock(false);
  });

  /* ============================================================
     搜索面板：引擎芯片与顶栏设置按钮共用同一个面板
     ============================================================ */
  function setPanel(open) {
    if (open === panelOpen) return;
    panelOpen = open;

    panelBtn.setAttribute('aria-expanded', String(open));
    engineBtn.setAttribute('aria-expanded', String(open));

    if (open) {
      closeHistory();
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('is-open'));
    } else {
      panel.classList.remove('is-open');
      // 等过渡结束再隐藏，保持动画连贯
      setTimeout(() => {
        if (!panelOpen) panel.hidden = true;
      }, 300);
    }
  }

  panelBtn.addEventListener('click', () => setPanel(!panelOpen));
  engineBtn.addEventListener('click', () => setPanel(!panelOpen));
  panelClose.addEventListener('click', () => {
    setPanel(false);
    panelBtn.focus();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!panelOpen) return;
    const t = event.target;
    if (panel.contains(t) || panelBtn.contains(t) || engineBtn.contains(t)) return;
    setPanel(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (langOpen) {
      setLangMenu(false);
      langBtn.focus();
    } else if (panelOpen) {
      setPanel(false);
      panelBtn.focus();
    } else if (histOpen) {
      closeHistory();
    } else if (sortOpen) {
      setSortMenu(false);
    } else if (dockOpen) {
      setDock(false);
    } else if (document.activeElement === input) {
      input.blur();
    }
  });

  // 任意位置按 "/" 聚焦搜索框
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    event.preventDefault();
    input.focus();
  });

  /* ============================================================
     引擎列表
     ============================================================ */
  const CHECK_SVG =
    '<svg class="engine__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  const ICON_PLUS =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function paintEngines() {
    enginesEl.innerHTML =
      allEngines()
        .map((engine) => {
          const main =
            `<button type="button" class="engine" role="radio" data-id="${engine.id}" ` +
            `aria-checked="${engine.id === state.engine}" style="--dot:${engine.mark}">` +
            '<span class="engine__mark" aria-hidden="true"></span>' +
            `<span class="engine__label">${escapeHtml(engineLabel(engine))}</span>` +
            CHECK_SVG +
            '</button>';
          const del = engine.custom
            ? `<button type="button" class="engine__del" data-del-engine="${engine.id}" ` +
              `aria-label="${escapeHtml(t('engine.remove'))}">${ICON_X}</button>`
            : '';
          return `<div class="engine-wrap">${main}${del}</div>`;
        })
        .join('') +
      `<button type="button" class="engine engine--add" id="engineAdd">${ICON_PLUS}` +
      `<span>${escapeHtml(t('engine.add'))}</span></button>`;

    const current = engineById(state.engine);
    engineName.textContent = engineLabel(current);
    engineDot.style.setProperty('--dot', current.mark);
  }

  function selectEngine(id) {
    state.engine = engineById(id).id;
    write('engine', state.engine);
    paintEngines();
    const btn = enginesEl.querySelector(`[data-id="${state.engine}"]`);
    if (btn) btn.focus();
  }

  enginesEl.addEventListener('click', (event) => {
    if (event.target.closest('#engineAdd')) {
      openEngineForm();
      return;
    }

    const del = event.target.closest('[data-del-engine]');
    if (del) {
      event.preventDefault();
      removeEngine(del.dataset.delEngine);
      return;
    }

    const btn = event.target.closest('.engine[data-id]');
    if (btn) selectEngine(btn.dataset.id);
  });

  /* 单选组的方向键导航（两处通用） */
  function wireRadioKeys(container, itemSelector, onPick) {
    container.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
      if (!keys.includes(event.key)) return;
      const items = Array.from(container.querySelectorAll(itemSelector));
      const index = items.indexOf(document.activeElement);
      if (index === -1) return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = items[(index + step + items.length) % items.length];
      next.focus();
      if (onPick) next.click();
    });
  }

  wireRadioKeys(enginesEl, '.engine[role="radio"]', true);
  wireRadioKeys($('#seg'), '[data-mode]', true);

  /* ============================================================
     导出 / 面板毛玻璃 / 视图切换 / 自定义搜索引擎
     ============================================================ */

  /* ---------- 导出：Chrome 也能直接导入的 HTML ---------- */
  bmExport.addEventListener('click', () => {
    const blob = new Blob([QZStore.toHtml()], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qingzhou-bookmarks-' + new Date().toISOString().slice(0, 10) + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showNote(t('dock.exported'));
  });

  /* ---------- 面板毛玻璃透明度 ---------- */
  function applyGlass() {
    html.style.setProperty('--glass', state.glass + '%');
    glassRange.value = String(state.glass);
    glassVal.textContent = state.glass + '%';
  }

  glassRange.addEventListener('input', () => {
    const next = Number(glassRange.value);
    state.glass = Math.min(95, Math.max(0, Number.isFinite(next) ? next : 44));
    applyGlass();
  });

  glassRange.addEventListener('change', () => write('glass', String(state.glass)));

  /* ---------- 长条 / 图标 两种视图 ---------- */
  const ICON_GRID =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/>' +
    '<rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg>';

  const ICON_LIST =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.9" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  function applyView() {
    const grid = state.bmView === 'grid';
    bmBody.classList.toggle('is-grid', grid);
    bmView.innerHTML = grid ? ICON_LIST : ICON_GRID;
    bmView.title = grid ? t('dock.viewList') : t('dock.viewGrid');
    bmView.setAttribute('aria-label', bmView.title);
  }

  /* ---------- 排序菜单 ---------- */
  let sortOpen = false;

  function setSortMenu(open) {
    if (open === sortOpen) return;
    sortOpen = open;
    bmSort.setAttribute('aria-expanded', String(open));
    sortMenu.classList.toggle('is-open', open);
  }

  function syncSortMenu() {
    sortMenu.querySelectorAll('[data-sort]').forEach((btn) => {
      btn.setAttribute('aria-checked', String(btn.dataset.sort === state.sort));
    });
  }

  bmSort.addEventListener('click', () => setSortMenu(!sortOpen));

  sortMenu.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-sort]');
    if (!btn) return;
    state.sort = btn.dataset.sort;
    write('sort', state.sort);
    syncSortMenu();
    setSortMenu(false);
    renderDockRow();
    renderPanel();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!sortOpen) return;
    if (sortMenu.contains(event.target) || bmSort.contains(event.target)) return;
    setSortMenu(false);
  });

  bmView.addEventListener('click', () => {
    state.bmView = state.bmView === 'grid' ? 'list' : 'grid';
    write('bmView', state.bmView);
    applyView();
    renderDockRow();
    renderPanel();
  });

  /* ---------- dock 只显示置顶 ---------- */
  function syncDockPinned() {
    dockPinnedSwitch.setAttribute('aria-checked', String(state.dockPinned));
  }

  dockPinnedSwitch.addEventListener('click', () => {
    state.dockPinned = !state.dockPinned;
    write('dockPinned', state.dockPinned ? 'on' : 'off');
    syncDockPinned();
    renderDockRow();
  });

  // 整行都能点：开关本身很小，没人愿意瞄准它
  dockPinnedSwitch.parentElement.addEventListener('click', (event) => {
    if (event.target.closest('#dockPinnedSwitch')) return;
    dockPinnedSwitch.click();
  });

  /* ---------- 自定义搜索引擎 ---------- */
  function openEngineForm() {
    engineForm.hidden = false;
    engineErr.textContent = '';
    engineNameInput.value = '';
    engineUrlInput.value = '';
    engineNameInput.focus();
  }

  function closeEngineForm() {
    engineForm.hidden = true;
    engineErr.textContent = '';
  }

  function persistEngines() {
    write(
      'engines',
      JSON.stringify(myEngines.map((e) => ({ id: e.id, name: e.name, url: e.url })))
    );
  }

  function saveEngine() {
    const name = engineNameInput.value.trim().slice(0, 24);
    let url = engineUrlInput.value.trim();
    if (url.indexOf('{q}') >= 0) url = url.replace(/\{q\}/g, '%s');

    if (!/^https?:\/\//i.test(url) || url.indexOf('%s') < 0) {
      engineErr.textContent = t('engine.invalid');
      return;
    }
    if (allEngines().some((e) => e.url === url)) {
      engineErr.textContent = t('engine.dup');
      return;
    }

    const id = 'c' + Date.now().toString(36);
    myEngines = myEngines.concat({
      id,
      name: name || url.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0],
      url,
      mark: '#8a8f98',
      custom: true,
    });
    persistEngines();
    closeEngineForm();
    selectEngine(id);
    showNote(t('engine.added'));
  }

  function removeEngine(id) {
    myEngines = myEngines.filter((e) => e.id !== id);
    persistEngines();
    if (state.engine === id) {
      state.engine = ENGINES[0].id;
      write('engine', state.engine);
    }
    paintEngines();
    showNote(t('engine.removed'));
  }

  engineSave.addEventListener('click', saveEngine);
  engineCancel.addEventListener('click', closeEngineForm);

  [engineNameInput, engineUrlInput].forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveEngine();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeEngineForm();
      }
    });
  });

  /* ============================================================
     启动
     ============================================================ */
  QZI18N.apply();
  buildFormatters();
  syncLang();
  applyTheme();
  syncCustomBox();
  applyWall();
  applyGlass();
  applyView();
  syncSortMenu();
  syncDockPinned();
  nameInput.value = state.name;
  syncProgressButtons();
  renderDockRow();
  paintEngines();
  paintTime();
  scheduleTick();
  updateHint();
})();
