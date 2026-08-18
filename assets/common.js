/* =========================================================================
   全画面共通の振る舞い
   ・ユーザー種別（ライト／ミドル／ヘビー）の保持と切替
   ・表示デバイス（スマホ版／Web版）の保持と切替
   ・AIチャットボットのキャラクター（口調）の保持と切替
   ・5タブのナビとチャットボットを自動で挿入
   いずれもページを移動しても選択が維持されます。
   使い方：各ページの <body> に data-screen="top|detail|budget|campaign|profile|security"
           を付けて、common.css と data.js と一緒に読み込むだけ。
   ========================================================================= */

(function () {
  "use strict";

  /* ---------- localStorage の代替 ----------------------------------------
     file:// で開いたときやプライベートモードでは localStorage が使えず、
     触っただけで例外になるブラウザがあります。
     各画面が localStorage を直接使っても落ちないよう、
     使えない場合はメモリ上の入れ物に差し替えます（common.js は最初に読まれます）。 */
  (function ensureStorage() {
    try {
      window.localStorage.getItem("rk-probe");
      return;
    } catch (e) { /* 使えないので下で差し替える */ }
    var mem = {};
    try {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: {
          getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
          setItem: function (k, v) { mem[k] = String(v); },
          removeItem: function (k) { delete mem[k]; },
          clear: function () { mem = {}; },
          key: function (i) { return Object.keys(mem)[i] || null; },
          get length() { return Object.keys(mem).length; }
        }
      });
    } catch (e) { /* 差し替えられない環境ではそのまま */ }
  })();

  var TIERS   = ["light", "mid", "heavy"];
  var DEVICES = ["mobile", "web"];
  var CHARS   = ["normal", "menhera", "gal", "stoic"];

  var K_TIER = "rk-tier", K_DEV = "rk-device", K_CHAR = "rk-char", K_AUTO = "rk-auto";

  /* 表示モードが「自動」かどうか。既定は自動。
     しきい値が決まるまでは自動＝ライト（安全側）で動かします。 */
  function isAuto() {
    try { return localStorage.getItem(K_AUTO) !== "0"; } catch (e) { return true; }
  }
  function autoTier() { return "light"; }

  var NAV = [
    { id: "top",      href: "top.html",      ic: "⌂",  label: "TOP" },
    { id: "detail",   href: "detail.html",   ic: "🧾", label: "明細" },
    { id: "budget",   href: "budget.html",   ic: "📅", label: "家計簿" },
    { id: "campaign", href: "campaign.html", ic: "🎁", label: "特典" },
    { id: "profile",  href: "profile.html",  ic: "👤", label: "登録情報" }
  ];

  /* ---------- 状態の読み書き（URL → localStorage → 既定値） --------- */
  function read(key, param, allowed, fallback) {
    var q = new URLSearchParams(location.search).get(param);
    if (allowed.indexOf(q) >= 0) return q;
    try {
      var s = localStorage.getItem(key);
      if (allowed.indexOf(s) >= 0) return s;
    } catch (e) { /* file:// で localStorage が使えない場合は既定値 */ }
    return fallback;
  }
  function write(key, v) { try { localStorage.setItem(key, v); } catch (e) {} }

  var readTier   = function () {
    var q = new URLSearchParams(location.search).get("tier");
    if (TIERS.indexOf(q) >= 0) return q;
    if (isAuto()) return autoTier();
    return read(K_TIER, "tier", TIERS, "light");
  };
  var readDevice = function () { return read(K_DEV,  "device", DEVICES, "mobile"); };
  var readChar   = function () { return read(K_CHAR, "char",   CHARS,   "normal"); };

  var state = { tier: "light", device: "mobile", char: "normal" };

  function swapClass(prefix, list, value) {
    list.forEach(function (x) { document.body.classList.remove(prefix + x); });
    document.body.classList.add(prefix + value);
  }

  function applyTier(t) {
    state.tier = t;
    swapClass("tier-", TIERS, t);
    paintSettings();
    fire();
  }

  function applyDevice(d) {
    state.device = d;
    swapClass("device-", DEVICES, d);
    document.querySelectorAll(".rk-devbar-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.setDevice === d ? "true" : "false");
    });
    fire();
  }

  function applyChar(c) {
    state.char = c;
    swapClass("char-", CHARS, c);
    paintSettings();
    paintChat();
    fire();
  }

  /* 状態が変わったことを各画面に知らせる（必要な画面だけ再描画する） */
  function fire() {
    document.dispatchEvent(new CustomEvent("rk:state", { detail: Object.assign({}, state) }));
    /* 旧イベント名も残しておく（種別だけを見ている画面のため） */
    document.dispatchEvent(new CustomEvent("rk:tier", { detail: { tier: state.tier } }));
  }

  /* 画面遷移しても選択が維持されるようにリンクへ引き継ぐ */
  function decorate(href) {
    /* すでに ?mode=... が付いているリンクもあるので、区切り文字を選ぶ */
    var sep = href.indexOf("?") >= 0 ? "&" : "?";
    return href + sep + "tier=" + state.tier + "&device=" + state.device + "&char=" + state.char;
  }
  function refreshLinks() {
    document.querySelectorAll("[data-rk-link]").forEach(function (a) {
      a.setAttribute("href", decorate(a.dataset.rkLink));
    });
  }

  /* ---------- キャラクターの画像（無ければ絵文字にフォールバック） ---
     faceHtml … 頭だけ。小さい丸アイコン向け
     bodyHtml … 全身。家計簿のマスコット向け                            */
  function imgHtml(key, which, cls) {
    var c = window.APP ? APP.C.characters[key] : null;
    if (!c) return "🐼";
    var src = c[which] || c.img;
    return '<img src="' + src + '" alt="' + c.label + '"' + (cls ? ' class="' + cls + '"' : "") +
           " onerror=\"this.replaceWith(document.createTextNode('" + c.emoji + "'))\" />";
  }
  function faceHtml(key, cls) { return imgHtml(key, "face", cls); }
  function bodyHtml(key, cls) { return imgHtml(key, "img", cls); }

  /* ---------- 確認用UI（種別・デバイス・キャラクター） --------------- */
  /* 上部に残すのはデバイス切替だけ。
     ユーザー種別とキャラクターは登録情報ページの「表示設定」に移しました。 */
  function buildBars() {
    var C = window.APP ? window.APP.C : null;
    var bar = document.createElement("div");
    bar.className = "rk-tierbar";
    bar.innerHTML =
      '<div class="rk-tierbar-label">📱 表示デバイスの切替（確認用UI）</div>' +
      '<div class="rk-devbar-switch" role="group" aria-label="表示デバイス"></div>' +
      '<div class="rk-tierbar-note">ユーザー種別とチャットボットのキャラクターは、' +
      '<b>登録情報 → 表示設定</b>から変えられます。</div>';

    var dw = bar.querySelector(".rk-devbar-switch");
    DEVICES.forEach(function (d) {
      var def = C ? C.device[d] : { label: d, note: "" };
      var b = document.createElement("button");
      b.className = "rk-devbar-btn";
      b.dataset.setDevice = d;
      b.setAttribute("aria-pressed", d === state.device ? "true" : "false");
      b.innerHTML = "<strong>" + def.label + "</strong><span>" + def.note + "</span>";
      b.addEventListener("click", function () {
        write(K_DEV, d); applyDevice(d); refreshLinks();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      dw.appendChild(b);
    });

    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ---------- 表示設定（登録情報ページに差し込む） --------------------
     profile.html から RK.mountSettings(要素) で呼びます。            */
  function mountSettings(host) {
    if (!host) return;
    var C = window.APP ? window.APP.C : null;
    host.innerHTML =
      '<div class="rk-set-block">' +
      '<div class="rk-set-title">表示モード</div>' +
      '<div class="rk-set-note">ふだんのご利用状況から自動で選びます。固定したい場合は選んでください。</div>' +
      '<div class="rk-tierbar-switch" role="group" aria-label="表示モード"></div>' +
      "</div>" +
      '<div class="rk-set-block">' +
      '<div class="rk-set-title">チャットボットのキャラクター</div>' +
      '<div class="rk-set-note">右下のキャラクターの見た目と話し方が変わります。</div>' +
      '<div class="rk-charbar-switch" role="group" aria-label="キャラクター"></div>' +
      "</div>";

    /* 表示モード：自動＋3種の固定 */
    var sw = host.querySelector(".rk-tierbar-switch");
    sw.style.gridTemplateColumns = "repeat(4, 1fr)";

    var autoBtn = document.createElement("button");
    autoBtn.className = "rk-tierbar-btn plain";
    autoBtn.dataset.setTier = "auto";
    autoBtn.innerHTML = "<strong>自動</strong>";
    autoBtn.addEventListener("click", function () {
      write(K_AUTO, "1");
      applyTier(readTier());
      paintSettings();
      RK.toast("表示モードを自動にしました");
    });
    sw.appendChild(autoBtn);

    TIERS.forEach(function (t) {
      var def = C ? C.tier[t] : { label: t };
      var b = document.createElement("button");
      b.className = "rk-tierbar-btn plain";
      b.dataset.setTier = t;
      b.innerHTML = "<strong>" + def.label + "</strong>";
      b.addEventListener("click", function () {
        write(K_AUTO, "0");
        write(K_TIER, t);
        applyTier(t);
        refreshLinks();
        paintSettings();
        RK.toast(def.label + "に固定しました");
      });
      sw.appendChild(b);
    });

    /* キャラクター */
    var cw = host.querySelector(".rk-charbar-switch");
    CHARS.forEach(function (k) {
      var def = C ? C.characters[k] : { short: k };
      var b = document.createElement("button");
      b.className = "rk-charbar-btn";
      b.dataset.setChar = k;
      b.innerHTML = '<span class="face">' + faceHtml(k) + "</span><span>" + def.short + "</span>";
      b.addEventListener("click", function () {
        write(K_CHAR, k); applyChar(k); refreshLinks();
        RK.toast(def.label + "に切り替えました");
      });
      cw.appendChild(b);
    });

    paintSettings();
  }

  /* 表示設定の選択状態を塗り直す */
  function paintSettings() {
    var auto = isAuto();
    document.querySelectorAll(".rk-tierbar-btn").forEach(function (b) {
      var t = b.dataset.setTier;
      b.setAttribute("aria-pressed",
        (t === "auto" ? auto : (!auto && t === state.tier)) ? "true" : "false");
    });
    document.querySelectorAll(".rk-charbar-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.setChar === state.char ? "true" : "false");
    });
  }

  /* ---------- 下部（Web版では上部）ナビ ------------------------------ */
  function buildNav(current) {
    var nav = document.createElement("nav");
    nav.className = "rk-nav";
    NAV.forEach(function (n) {
      var a = document.createElement("a");
      a.href = decorate(n.href);
      a.dataset.rkLink = n.href;
      if (n.id === current) a.className = "active";
      a.innerHTML = '<span class="ic">' + n.ic + "</span>" + n.label;
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
  }

  /* ---------- AIチャットボット --------------------------------------- */
  var SUGGEST = {
    top:      ["今月あといくら使える？", "次回の支払額を教えて", "失効しそうなポイントは？"],
    detail:   ["先月と比べてどう？", "一番大きい支払いは？", "あとから分割にしたい"],
    budget:   ["現金の支出を追加したい", "今月の食費はいくら？", "先月より使いすぎ？"],
    campaign: ["私におすすめの特典は？", "もうすぐ終わる特典は？", "旅行の特典を見たい"],
    profile:  ["住所を変えたい", "カード番号による不具合を解消したい", "メールアドレスの変更ができない"],
    security: ["カードを止めたい", "ポイントの失効日は？", "利用通知の金額を変えたい"],
    recap:    ["もう一度見たい", "去年のぶんも見たい", "この内容を保存したい"]
  };

  var chatPanel, chatFab, chatScreen;

  function talk() {
    return (window.APP && APP.TALK[state.char]) || { greet: "", ack: function (q) { return q; } };
  }

  /* キャラクターが変わったら、あいさつ・名前・アイコンを描き直す */
  function paintChat() {
    if (!chatPanel) return;
    var C = window.APP ? APP.C.characters[state.char] : null;
    chatPanel.querySelector(".rk-chat-avatar").innerHTML = faceHtml(state.char);
    chatPanel.querySelector(".rk-chat-head-name").textContent = C ? C.label : "AIチャットサポート";
    chatPanel.querySelector(".rk-chat-bubble").textContent = notifyText || talk().greet;
    if (C) {
      chatPanel.querySelector(".rk-chat-head").style.background =
        "linear-gradient(135deg, " + C.color + ", #e84c3d)";
      /* ボタンは白のまま、枠と光だけキャラの色にする（透過画像が見やすい） */
      chatFab.style.borderColor = C.color;
      chatFab.style.boxShadow = "0 8px 20px -6px " + C.color + "88";
    }
    chatFab.querySelector(".rk-fab-inner").innerHTML = faceHtml(state.char, "rk-fab-face");
  }

  function buildChat(screen) {
    chatScreen = screen;

    chatFab = document.createElement("button");
    chatFab.className = "rk-fab";
    chatFab.setAttribute("aria-label", "AIチャットサポートを開く");
    chatFab.innerHTML = '<span class="rk-fab-inner"></span>';

    chatPanel = document.createElement("div");
    chatPanel.className = "rk-chat";
    chatPanel.innerHTML =
      '<div class="rk-chat-head">' +
      '<div class="rk-chat-head-main"><span class="rk-chat-avatar"></span>' +
      '<span><span class="rk-chat-head-name"></span><br>' +
      '<span class="rk-chat-head-sub">AIチャットサポート</span></span></div>' +
      '<button class="rk-chat-close" aria-label="閉じる">×</button></div>' +
      '<div class="rk-chat-body"><div class="rk-chat-bubble"></div>' +
      '<div class="rk-chat-suggest"></div></div>';

    var list = chatPanel.querySelector(".rk-chat-suggest");
    (SUGGEST[screen] || SUGGEST.top).forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", function () {
        chatPanel.querySelector(".rk-chat-bubble").textContent = talk().ack(q);
      });
      list.appendChild(b);
    });

    chatFab.addEventListener("click", function () {
      /* 押したらキャラがゆるやかに動く */
      chatFab.classList.remove("pressed");
      void chatFab.offsetWidth;              /* アニメーションを最初からやり直す */
      chatFab.classList.add("pressed");
      chatFab.classList.remove("notify");    /* 知らせを見たので光るのを止める */
      chatPanel.classList.toggle("open");
    });
    chatFab.addEventListener("animationend", function () { chatFab.classList.remove("pressed"); });
    chatPanel.querySelector(".rk-chat-close").addEventListener("click", function () {
      chatPanel.classList.remove("open");
    });

    document.body.appendChild(chatFab);
    document.body.appendChild(chatPanel);
    paintChat();
  }

  /* ---------- キャラクターからの知らせ --------------------------------
     画面側から RK.notify("文章") を呼ぶと、チャットの最初のひとことが
     その文章に変わり、キャラクターがやわらかく光ります。            */
  var notifyText = null;
  function notify(text) {
    if (!text || !chatPanel) return;
    notifyText = text;
    chatPanel.querySelector(".rk-chat-bubble").textContent = text;
    chatFab.classList.add("notify");
  }

  /* ---------- トースト ----------------------------------------------- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "rk-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  /* ---------- 公開API ------------------------------------------------- */
  window.RK = {
    toast: toast,
    notify: notify,
    TIERS: TIERS, DEVICES: DEVICES, CHARS: CHARS,
    tier:   function () { return state.tier; },
    /* 画面側から種別を変えたいとき（キャンペーン画面のライト／ヘビー切替など） */
    setTier: function (t) {
      if (TIERS.indexOf(t) < 0) return;
      write(K_AUTO, "0");
      write(K_TIER, t);
      applyTier(t);
      refreshLinks();
    },
    mountSettings: mountSettings,
    device: function () { return state.device; },
    char:   function () { return state.char; },
    /* キャラクターのセリフを取り出す。{rate} などは置換して渡す */
    line: function (kind, vars) {
      var t = talk().mascot;
      var s = (t && t[kind]) || "";
      Object.keys(vars || {}).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
      return s;
    },
    face: faceHtml,
    body: bodyHtml,
    refreshLinks: refreshLinks,
    md:  function (s) { return Number(s.slice(5, 7)) + "月" + Number(s.slice(8, 10)) + "日"; },
    ymd: function (s) { return s.slice(0, 4) + "年" + Number(s.slice(5, 7)) + "月" + Number(s.slice(8, 10)) + "日"; }
  };

  /* ---------- 起動 ---------------------------------------------------- */
  function init() {
    var screen = document.body.dataset.screen || "top";
    state.tier   = readTier();
    state.device = readDevice();
    state.char   = readChar();

    swapClass("tier-", TIERS, state.tier);
    swapClass("device-", DEVICES, state.device);
    swapClass("char-", CHARS, state.char);

    buildBars();
    buildNav(screen);
    buildChat(screen);
    refreshLinks();
    fire();

    document.querySelectorAll("[data-toast]").forEach(function (el) {
      el.addEventListener("click", function () { toast(el.dataset.toast); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
