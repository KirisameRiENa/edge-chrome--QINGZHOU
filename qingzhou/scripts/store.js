/* ============================================================
   清昼 · 收藏夹数据层
   新标签页与工具栏弹窗共用同一份代码，数据放在 localStorage 的
   qz.bookmarks 里（两个页面同源，可直接共享）。
   ============================================================ */

(function (global) {
  'use strict';

  const KEY = 'qz.bookmarks';
  const MAX = 3000;
  const DEFAULT_FOLDER = '未分类';

  /* ---------- 工具 ---------- */

  /** 把 URL 归一化，用于判重：忽略协议差异、末尾斜杠和锚点 */
  function normUrl(raw) {
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      const path = u.pathname.replace(/\/+$/, '');
      return u.host.toLowerCase() + path + u.search;
    } catch (e) {
      return '';
    }
  }

  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /** 只接受内嵌的 data:image，避免渲染时偷偷发起网络请求 */
  function safeIcon(value) {
    return typeof value === 'string' && value.slice(0, 11) === 'data:image/' ? value : '';
  }

  function hostOf(url) {
    try {
      return new URL(url).host.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  /* ---------- 读写 ---------- */

  function read() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (data && Array.isArray(data.items)) {
        if (!Array.isArray(data.folders)) data.folders = [];
        return data;
      }
    } catch (e) {
      /* 数据损坏时当作空 */
    }
    return { v: 1, items: [], folders: [] };
  }

  function persist(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return 'ok';
    } catch (e) {
      // 配额不够：去掉图标再试，图标是可再生的装饰，标题和网址才是数据
      try {
        const slim = {
          v: 1,
          folders: data.folders || [],
          items: data.items.map((it) => Object.assign({}, it, { icon: '' })),
        };
        localStorage.setItem(KEY, JSON.stringify(slim));
        return 'no-icon';
      } catch (e2) {
        return 'fail';
      }
    }
  }

  /* ---------- 对外接口 ---------- */

  const api = {
    DEFAULT_FOLDER,

    list() {
      return read().items;
    },

    /** 按出现顺序去重后的分类名：先按条目顺序，再补上用户新建的空分类 */
    folders() {
      const data = read();
      const out = [];
      const push = (name) => {
        if (name && out.indexOf(name) === -1) out.push(name);
      };
      data.items.forEach((it) => push(it.folder || DEFAULT_FOLDER));
      (data.folders || []).forEach(push);
      return out;
    },

    count() {
      return read().items.length;
    },

    /**
     * 新增一条。已存在同网址则返回 duplicate，不重复写入。
     * @returns {{status:'ok'|'duplicate'|'invalid'|'fail', item?:object}}
     */
    add(input) {
      const url = String(input.url || '').trim();
      if (!normUrl(url)) return { status: 'invalid' };

      const data = read();
      const key = normUrl(url);
      const exists = data.items.some((it) => normUrl(it.url) === key);
      if (exists) return { status: 'duplicate' };

      const item = {
        id: 'b' + hash(key + Date.now().toString(36)),
        title: String(input.title || '').trim().slice(0, 160) || hostOf(url) || url,
        url,
        icon: safeIcon(input.icon),
        folder: String(input.folder || DEFAULT_FOLDER).trim() || DEFAULT_FOLDER,
        at: Date.now(),
      };

      data.items.unshift(item);
      if (data.items.length > MAX) data.items.length = MAX;
      return { status: persist(data) === 'fail' ? 'fail' : 'ok', item };
    },

    /**
     * 修改一条：标题、网址、分类都能换；换网址要重新判重，
     * 网址变了就丢掉旧图标（那个图标属于旧站点）。
     */
    update(id, patch) {
      const url = String(patch.url || '').trim();
      if (!normUrl(url)) return { status: 'invalid' };

      const data = read();
      const item = data.items.find((it) => it.id === id);
      if (!item) return { status: 'missing' };

      const key = normUrl(url);
      const clash = data.items.some((it) => it.id !== id && normUrl(it.url) === key);
      if (clash) return { status: 'duplicate' };

      if (normUrl(item.url) !== key) item.icon = '';
      item.url = url;
      item.title = String(patch.title || '').trim().slice(0, 160) || hostOf(url);
      item.folder = String(patch.folder || '').trim().slice(0, 40) || DEFAULT_FOLDER;

      return { status: persist(data) === 'fail' ? 'fail' : 'ok', item };
    },

    /** 新建空分类 */
    addFolder(name) {
      const clean = String(name || '').trim().slice(0, 40);
      if (!clean) return { status: 'invalid' };
      if (api.folders().indexOf(clean) >= 0) return { status: 'duplicate' };

      const data = read();
      if (!Array.isArray(data.folders)) data.folders = [];
      data.folders.push(clean);
      return { status: persist(data) === 'fail' ? 'fail' : 'ok' };
    },

    /** 重命名分类：名下的条目一起改 */
    renameFolder(from, to) {
      const next = String(to || '').trim().slice(0, 40);
      if (!next) return { status: 'invalid' };
      if (next === from) return { status: 'same' };
      if (api.folders().indexOf(next) >= 0) return { status: 'duplicate' };

      const data = read();
      let moved = 0;
      data.items.forEach((it) => {
        if ((it.folder || DEFAULT_FOLDER) === from) {
          it.folder = next;
          moved += 1;
        }
      });
      data.folders = (data.folders || []).map((f) => (f === from ? next : f));
      return { status: persist(data) === 'fail' ? 'fail' : 'ok', moved };
    },

    /** 删除分类：条目不删，退回默认分类 */
    removeFolder(name) {
      const data = read();
      let moved = 0;
      data.items.forEach((it) => {
        if ((it.folder || DEFAULT_FOLDER) === name) {
          it.folder = DEFAULT_FOLDER;
          moved += 1;
        }
      });
      data.folders = (data.folders || []).filter((f) => f !== name);
      return { status: persist(data) === 'fail' ? 'fail' : 'ok', moved };
    },

    /**
     * 按传入的 id 顺序重排。只重排这些 id 原本占用的槽位，
     * 不在列表里的条目位置保持不变（分页/筛选下也不会打乱别的分类）。
     */
    reorder(ids) {
      const data = read();
      const slots = [];
      data.items.forEach((it, index) => {
        if (ids.indexOf(it.id) >= 0) slots.push(index);
      });
      if (!slots.length || slots.length !== ids.length) return { status: 'invalid' };

      const byId = new Map(data.items.map((it) => [it.id, it]));
      slots.forEach((slot, k) => {
        data.items[slot] = byId.get(ids[k]);
      });
      return { status: persist(data) === 'fail' ? 'fail' : 'ok' };
    },

    /** 置顶 / 取消置顶：置顶的条目排在 dock 与列表最前 */
    togglePin(id) {
      const data = read();
      const item = data.items.find((it) => it.id === id);
      if (!item) return { status: 'missing' };

      if (item.pin) {
        delete item.pin;
      } else {
        item.pin = Date.now();
        // 置顶同时提到最前：默认顺序直接按存储顺序渲染，
        // 这样「新置顶的在最上面」和「拖动出来的顺序」才能同时成立
        data.items.splice(data.items.indexOf(item), 1);
        data.items.unshift(item);
      }

      return { status: persist(data) === 'fail' ? 'fail' : 'ok', pinned: Boolean(item.pin) };
    },

    remove(id) {
      const data = read();
      const before = data.items.length;
      data.items = data.items.filter((it) => it.id !== id);
      if (data.items.length === before) return false;
      persist(data);
      return true;
    },

    clear() {
      persist({ v: 1, items: [] });
    },

    /** 顺序调整：把某条挪到最前 */
    touch(id) {
      const data = read();
      const index = data.items.findIndex((it) => it.id === id);
      if (index <= 0) return;
      const [item] = data.items.splice(index, 1);
      item.at = Date.now();
      data.items.unshift(item);
      persist(data);
    },

    /* ---------- 导入浏览器导出的书签 HTML ---------- */

    parse(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const root = doc.querySelector('dl');
      const out = [];
      if (!root) return out;

      // Chrome 导出的结构里，子文件夹的 <DL> 与 <DT><H3> 是兄弟关系而非嵌套，
      // 所以用一个 pending 变量把「刚读到的文件夹名」交给下一个 DL。
      function walk(dl, folder) {
        let pending = '';
        const nodes = Array.from(dl.children);
        for (let i = 0; i < nodes.length; i += 1) {
          const node = nodes[i];
          if (node.tagName === 'DT') {
            const link = node.querySelector(':scope > a');
            const head = node.querySelector(':scope > h3');
            if (link) {
              const href = link.getAttribute('href') || '';
              if (normUrl(href)) {
                out.push({
                  title: (link.textContent || '').trim() || hostOf(href),
                  url: href,
                  icon: safeIcon(link.getAttribute('icon')),
                  folder: pending || folder,
                });
              }
              if (pending) pending = '';
            } else if (head) {
              pending = head.textContent.trim() || DEFAULT_FOLDER;
              const nested = node.querySelector(':scope > dl');
              if (nested) {
                walk(nested, pending);
                pending = '';
              }
            }
          } else if (node.tagName === 'DL') {
            walk(node, pending || folder);
            pending = '';
          }
        }
      }

      walk(root, DEFAULT_FOLDER);
      return out;
    },

    /** 导入结果：已存在的不重复写入 */
    importHtml(html) {
      const incoming = api.parse(html);
      const data = read();
      if (!Array.isArray(data.folders)) data.folders = [];
      const seen = new Set(data.items.map((it) => normUrl(it.url)));
      let added = 0;
      let dup = 0;

      incoming.forEach((it) => {
        const key = normUrl(it.url);
        if (!key || seen.has(key)) {
          dup += 1;
          return;
        }
        seen.add(key);
        data.items.unshift({
          id: 'b' + hash(key + Math.random().toString(36).slice(2, 7)),
          title: (it.title || hostOf(it.url)).slice(0, 160),
          url: it.url,
          icon: it.icon,
          folder: it.folder || DEFAULT_FOLDER,
          at: Date.now(),
        });
        added += 1;
      });

      if (data.items.length > MAX) data.items.length = MAX;
      const saved = added ? persist(data) : 'ok';
      return { added, dup, total: incoming.length, saved };
    },

    /** 导出成 Chrome / Edge 能直接导入的书签 HTML（Netscape 格式） */
    toHtml() {
      const data = read();
      const byFolder = new Map();
      data.items.forEach((it) => {
        const name = it.folder || DEFAULT_FOLDER;
        if (!byFolder.has(name)) byFolder.set(name, []);
        byFolder.get(name).push(it);
      });
      (data.folders || []).forEach((name) => {
        if (!byFolder.has(name)) byFolder.set(name, []);
      });

      const esc = (v) =>
        String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const stamp = Math.floor(Date.now() / 1000);
      const out = [
        '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
        '<!-- This is an automatically generated file. -->',
        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
        '<TITLE>Bookmarks</TITLE>',
        '<H1>Bookmarks</H1>',
        '<DL><p>',
      ];

      byFolder.forEach((items, folder) => {
        out.push(`    <DT><H3 ADD_DATE="${stamp}">${esc(folder)}</H3>`);
        out.push('    <DL><p>');
        items.forEach((it) => {
          const icon = it.icon ? ` ICON="${it.icon}"` : '';
          const added = Math.floor((it.at || Date.now()) / 1000);
          out.push(
            `        <DT><A HREF="${esc(it.url)}" ADD_DATE="${added}"${icon}>${esc(it.title)}</A>`
          );
        });
        out.push('    </DL><p>');
      });

      out.push('</DL><p>');
      return out.join('\n');
    },

    /** 其他标签页改了数据时通知（storage 事件只在别的文档里触发） */
    onChange(fn) {
      window.addEventListener('storage', (event) => {
        if (event.key === KEY) fn();
      });
    },

    hostOf,
  };

  global.QZStore = api;
})(window);
