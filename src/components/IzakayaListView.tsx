"use client";

import React, { useState, useMemo } from "react";
import {
  Izakaya,
  SMOKING_LABELS,
  RATING_LABELS,
  PRESET_GENRES,
  buildGoogleMapsDirUrl,
  calculateDistanceKm,
  formatDistance,
} from "@/types/izakaya";
import {
  Search,
  MapPin,
  Navigation,
  Cigarette,
  ArrowUpDown,
  Utensils,
  Edit3,
  CheckCircle2,
  Bookmark,
  Repeat,
  Plus,
  LocateFixed,
  Check,
} from "lucide-react";

interface IzakayaListViewProps {
  izakayas: Izakaya[];
  referenceCoords: { lat: number; lng: number };
  hasUserGps: boolean;
  onRequestGps: () => void;
  onSelectOnMap: (izakaya: Izakaya) => void;
  onEdit: (izakaya: Izakaya) => void;
  onToggleVisited: (izakaya: Izakaya) => void;
  onIncrementVisitCount: (izakaya: Izakaya, delta: number) => void;
}

type SortKey = "nearest" | "visit_count_desc" | "rating_desc" | "newest";

export default function IzakayaListView({
  izakayas,
  referenceCoords,
  hasUserGps,
  onRequestGps,
  onSelectOnMap,
  onEdit,
  onToggleVisited,
  onIncrementVisitCount,
}: IzakayaListViewProps) {
  const [keyword, setKeyword] = useState("");
  // 複数選択可能なフィルタチップ配列（空配列＝「すべて」選択状態）
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("nearest");

  const filterChips = useMemo(
    () => [
      "すべて",
      "訪問済",
      "未訪問",
      "喫煙可",
      ...PRESET_GENRES.slice(0, 8),
    ],
    []
  );

  // チップタップで複数選択ON/OFFをトグル
  const handleToggleFilterChip = (chip: string) => {
    if (chip === "すべて") {
      setSelectedFilters([]);
      return;
    }
    setSelectedFilters((prev) => {
      if (prev.includes(chip)) {
        return prev.filter((item) => item !== chip);
      }
      // 「訪問済」と「未訪問」は排他的に切り替える
      const cleaned =
        chip === "訪問済"
          ? prev.filter((i) => i !== "未訪問")
          : chip === "未訪問"
          ? prev.filter((i) => i !== "訪問済")
          : prev;
      return [...cleaned, chip];
    });
  };

  // 各店舗の現在地（またはマップ中心）からの距離を計算し、複数条件絞り込み＆ソート
  const filteredAndSorted = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    const withDist = izakayas.map((shop) => ({
      shop,
      distanceKm: calculateDistanceKm(
        referenceCoords.lat,
        referenceCoords.lng,
        shop.lat,
        shop.lng
      ),
    }));

    const filtered = withDist.filter(({ shop }) => {
      // 複数選択された各フィルタ条件を満たすか判定
      for (const filter of selectedFilters) {
        if (filter === "訪問済" && !shop.visited) return false;
        if (filter === "未訪問" && shop.visited) return false;
        if (
          filter === "喫煙可" &&
          shop.smoking !== "all" &&
          shop.smoking !== "separated" &&
          shop.smoking !== "heated_only"
        ) {
          return false;
        }
        if (
          filter !== "訪問済" &&
          filter !== "未訪問" &&
          filter !== "喫煙可" &&
          !shop.genres.includes(filter)
        ) {
          return false;
        }
      }

      if (!q) return true;
      const haystack = [
        shop.name,
        shop.area,
        shop.address ?? "",
        shop.specialty,
        shop.memo,
        ...shop.genres,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return filtered.sort((a, b) => {
      if (sortBy === "nearest") {
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === "visit_count_desc") {
        const countDiff =
          (b.shop.visit_count ?? 0) - (a.shop.visit_count ?? 0);
        if (countDiff !== 0) return countDiff;
        return b.shop.rating - a.shop.rating;
      }
      if (sortBy === "rating_desc") {
        if (b.shop.rating !== a.shop.rating)
          return b.shop.rating - a.shop.rating;
        return (
          (b.shop.visit_count ?? 0) - (a.shop.visit_count ?? 0)
        );
      }
      return (
        new Date(b.shop.created_at).getTime() -
        new Date(a.shop.created_at).getTime()
      );
    });
  }, [izakayas, keyword, selectedFilters, sortBy, referenceCoords]);

  return (
    <div className="h-full flex flex-col bg-sumi-950 text-kinari-100">
      {/* 固定検索＆フィルタヘッダー */}
      <div className="p-3 bg-sumi-900 border-b border-sumi-500 space-y-2.5 shrink-0">
        {/* キーワード検索 + ソート切替 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-kinari-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="店名・エリア・名物・メモで検索..."
              className="w-full pl-9 pr-3 py-2 bg-sumi-950 border border-sumi-500 text-xs text-kinari-100 placeholder-kinari-500 focus:outline-none focus:border-chochin"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="並び替え"
              className="h-full pl-2.5 pr-7 py-2 bg-sumi-800 border border-sumi-500 text-xs font-bold text-kinari-200 focus:outline-none focus:border-chochin appearance-none"
            >
              <option value="nearest">現在地から近い順</option>
              <option value="visit_count_desc">リピート回数順</option>
              <option value="rating_desc">★お気に入り度順</option>
              <option value="newest">登録が新しい順</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-kinari-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 横スクロールフィルタチップ（複数選択対応） */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {filterChips.map((chip) => {
            const active =
              chip === "すべて"
                ? selectedFilters.length === 0
                : selectedFilters.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() => handleToggleFilterChip(chip)}
                className={`px-2.5 py-1 text-xs font-bold border whitespace-nowrap flex items-center gap-1 transition-colors ${
                  active
                    ? "bg-chochin text-white border-white"
                    : "bg-sumi-800 text-kinari-400 border-sumi-500 hover:text-kinari-200"
                }`}
              >
                {active && chip !== "すべて" && <Check className="w-3 h-3" />}
                <span>{chip}</span>
              </button>
            );
          })}
        </div>

        {/* 件数ステータス & GPS測位ボタン */}
        <div className="flex items-center justify-between text-[11px] text-kinari-400 px-0.5">
          <span>
            該当{" "}
            <strong className="text-kinari-100">
              {filteredAndSorted.length}
            </strong>{" "}
            軒 （全 {izakayas.length} 軒）
            {selectedFilters.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedFilters([])}
                className="ml-2 text-chochin underline"
              >
                解除({selectedFilters.length})
              </button>
            )}
          </span>
          <button
            type="button"
            onClick={onRequestGps}
            className="text-[11px] text-karashi hover:underline flex items-center gap-1"
          >
            <LocateFixed className="w-3 h-3" />
            <span>
              {hasUserGps ? "現在地からの距離表示中" : "現在地を取得して近い順にする"}
            </span>
          </button>
        </div>
      </div>

      {/* 店舗カードリスト */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pb-24">
        {filteredAndSorted.length === 0 ? (
          <div className="p-8 text-center bg-sumi-900 border border-sumi-500 text-xs text-kinari-400 space-y-2">
            <p>選択した条件にすべて一致する居酒屋が見つかりません。</p>
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setSelectedFilters([]);
              }}
              className="px-3 py-1.5 bg-sumi-700 border border-sumi-500 text-kinari-200 font-bold"
            >
              フィルタをリセット
            </button>
          </div>
        ) : (
          filteredAndSorted.map(({ shop, distanceKm }) => {
            const smokingInfo = SMOKING_LABELS[shop.smoking];
            const ratingInfo = RATING_LABELS[shop.rating] ?? RATING_LABELS[3];
            const googleWalkUrl = buildGoogleMapsDirUrl(shop);
            const visitCount = shop.visit_count ?? 0;

            return (
              <article
                key={shop.id}
                className="bg-sumi-700 border border-sumi-500 p-3.5 space-y-2.5 transition-colors hover:border-kinari-400/50"
              >
                {/* 上段：訪問バッジ・エリア・距離・喫煙・5段階星 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleVisited(shop)}
                      className={`px-2 py-0.5 text-[10px] font-bold border flex items-center gap-1 ${
                        shop.visited
                          ? "bg-chochin text-white border-chochin"
                          : "bg-karashi text-neutral-950 border-karashi"
                      }`}
                    >
                      {shop.visited ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          訪問済
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3 h-3" />
                          未訪問
                        </>
                      )}
                    </button>

                    <span className="px-2 py-0.5 text-[10px] font-bold bg-sumi-900 border border-sumi-500 text-kinari-200 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-chochin" />
                      {shop.area}
                    </span>

                    {/* 直線距離バッジ */}
                    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-sumi-900 border border-sumi-500 text-karashi">
                      約{formatDistance(distanceKm)}
                    </span>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium border flex items-center gap-1 ${smokingInfo.badgeClass}`}
                    >
                      <Cigarette className="w-2.5 h-2.5" />
                      {smokingInfo.short}
                    </span>
                  </div>

                  <span
                    className="font-mono text-xs text-karashi shrink-0"
                    title={ratingInfo.text}
                  >
                    {ratingInfo.stars}
                  </span>
                </div>

                {/* 店名 & 訪問回数 & ジャンルタグ */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-serif text-base font-bold text-kinari-100 leading-snug">
                      {shop.name}
                    </h3>

                    {/* 行った回数バッジ + ワンタップ「+1回」ボタン */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="px-2 py-0.5 bg-sumi-900 border border-sumi-500 text-[11px] font-mono text-kinari-100 flex items-center gap-1">
                        <Repeat className="w-3 h-3 text-chochin" />
                        <span>{visitCount}回</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrementVisitCount(shop, 1)}
                        title="行った回数を+1する"
                        className="px-1.5 py-0.5 bg-sumi-800 hover:bg-chochin hover:text-white border border-sumi-500 text-[10px] font-bold text-kinari-200 flex items-center"
                      >
                        <Plus className="w-3 h-3" />1
                      </button>
                    </div>
                  </div>

                  {shop.address && (
                    <p className="text-[11px] text-kinari-400 mb-1.5">
                      {shop.address}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {shop.genres.map((g) => (
                      <span
                        key={g}
                        className="px-1.5 py-0.5 bg-sumi-900 border border-sumi-500 text-[10px] text-kinari-200"
                      >
                        #{g}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 名物・メモ */}
                {shop.specialty && (
                  <div className="px-2.5 py-1.5 bg-sumi-800 border-l-2 border-karashi text-xs text-kinari-100 flex items-start gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-karashi shrink-0 mt-0.5" />
                    <span>{shop.specialty}</span>
                  </div>
                )}

                {shop.memo && (
                  <p className="text-xs text-kinari-400 line-clamp-2 leading-relaxed">
                    {shop.memo}
                  </p>
                )}

                {/* アクションボタン行 */}
                <div className="pt-1 flex items-center gap-2 border-t border-sumi-500">
                  <button
                    type="button"
                    onClick={() => onSelectOnMap(shop)}
                    className="flex-1 py-2 px-3 bg-sumi-800 hover:bg-sumi-600 border border-sumi-500 text-kinari-100 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-chochin" />
                    <span>マップで表示</span>
                  </button>

                  <a
                    href={googleWalkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-chochin hover:bg-chochin-hover text-white border border-white/20 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>徒歩ナビ</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onEdit(shop)}
                    className="py-2 px-2.5 bg-sumi-800 hover:bg-sumi-600 border border-sumi-500 text-kinari-400 hover:text-kinari-100 text-xs"
                    aria-label="編集"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
