"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useIzakayas } from "@/hooks/useIzakayas";
import { Izakaya, IzakayaInput } from "@/types/izakaya";
import IzakayaMap from "@/components/IzakayaMap";
import IzakayaDetailDrawer from "@/components/IzakayaDetailDrawer";
import IzakayaFormModal from "@/components/IzakayaFormModal";
import IzakayaListView from "@/components/IzakayaListView";
import {
  Map as MapIcon,
  Plus,
  List,
  RotateCcw,
  Database,
  Cloud,
  Sun,
  Moon,
  Check,
  Download,
  Upload,
} from "lucide-react";

const QUICK_FILTER_CHIPS = [
  "すべて",
  "やきとん",
  "海鮮",
  "立ち飲み",
  "大衆酒場",
  "角打ち",
  "もつ焼き",
  "煮込み",
  "町中華",
  "喫煙可",
  "未訪問",
  "訪問済",
] as const;

const THEME_STORAGE_KEY = "izakaya_map_theme_v1";
const DEFAULT_CENTER = { lat: 35.67205, lng: 139.7962 };

export default function HomePage() {
  const {
    izakayas,
    loading,
    error,
    mode,
    addIzakaya,
    updateIzakaya,
    deleteIzakaya,
    toggleVisited,
    incrementVisitCount,
    resetDemoData,
    importIzakayas,
  } = useIzakayas();

  // UIテーマモード（"dark" | "light"）
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  // モバイルでのアクティブタブ（"map" | "list"）
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  // マップ上部の高速フィルタチップ選択状態（複数選択対応、空配列＝「すべて」）
  const [activeChips, setActiveChips] = useState<string[]>([]);
  // 詳細ドロワーで選択中の居酒屋
  const [selectedIzakaya, setSelectedIzakaya] = useState<Izakaya | null>(null);
  // 一覧リストから「マップで表示」を押したときはドロワーを下に収納した状態で開くフラグ
  const [drawerMinimizedByDefault, setDrawerMinimizedByDefault] =
    useState<boolean>(false);
  // 新規登録・編集モーダル開閉
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingIzakaya, setEditingIzakaya] = useState<Izakaya | null>(null);
  // 地図タップでの座標取得モード
  const [pickingLocation, setPickingLocation] = useState<boolean>(false);
  const [pickedCoords, setPickedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  // 地図のフライ移動ターゲット
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);

  // ユーザーの現在地GPS & 現在のマップ中心座標（「近い順」ソート用）
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    DEFAULT_CENTER
  );

  // 初回マウント時に保存済みテーマを復元 & 位置情報が許可されていれば静かに取得
  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      setThemeMode(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // 未許可時はデフォルト中心またはマップ中心を使用
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  // リストの「現在地を取得して近い順にする」ボタン用
  const handleRequestGps = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setFlyToTarget({ ...coords, zoom: 15.5 });
      },
      (err) => {
        alert(`現在地を取得できませんでした: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // ダーク / ホワイトモード切替
  const toggleThemeMode = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  // マップ上部フィルタチップの複数選択トグル
  const handleToggleMapChip = (chip: string) => {
    if (chip === "すべて") {
      setActiveChips([]);
      return;
    }
    setActiveChips((prev) => {
      if (prev.includes(chip)) {
        return prev.filter((c) => c !== chip);
      }
      const cleaned =
        chip === "訪問済"
          ? prev.filter((c) => c !== "未訪問")
          : chip === "未訪問"
          ? prev.filter((c) => c !== "訪問済")
          : prev;
      return [...cleaned, chip];
    });
  };

  // 複数選択チップによるマップピンの即時フィルタリング
  const filteredMapIzakayas = useMemo(() => {
    if (activeChips.length === 0) return izakayas;
    return izakayas.filter((shop) => {
      for (const chip of activeChips) {
        if (chip === "未訪問" && shop.visited) return false;
        if (chip === "訪問済" && !shop.visited) return false;
        if (chip === "喫煙可") {
          if (
            shop.smoking !== "all" &&
            shop.smoking !== "separated" &&
            shop.smoking !== "heated_only"
          ) {
            return false;
          }
          continue;
        }
        if (
          chip !== "未訪問" &&
          chip !== "訪問済" &&
          !shop.genres.includes(chip)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [izakayas, activeChips]);

  // 新規登録モーダルを開く
  const handleOpenCreateModal = () => {
    setEditingIzakaya(null);
    setIsFormOpen(true);
  };

  // 編集モーダルを開く
  const handleOpenEditModal = (izakaya: Izakaya) => {
    setEditingIzakaya(izakaya);
    setPickedCoords({ lat: izakaya.lat, lng: izakaya.lng });
    setIsFormOpen(true);
  };

  // フォーム保存処理
  const handleSaveIzakaya = async (input: IzakayaInput, editingId?: string) => {
    if (editingId) {
      const updated = await updateIzakaya(editingId, input);
      setDrawerMinimizedByDefault(false);
      setSelectedIzakaya(updated);
      setFlyToTarget({ lat: updated.lat, lng: updated.lng, zoom: 16 });
    } else {
      const created = await addIzakaya(input);
      setDrawerMinimizedByDefault(false);
      setSelectedIzakaya(created);
      setActiveTab("map");
      setFlyToTarget({ lat: created.lat, lng: created.lng, zoom: 16 });
    }
    setPickingLocation(false);
    setPickedCoords(null);
  };

  // 削除処理
  const handleDeleteIzakaya = async (izakaya: Izakaya) => {
    await deleteIzakaya(izakaya.id);
    if (selectedIzakaya?.id === izakaya.id) {
      setSelectedIzakaya(null);
    }
  };

  // 訪問済み/未訪問のワンタップ切り替え
  const handleToggleVisited = async (izakaya: Izakaya) => {
    const updated = await toggleVisited(izakaya);
    if (selectedIzakaya?.id === izakaya.id) {
      setSelectedIzakaya(updated);
    }
  };

  // 訪問回数のカウントアップ/ダウン
  const handleIncrementVisitCount = async (izakaya: Izakaya, delta: number) => {
    const updated = await incrementVisitCount(izakaya, delta);
    if (selectedIzakaya?.id === izakaya.id) {
      setSelectedIzakaya(updated);
    }
  };

  // マップ上でピンを直接タップした時は通常表示（または現在の収納状態を維持）
  const handleSelectPinOnMap = useCallback((izakaya: Izakaya | null) => {
    setDrawerMinimizedByDefault(false);
    setSelectedIzakaya(izakaya);
  }, []);

  // リストから「マップで表示」を選択した時は、マップが隠れないようドロワーを下に収納した状態でフォーカス
  const handleSelectFromList = (izakaya: Izakaya) => {
    setDrawerMinimizedByDefault(true);
    setSelectedIzakaya(izakaya);
    setActiveTab("map");
    setFlyToTarget({ lat: izakaya.lat, lng: izakaya.lng, zoom: 16 });
  };

  // フォームから「地図タップで指定」が押された時
  const handleRequestMapPick = () => {
    setIsFormOpen(false);
    setActiveTab("map");
    setPickingLocation(true);
  };

  // マップ上で座標をタップした時
  const handlePickCoords = (coords: { lat: number; lng: number }) => {
    setPickedCoords(coords);
    setPickingLocation(false);
    setIsFormOpen(true);
  };

  // 登録データをJSONファイルとしてバックアップ保存（エクスポート）
  const handleExportJson = () => {
    const dataStr = JSON.stringify(izakayas, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `izakaya-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // バックアップJSONファイルから復元（インポート）
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (!Array.isArray(parsed)) {
          alert("有効な居酒屋バックアップファイルではありません。");
          return;
        }
        await importIzakayas(parsed as Izakaya[]);
        alert(`${parsed.length}軒の居酒屋データを復元しました。`);
      } catch {
        alert("JSONファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const referenceCoords = userLocation ?? mapCenter;

  return (
    <div className="h-dvh w-full bg-sumi-950 text-kinari-100 flex flex-col lg:flex-row overflow-hidden">
      {/* ====================================================================
          PC大画面用：左サイドパネル（一覧リスト＆検索常時表示）
         ==================================================================== */}
      <aside className="hidden lg:flex lg:w-[420px] xl:w-[460px] h-full border-r border-sumi-500 flex-col bg-sumi-900 shrink-0 z-20">
        {/* 左サイドヘッダー */}
        <header className="px-4 py-3 bg-sumi-950 border-b border-sumi-500 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-8 bg-chochin border border-white flex items-center justify-center">
              <span className="font-serif text-xs font-black text-white">
                酒
              </span>
            </div>
            <div>
              <h1 className="font-serif text-base font-bold tracking-tight text-kinari-100 leading-none">
                居酒屋開拓マップ
              </h1>
              <p className="text-[10px] text-kinari-400 font-mono mt-0.5">
                DIGITAL AKA-CHOCHIN ARCHIVE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* ダーク / ホワイトモード切替ボタン */}
            <button
              type="button"
              onClick={toggleThemeMode}
              title="ダークモード / ホワイトモード切替"
              className="px-2 py-1 bg-sumi-800 hover:bg-sumi-700 border border-sumi-500 text-[11px] font-bold text-kinari-200 flex items-center gap-1"
            >
              {themeMode === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-karashi" />
                  <span>ホワイト</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-chochin" />
                  <span>ダーク</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3 py-1.5 bg-chochin hover:bg-chochin-hover text-white text-xs font-bold flex items-center gap-1 border border-white/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新規登録</span>
            </button>
          </div>
        </header>

        {/* PC用リストビュー */}
        <div className="flex-1 min-h-0">
          <IzakayaListView
            izakayas={izakayas}
            referenceCoords={referenceCoords}
            hasUserGps={Boolean(userLocation)}
            onRequestGps={handleRequestGps}
            onSelectOnMap={handleSelectFromList}
            onEdit={handleOpenEditModal}
            onToggleVisited={handleToggleVisited}
            onIncrementVisitCount={handleIncrementVisitCount}
          />
        </div>
      </aside>

      {/* ====================================================================
          メイン領域（モバイル全画面 / PC右カラム）
         ==================================================================== */}
      <main className="relative flex-1 h-full flex flex-col min-w-0">
        {/* モバイル・タブレット用上部ヘッダー & 横スクロールジャンル高速フィルタ */}
        <header
          className={`z-20 bg-sumi-950/95 border-b border-sumi-500 pt-safe ${
            activeTab === "list" ? "lg:block" : ""
          }`}
        >
          {/* 上段：タイトル・テーマ切替・モード表示・データ初期化ボタン */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-sumi-500/70">
            <div className="flex items-center gap-2">
              <div className="w-6 h-7 bg-chochin border border-white flex items-center justify-center">
                <span className="font-serif text-[11px] font-black text-white">
                  酒
                </span>
              </div>
              <div>
                <h1 className="font-serif text-sm font-bold tracking-tight text-kinari-100 leading-none">
                  居酒屋開拓マップ
                </h1>
                <p className="text-[10px] text-kinari-400 mt-0.5">
                  全 {izakayas.length} 軒（訪問済{" "}
                  {izakayas.filter((s) => s.visited).length} / 未開拓{" "}
                  {izakayas.filter((s) => !s.visited).length}）
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* ダークモード / ホワイトモード切替ボタン */}
              <button
                type="button"
                onClick={toggleThemeMode}
                aria-label="テーマ切り替え"
                className="px-2 py-1 bg-sumi-800 hover:bg-sumi-700 border border-sumi-500 text-[11px] font-bold text-kinari-100 flex items-center gap-1"
              >
                {themeMode === "dark" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-karashi" />
                    <span>ホワイト</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-chochin" />
                    <span>ダーク</span>
                  </>
                )}
              </button>

              <span className="hidden sm:flex px-2 py-0.5 bg-sumi-800 border border-sumi-500 text-[10px] font-mono text-kinari-400 items-center gap-1">
                {mode === "local" ? (
                  <>
                    <Database className="w-3 h-3 text-karashi" />
                    <span>LOCAL</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3 text-chochin" />
                    <span>CLOUD</span>
                  </>
                )}
              </span>

              {mode === "local" && (
                <>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    title="現在の居酒屋データをJSONファイルにバックアップ保存"
                    className="p-1.5 bg-sumi-800 hover:bg-sumi-700 border border-sumi-500 text-kinari-200 hover:text-kinari-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <label
                    title="バックアップJSONファイルからデータを復元"
                    className="p-1.5 bg-sumi-800 hover:bg-sumi-700 border border-sumi-500 text-kinari-200 hover:text-kinari-100 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="application/json"
                      onChange={handleImportJson}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "ローカルデータを初期の下町プリセット（8軒）にリセットしますか？"
                        )
                      ) {
                        resetDemoData();
                        setSelectedIzakaya(null);
                      }
                    }}
                    title="初期プリセットデータに戻す"
                    className="p-1.5 bg-sumi-800 hover:bg-sumi-700 border border-sumi-500 text-kinari-400 hover:text-kinari-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 下段：マップ表示時のジャンル高速フィルタチップ（複数選択対応） */}
          {activeTab === "map" && (
            <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-sumi-900">
              {QUICK_FILTER_CHIPS.map((chip) => {
                const isActive =
                  chip === "すべて"
                    ? activeChips.length === 0
                    : activeChips.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleToggleMapChip(chip)}
                    className={`px-3 py-1 text-xs font-bold border whitespace-nowrap flex items-center gap-1 transition-colors ${
                      isActive
                        ? "bg-chochin text-white border-white"
                        : "bg-sumi-800 text-kinari-400 border-sumi-500 hover:text-kinari-100"
                    }`}
                  >
                    {isActive && chip !== "すべて" && (
                      <Check className="w-3 h-3" />
                    )}
                    <span>{chip}</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* エラー通知バナー */}
        {error && (
          <div className="bg-chochin/20 border-b border-chochin px-3 py-2 text-xs text-kinari-100 z-20">
            {error}
          </div>
        )}

        {/* メインビューポート：マップ or 一覧リスト */}
        <div className="relative flex-1 min-h-0">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-sumi-950 text-xs text-kinari-400 font-mono">
              暖簾データを読み込み中...
            </div>
          ) : activeTab === "map" ? (
            <IzakayaMap
              izakayas={filteredMapIzakayas}
              selectedIzakaya={selectedIzakaya}
              onSelectIzakaya={handleSelectPinOnMap}
              pickingLocation={pickingLocation}
              pickedCoords={pickedCoords}
              onPickCoords={handlePickCoords}
              flyToTarget={flyToTarget}
              themeMode={themeMode}
              userLocation={userLocation}
              onUpdateUserLocation={setUserLocation}
              onMapCenterChange={setMapCenter}
            />
          ) : (
            <div className="h-full lg:hidden">
              <IzakayaListView
                izakayas={izakayas}
                referenceCoords={referenceCoords}
                hasUserGps={Boolean(userLocation)}
                onRequestGps={handleRequestGps}
                onSelectOnMap={handleSelectFromList}
                onEdit={handleOpenEditModal}
                onToggleVisited={handleToggleVisited}
                onIncrementVisitCount={handleIncrementVisitCount}
              />
            </div>
          )}

          {/* 店舗詳細ハーフシート（下に収納できるバー付き） */}
          {activeTab === "map" && selectedIzakaya && (
            <IzakayaDetailDrawer
              izakaya={selectedIzakaya}
              defaultMinimized={drawerMinimizedByDefault}
              onClose={() => setSelectedIzakaya(null)}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteIzakaya}
              onToggleVisited={handleToggleVisited}
              onIncrementVisitCount={handleIncrementVisitCount}
            />
          )}
        </div>

        {/* ====================================================================
            iPhone片手（親指）操作特化：下部固定ソリッド・ボトムナビゲーションバー
           ==================================================================== */}
        <nav
          aria-label="メインナビゲーション"
          className="lg:hidden z-40 bg-sumi-900 border-t border-sumi-500 pb-safe shrink-0"
        >
          <div className="grid grid-cols-3 h-16 max-w-[480px] mx-auto">
            {/* ① マップタブ */}
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={`flex flex-col items-center justify-center gap-1 border-r border-sumi-500 transition-colors ${
                activeTab === "map"
                  ? "bg-sumi-800 text-chochin font-bold"
                  : "text-kinari-400 hover:text-kinari-100"
              }`}
            >
              <MapIcon className="w-5 h-5" />
              <span className="text-[11px] tracking-tight">赤提灯マップ</span>
            </button>

            {/* ② ＋登録ボタン（中央アクセント） */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex flex-col items-center justify-center gap-1 bg-chochin hover:bg-chochin-hover active:bg-chochin text-white font-bold border-r border-sumi-500 transition-colors"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span className="text-[11px] tracking-tight">＋暖簾を登録</span>
            </button>

            {/* ③ 一覧リストタブ */}
            <button
              type="button"
              onClick={() => {
                setSelectedIzakaya(null);
                setActiveTab("list");
              }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                activeTab === "list"
                  ? "bg-sumi-800 text-chochin font-bold"
                  : "text-kinari-400 hover:text-kinari-100"
              }`}
            >
              <List className="w-5 h-5" />
              <span className="text-[11px] tracking-tight">
                一覧リスト ({izakayas.length})
              </span>
            </button>
          </div>
        </nav>
      </main>

      {/* 新規登録・編集モーダル */}
      <IzakayaFormModal
        isOpen={isFormOpen}
        editingIzakaya={editingIzakaya}
        pickedCoords={pickedCoords}
        referenceCoords={referenceCoords}
        onClose={() => {
          setIsFormOpen(false);
          setPickingLocation(false);
        }}
        onSave={handleSaveIzakaya}
        onRequestMapPick={handleRequestMapPick}
      />
    </div>
  );
}
