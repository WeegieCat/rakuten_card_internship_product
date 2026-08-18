/* =========================================================================
   共通データ（全画面の単一の真実源）
   このファイルの数値を変えると、全画面の表示が同時に変わります。
   画面ごとに数値をハードコードしないでください。
   ========================================================================= */

(function (global) {
  "use strict";

  /* ---------------------------------------------------------------------
     1. 仮決定した基準値
     --------------------------------------------------------------------- */
  var CONST = {
    user:  { name: "楽天 太郎", nameEn: "RAKUTEN TARO", last4: "1234", brand: "VISA" },

    /* デモ上の「今日」。データの最終日に合わせています */
    today: "2026-06-25",

    /* ショッピング利用可能枠（全画面共通・仮決定値） */
    limit: 250000,

    /* ユーザーが自分で決めた「使いすぎライン」。未設定なら limit を使う */
    userLimit: 200000,

    /* 使いすぎ通知のしきい値（％）。一次責任は明細画面 */
    alert: { notice: 80, warn: 90 },

    /* 1日の利用通知上限額（セキュリティ画面） */
    dailyNotifyLimit: 50000,

    /* 未払い残高 */
    unpaid: { amount: 5000, due: "2026-06-30" },

    /* お支払い */
    payment: { due: "2026-06-30", bank: "みずほ銀行", bankLast4: "1234" },

    /* ポイント（一次責任はセキュリティ画面） */
    points: {
      total: 12450,
      limited: 1500,
      limitedExpire: "2026-07-10",
      normal: 10950,
      normalExpire: "2026-12-25",
      earnedThisMonth: 1500,
      campaignBonus: 620,
      alertDays: 30          /* 失効まで何日以内でアラートを出すか */
    },

    /* ユーザー種別の判定基準（週あたり）
       表示時間＝アプリを開いていた合計／操作時間＝タップ・スクロールしていた合計
       2軸の判定が食い違った場合は「低い方」を採用する（安全側＝シンプル側）

       ★しきい値は2日目に決めます。決まったら view / op の "？" を
         "10分未満" のような文字列に置き換えてください（画面側の修正は不要）。 */
    tier: {
      light: { label: "ライト", view: "？", op: "？", viewMax: null, opMax: null },
      mid:   { label: "ミドル", view: "？", op: "？", viewMax: null, opMax: null },
      heavy: { label: "ヘビー", view: "？", op: "？", viewMax: null, opMax: null }
    },

    /* 表示デバイス（ホワイトボード：モバイル＝最重要項目のみ／PC＝最重要＋付加項目） */
    device: {
      mobile: { label: "スマホ版", note: "最重要項目のみ" },
      web:    { label: "Web版",   note: "最重要項目＋付加項目" }
    },

    /* AIチャットボットのキャラクター。
       img  … 全身（家計簿のマスコット用）
       face … 頭だけを切り出したもの（小さい丸アイコン用。img から自動生成）
       画像が無い場合は emoji で代替表示します。 */
    characters: {
      normal:  { label: "お買いものパンダ",           short: "パンダ",     emoji: "🐼", color: "#bf0000",
                 img: "assets/panda-normal.png",  face: "assets/panda-normal-face.png" },
      menhera: { label: "メンヘラお買いものパンダ",   short: "メンヘラ",   emoji: "🥀", color: "#8e3b5a",
                 img: "assets/panda-menhera.png", face: "assets/panda-menhera-face.png" },
      gal:     { label: "ギャルお買いものパンダ",     short: "ギャル",     emoji: "💅", color: "#e8590c",
                 img: "assets/panda-gal.png",     face: "assets/panda-gal-face.png" },
      stoic:   { label: "ストイックお買いものパンダ", short: "ストイック", emoji: "🏋️", color: "#333a44",
                 img: "assets/panda-stoic.png",   face: "assets/panda-stoic-face.png" }
    },

    /* 年末サマリー（YouTubeの一年の振り返りのような機能）
       ★情報量の出し分けはしません。ライトでもヘビーでも同じ内容を見せます。
         「一年ぶんの事実」なので、隠す理由がないためです。 */
    recap: {
      year: 2026,
      from: "2026-12-01",          /* この期間だけTOPに入口を出す */
      to:   "2027-01-15",
      forceShow: true,             /* ★本番では false にする（今は確認用に常時表示） */
      modes: {
        short: { label: "サクッと版", sub: "15秒",  slideMs: 3000, note: "数字だけ、テンポ重視" },
        basic: { label: "じっくり版", sub: "約1分", slideMs: 6000, note: "理由と内訳つき" }
      }
    },

    /* 決済方法の表示色（赤・暖色系・シルバーで統一） */
    methodColor: {
      "1回払い": { fg: "#5c636b", bg: "#f1f3f5", bd: "#dfe3e8", short: "1回"  },
      "分割":    { fg: "#c2410c", bg: "#fff4ec", bd: "#ffd8bd", short: "分割" },
      "リボ":    { fg: "#bf0000", bg: "#fff0f0", bd: "#f3caca", short: "リボ" }
    },

    /* カテゴリの表示色（同上） */
    categoryColor: {
      "ショッピング":       "#bf0000",
      "光熱費":             "#e8590c",
      "医療":               "#d99a00",
      "交通費":             "#a8763e",
      "食費":               "#8a9099",
      "エンタメ":           "#c96a8e",
      "サブスクリプション": "#6f7680"
    }
  };

  /* ---------------------------------------------------------------------
     2. 明細データ（明細・家計簿・TOP がすべてこの配列を参照する）
     --------------------------------------------------------------------- */
  var MONTHS = [
    {
      key: "2026-06",
      label: "2026年6月",
      short: "6月",
      billingDate: "2026年6月30日",
      items: [
        { date: "2026-06-25", shop: "スーパーマルシェ",     category: "食費",               amount: 1200,  payment: "1回払い" },
        { date: "2026-06-25", shop: "タクシー北口",         category: "交通費",             amount: 860,   payment: "1回払い" },
        { date: "2026-06-24", shop: "NETストア",            category: "ショッピング",       amount: 9800,  payment: "分割"   },
        { date: "2026-06-24", shop: "シネマシティ",         category: "エンタメ",           amount: 1500,  payment: "1回払い" },
        { date: "2026-06-23", shop: "コンビニA",            category: "食費",               amount: 320,   payment: "1回払い" },
        { date: "2026-06-22", shop: "電力（公共料金）",     category: "光熱費",             amount: 8200,  payment: "リボ"   },
        { date: "2026-06-21", shop: "ドラッグH",            category: "医療",               amount: 2300,  payment: "1回払い" },
        { date: "2026-06-20", shop: "サブスクX",            category: "サブスクリプション", amount: 980,   payment: "1回払い" },
        { date: "2026-06-19", shop: "セレクトショップ",     category: "ショッピング",       amount: 14500, payment: "分割"   },
        { date: "2026-06-18", shop: "カフェB",              category: "食費",               amount: 760,   payment: "1回払い" },
        { date: "2026-06-17", shop: "地下鉄",               category: "交通費",             amount: 200,   payment: "1回払い" },
        { date: "2026-06-16", shop: "オンライン書店",       category: "ショッピング",       amount: 2400,  payment: "1回払い" },
        { date: "2026-06-15", shop: "ライブハウス",         category: "エンタメ",           amount: 4200,  payment: "分割"   },
        { date: "2026-06-14", shop: "コンビニC",            category: "食費",               amount: 450,   payment: "1回払い" },
        { date: "2026-06-13", shop: "ガソリンスタンド",     category: "交通費",             amount: 5600,  payment: "1回払い" },
        { date: "2026-06-12", shop: "家電量販店",           category: "ショッピング",       amount: 56000, payment: "分割"   },
        { date: "2026-06-11", shop: "飲食チェーン",         category: "食費",               amount: 2300,  payment: "1回払い" },
        { date: "2026-06-10", shop: "クリニックY",          category: "医療",               amount: 5400,  payment: "1回払い" },
        { date: "2026-06-09", shop: "配信サービス",         category: "サブスクリプション", amount: 1200,  payment: "1回払い" },
        { date: "2026-06-08", shop: "デパート",             category: "ショッピング",       amount: 19800, payment: "分割"   },
        { date: "2026-06-07", shop: "カフェD",              category: "食費",               amount: 980,   payment: "1回払い" },
        { date: "2026-06-06", shop: "バス路線",             category: "交通費",             amount: 210,   payment: "1回払い" },
        { date: "2026-06-05", shop: "通信会社",             category: "光熱費",             amount: 6700,  payment: "リボ"   },
        { date: "2026-06-04", shop: "薬局Z",                category: "医療",               amount: 1500,  payment: "1回払い" },
        { date: "2026-06-03", shop: "オンライン音楽",       category: "サブスクリプション", amount: 600,   payment: "1回払い" },
        { date: "2026-06-02", shop: "ファッションA",        category: "ショッピング",       amount: 12400, payment: "分割"   },
        { date: "2026-06-01", shop: "弁当屋",               category: "食費",               amount: 680,   payment: "1回払い" }
      ]
    },
    {
      key: "2026-05",
      label: "2026年5月",
      short: "5月",
      billingDate: "2026年5月29日",
      items: [
        { date: "2026-05-31", shop: "タクシー南口",     category: "交通費",             amount: 920,   payment: "1回払い" },
        { date: "2026-05-30", shop: "スーパーD",        category: "食費",               amount: 3450,  payment: "1回払い" },
        { date: "2026-05-29", shop: "ヘルスクリニック", category: "医療",               amount: 8800,  payment: "1回払い" },
        { date: "2026-05-28", shop: "家電レンタル",     category: "ショッピング",       amount: 7600,  payment: "分割"   },
        { date: "2026-05-27", shop: "カフェE",          category: "食費",               amount: 410,   payment: "1回払い" },
        { date: "2026-05-26", shop: "私鉄",             category: "交通費",             amount: 360,   payment: "1回払い" },
        { date: "2026-05-25", shop: "水道料金",         category: "光熱費",             amount: 4200,  payment: "リボ"   },
        { date: "2026-05-24", shop: "ドラッグM",        category: "医療",               amount: 2200,  payment: "1回払い" },
        { date: "2026-05-23", shop: "動画サブスク",     category: "サブスクリプション", amount: 1500,  payment: "1回払い" },
        { date: "2026-05-22", shop: "セレクトショップB",category: "ショッピング",       amount: 33200, payment: "分割"   },
        { date: "2026-05-21", shop: "弁当チェーン",     category: "食費",               amount: 780,   payment: "1回払い" },
        { date: "2026-05-20", shop: "市営バス",         category: "交通費",             amount: 210,   payment: "1回払い" },
        { date: "2026-05-19", shop: "電気ガス合算",     category: "光熱費",             amount: 10300, payment: "リボ"   },
        { date: "2026-05-18", shop: "クリニックZ",      category: "医療",               amount: 3200,  payment: "1回払い" },
        { date: "2026-05-17", shop: "オンラインゲーム", category: "サブスクリプション", amount: 850,   payment: "1回払い" },
        { date: "2026-05-16", shop: "アウトレット",     category: "ショッピング",       amount: 25500, payment: "分割"   },
        { date: "2026-05-15", shop: "コンビニF",        category: "食費",               amount: 290,   payment: "1回払い" },
        { date: "2026-05-14", shop: "レンタカー",       category: "交通費",             amount: 7200,  payment: "分割"   },
        { date: "2026-05-13", shop: "ガス会社",         category: "光熱費",             amount: 4300,  payment: "リボ"   },
        { date: "2026-05-12", shop: "病院X",            category: "医療",               amount: 15000, payment: "1回払い" },
        { date: "2026-05-11", shop: "サブスクPremium",  category: "サブスクリプション", amount: 2200,  payment: "1回払い" },
        { date: "2026-05-10", shop: "ネット通販",       category: "ショッピング",       amount: 8900,  payment: "分割"   },
        { date: "2026-05-09", shop: "カフェG",          category: "食費",               amount: 640,   payment: "1回払い" },
        { date: "2026-05-08", shop: "タクシー東口",     category: "交通費",             amount: 1130,  payment: "1回払い" },
        { date: "2026-05-07", shop: "家電B",            category: "ショッピング",       amount: 6800,  payment: "分割"   },
        { date: "2026-05-06", shop: "コンビニG",        category: "食費",               amount: 350,   payment: "1回払い" },
        { date: "2026-05-05", shop: "地下鉄南",         category: "交通費",             amount: 200,   payment: "1回払い" },
        { date: "2026-05-04", shop: "光熱合算",         category: "光熱費",             amount: 7800,  payment: "リボ"   },
        { date: "2026-05-03", shop: "薬局A",            category: "医療",               amount: 900,   payment: "1回払い" },
        { date: "2026-05-02", shop: "音楽配信",         category: "サブスクリプション", amount: 500,   payment: "1回払い" },
        { date: "2026-05-01", shop: "ブランド直営",     category: "ショッピング",       amount: 45200, payment: "分割"   }
      ]
    }
  ];

  /* 明細を持たない過去月（推移グラフ用のサマリのみ） */
  var PAST_SUMMARY = [{ short: "4月", total: 98000 }];

  /* ---------------------------------------------------------------------
     3. キャンペーンデータ
     ★ campaign.html（松本さんの画面）の内容をそのまま写したものです。
       画面が正で、ここはTOP画面などから参照するための写しです。
       キャンペーンを増やすときは campaign.html と両方直してください。
     --------------------------------------------------------------------- */
  var CAMPAIGNS = [
    /* 旅行 */
    { genre: "旅行",         store: "ホテル海風", rate: 25, to: "2026-07-31", featured: true,
      url: "https://hotel.travel.rakuten.co.jp/hotelinfo/plan/151369?f_campaign=sd260806A_kyu" },
    { genre: "旅行",         store: "旅館つばき", rate: 15, to: "2026-07-31",
      url: "https://hotel.travel.rakuten.co.jp/hinfo/163065/?f_campaign=sd260806A_kyu" },
    { genre: "旅行",         store: "ホテル月見", rate: 10, to: "2026-09-30",
      url: "https://hotel.travel.rakuten.co.jp/hotelinfo/plan/9217?f_campaign=sd260806A_kyu" },
    { genre: "旅行",         store: "スカイツアーズ", rate:  7, to: "2026-09-15",
      url: "https://hotel.travel.rakuten.co.jp/hotelinfo/plan/178484?f_campaign=sd260806A_kyu" },
    { genre: "旅行",         store: "湯宿しらかば", rate:  5, to: "2026-08-10",
      url: "https://hotel.travel.rakuten.co.jp/hotelinfo/plan/184617?f_campaign=sd260806A_kyu" },

    /* ショッピング */
    { genre: "ショッピング", store: "まるみ百貨店",   rate: 15, to: "2026-12-25", url: "https://zozo.jp/" },
    { genre: "ショッピング", store: "家電のヤマオカ",   rate: 12, to: "2026-11-30", url: "https://zozo.jp/" },
    { genre: "ショッピング", store: "アパレルモモ",   rate:  8, to: "2026-10-15",
      url: "https://hotel.travel.rakuten.co.jp/hinfo/163065/?f_campaign=sd260806A_kyu" },
    { genre: "ショッピング", store: "雑貨のみどり",   rate:  6, to: "2026-08-20", featured: true,
      url: "https://zozo.jp/" },
    { genre: "ショッピング", store: "書店 文庫堂",   rate:  2, to: "2027-01-31", url: "https://zozo.jp/" },

    /* グルメ */
    { genre: "グルメ",       store: "うなぎ処 川治",    rate: 20, to: "2026-07-20", featured: true,
      url: "https://search.rakuten.co.jp/rat-redirect?dest=https%3A%2F%2Fitem.rakuten.co.jp%2Ff152021-nagaoka%2F75-n101%2F&redirectproxy=1" },
    { genre: "グルメ",       store: "産直市場のうか",    rate: 10, to: "2026-10-05",
      url: "https://search.rakuten.co.jp/rat-redirect?dest=https%3A%2F%2Fitem.rakuten.co.jp%2Fexception5251%2Fex-x01028%2F&redirectproxy=1" },
    { genre: "グルメ",       store: "カフェソレイユ",    rate:  5, to: "2026-08-31",
      url: "https://search.rakuten.co.jp/rat-redirect?dest=https%3A%2F%2Fgrp07.ias.rakuten.co.jp%2F&redirectproxy=1" },
    { genre: "グルメ",       store: "精肉のまつばら",    rate:  4, to: "2026-09-01",
      url: "https://search.rakuten.co.jp/rat-redirect?dest=https%3A%2F%2Fitem.rakuten.co.jp%2Fexception5251%2Fex-x01028%2F&redirectproxy=1" },
    { genre: "グルメ",       store: "スイーツ工房ハル",    rate:  3, to: "2026-12-31",
      url: "https://search.rakuten.co.jp/rat-redirect?dest=https%3A%2F%2Fitem.rakuten.co.jp%2Ff152021-nagaoka%2F75-n101%2F&redirectproxy=1" }
  ];

  /* キャンペーン画面のジャンルは 旅行／ショッピング／グルメ の3つ。
     明細のカテゴリ（ショッピング・食費…）とは別軸なので、対応表で結ぶ。 */
  var GENRE_FROM_CATEGORY = {
    "ショッピング": "ショッピング",
    "食費": "グルメ",
    "交通費": "旅行",
    "エンタメ": "グルメ"
  };

  /* ---------------------------------------------------------------------
     3b. 年間データ（年末サマリー用）
     5月・6月は実際の明細から、それ以外の月は仮の値です。
     実データが増えたら months の total を差し替えてください。
     --------------------------------------------------------------------- */
  var YEAR = {
    year: 2026,
    prevTotal: 1642000,                 /* 前年の年間利用額（仮） */
    months: [
      { short: "1月",  total: 132400 },
      { short: "2月",  total:  88900 },
      { short: "3月",  total: 176300 },
      { short: "4月",  total:  98000 },
      { short: "5月",  total: 204890 },  /* 実データ */
      { short: "6月",  total: 161040 },  /* 実データ */
      { short: "7月",  total: 143600 },
      { short: "8月",  total: 219700 },
      { short: "9月",  total: 112300 },
      { short: "10月", total: 154800 },
      { short: "11月", total: 168500 },
      { short: "12月", total: 197200 }
    ],
    categories: [
      { key: "ショッピング",       amount: 1286400 },
      { key: "光熱費",             amount:  178900 },
      { key: "医療",               amount:   96200 },
      { key: "交通費",             amount:   92300 },
      { key: "食費",               amount:   88700 },
      { key: "エンタメ",           amount:   66300 },
      { key: "サブスクリプション", amount:   48830 }
    ],
    shops: [
      { name: "楽天市場",     amount: 342800, count: 48 },
      { name: "家電量販店",   amount: 186000, count:  5 },
      { name: "デパート",     amount: 121400, count:  9 },
      { name: "楽天トラベル", amount:  98000, count:  1 },
      { name: "スーパーマルシェ", amount: 62300, count: 71 }
    ],
    methods: [
      { key: "分割",    amount: 1038400 },
      { key: "1回払い", amount:  612300 },
      { key: "リボ",    amount:  206930 }
    ],
    biggest: { shop: "楽天トラベル", amount: 98000, date: "2026-08-03", method: "分割" },
    fee: 38400,                          /* 年間の支払手数料（仮） */
    count: 341,                          /* 年間の利用回数 */
    topWeekday: "土曜日",
    topHour: "21時台",
    points: { earned: 18760, campaign: 4320, used: 12000, expired: 380 }
  };

  /* ---------------------------------------------------------------------
     4. キャラクターごとの口調
     チャットボットの文言と、家計簿のマスコットのセリフをここで一括管理します。
     --------------------------------------------------------------------- */
  var TALK = {
    normal: {
      greet: "こんにちは。この画面についてお手伝いできます。下から選ぶか、そのままご相談ください。",
      ack:   function (q) { return "「" + q + "」ですね。お調べします。少々お待ちください。"; },
      mascot: {
        idle:   "日付を押すと、その日の詳細が見られるよ。",
        notice: "枠の{rate}%まで来たよ。ここからは気をつけてね。",
        danger: "枠の{rate}%だよ。今月はここまでにしておこうね。",
        back:   "カレンダーに戻ったよ。",
        added:  "手動の支払いを記録したよ。"
      },
      recap: {
        open:  "2026年、おつかれさまでした。1年ぶんをまとめました。",
        close: "来年も、いっしょにお買いものしようね。"
      }
    },
    menhera: {
      greet: "……来てくれたんだ。ちゃんと待ってたよ。なんでも聞いて、ね？　わたししかいないでしょ？",
      ack:   function (q) { return "「" + q + "」……そんなこと聞くんだ。いいよ、調べる。わたしのことは気にしないで。"; },
      mascot: {
        idle:   "……ねえ、日付、押してくれないの？　ずっと待ってるんだけど。",
        notice: "枠の{rate}%……ねえ、それってわたしのせいじゃないよね？　ねえ。",
        danger: "枠の{rate}%だよ。もう無理。どうして止めてくれなかったの？　ねえ、聞いてる？",
        back:   "……戻ってきてくれたんだ。もう行かないでね。",
        added:  "記録したよ。全部おぼえてるから。ぜんぶ。"
      },
      recap: {
        open:  "……1年、ずっと見てたよ。ぜんぶ覚えてる。見せてあげる。",
        close: "来年も、わたしのそばにいてくれるよね。ね？"
      }
    },
    gal: {
      greet: "やっほ〜！ 今日もお買い物する感じ？ なんでも聞いて、マジで秒で調べるから〜！",
      ack:   function (q) { return "「" + q + "」ね、りょ〜かい！ ちょい待ってて、秒で出すわ〜！"; },
      mascot: {
        idle:   "日付タップしてみ？ その日の使ったやつ全部見れるから〜！",
        notice: "ちょ、枠の{rate}%いってるんだけど！ まあまだイケるっしょ、知らんけど！",
        danger: "え、{rate}%!? やば、それはさすがにヤバみ〜！ 一回落ち着こ？ ね？",
        back:   "カレンダー戻ってきた〜！ おかえり〜！",
        added:  "追加しといたよ〜！ えらい、ちゃんとつけてるじゃん！"
      },
      recap: {
        open:  "2026年おつかれ〜！ 1年分まとめたから見て見て〜！",
        close: "来年もいっぱい使お〜！ ……いや、ほどほどにね！"
      }
    },
    stoic: {
      greet: "用件を述べよ。数字は嘘をつかない。最短で答える。",
      ack:   function (q) { return "「" + q + "」。承知した。確認する。"; },
      mascot: {
        idle:   "日付を押せ。記録を見ろ。話はそれからだ。",
        notice: "利用率{rate}%。まだ折り返しではない。ここからが本番だ。気を抜くな。",
        danger: "利用率{rate}%。限界が近い。今月の追加支出は認めない。以上。",
        back:   "戻った。次に行くぞ。",
        added:  "記録した。継続しろ。それだけが力になる。"
      },
      recap: {
        open:  "2026年の記録を提示する。目を逸らすな。",
        close: "数字は残った。来年はこれを超えろ。"
      }
    }
  };

  /* ---------------------------------------------------------------------
     5. 計算ヘルパー
     --------------------------------------------------------------------- */
  function yen(n) { return "¥" + Number(n).toLocaleString("ja-JP"); }

  function monthByKey(key) {
    for (var i = 0; i < MONTHS.length; i++) { if (MONTHS[i].key === key) return MONTHS[i]; }
    return MONTHS[0];
  }

  function total(items) {
    return items.reduce(function (s, x) { return s + x.amount; }, 0);
  }

  function groupSum(items, field) {
    var map = {};
    items.forEach(function (x) { map[x[field]] = (map[x[field]] || 0) + x.amount; });
    return Object.keys(map)
      .map(function (k) { return { key: k, amount: map[k] }; })
      .sort(function (a, b) { return b.amount - a.amount; });
  }

  /* 利用率とアラート段階を返す */
  function usage(monthKey) {
    var m = monthByKey(monthKey || MONTHS[0].key);
    var t = total(m.items);
    var rate = Math.round((t / CONST.limit) * 1000) / 10;
    var level = "safe";
    if (rate >= CONST.alert.warn) level = "danger";
    else if (rate >= CONST.alert.notice) level = "notice";
    return {
      month: m, used: t, rate: rate, level: level,
      remaining: Math.max(CONST.limit - t, 0),
      limit: CONST.limit, count: m.items.length
    };
  }

  function daysUntil(dateStr) {
    var a = new Date(CONST.today + "T00:00:00");
    var b = new Date(dateStr + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  /* 1日あたりの利用額。セキュリティ画面の上限超過判定に使う */
  function dailyTotals(monthKey) {
    var m = monthByKey(monthKey || MONTHS[0].key);
    var map = {};
    m.items.forEach(function (x) { map[x.date] = (map[x.date] || 0) + x.amount; });
    return map;
  }

  /* 直近で1日の通知上限を超えた日 */
  function lastOverLimitDay(monthKey) {
    var map = dailyTotals(monthKey);
    var hit = Object.keys(map)
      .filter(function (d) { return map[d] > CONST.dailyNotifyLimit; })
      .sort()
      .pop();
    return hit ? { date: hit, amount: map[hit] } : null;
  }

  /* 家計簿用：日付をキーにした明細マップ */
  function byDate(monthKey) {
    var m = monthByKey(monthKey || MONTHS[0].key);
    var map = {};
    m.items.forEach(function (x) {
      (map[x.date] = map[x.date] || []).push(x);
    });
    return map;
  }

  /* ユーザーがよく使うカテゴリ（キャンペーンのレコメンドに使う） */
  function topCategory(monthKey) {
    var g = groupSum(monthByKey(monthKey || MONTHS[0].key).items, "category");
    return g.length ? g[0].key : null;
  }

  /* 明細でいちばん使ったカテゴリを、キャンペーン画面のジャンルに読み替える */
  function topGenre(monthKey) {
    var g = groupSum(monthByKey(monthKey || MONTHS[0].key).items, "category");
    for (var i = 0; i < g.length; i++) {
      if (GENRE_FROM_CATEGORY[g[i].key]) return GENRE_FROM_CATEGORY[g[i].key];
    }
    return "ショッピング";
  }

  /* 推移グラフ用（古い月→新しい月の順） */
  function trend() {
    var out = PAST_SUMMARY.slice();
    for (var i = MONTHS.length - 1; i >= 0; i--) {
      out.push({ short: MONTHS[i].short, total: total(MONTHS[i].items) });
    }
    return out;
  }


  /* --- 年末サマリー --- */

  /* 年末サマリーを出す時期かどうか（本番は forceShow を false にする） */
  function isRecapSeason() {
    var r = CONST.recap;
    if (r.forceShow) return true;
    return CONST.today >= r.from && CONST.today <= r.to;
  }

  /* サマリーに出す数字をまとめて計算する */
  function recapStats() {
    var y = YEAR;
    var total = y.months.reduce(function (s, m) { return s + m.total; }, 0);
    var best  = y.months.slice().sort(function (a, b) { return b.total - a.total; })[0];
    var quiet = y.months.slice().sort(function (a, b) { return a.total - b.total; })[0];
    var diff  = total - y.prevTotal;
    var topCat = y.categories[0];
    var revolving = y.methods.filter(function (m) { return m.key !== "1回払い"; })
                            .reduce(function (s, m) { return s + m.amount; }, 0);

    /* タイプ診断：分割・リボの比率とカテゴリの偏りで決める */
    var revoRate = revolving / total;
    var catRate  = topCat.amount / total;
    var type, typeNote;
    if (revoRate >= 0.6) {
      type = "じっくり分割派";
      typeNote = "大きい買いものを月々に分けるのが上手。手数料だけ気にしておこう。";
    } else if (catRate >= 0.6) {
      type = topCat.key + "マスター";
      typeNote = "支出の" + Math.round(catRate * 100) + "%が" + topCat.key + "。好きなものがはっきりしてる。";
    } else if (y.count >= 300) {
      type = "こまめ使い派";
      typeNote = "1年で" + y.count + "回。日常のすみずみでカードを使いこなしてる。";
    } else {
      type = "バランス型";
      typeNote = "使いどころが偏っていない、安定したお買いもの。";
    }

    return {
      year: y.year, total: total, prev: y.prevTotal, diff: diff,
      diffRate: Math.round((diff / y.prevTotal) * 1000) / 10,
      months: y.months, best: best, quiet: quiet,
      categories: y.categories, catRate: Math.round(catRate * 1000) / 10,
      shops: y.shops, methods: y.methods, revolving: revolving,
      revoRate: Math.round(revoRate * 1000) / 10,
      biggest: y.biggest, fee: y.fee, count: y.count,
      avgPerUse: Math.round(total / y.count),
      topWeekday: y.topWeekday, topHour: y.topHour,
      points: y.points, type: type, typeNote: typeNote
    };
  }

  global.APP = {
    C: CONST, MONTHS: MONTHS, CAMPAIGNS: CAMPAIGNS, PAST_SUMMARY: PAST_SUMMARY, TALK: TALK, YEAR: YEAR, GENRE_FROM_CATEGORY: GENRE_FROM_CATEGORY,
    yen: yen, monthByKey: monthByKey, total: total, groupSum: groupSum,
    usage: usage, daysUntil: daysUntil, dailyTotals: dailyTotals,
    lastOverLimitDay: lastOverLimitDay, byDate: byDate,
    topCategory: topCategory, topGenre: topGenre, trend: trend,
    isRecapSeason: isRecapSeason, recapStats: recapStats
  };
})(window);
