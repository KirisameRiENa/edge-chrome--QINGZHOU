/* ============================================================
   清昼 · 三语文案
   新标签页与工具栏弹窗共用。词表直接写在代码里，不进 _locales，
   这样切换语言可以即时生效、不用重载扩展。
   ============================================================ */

(function (global) {
  'use strict';

  const KEY = 'qz.lang';
  const LANGS = ['zh', 'en', 'ja'];
  const TAG = { zh: 'zh-CN', en: 'en', ja: 'ja' };
  const SHORT = { zh: '中', en: 'EN', ja: '日' };
  const NAME = { zh: '中文', en: 'English', ja: '日本語' };

  const DICT = {
    zh: {
      'greet.late': '夜深了',
      'greet.early': '早上好',
      'greet.morning': '上午好',
      'greet.noon': '中午好',
      'greet.afternoon': '下午好',
      'greet.evening': '晚上好',
      'greet.sep': '，',
      'clock.now': '现在 {time}',

      'search.ph': '搜索，或输入网址',
      'search.go': '搜索',
      'search.open': '打开',

      'progress.day': '今日',
      'progress.week': '本周',
      'progress.month': '本月',
      'progress.year': '今年',
      'progress.text': '{unit}已过 {pct}%',

      'footer.local': '本地运行',

      'dock.title': '收藏夹',
      'dock.import': '导入书签',
      'dock.close': '收起收藏夹',
      'dock.open': '收藏夹',
      'dock.all': '全部',
      'dock.empty': '还没有收藏',
      'dock.emptyImport': '导入浏览器书签',
      'dock.emptyDock': '收藏夹为空 · 导入书签',
      'dock.expand': '展开全部收藏',
      'dock.pin': '置顶',
      'dock.pinnedOnly': 'Dock 只显示置顶',
      'dock.nonePinned': '还没有置顶的网页',
      'dock.manual': '已切回手动排序',
      'dock.unpin': '取消置顶',
      'dock.sort': '排序',
      'dock.sortDefault': '默认顺序',
      'dock.sortName': '名称',
      'dock.sortHost': '网站',
      'dock.pinned': '已置顶',
      'dock.unpinned': '已取消置顶',
      'dock.export': '导出收藏夹',
      'dock.exported': '已导出书签文件',
      'dock.viewList': '长条列表',
      'dock.viewGrid': '只显示图标',
      'dock.glass': '毛玻璃',
      'dock.glassSection': '面板',
      'engine.add': '添加引擎',
      'engine.name': '名称',
      'engine.url': '网址（用 %s 代表关键词）',
      'engine.save': '保存',
      'engine.cancel': '取消',
      'engine.invalid': '网址要以 http 开头，并包含 %s',
      'engine.dup': '这个引擎已经有了',
      'engine.remove': '删除这个引擎',
      'engine.added': '已添加引擎',
      'engine.removed': '已删除引擎',
      'dock.search': '搜索收藏',
      'dock.newFolder': '新建分类',
      'dock.renameFolder': '重命名分类',
      'dock.deleteFolder': '删除分类',
      'dock.folderPh': '分类名称',
      'dock.noMatch': '没有匹配的收藏',
      'dock.folderAdded': '已新建分类',
      'dock.folderRenamed': '已重命名',
      'dock.folderDup': '这个分类已经存在',
      'dock.folderRemoved': '已删除分类，{n} 条归入未分类',
      'dock.folderDeleted': '已删除分类',
      'dock.saved': '已保存',
      'dock.deleted': '已删除',

      'edit.title': '标题',
      'edit.url': '网址',
      'edit.folder': '分类',
      'edit.save': '保存',
      'edit.cancel': '取消',
      'edit.dup': '这个网址已经在收藏夹里了',
      'edit.bad': '网址填得不太对',
      'edit.edit': '编辑这条收藏',
      'edit.del': '删除这条收藏',

      'import.added': '导入 {n} 条',
      'import.dup': '，跳过 {n} 条重复',
      'import.all': '都已经在收藏夹里了',
      'import.noIcon': '（空间不足，图标已省略）',
      'import.fail': '没读到书签，换个文件试试',

      'settings.title': '设置',
      'settings.close': '关闭面板',
      'settings.open': '设置',
      'settings.appearance': '外观',
      'settings.auto': '自动',
      'settings.light': '浅色',
      'settings.dark': '深色',
      'settings.theme': '配色',
      'settings.custom': '自定义',
      'palette.paper': '纸',
      'palette.mist': '雾蓝',
      'palette.teal': '青',
      'palette.sage': '苔绿',
      'palette.sand': '沙',
      'palette.clay': '陶土',
      'palette.rose': '绯',
      'settings.background': '背景',
      'settings.pickImage': '选择图片',
      'settings.remove': '移除',
      'settings.defaultPaper': '默认纸面',
      'settings.set': '已设置',
      'settings.processing': '处理中…',
      'settings.blur': '模糊',
      'settings.progress': '进度',
      'settings.day': '日',
      'settings.week': '周',
      'settings.month': '月',
      'settings.year': '年',
      'settings.name': '称呼',
      'settings.namePh': '怎么称呼你？留空则不显示',
      'settings.search': '搜索引擎',
      'settings.foot': '设置仅保存在这台设备上，扩展不发起任何网络请求，也没有后台进程。',
      'settings.bgBad': '这张图读不出来',
      'settings.bgBig': '图片太大，换一张试试',
      'settings.language': '语言',

      'theme.toDark': '切换到深色模式',
      'theme.toLight': '切换到浅色模式',

      'engine.baidu': '百度',
      'engine.bing': '必应',
      'engine.google': 'Google',
      'engine.sogou': '搜狗',
      'engine.so': '360',
      'engine.ddg': 'DuckDuckGo',

      'popup.brand': '收藏到清昼',
      'popup.saveTo': '收藏到',
      'popup.add': '添加到收藏夹',
      'popup.added': '已添加 ✓',
      'popup.exists': '已在收藏夹中',
      'popup.cannot': '无法收藏',
      'popup.loading': '正在读取当前页面…',
      'popup.noEnv': '当前环境不支持读取标签页',
      'popup.noPage': '这个页面不支持收藏',
      'popup.noUrl': '读不到当前页面地址',
      'popup.hintHttp': '只能收藏普通的 http / https 网页。',
      'popup.hintOk': '收藏已保存，可以在起始页底部的 dock 里看到。',
      'popup.hintDup': '这条网址已经收藏过了。',
      'popup.hintQuota': '存储空间不足，先把收藏夹清理一下吧。',

      'folders.default': '未分类',
    },

    en: {
      'greet.late': 'Still up?',
      'greet.early': 'Good morning',
      'greet.morning': 'Good morning',
      'greet.noon': 'Good afternoon',
      'greet.afternoon': 'Good afternoon',
      'greet.evening': 'Good evening',
      'greet.sep': ', ',
      'clock.now': 'Now {time}',

      'search.ph': 'Search, or type a URL',
      'search.go': 'Search',
      'search.open': 'Open',

      'progress.day': 'today',
      'progress.week': 'this week',
      'progress.month': 'this month',
      'progress.year': 'this year',
      'progress.text': '{pct}% of {unit}',

      'footer.local': 'Runs locally',

      'dock.title': 'Bookmarks',
      'dock.import': 'Import',
      'dock.close': 'Close bookmarks',
      'dock.open': 'Bookmarks',
      'dock.all': 'All',
      'dock.empty': 'No bookmarks yet',
      'dock.emptyImport': 'Import bookmarks file',
      'dock.emptyDock': 'No bookmarks yet · Import',
      'dock.expand': 'Show all bookmarks',
      'dock.pin': 'Pin',
      'dock.pinnedOnly': 'Dock: pinned only',
      'dock.nonePinned': 'Nothing pinned yet',
      'dock.manual': 'Switched to manual order',
      'dock.unpin': 'Unpin',
      'dock.sort': 'Sort',
      'dock.sortDefault': 'Default order',
      'dock.sortName': 'Name',
      'dock.sortHost': 'Site',
      'dock.pinned': 'Pinned',
      'dock.unpinned': 'Unpinned',
      'dock.export': 'Export bookmarks',
      'dock.exported': 'Bookmark file exported',
      'dock.viewList': 'List view',
      'dock.viewGrid': 'Icons only',
      'dock.glass': 'Glass',
      'dock.glassSection': 'Panel',
      'engine.add': 'Add engine',
      'engine.name': 'Name',
      'engine.url': 'URL (use %s for the query)',
      'engine.save': 'Save',
      'engine.cancel': 'Cancel',
      'engine.invalid': 'URL must start with http and contain %s',
      'engine.dup': 'That engine already exists',
      'engine.remove': 'Remove this engine',
      'engine.added': 'Engine added',
      'engine.removed': 'Engine removed',
      'dock.search': 'Search bookmarks',
      'dock.newFolder': 'New folder',
      'dock.renameFolder': 'Rename folder',
      'dock.deleteFolder': 'Delete folder',
      'dock.folderPh': 'Folder name',
      'dock.noMatch': 'No matching bookmarks',
      'dock.folderAdded': 'Folder created',
      'dock.folderRenamed': 'Renamed',
      'dock.folderDup': 'That folder already exists',
      'dock.folderRemoved': 'Folder deleted, {n} moved to Uncategorized',
      'dock.folderDeleted': 'Folder deleted',
      'dock.saved': 'Saved',
      'dock.deleted': 'Deleted',

      'edit.title': 'Title',
      'edit.url': 'URL',
      'edit.folder': 'Folder',
      'edit.save': 'Save',
      'edit.cancel': 'Cancel',
      'edit.dup': 'That URL is already saved',
      'edit.bad': 'That URL does not look right',
      'edit.edit': 'Edit bookmark',
      'edit.del': 'Delete bookmark',

      'import.added': 'Imported {n}',
      'import.dup': ', skipped {n} duplicate(s)',
      'import.all': 'Everything is already saved',
      'import.noIcon': ' (icons dropped, storage full)',
      'import.fail': 'Could not read that file',

      'settings.title': 'Settings',
      'settings.close': 'Close panel',
      'settings.open': 'Settings',
      'settings.appearance': 'Appearance',
      'settings.auto': 'Auto',
      'settings.light': 'Light',
      'settings.dark': 'Dark',
      'settings.theme': 'Theme',
      'settings.custom': 'Custom',
      'palette.paper': 'Paper',
      'palette.mist': 'Mist',
      'palette.teal': 'Teal',
      'palette.sage': 'Sage',
      'palette.sand': 'Sand',
      'palette.clay': 'Clay',
      'palette.rose': 'Rose',
      'settings.background': 'Background',
      'settings.pickImage': 'Choose image',
      'settings.remove': 'Remove',
      'settings.defaultPaper': 'Default paper',
      'settings.set': 'Set',
      'settings.processing': 'Processing…',
      'settings.blur': 'Blur',
      'settings.progress': 'Progress',
      'settings.day': 'Day',
      'settings.week': 'Week',
      'settings.month': 'Month',
      'settings.year': 'Year',
      'settings.name': 'Name',
      'settings.namePh': 'What should we call you?',
      'settings.search': 'Search engine',
      'settings.foot':
        'Settings stay on this device. The extension makes no network requests and runs no background process.',
      'settings.bgBad': 'Could not read this image',
      'settings.bgBig': 'Image too large, try another one',
      'settings.language': 'Language',

      'theme.toDark': 'Switch to dark mode',
      'theme.toLight': 'Switch to light mode',

      'engine.baidu': 'Baidu',
      'engine.bing': 'Bing',
      'engine.google': 'Google',
      'engine.sogou': 'Sogou',
      'engine.so': '360',
      'engine.ddg': 'DuckDuckGo',

      'popup.brand': 'Save to Qingzhou',
      'popup.saveTo': 'Save to',
      'popup.add': 'Add bookmark',
      'popup.added': 'Added ✓',
      'popup.exists': 'Already saved',
      'popup.cannot': 'Can not save',
      'popup.loading': 'Reading the current page…',
      'popup.noEnv': 'Tabs are not available here',
      'popup.noPage': 'This page can not be bookmarked',
      'popup.noUrl': 'Could not read the page address',
      'popup.hintHttp': 'Only regular http / https pages can be saved.',
      'popup.hintOk': 'Saved. You will find it in the dock at the bottom of the start page.',
      'popup.hintDup': 'This URL is already in your bookmarks.',
      'popup.hintQuota': 'Storage is full. Try clearing some bookmarks first.',

      'folders.default': 'Uncategorized',
    },

    ja: {
      'greet.late': '夜更かしですね',
      'greet.early': 'おはよう',
      'greet.morning': 'おはようございます',
      'greet.noon': 'こんにちは',
      'greet.afternoon': 'こんにちは',
      'greet.evening': 'こんばんは',
      'greet.sep': '、',
      'clock.now': '現在 {time}',

      'search.ph': '検索、または URL を入力',
      'search.go': '検索',
      'search.open': '開く',

      'progress.day': '今日',
      'progress.week': '今週',
      'progress.month': '今月',
      'progress.year': '今年',
      'progress.text': '{unit} {pct}% 経過',

      'footer.local': 'ローカル実行',

      'dock.title': 'ブックマーク',
      'dock.import': 'インポート',
      'dock.close': 'ブックマークを閉じる',
      'dock.open': 'ブックマーク',
      'dock.all': 'すべて',
      'dock.empty': 'まだブックマークがありません',
      'dock.emptyImport': 'ブックマークを読み込む',
      'dock.emptyDock': '空です · インポート',
      'dock.expand': 'すべて表示',
      'dock.pin': 'ピン留め',
      'dock.pinnedOnly': 'ドックはピン留めのみ',
      'dock.nonePinned': 'ピン留めがありません',
      'dock.manual': '手動順に切り替えました',
      'dock.unpin': 'ピン留めを解除',
      'dock.sort': '並び替え',
      'dock.sortDefault': '既定順',
      'dock.sortName': '名前',
      'dock.sortHost': 'サイト',
      'dock.pinned': 'ピン留めしました',
      'dock.unpinned': 'ピン留めを解除しました',
      'dock.export': 'ブックマークを書き出す',
      'dock.exported': '書き出しました',
      'dock.viewList': 'リスト表示',
      'dock.viewGrid': 'アイコンのみ',
      'dock.glass': 'すりガラス',
      'dock.glassSection': 'パネル',
      'engine.add': 'エンジンを追加',
      'engine.name': '名前',
      'engine.url': 'URL（%s が検索語）',
      'engine.save': '保存',
      'engine.cancel': 'キャンセル',
      'engine.invalid': 'URL は http で始まり %s を含む必要があります',
      'engine.dup': 'そのエンジンは既にあります',
      'engine.remove': 'このエンジンを削除',
      'engine.added': 'エンジンを追加しました',
      'engine.removed': 'エンジンを削除しました',
      'dock.search': 'ブックマークを検索',
      'dock.newFolder': '新規フォルダー',
      'dock.renameFolder': '名前を変更',
      'dock.deleteFolder': 'フォルダーを削除',
      'dock.folderPh': 'フォルダー名',
      'dock.noMatch': '一致するブックマークはありません',
      'dock.folderAdded': 'フォルダーを作成しました',
      'dock.folderRenamed': '名前を変更しました',
      'dock.folderDup': 'そのフォルダーは既に存在します',
      'dock.folderRemoved': 'フォルダーを削除、{n} 件を未分類へ',
      'dock.folderDeleted': 'フォルダーを削除しました',
      'dock.saved': '保存しました',
      'dock.deleted': '削除しました',

      'edit.title': 'タイトル',
      'edit.url': 'URL',
      'edit.folder': 'フォルダー',
      'edit.save': '保存',
      'edit.cancel': 'キャンセル',
      'edit.dup': 'この URL はすでに保存されています',
      'edit.bad': 'URL の形式が正しくありません',
      'edit.edit': '編集',
      'edit.del': '削除',

      'import.added': '{n} 件を読み込みました',
      'import.dup': '、重複 {n} 件をスキップ',
      'import.all': 'すべて保存済みです',
      'import.noIcon': '（容量不足のためアイコンは省略）',
      'import.fail': '読み込めませんでした。別のファイルをお試しください',

      'settings.title': '設定',
      'settings.close': 'パネルを閉じる',
      'settings.open': '設定',
      'settings.appearance': '外観',
      'settings.auto': '自動',
      'settings.light': 'ライト',
      'settings.dark': 'ダーク',
      'settings.theme': '配色',
      'settings.custom': 'カスタム',
      'palette.paper': '紙',
      'palette.mist': 'ミスト',
      'palette.teal': '青',
      'palette.sage': 'セージ',
      'palette.sand': '砂',
      'palette.clay': 'テラコッタ',
      'palette.rose': 'ローズ',
      'settings.background': '背景',
      'settings.pickImage': '画像を選択',
      'settings.remove': '削除',
      'settings.defaultPaper': '既定の紙面',
      'settings.set': '設定済み',
      'settings.processing': '処理中…',
      'settings.blur': 'ぼかし',
      'settings.progress': '進捗',
      'settings.day': '日',
      'settings.week': '週',
      'settings.month': '月',
      'settings.year': '年',
      'settings.name': '呼び名',
      'settings.namePh': 'お名前は？（空欄なら表示しません）',
      'settings.search': '検索エンジン',
      'settings.foot':
        '設定はこの端末にのみ保存されます。拡張機能は通信を行わず、バックグラウンド処理もありません。',
      'settings.bgBad': 'この画像は読み込めません',
      'settings.bgBig': '画像が大きすぎます。別の画像をお試しください',
      'settings.language': '言語',

      'theme.toDark': 'ダークモードに切り替える',
      'theme.toLight': 'ライトモードに切り替える',

      'engine.baidu': 'Baidu',
      'engine.bing': 'Bing',
      'engine.google': 'Google',
      'engine.sogou': 'Sogou',
      'engine.so': '360',
      'engine.ddg': 'DuckDuckGo',

      'popup.brand': '清昼に保存',
      'popup.saveTo': '保存先',
      'popup.add': 'ブックマークに追加',
      'popup.added': '追加しました ✓',
      'popup.exists': '保存済み',
      'popup.cannot': '保存できません',
      'popup.loading': 'ページを読み取り中…',
      'popup.noEnv': 'この環境ではタブを読み取れません',
      'popup.noPage': 'このページは保存できません',
      'popup.noUrl': 'ページの URL を取得できません',
      'popup.hintHttp': '通常の http / https ページのみ保存できます。',
      'popup.hintOk': '保存しました。開始ページ下部のドックに表示されます。',
      'popup.hintDup': 'この URL はすでに保存されています。',
      'popup.hintQuota': '保存領域が不足しています。ブックマークを整理してください。',

      'folders.default': '未分類',
    },
  };

  let lang = LANGS.indexOf(localStorage.getItem(KEY)) >= 0 ? localStorage.getItem(KEY) : 'zh';
  const listeners = [];

  function t(key, params) {
    const table = DICT[lang] || DICT.zh;
    let text = table[key];
    if (text === undefined) text = DICT.zh[key];
    if (text === undefined) return key;
    if (params) {
      Object.keys(params).forEach((k) => {
        text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
      });
    }
    return text;
  }

  /** 把页面上带 data-i18n* 的静态文案填好 */
  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.documentElement.lang = TAG[lang];
  }

  function set(next) {
    if (LANGS.indexOf(next) < 0 || next === lang) return;
    lang = next;
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {
      /* 隐私模式下切了也不影响本次使用 */
    }
    apply();
    listeners.forEach((fn) => fn(lang));
  }

  /** 其它页面（弹窗）改了语言时同步 */
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY || !event.newValue || event.newValue === lang) return;
    if (LANGS.indexOf(event.newValue) < 0) return;
    lang = event.newValue;
    apply();
    listeners.forEach((fn) => fn(lang));
  });

  global.QZI18N = {
    t,
    apply,
    set,
    onChange: (fn) => listeners.push(fn),
    get lang() {
      return lang;
    },
    LANGS,
    SHORT,
    NAME,
    TAG,
  };
})(window);
