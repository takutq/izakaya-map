import { NextRequest, NextResponse } from "next/server";
import { calculateDistanceKm } from "@/types/izakaya";

export interface PlaceCandidate {
  id: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  suggestedGenres?: string[];
  suggestedSpecialty?: string;
  distanceKm?: number;
  source?: "ai" | "curated" | "osm_izakaya";
}

// APIキーや通信状況に関わらず即座に100%の精度で特定できる代表的な名酒場辞書
const CURATED_FAMOUS_IZAKAYAS: Omit<PlaceCandidate, "id" | "source">[] = [
  {
    name: "魚三酒場 富岡店",
    area: "門前仲町",
    address: "東京都江東区富岡1-5-4",
    lat: 35.67198,
    lng: 139.79796,
    suggestedGenres: ["海鮮", "大衆酒場", "日本酒"],
    suggestedSpecialty: "本まぐろ中落ち・ぶり刺し・あら煮（名物おつゆ）",
  },
  {
    name: "魚三酒場 新小岩店",
    area: "新小岩",
    address: "東京都葛飾区新小岩2-8-4",
    lat: 35.71552,
    lng: 139.85885,
    suggestedGenres: ["海鮮", "大衆酒場", "日本酒"],
    suggestedSpecialty: "鮮魚刺し盛り・天ぷら・あら煮",
  },
  {
    name: "もつ焼き 大坂屋",
    area: "門前仲町",
    address: "東京都江東区門前仲町2-9-12",
    lat: 35.67205,
    lng: 139.79558,
    suggestedGenres: ["もつ焼き", "やきとん", "煮込み", "大衆酒場"],
    suggestedSpecialty: "牛にこみ・串5本盛り・梅割り",
  },
  {
    name: "岸田屋",
    area: "月島",
    address: "東京都中央区月島3-15-12",
    lat: 35.66346,
    lng: 139.78223,
    suggestedGenres: ["大衆酒場", "煮込み", "海鮮"],
    suggestedSpecialty: "牛にこみ（ネギ増し）・肉豆腐・ぬた",
  },
  {
    name: "山利喜 本館",
    area: "森下",
    address: "東京都江東区森下2-18-8",
    lat: 35.68788,
    lng: 139.79886,
    suggestedGenres: ["大衆酒場", "煮込み", "やきとん"],
    suggestedSpecialty: "煮込み玉子入り＋ガーリックトースト・やきとん",
  },
  {
    name: "北千住 大はし",
    area: "北千住",
    address: "東京都足立区千住3-46",
    lat: 35.74954,
    lng: 139.80302,
    suggestedGenres: ["大衆酒場", "煮込み", "海鮮"],
    suggestedSpecialty: "肉とうふ・牛にこみ・梅割り",
  },
  {
    name: "斎藤酒場",
    area: "十条",
    address: "東京都北区上十条2-30-13",
    lat: 35.76092,
    lng: 139.72195,
    suggestedGenres: ["大衆酒場", "煮込み", "海鮮"],
    suggestedSpecialty: "カレーコロッケ・串カツ・まぐろ刺し",
  },
  {
    name: "宇ち多゛（うちだ）",
    area: "立石",
    address: "東京都葛飾区立石1-18-8",
    lat: 35.73795,
    lng: 139.84828,
    suggestedGenres: ["もつ焼き", "やきとん", "煮込み", "大衆酒場"],
    suggestedSpecialty: "シンキ（テッポウ・コブクロ）・カシラ素焼きお酢・梅割り",
  },
  {
    name: "秋元屋",
    area: "野方",
    address: "東京都中野区野方5-28-3",
    lat: 35.71962,
    lng: 139.65315,
    suggestedGenres: ["やきとん", "もつ焼き", "大衆酒場"],
    suggestedSpecialty: "味噌ダレやきとん・肉巻きトマト・シャリキンホッピー",
  },
  {
    name: "やきとん ひなた 大山店",
    area: "大山",
    address: "東京都板橋区大山町8-8",
    lat: 35.74842,
    lng: 139.70241,
    suggestedGenres: ["やきとん", "もつ焼き", "大衆酒場"],
    suggestedSpecialty: "たん・てっぽう・網れば・パテドカンパーニュ",
  },
  {
    name: "大統領 本店",
    area: "上野",
    address: "東京都台東区上野6-10-14",
    lat: 35.70978,
    lng: 139.77462,
    suggestedGenres: ["もつ焼き", "大衆酒場", "煮込み"],
    suggestedSpecialty: "大統領特製もつ煮込み・もつ焼き盛り合わせ",
  },
  {
    name: "立飲み たきおか",
    area: "上野",
    address: "東京都台東区上野6-9-14",
    lat: 35.70998,
    lng: 139.77512,
    suggestedGenres: ["立ち飲み", "大衆酒場", "煮込み"],
    suggestedSpecialty: "牛煮込み・ハムカツ・大瓶ビール",
  },
  {
    name: "立飲み カドクラ",
    area: "上野",
    address: "東京都台東区上野6-13-1",
    lat: 35.71022,
    lng: 139.77485,
    suggestedGenres: ["立ち飲み", "大衆酒場"],
    suggestedSpecialty: "名物ハムカツ（チーズ入り）・鉄板ホルモン",
  },
  {
    name: "肉の大山 上野店",
    area: "上野",
    address: "東京都台東区上野6-13-2",
    lat: 35.71015,
    lng: 139.77478,
    suggestedGenres: ["立ち飲み", "大衆酒場"],
    suggestedSpecialty: "やみつきメンチ・特製メンチカツ・生ビール",
  },
  {
    name: "晩杯屋 門前仲町店",
    area: "門前仲町",
    address: "東京都江東区富岡1-6-6",
    lat: 35.67181,
    lng: 139.79621,
    suggestedGenres: ["立ち飲み", "やきとん", "海鮮"],
    suggestedSpecialty: "煮込み・納豆オムレツ・ゴールデンチュウハイ",
  },
  {
    name: "折原商店",
    area: "門前仲町",
    address: "東京都江東区富岡1-13-11",
    lat: 35.67311,
    lng: 139.79681,
    suggestedGenres: ["角打ち", "立ち飲み", "日本酒", "おでん"],
    suggestedSpecialty: "全国の地酒グラス量り売り・玉こんにゃく・おでん",
  },
  {
    name: "だるま",
    area: "門前仲町・清澄白河",
    address: "東京都江東区三好2-17-9",
    lat: 35.68062,
    lng: 139.80115,
    suggestedGenres: ["大衆酒場", "海鮮", "煮込み"],
    suggestedSpecialty: "ポパイベーコン・牛にこみ・鮮魚刺し",
  },
  {
    name: "みますや",
    area: "淡路町・神田",
    address: "東京都千代田区神田司町2-15-2",
    lat: 35.69554,
    lng: 139.76762,
    suggestedGenres: ["大衆酒場", "海鮮", "煮込み", "日本酒"],
    suggestedSpecialty: "さくら刺し（馬刺し）・どじょう丸煮・こはだ酢",
  },
  {
    name: "鍵屋",
    area: "鶯谷・根岸",
    address: "東京都台東区根岸3-6-23-18",
    lat: 35.72245,
    lng: 139.77985,
    suggestedGenres: ["大衆酒場", "日本酒", "焼き鳥"],
    suggestedSpecialty: "くりから焼き・たたみいわし・とりもつ鍋・菊正宗樽酒",
  },
  {
    name: "伊勢藤",
    area: "神楽坂",
    address: "東京都新宿区神楽坂4-2",
    lat: 35.70215,
    lng: 139.73952,
    suggestedGenres: ["大衆酒場", "日本酒"],
    suggestedSpecialty: "白鷹（燗酒）・一汁四菜セット・くさや",
  },
];

interface NominatimItem {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  extratags?: Record<string, string>;
  address?: {
    amenity?: string;
    shop?: string;
    suburb?: string;
    quarter?: string;
    neighbourhood?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    ward?: string;
    county?: string;
    state?: string;
    road?: string;
    house_number?: string;
  };
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const EXCLUDE_TYPES = new Set([
  "station",
  "halt",
  "subway_entrance",
  "bus_stop",
  "convenience",
  "supermarket",
  "clothes",
  "hairdresser",
  "school",
  "hospital",
  "clinic",
  "pharmacy",
  "bank",
  "atm",
  "post_office",
  "parking",
  "fuel",
  "hotel",
  "apartment",
  "office",
  "place_of_worship",
  "administrative",
]);

const IZAKAYA_POSITIVE_TYPES = new Set([
  "bar",
  "pub",
  "restaurant",
  "izakaya",
  "biergarten",
  "food_court",
  "fast_food",
  "alcohol",
  "wine",
  "beverages",
  "butcher",
  "seafood",
]);

const IZAKAYA_NAME_KEYWORDS = [
  "酒場",
  "居酒屋",
  "立呑",
  "立ち飲み",
  "立ち呑み",
  "やきとん",
  "もつ焼",
  "焼鳥",
  "焼き鳥",
  "角打ち",
  "食堂",
  "水産",
  "屋",
  "亭",
  "軒",
  "酒",
  "ホルモン",
  "串",
  "バル",
  "おでん",
  "煮込",
  "中華",
];

function inferGenresFromText(text: string): string[] {
  const genres: string[] = [];
  if (/やきとん|ヤキトン/.test(text)) genres.push("やきとん");
  if (/もつ焼|モツ焼|ホルモン/.test(text)) genres.push("もつ焼き");
  if (/立呑|立ち飲み|立ち呑み|スタンディング/.test(text))
    genres.push("立ち飲み");
  if (/魚|鮮魚|水産|海鮮|刺|寿司|まぐろ/.test(text)) genres.push("海鮮");
  if (/角打ち|酒店|酒販|折原/.test(text)) genres.push("角打ち");
  if (/焼鳥|焼き鳥|やきとり|鳥/.test(text)) genres.push("焼き鳥");
  if (/中華|餃子|来集軒|ラーメン/.test(text)) genres.push("町中華");
  if (/煮込|にこみ/.test(text)) genres.push("煮込み");
  if (/おでん/.test(text)) genres.push("おでん");
  if (/日本酒|地酒|吟醸/.test(text)) genres.push("日本酒");
  if (/ビール|クラフト|麦酒/.test(text)) genres.push("クラフトビール");
  if (genres.length === 0) genres.push("大衆酒場");
  return genres;
}

function formatJapaneseAddress(
  item: NominatimItem,
  fallbackQuery: string
): {
  shopName: string;
  area: string;
  address: string;
} {
  const segments = item.display_name
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !/^\d{3}-?\d{4}$/.test(s) && s !== "日本");

  const addr = item.address;
  const shopName =
    item.name?.trim() ||
    addr?.amenity ||
    addr?.shop ||
    segments[0] ||
    fallbackQuery;

  if (!addr) {
    return {
      shopName,
      area: segments[1] || segments[0] || "",
      address: segments.slice(0, 4).reverse().join(" "),
    };
  }

  const rawArea =
    addr.neighbourhood ||
    addr.quarter ||
    addr.suburb ||
    addr.city_district ||
    addr.ward ||
    addr.town ||
    addr.city ||
    "";
  const cleanArea = rawArea.replace(/[一二三四五六七八九十0-9０-９]+丁目$/, "");

  const prefecture = addr.state || "";
  const cityOrWard =
    addr.city || addr.ward || addr.county || addr.town || addr.village || "";
  const town = addr.suburb || addr.quarter || addr.neighbourhood || "";
  const block = [addr.road, addr.house_number].filter(Boolean).join(" ");

  const fullAddress = [prefecture, cityOrWard, town, block]
    .filter(Boolean)
    .join("");

  return {
    shopName,
    area: cleanArea || rawArea,
    address: fullAddress || segments.slice(0, 4).reverse().join(" "),
  };
}

/**
 * Gemini API / Vertex AI Express API キーを使って実在居酒屋を特定
 */
async function searchIzakayaWithGeminiAI(
  query: string,
  customApiKey?: string | null
): Promise<PlaceCandidate[]> {
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  const prompt = `あなたは日本の居酒屋・赤ちょうちん・大衆酒場・立ち飲み・町中華の専門データベースAIです。
ユーザーが入力した検索キーワード「${query}」に一致する、日本国内の実在する居酒屋・酒場・飲食店のみを最大5件特定し、以下のJSON配列形式で出力してください。
居酒屋・飲食店以外の施設（駅、ビル、コンビニ、一般企業など）は絶対に含めないでください。

出力フォーマット（JSONのみ、マークダウンコードブロック不要）:
[
  {
    "name": "正確な店舗名（支店名含む）",
    "area": "最寄り駅名またはエリア名（例：門前仲町、上野）",
    "address": "都道府県から始まる正確な住所",
    "lat": 35.67198,
    "lng": 139.79796,
    "suggestedGenres": ["海鮮", "大衆酒場"],
    "suggestedSpecialty": "代表的な名物メニュー・酒（20〜40文字程度）"
  }
]`;

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`,
    `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(2500),
      });

      if (!res.ok) continue;
      const json = await res.json();
      const rawText: string =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed) || parsed.length === 0) continue;

      return parsed
        .filter((item) => item && item.name && item.lat && item.lng)
        .map((item, idx) => ({
          id: `ai-${idx}-${Date.now()}`,
          name: String(item.name),
          area: String(item.area || ""),
          address: String(item.address || ""),
          lat: Number(parseFloat(String(item.lat)).toFixed(6)),
          lng: Number(parseFloat(String(item.lng)).toFixed(6)),
          suggestedGenres: Array.isArray(item.suggestedGenres)
            ? item.suggestedGenres.map(String)
            : inferGenresFromText(
                `${item.name} ${item.suggestedSpecialty || ""}`
              ),
          suggestedSpecialty: item.suggestedSpecialty
            ? String(item.suggestedSpecialty)
            : undefined,
          source: "ai" as const,
        }));
    } catch {
      // try next endpoint
    }
  }

  return [];
}

/**
 * Overpass API で日本国内の居酒屋・バー・パブ・飲食店タグを持つPOIのみを直接検索
 */
async function searchOverpassIzakaya(
  keyword: string
): Promise<PlaceCandidate[]> {
  const safeKw = keyword.replace(/["\\]/g, "").trim();
  if (!safeKw) return [];

  const overpassQuery = `[out:json][timeout:4];
(
  nwr["amenity"~"^(izakaya|bar|pub|restaurant|biergarten)$"]["name"~"${safeKw}"](24.0,122.0,46.0,146.0);
);
out center 10;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(1800),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    const elements = data.elements ?? [];

    return elements
      .map((el): PlaceCandidate | null => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const tags = el.tags ?? {};
        if (!lat || !lon || !tags.name) return null;

        const pref = tags["addr:province"] || tags["addr:state"] || "";
        const city =
          tags["addr:city"] ||
          tags["addr:ward"] ||
          tags["addr:suburb"] ||
          tags["addr:district"] ||
          "";
        const quarter =
          tags["addr:quarter"] ||
          tags["addr:neighbourhood"] ||
          tags["addr:street"] ||
          "";
        const num =
          tags["addr:block_number"] || tags["addr:housenumber"] || "";
        const address = [pref, city, quarter, num].filter(Boolean).join("");
        const area =
          quarter.replace(/[一二三四五六七八九十0-9０-９]+丁目$/, "") ||
          city ||
          "";

        return {
          id: `ovp-${el.id}`,
          name: tags.name,
          area,
          address: address || area,
          lat: Number(lat.toFixed(6)),
          lng: Number(lon.toFixed(6)),
          suggestedGenres: inferGenresFromText(
            `${tags.name} ${tags.cuisine || ""} ${tags.amenity || ""}`
          ),
          source: "osm_izakaya",
        };
      })
      .filter((x): x is PlaceCandidate => x !== null);
  } catch {
    return [];
  }
}

async function fetchNominatim(q: string): Promise<NominatimItem[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("countrycodes", "jp");
  url.searchParams.set("limit", "20");
  url.searchParams.set("accept-language", "ja");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "IzakayaKaitakuMapApp/1.0 (local-pwa)",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];
  return (await res.json()) as NominatimItem[];
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const refLat = parseFloat(request.nextUrl.searchParams.get("lat") || "");
  const refLng = parseFloat(request.nextUrl.searchParams.get("lng") || "");
  const hasRefCoords = !Number.isNaN(refLat) && !Number.isNaN(refLng);

  const headerKey = request.headers.get("x-gemini-api-key");
  const hasAiKey = Boolean(
    headerKey?.trim() || process.env.GEMINI_API_KEY?.trim()
  );

  if (!q || q.length < 2) {
    return NextResponse.json({ candidates: [], aiEnabled: hasAiKey });
  }

  try {
    const keywords = q.split(/[\s　]+/).filter(Boolean);
    const primaryKeyword = keywords[0];

    // 0. 内蔵名酒場辞書からの即時一致チェック
    const curatedMatches: PlaceCandidate[] = CURATED_FAMOUS_IZAKAYAS.filter(
      (item) => {
        const hay = `${item.name} ${item.area} ${item.address}`.toLowerCase();
        return keywords.every((kw) => hay.includes(kw.toLowerCase()));
      }
    ).map((item, idx) => ({
      ...item,
      id: `curated-${idx}`,
      source: "curated" as const,
    }));

    // 1. Gemini AI 特定 ＋ Overpass 飲食店専用検索 ＋ Nominatim 検索を並列実行
    const [aiResults, overpassResults, rawDirect] = await Promise.all([
      searchIzakayaWithGeminiAI(q, headerKey),
      searchOverpassIzakaya(primaryKeyword),
      fetchNominatim(q),
    ]);

    // 2. Nominatim 結果を居酒屋・飲食店のみに厳格フィルタリング
    const seenCoords = new Set<string>();
    const osmCandidates: { candidate: PlaceCandidate; score: number }[] = [];

    for (const item of rawDirect) {
      const itemType = (item.type || "").toLowerCase();
      const itemClass = (item.class || "").toLowerCase();
      const cuisine = (item.extratags?.cuisine || "").toLowerCase();

      if (
        EXCLUDE_TYPES.has(itemType) ||
        itemClass === "railway" ||
        itemClass === "highway" ||
        itemClass === "boundary" ||
        itemClass === "landuse"
      ) {
        continue;
      }

      const { shopName, area, address } = formatJapaneseAddress(item, q);
      const fullText = `${shopName} ${item.display_name} ${cuisine}`;

      if (!fullText.toLowerCase().includes(primaryKeyword.toLowerCase())) {
        continue;
      }

      const isPositiveCategory =
        IZAKAYA_POSITIVE_TYPES.has(itemType) ||
        itemClass === "amenity" ||
        Boolean(item.address?.amenity);
      const hasIzakayaKeyword = IZAKAYA_NAME_KEYWORDS.some((kw) =>
        fullText.includes(kw)
      );

      if (!isPositiveCategory && !hasIzakayaKeyword) {
        continue;
      }

      const latNum = Number(parseFloat(item.lat).toFixed(6));
      const lngNum = Number(parseFloat(item.lon).toFixed(6));
      const coordKey = `${latNum.toFixed(4)},${lngNum.toFixed(4)}`;
      if (seenCoords.has(coordKey)) continue;
      seenCoords.add(coordKey);

      let score = 0;
      if (itemType === "izakaya" || itemType === "bar" || itemType === "pub")
        score += 50;
      if (itemType === "restaurant") score += 35;
      if (cuisine.includes("izakaya") || cuisine.includes("japanese"))
        score += 30;
      if (hasIzakayaKeyword) score += 25;
      if (shopName.includes(primaryKeyword)) score += 30;

      const distKm = hasRefCoords
        ? calculateDistanceKm(refLat, refLng, latNum, lngNum)
        : undefined;
      if (distKm !== undefined) {
        if (distKm < 5) score += 40;
        else if (distKm < 20) score += 25;
        else if (distKm < 50) score += 10;
      }

      osmCandidates.push({
        score,
        candidate: {
          id: String(item.place_id),
          name: shopName,
          area,
          address,
          lat: latNum,
          lng: lngNum,
          distanceKm: distKm,
          suggestedGenres: inferGenresFromText(fullText),
          source: "osm_izakaya",
        },
      });
    }

    osmCandidates.sort((a, b) => b.score - a.score);

    // AI結果 → 名酒場辞書 → Overpass飲食店 → Nominatim居酒屋 の順で統合し、近い順に微調整
    const merged: PlaceCandidate[] = [];
    const pushUnique = (cand: PlaceCandidate) => {
      const isDup = merged.some(
        (m) =>
          Math.abs(m.lat - cand.lat) < 0.0008 &&
          Math.abs(m.lng - cand.lng) < 0.0008
      );
      if (!isDup && merged.length < 10) {
        merged.push({
          ...cand,
          distanceKm:
            cand.distanceKm ??
            (hasRefCoords
              ? calculateDistanceKm(refLat, refLng, cand.lat, cand.lng)
              : undefined),
        });
      }
    };

    aiResults.forEach(pushUnique);
    curatedMatches.forEach(pushUnique);
    overpassResults.forEach(pushUnique);
    osmCandidates.forEach((entry) => pushUnique(entry.candidate));

    // 現在地・マップ中心座標がある場合は近い店舗を上位に優先ソート
    if (hasRefCoords) {
      merged.sort((a, b) => {
        if (a.source === "ai" && b.source !== "ai") return -1;
        if (b.source === "ai" && a.source !== "ai") return 1;
        return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
      });
    }

    return NextResponse.json({
      candidates: merged.slice(0, 8),
      aiEnabled: hasAiKey,
    });
  } catch {
    return NextResponse.json({
      candidates: [],
      aiEnabled: hasAiKey,
    });
  }
}
