export type SmokingStatus = "all" | "separated" | "heated_only" | "no_smoking";

export type RatingLevel = 1 | 2 | 3 | 4 | 5;

export interface Izakaya {
  id: string;
  name: string;
  genres: string[];
  lat: number;
  lng: number;
  area: string;
  address?: string;
  smoking: SmokingStatus;
  rating: RatingLevel;
  visit_count: number; // 行った回数（0 = 未訪問）
  specialty: string;
  memo: string;
  visited: boolean;
  created_at: string;
}

export type IzakayaInput = Omit<Izakaya, "id" | "created_at">;

export const PRESET_GENRES = [
  "やきとん",
  "立ち飲み",
  "海鮮",
  "大衆酒場",
  "角打ち",
  "焼き鳥",
  "町中華",
  "もつ焼き",
  "煮込み",
  "日本酒",
  "クラフトビール",
  "おでん",
] as const;

export const SMOKING_LABELS: Record<
  SmokingStatus,
  { label: string; short: string; badgeClass: string }
> = {
  all: {
    label: "全面喫煙可",
    short: "喫煙可",
    badgeClass: "border-karashi text-karashi bg-karashi/10",
  },
  separated: {
    label: "分煙（喫煙室あり）",
    short: "分煙",
    badgeClass: "border-sumi-500 text-kinari-200 bg-sumi-800",
  },
  heated_only: {
    label: "加熱式たばこのみ可",
    short: "加熱式のみ",
    badgeClass: "border-sumi-500 text-kinari-200 bg-sumi-800",
  },
  no_smoking: {
    label: "完全禁煙",
    short: "禁煙",
    badgeClass: "border-sumi-500 text-kinari-400 bg-sumi-900",
  },
};

export const RATING_LABELS: Record<RatingLevel, { stars: string; text: string }> = {
  1: { stars: "★☆☆☆☆", text: "一度行けば満足" },
  2: { stars: "★★☆☆☆", text: "機会があれば寄る" },
  3: { stars: "★★★☆☆", text: "またふらっと寄りたい良店" },
  4: { stars: "★★★★☆", text: "かなり好き・定期的に通いたい" },
  5: { stars: "★★★★★", text: "殿堂入り・一生通いたい名酒場" },
};

/**
 * 2点間の直線距離（km）を算出する Haversine 公式
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球半径 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 距離を読みやすい文字列（例: "280m", "1.4km"）にフォーマット
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Google マップで店名・住所・座標から正確な店舗ナビを起動するURLを生成
 */
export function buildGoogleMapsDirUrl(izakaya: {
  name: string;
  area?: string;
  address?: string;
  lat: number;
  lng: number;
}): string {
  const destinationQuery = [izakaya.name, izakaya.address || izakaya.area]
    .filter(Boolean)
    .join(" ")
    .trim();

  const destination = destinationQuery
    ? encodeURIComponent(destinationQuery)
    : `${izakaya.lat},${izakaya.lng}`;

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
}

/**
 * Apple マップで店名・座標から徒歩ルートを起動するURLを生成
 */
export function buildAppleMapsDirUrl(izakaya: {
  name: string;
  area?: string;
  address?: string;
  lat: number;
  lng: number;
}): string {
  const q = encodeURIComponent(
    [izakaya.name, izakaya.address || izakaya.area].filter(Boolean).join(" ")
  );
  return `https://maps.apple.com/?q=${q}&sll=${izakaya.lat},${izakaya.lng}&dirflg=w`;
}
