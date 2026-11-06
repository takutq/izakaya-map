"use client";

import React, { useState, useEffect } from "react";
import {
  Izakaya,
  SMOKING_LABELS,
  RATING_LABELS,
  buildGoogleMapsDirUrl,
  buildAppleMapsDirUrl,
} from "@/types/izakaya";
import {
  X,
  Navigation,
  MapPin,
  Cigarette,
  Utensils,
  FileText,
  Edit3,
  Trash2,
  CheckCircle2,
  Bookmark,
  ExternalLink,
  Plus,
  Minus,
  Repeat,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface IzakayaDetailDrawerProps {
  izakaya: Izakaya | null;
  defaultMinimized?: boolean;
  onClose: () => void;
  onEdit: (izakaya: Izakaya) => void;
  onDelete: (izakaya: Izakaya) => void;
  onToggleVisited: (izakaya: Izakaya) => void;
  onIncrementVisitCount: (izakaya: Izakaya, delta: number) => void;
}

export default function IzakayaDetailDrawer({
  izakaya,
  defaultMinimized = false,
  onClose,
  onEdit,
  onDelete,
  onToggleVisited,
  onIncrementVisitCount,
}: IzakayaDetailDrawerProps) {
  const [isMinimized, setIsMinimized] = useState<boolean>(defaultMinimized);

  // 選択店舗が切り替わった際、一覧リスト経由なら最小化バー（マップが広く見える状態）で開く
  useEffect(() => {
    setIsMinimized(defaultMinimized);
  }, [izakaya?.id, defaultMinimized]);

  if (!izakaya) return null;

  const smokingInfo = SMOKING_LABELS[izakaya.smoking];
  const ratingInfo = RATING_LABELS[izakaya.rating] ?? RATING_LABELS[3];
  const visitCount = izakaya.visit_count ?? 0;

  const googleMapsWalkUrl = buildGoogleMapsDirUrl(izakaya);
  const appleMapsWalkUrl = buildAppleMapsDirUrl(izakaya);

  return (
    <div
      className="fixed inset-x-0 bottom-16 lg:bottom-4 z-30 pointer-events-none flex justify-center px-0 lg:px-4"
      role="dialog"
      aria-label={`${izakaya.name}の詳細`}
    >
      <div className="w-full max-w-[480px] lg:max-w-[540px] bg-sumi-700 border-t-2 lg:border border-x border-sumi-500 text-kinari-100 pointer-events-auto flex flex-col transition-all">
        {/* ====================================================================
            上部収納ハンドルバー（タップで「下に収納 ⇄ 詳細を展開」を切り替え）
           ==================================================================== */}
        <button
          type="button"
          onClick={() => setIsMinimized((prev) => !prev)}
          className="w-full py-1.5 px-4 bg-sumi-900 hover:bg-sumi-800 border-b border-sumi-500 flex items-center justify-center gap-1.5 text-[11px] font-bold text-kinari-400 hover:text-kinari-100 transition-colors"
        >
          <span className="w-8 h-1 bg-sumi-500 inline-block mr-1" />
          {isMinimized ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-karashi" />
              <span>詳細を開く</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-karashi" />
              <span>下に収納してマップを広く見る</span>
            </>
          )}
        </button>

        {/* ====================================================================
            常時表示ヘッダー（収納時も店名・回数・ワンタップ徒歩ナビがすぐ使える）
           ==================================================================== */}
        <div className="px-4 py-2.5 border-b border-sumi-500 flex items-center justify-between gap-2 bg-sumi-800">
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => setIsMinimized((prev) => !prev)}
          >
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              {/* 訪問ステータスバッジ */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisited(izakaya);
                }}
                className={`px-1.5 py-0.5 text-[10px] font-bold border flex items-center gap-1 transition-colors ${
                  izakaya.visited
                    ? "bg-chochin text-white border-chochin"
                    : "bg-karashi text-neutral-950 border-karashi"
                }`}
              >
                {izakaya.visited ? (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>訪問済({visitCount}回)</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-2.5 h-2.5" />
                    <span>未訪問</span>
                  </>
                )}
              </button>

              {izakaya.area && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-sumi-900 border border-sumi-500 text-kinari-200 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-chochin" />
                  {izakaya.area}
                </span>
              )}

              <span
                className={`px-1.5 py-0.5 text-[10px] font-medium border flex items-center gap-0.5 ${smokingInfo.badgeClass}`}
              >
                <Cigarette className="w-2.5 h-2.5" />
                {smokingInfo.short}
              </span>

              <span className="text-karashi font-mono text-xs tracking-tighter">
                {ratingInfo.stars}
              </span>
            </div>

            {/* 店名 */}
            <h2 className="font-serif text-base font-bold tracking-tight text-kinari-100 truncate">
              {izakaya.name}
            </h2>
          </div>

          {/* 収納時にすぐ押せる「ナビ」ボタン & 展開切替 & 閉じるボタン */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isMinimized && (
              <a
                href={googleMapsWalkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-2 bg-chochin hover:bg-chochin-hover text-white text-xs font-bold flex items-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>ナビ</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="p-1.5 bg-sumi-700 hover:bg-sumi-600 border border-sumi-500 text-kinari-400 hover:text-kinari-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ====================================================================
            展開時のみ表示される詳細コンテンツ領域
           ==================================================================== */}
        {!isMinimized && (
          <div className="p-4 space-y-3 overflow-y-auto max-h-[52vh] text-xs">
            {/* 行った回数（ワンタップで＋1カウントアップ可能） */}
            <div className="px-3 py-2 bg-sumi-800 border border-sumi-500 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-chochin" />
                <span className="font-bold text-kinari-200">行った回数</span>
                <span className="font-mono text-sm font-bold text-kinari-100 ml-1">
                  {visitCount}回
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onIncrementVisitCount(izakaya, -1)}
                  disabled={visitCount <= 0}
                  className="w-7 h-7 bg-sumi-900 hover:bg-sumi-700 disabled:opacity-40 border border-sumi-500 text-kinari-200 flex items-center justify-center"
                  aria-label="訪問回数を1減らす"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onIncrementVisitCount(izakaya, 1)}
                  className="px-2.5 h-7 bg-chochin hover:bg-chochin-hover text-white font-bold text-[11px] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>今日行った（+1）</span>
                </button>
              </div>
            </div>

            {/* ジャンルタグ */}
            {izakaya.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {izakaya.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-0.5 bg-sumi-900 border border-sumi-500 text-kinari-200 font-medium"
                  >
                    #{genre}
                  </span>
                ))}
              </div>
            )}

            {/* 名物・必食メニュー・酒 */}
            {izakaya.specialty && (
              <div className="bg-sumi-800 border border-sumi-500 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-karashi mb-1">
                  <Utensils className="w-3.5 h-3.5" />
                  <span>名物・必食のアテ・酒</span>
                </div>
                <p className="text-kinari-100 leading-relaxed">
                  {izakaya.specialty}
                </p>
              </div>
            )}

            {/* メモ・定休日の注意点など */}
            {izakaya.memo && (
              <div className="bg-sumi-800 border border-sumi-500 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-kinari-400 mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>覚え書き・注意点</span>
                </div>
                <p className="text-kinari-200 leading-relaxed whitespace-pre-wrap">
                  {izakaya.memo}
                </p>
              </div>
            )}

            {/* 所在地・喫煙環境情報 */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-kinari-400 pt-1 border-t border-sumi-500">
              <span>喫煙環境: {smokingInfo.label}</span>
              {izakaya.address && (
                <span className="text-kinari-200">{izakaya.address}</span>
              )}
            </div>

            {/* 道案内アクション（ワンタップ徒歩ナビ） */}
            <div className="pt-1 space-y-2">
              <a
                href={googleMapsWalkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-chochin hover:bg-chochin-hover active:bg-chochin text-white font-bold text-sm border border-white/20 flex items-center justify-center gap-2 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                <span>Google マップでナビ開始（徒歩）</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <div className="flex items-center justify-between gap-2">
                <a
                  href={appleMapsWalkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-sumi-800 hover:bg-sumi-600 border border-sumi-500 text-kinari-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-karashi" />
                  <span>Apple マップで開く</span>
                </a>

                <button
                  type="button"
                  onClick={() => onEdit(izakaya)}
                  className="py-2 px-3 bg-sumi-800 hover:bg-sumi-600 border border-sumi-500 text-kinari-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>編集</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `「${izakaya.name}」の記録を削除してもよろしいですか？`
                      )
                    ) {
                      onDelete(izakaya);
                    }
                  }}
                  className="py-2 px-3 bg-sumi-800 hover:bg-chochin/20 border border-sumi-500 text-kinari-400 hover:text-chochin text-xs font-medium flex items-center gap-1 transition-colors"
                  aria-label="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
