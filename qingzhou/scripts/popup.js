/* ============================================================
   工具栏弹窗逻辑
   需要 activeTab 权限才能读到当前标签页的标题与地址；
   该权限只在用户点开本弹窗时临时授予。
   ============================================================ */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const t = (key, params) => QZI18N.t(key, params);
  const titleEl = $('#pageTitle');
  const urlEl = $('#pageUrl');
  const folderEl = $('#folder');
  const addBtn = $('#addBtn');
  const hintEl = $('#hint');

  let current = null; // { title, url }

  function setBusy(text) {
    addBtn.disabled = true;
    addBtn.textContent = text;
  }

  function fail(message) {
    setBusy(t('popup.cannot'));
    titleEl.textContent = message;
    urlEl.textContent = '';
    folderEl.disabled = true;
  }

  /* ---------- 文件夹下拉 ---------- */
  const folderLabel = (name) =>
    !name || name === QZStore.DEFAULT_FOLDER ? t('folders.default') : name;

  function fillFolders() {
    const folders = QZStore.folders();
    const list = folders.length ? folders : [QZStore.DEFAULT_FOLDER];
    // 默认放到「未分类」，没有就放第一个
    const preferred = list.indexOf(QZStore.DEFAULT_FOLDER) >= 0 ? QZStore.DEFAULT_FOLDER : list[0];
    folderEl.innerHTML = list
      .map(
        (name) =>
          `<option value="${name.replace(/"/g, '&quot;')}"${name === preferred ? ' selected' : ''}>` +
          `${folderLabel(name)}</option>`
      )
      .join('');
  }

  /* ---------- 添加 ---------- */
  addBtn.addEventListener('click', () => {
    if (!current) return;
    const result = QZStore.add({
      title: current.title,
      url: current.url,
      folder: folderEl.value,
    });

    if (result.status === 'ok') {
      addBtn.textContent = t('popup.added');
      addBtn.classList.add('is-done');
      addBtn.disabled = true;
      hintEl.textContent = t('popup.hintOk');
      setTimeout(() => window.close(), 900);
      return;
    }

    if (result.status === 'duplicate') {
      addBtn.textContent = t('popup.exists');
      addBtn.classList.add('is-done');
      addBtn.disabled = true;
      hintEl.textContent = t('popup.hintDup');
      return;
    }

    hintEl.textContent = t('popup.hintQuota');
  });

  /* ---------- 启动 ---------- */
  QZI18N.apply();

  (async function init() {
    fillFolders();

    if (!chrome.tabs || !chrome.tabs.query) {
      fail(t('popup.noEnv'));
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];
    const url = tab && tab.url ? tab.url : '';

    if (!/^https?:/i.test(url)) {
      fail(url ? t('popup.noPage') : t('popup.noUrl'));
      hintEl.textContent = t('popup.hintHttp');
      return;
    }

    current = { title: (tab.title || url).trim(), url };
    titleEl.textContent = current.title;
    urlEl.textContent = url;
    urlEl.title = url;

    addBtn.disabled = false;
    addBtn.textContent = t('popup.add');
    // 打开就聚焦，回车即可收藏；但不显示焦点描边，
    // 免得每次打开都像被"高亮"了一次（Tab 过来才会有描边）
    addBtn.focus({ preventScroll: true });
    addBtn.classList.add('is-auto-focus');
    addBtn.addEventListener('blur', () => addBtn.classList.remove('is-auto-focus'), { once: true });
  })();
})();
