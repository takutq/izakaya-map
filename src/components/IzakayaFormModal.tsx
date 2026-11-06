"use client";

import React, { useState, useEffect } from "react";
import {
  Izakaya,
  IzakayaInput,
  PRESET_GENRES,
  SmokingStatus,
  RatingLevel,
  SMOKING_LABELS,
  RATING_LABELS,
} from "@/types/izakaya";
import type { PlaceCandidate } from "@/app/api/places/route";
import {
  X,
  MapPin,
  LocateFixed,
  Plus,
  Minus,
  Check,
  Crosshair,
  Save,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Repeat,
} from "lucide-react";

interface IzakayaFormModalProps {
  isOpen: boolean;
  editingIzakaya: Izakaya | null;
  pickedCoords: { lat: number; lng: number } | null;
  referenceCoords?: { lat: number; lng: number };
  onClose: () => void;
  onSave: (input: IzakayaInput, editingId?: string) => Promise<void>;
  onRequestMapPick: () => void;
}

const DEFAULT_COORDS = {
  lat: 35.67205,
  lng: 139.79558,
};

export default function IzakayaFormModal({
  isOpen,
  editingIzakaya,
  pickedCoords,
  referenceCoords,
  onClose,
  onSave,
  onRequestMapPick,
}: IzakayaFormModalProps) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [genres, setGenres] = useState<string[]>(["大衆酒場"]);
  const [customGenre, setCustomGenre] = useState("");
  const [lat, setLat] = useState<string>(String(DEFAULT_COORDS.lat));
  const [lng, setLng] = useState<string>(String(DEFAULT_COORDS.lng));
  const [smoking, setSmoking] = useState<SmokingStatus>("no_smoking");
  const [rating, setRating] = useState<RatingLevel>(3);
  const [visitCount, setVisitCount] = useState<number>(1);
  const [visited, setVisited] = useState<boolean>(true);
  const [specialty, setSpecialty] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 居酒屋特化・AI店名検索ステート
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPlaceNotice, setSelectedPlaceNotice] = useState<string | null>(
    null
  );
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [showAiKeyInput, setShowAiKeyInput] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [aiEnabledServer, setAiEnabledServer] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = window.localStorage.getItem("izakaya_gemini_api_key");
      if (savedKey) setGeminiApiKey(savedKey);
    }
  }, []);

  // 編集データまたは初期状態の反映
  useEffect(() => {
    if (editingIzakaya) {
      setName(editingIzakaya.name);
      setArea(editingIzakaya.area);
      setAddress(editingIzakaya.address ?? "");
      setGenres(editingIzakaya.genres);
      setLat(String(editingIzakaya.lat));
      setLng(String(editingIzakaya.lng));
      setSmoking(editingIzakaya.smoking);
      setRating(editingIzakaya.rating);
      setVisitCount(
        editingIzakaya.visit_count ?? (editingIzakaya.visited ? 1 : 0)
      );
      setVisited(editingIzakaya.visited);
      setSpecialty(editingIzakaya.specialty);
      setMemo(editingIzakaya.memo);
    } else {
      setName("");
      setArea("");
      setAddress("");
      setGenres(["大衆酒場"]);
      setLat(String(pickedCoords?.lat ?? DEFAULT_COORDS.lat));
      setLng(String(pickedCoords?.lng ?? DEFAULT_COORDS.lng));
      setSmoking("no_smoking");
      setRating(3);
      setVisitCount(1);
      setVisited(true);
      setSpecialty("");
      setMemo("");
    }
    setCandidates([]);
    setSelectedPlaceNotice(null);
    setFormError(null);
  }, [editingIzakaya, isOpen]);

  // マップ上でタップ指定した座標が更新されたらフォームに即座に反映
  useEffect(() => {
    if (pickedCoords) {
      setLat(String(pickedCoords.lat));
      setLng(String(pickedCoords.lng));
      setSelectedPlaceNotice("地図上で指定した位置をセットしました");
    }
  }, [pickedCoords]);

  // 店名（＋エリア）入力に連動した居酒屋専用検索
  useEffect(() => {
    if (!isOpen) return;
    const query = [name.trim(), area.trim()].filter(Boolean).join(" ");
    if (name.trim().length < 2) {
      setCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPlaces(true);
      try {
        const headers: Record<string, string> = {};
        if (geminiApiKey.trim()) {
          headers["x-gemini-api-key"] = geminiApiKey.trim();
        }
        const params = new URLSearchParams({ q: query });
        if (referenceCoords) {
          params.set("lat", String(referenceCoords.lat));
          params.set("lng", String(referenceCoords.lng));
        }
        const res = await fetch(`/api/places?${params.toString()}`, {
          headers,
        });
        if (res.ok) {
          const data = (await res.json()) as {
            candidates: PlaceCandidate[];
            aiEnabled?: boolean;
          };
          setCandidates(data.candidates ?? []);
          setAiEnabledServer(Boolean(data.aiEnabled));
        }
      } catch {
        // 通信失敗時は無視
      } finally {
        setSearchingPlaces(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [name, area, isOpen, geminiApiKey]);

  if (!isOpen) return null;

  // 候補をタップした時に店名・エリア・住所・座標・推定ジャンル・名物を一括自動入力
  const handleSelectCandidate = (cand: PlaceCandidate) => {
    setName(cand.name);
    if (cand.area) setArea(cand.area);
    if (cand.address) setAddress(cand.address);
    setLat(String(cand.lat));
    setLng(String(cand.lng));
    if (cand.suggestedGenres && cand.suggestedGenres.length > 0) {
      setGenres(cand.suggestedGenres);
    }
    if (cand.suggestedSpecialty && !specialty.trim()) {
      setSpecialty(cand.suggestedSpecialty);
    }
    setCandidates([]);
    setSelectedPlaceNotice(
      `「${cand.name}」の住所・位置・ジャンルを自動特定しました`
    );
  };

  // 手動で今すぐ検索ボタン
  const handleManualSearch = async () => {
    const query = [name.trim(), area.trim()].filter(Boolean).join(" ");
    if (!query) return;
    setSearchingPlaces(true);
    try {
      const headers: Record<string, string> = {};
      if (geminiApiKey.trim()) {
        headers["x-gemini-api-key"] = geminiApiKey.trim();
      }
      const params = new URLSearchParams({ q: query });
      if (referenceCoords) {
        params.set("lat", String(referenceCoords.lat));
        params.set("lng", String(referenceCoords.lng));
      }
      const res = await fetch(`/api/places?${params.toString()}`, {
        headers,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          candidates: PlaceCandidate[];
          aiEnabled?: boolean;
        };
        setCandidates(data.candidates ?? []);
        setAiEnabledServer(Boolean(data.aiEnabled));
      }
    } finally {
      setSearchingPlaces(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleAddCustomGenre = () => {
    const trimmed = customGenre.trim();
    if (!trimmed) return;
    if (!genres.includes(trimmed)) {
      setGenres((prev) => [...prev, trimmed]);
    }
    setCustomGenre("");
  };

  const handleGetCurrentCoords = () => {
    if (!("geolocation" in navigator)) {
      setFormError("このブラウザでは位置情報がサポートされていません。");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setSelectedPlaceNotice("現在地の位置情報をセットしました");
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setFormError(`現在地の取得に失敗しました: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("店名を入力してください。");
      return;
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      setFormError("有効な位置情報を指定してください。");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(
        {
          name: name.trim(),
          area: area.trim() || "エリア未設定",
          address: address.trim(),
          genres: genres.length > 0 ? genres : ["大衆酒場"],
          lat: parsedLat,
          lng: parsedLng,
          smoking,
          rating,
          visit_count: visited ? Math.max(1, visitCount) : 0,
          visited,
          specialty: specialty.trim(),
          memo: memo.trim(),
        },
        editingIzakaya?.id
      );
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "保存中にエラーが発生しました。"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const allGenreOptions = Array.from(new Set([...PRESET_GENRES, ...genres]));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={editingIzakaya ? "店舗情報の編集" : "新規居酒屋の登録"}
    >
      <div className="w-full max-w-[480px] bg-sumi-800 border-t-2 sm:border border-sumi-500 text-kinari-100 max-h-[92dvh] flex flex-col">
        {/* モーダルヘッダー */}
        <div className="px-4 py-3 bg-sumi-900 border-b border-sumi-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 bg-chochin inline-block" />
            <h2 className="font-serif text-base font-bold tracking-tight">
              {editingIzakaya ? "暖簾データの編集" : "新規赤ちょうちん登録"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-sumi-800 border border-sumi-500 text-kinari-400 hover:text-kinari-100"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* フォーム本体 */}
        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-4 overflow-y-auto text-xs flex-1"
        >
          {formError && (
            <div className="p-2.5 bg-chochin/20 border border-chochin text-kinari-100 text-xs">
              {formError}
            </div>
          )}

          {/* 訪問ステータス & 行った回数 */}
          <div className="space-y-2.5">
            <label className="block text-[11px] font-bold text-kinari-400">
              開拓ステータス & 行った回数
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVisited(true);
                  if (visitCount === 0) setVisitCount(1);
                }}
                className={`py-2.5 px-3 border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  visited
                    ? "bg-chochin text-white border-white"
                    : "bg-sumi-900 text-kinari-400 border-sumi-500"
                }`}
              >
                <span className="w-2 h-2 bg-white inline-block" />
                訪問済み（赤提灯）
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisited(false);
                  setVisitCount(0);
                }}
                className={`py-2.5 px-3 border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  !visited
                    ? "bg-karashi text-neutral-950 border-white"
                    : "bg-sumi-900 text-kinari-400 border-sumi-500"
                }`}
              >
                <span className="w-2 h-2 bg-neutral-950 inline-block" />
                未訪問（開拓候補）
              </button>
            </div>

            {/* 訪問済み時の訪問回数カウンター */}
            {visited && (
              <div className="px-3 py-2 bg-sumi-900 border border-sumi-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-kinari-200">
                  <Repeat className="w-3.5 h-3.5 text-chochin" />
                  行った回数（リピート回数）
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVisitCount((c) => Math.max(1, c - 1))}
                    className="w-7 h-7 bg-sumi-800 hover:bg-sumi-700 border border-sumi-500 text-kinari-100 flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-sm font-bold min-w-[3rem] text-center">
                    {visitCount}回
                  </span>
                  <button
                    type="button"
                    onClick={() => setVisitCount((c) => c + 1)}
                    className="w-7 h-7 bg-chochin hover:bg-chochin-hover text-white flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 店名入力 & 居酒屋専用AI/スマート特定サジェスト */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-kinari-400">
                店名・エリア検索（居酒屋・飲食店のみ抽出）
              </span>
              <button
                type="button"
                onClick={() => setShowAiKeyInput((prev) => !prev)}
                className={`px-2 py-0.5 text-[10px] font-bold border flex items-center gap-1 ${
                  aiEnabledServer || geminiApiKey.trim()
                    ? "bg-chochin/20 border-chochin text-chochin"
                    : "bg-sumi-900 border-sumi-500 text-kinari-400 hover:text-kinari-100"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>
                  {aiEnabledServer || geminiApiKey.trim()
                    ? "AI店舗特定: ON"
                    : "AI特定(Gemini)を設定"}
                </span>
              </button>
            </div>

            {showAiKeyInput && (
              <div className="p-2.5 bg-sumi-950 border border-karashi space-y-1.5">
                <p className="text-[11px] text-kinari-200 leading-relaxed">
                  Google Gemini APIキーを設定すると、AIが店名から全国の居酒屋・住所・名物メニューまでピンポイントで特定します（端末のlocalStorageに保存されます）。
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      window.localStorage.setItem(
                        "izakaya_gemini_api_key",
                        e.target.value.trim()
                      );
                    }}
                    placeholder="AIzaSy... (Gemini API Key)"
                    className="flex-1 px-2.5 py-1.5 bg-sumi-900 border border-sumi-500 text-xs font-mono text-kinari-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKeyInput(false)}
                    className="px-3 py-1.5 bg-chochin text-white text-xs font-bold"
                  >
                    完了
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-kinari-400 mb-1">
                  店名 <span className="text-chochin">*</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSelectedPlaceNotice(null);
                    }}
                    placeholder="例：魚三酒場 / 大統領 / 晩杯屋"
                    className="flex-1 px-3 py-2.5 bg-sumi-900 border border-sumi-500 text-kinari-100 placeholder-kinari-500 text-sm focus:outline-none focus:border-chochin"
                  />
                  <button
                    type="button"
                    onClick={handleManualSearch}
                    title="店名から居酒屋を特定"
                    className="px-3 bg-sumi-700 hover:bg-sumi-600 border border-sumi-500 text-kinari-200 flex items-center justify-center gap-1"
                  >
                    <Search className="w-4 h-4 text-karashi" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-kinari-400 mb-1">
                  最寄り駅・エリア
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="例：門前仲町"
                  className="w-full px-3 py-2.5 bg-sumi-900 border border-sumi-500 text-kinari-100 placeholder-kinari-500 text-sm focus:outline-none focus:border-chochin"
                />
              </div>
            </div>

            {/* 候補リスト表示 */}
            {searchingPlaces && (
              <div className="px-3 py-2 bg-sumi-900 border border-sumi-500 text-[11px] text-kinari-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-karashi animate-pulse" />
                <span>「{name}」に一致する居酒屋・酒場を特定中...</span>
              </div>
            )}

            {!searchingPlaces && candidates.length > 0 && (
              <div className="bg-sumi-900 border border-karashi divide-y divide-sumi-500 max-h-52 overflow-y-auto">
                <div className="px-2.5 py-1.5 bg-sumi-950 text-[10px] font-bold text-karashi flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    居酒屋・酒場の特定結果（タップで住所・位置を自動入力）
                  </span>
                  <button
                    type="button"
                    onClick={() => setCandidates([])}
                    className="text-kinari-400 hover:text-kinari-100"
                  >
                    閉じる
                  </button>
                </div>
                {candidates.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => handleSelectCandidate(cand)}
                    className="w-full px-3 py-2 text-left hover:bg-sumi-700 transition-colors flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-kinari-100 truncate flex items-center gap-1.5">
                        {cand.source === "ai" && (
                          <span className="px-1 py-0.2 bg-chochin text-white text-[9px] font-mono">
                            AI特定
                          </span>
                        )}
                        <span>{cand.name}</span>
                      </div>
                      <div className="text-[11px] text-kinari-400 truncate">
                        {cand.address}
                      </div>
                    </div>
                    {cand.area && (
                      <span className="px-1.5 py-0.5 bg-sumi-800 border border-sumi-500 text-[10px] text-karashi shrink-0">
                        {cand.area}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 自動セット完了メッセージ */}
            {selectedPlaceNotice && (
              <div className="px-3 py-1.5 bg-karashi/15 border border-karashi text-[11px] text-kinari-100 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-karashi shrink-0" />
                <span>{selectedPlaceNotice}</span>
              </div>
            )}
          </div>

          {/* 住所 & 位置指定サポート */}
          <div className="p-3 bg-sumi-900 border border-sumi-500 space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-kinari-400 mb-1">
                住所（店舗候補から自動取得、または手入力）
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="例：東京都江東区富岡1-5-4"
                className="w-full px-2.5 py-2 bg-sumi-950 border border-sumi-500 text-xs text-kinari-100 placeholder-kinari-500 focus:outline-none focus:border-chochin"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onRequestMapPick}
                  className="px-2.5 py-1.5 bg-sumi-700 hover:bg-sumi-600 border border-karashi text-karashi text-[11px] font-bold flex items-center gap-1"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>地図タップで場所指定</span>
                </button>
                <button
                  type="button"
                  onClick={handleGetCurrentCoords}
                  disabled={locating}
                  className="px-2.5 py-1.5 bg-sumi-700 hover:bg-sumi-600 border border-sumi-500 text-kinari-200 text-[11px] font-bold flex items-center gap-1"
                >
                  <LocateFixed className="w-3.5 h-3.5 text-chochin" />
                  <span>{locating ? "測位中..." : "現在地をセット"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowManualCoords((prev) => !prev)}
                className="text-[11px] text-kinari-400 hover:text-kinari-200 flex items-center gap-0.5"
              >
                <MapPin className="w-3 h-3" />
                <span>座標を微調整</span>
                {showManualCoords ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {showManualCoords && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-sumi-500">
                <div>
                  <span className="block text-[10px] text-kinari-400 mb-0.5">
                    緯度 (Lat)
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-sumi-950 border border-sumi-500 font-mono text-xs text-kinari-100 focus:outline-none focus:border-chochin"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-kinari-400 mb-0.5">
                    経度 (Lng)
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-sumi-950 border border-sumi-500 font-mono text-xs text-kinari-100 focus:outline-none focus:border-chochin"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ジャンルタグ（タップでON/OFF ＋ 自由追加） */}
          <div>
            <label className="block text-[11px] font-bold text-kinari-400 mb-1.5">
              ジャンルタグ（複数選択可）
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allGenreOptions.map((genre) => {
                const active = genres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-2.5 py-1 text-xs font-medium border flex items-center gap-1 transition-colors ${
                      active
                        ? "bg-chochin text-white border-white"
                        : "bg-sumi-900 text-kinari-400 border-sumi-500 hover:text-kinari-200"
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    <span>{genre}</span>
                  </button>
                );
              })}
            </div>

            {/* 自由タグ追加 */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomGenre();
                  }
                }}
                placeholder="自由タグを追加（例：ホッピー、昭和レトロ）"
                className="flex-1 px-2.5 py-1.5 bg-sumi-900 border border-sumi-500 text-xs text-kinari-100 placeholder-kinari-500 focus:outline-none focus:border-chochin"
              />
              <button
                type="button"
                onClick={handleAddCustomGenre}
                className="px-3 py-1.5 bg-sumi-700 hover:bg-sumi-600 border border-sumi-500 text-kinari-200 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                追加
              </button>
            </div>
          </div>

          {/* 喫煙環境 & 5段階リピート度 */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-kinari-400 mb-1.5">
                喫煙環境
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(SMOKING_LABELS) as SmokingStatus[]).map((key) => {
                  const active = smoking === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSmoking(key)}
                      className={`py-2 px-1.5 border text-xs font-bold transition-colors ${
                        active
                          ? "bg-karashi text-neutral-950 border-white"
                          : "bg-sumi-900 text-kinari-400 border-sumi-500"
                      }`}
                    >
                      {SMOKING_LABELS[key].short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-kinari-400">
                  お気に入り度・期待度（5段階）
                </label>
                <span className="text-[11px] text-karashi font-bold">
                  {RATING_LABELS[rating].text}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {([1, 2, 3, 4, 5] as RatingLevel[]).map((level) => {
                  const active = rating === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRating(level)}
                      className={`py-2 px-1 border text-xs font-mono font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${
                        active
                          ? "bg-chochin text-white border-white"
                          : "bg-sumi-900 text-kinari-400 border-sumi-500 hover:text-kinari-200"
                      }`}
                    >
                      <span>★{level}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 名物・必食メニュー・酒 */}
          <div>
            <label className="block text-[11px] font-bold text-kinari-400 mb-1">
              名物・必食のアテ・酒
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="例：牛にこみ・網れば・シャリキン梅割り"
              className="w-full px-3 py-2 bg-sumi-900 border border-sumi-500 text-kinari-100 placeholder-kinari-500 text-xs focus:outline-none focus:border-chochin"
            />
          </div>

          {/* 雰囲気・価格帯・定休日の注意点メモ */}
          <div>
            <label className="block text-[11px] font-bold text-kinari-400 mb-1">
              覚え書き（雰囲気・予算・定休日など）
            </label>
            <textarea
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：口開け16時。コの字カウンター。現金のみ。水曜定休。"
              className="w-full px-3 py-2 bg-sumi-900 border border-sumi-500 text-kinari-100 placeholder-kinari-500 text-xs focus:outline-none focus:border-chochin resize-none"
            />
          </div>

          {/* 保存・キャンセルボタン */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-sumi-900 hover:bg-sumi-700 border border-sumi-500 text-kinari-400 font-bold text-xs"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] py-3 bg-chochin hover:bg-chochin-hover text-white border border-white/20 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>
                {submitting
                  ? "保存中..."
                  : editingIzakaya
                  ? "変更を保存する"
                  : "赤ちょうちんを登録する"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
