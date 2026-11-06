"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  MapRef,
  MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Izakaya } from "@/types/izakaya";
import { LocateFixed, Crosshair, Compass } from "lucide-react";

/**
 * ベクターマップタイル（CartoDB Voyager / Positron GL）を使用：
 * - 地図を回転させても、道路名や駅名などの文字は常に水平（正立）を保ち逆さまにならない
 * - 余計な巨大観光地アイコンや商業POIが一切出ないため、自分の赤提灯ピンが主役としてくっきり見える
 */
const VECTOR_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// 拡大時のみ店名ラベルを表示し、広域表示（ピンチアウト時）はピン単体にする閾値
const LABEL_VISIBLE_MIN_ZOOM = 13.8;

interface IzakayaMapProps {
  izakayas: Izakaya[];
  selectedIzakaya: Izakaya | null;
  onSelectIzakaya: (izakaya: Izakaya | null) => void;
  pickingLocation: boolean;
  pickedCoords: { lat: number; lng: number } | null;
  onPickCoords: (coords: { lat: number; lng: number }) => void;
  flyToTarget: { lat: number; lng: number; zoom?: number } | null;
  themeMode: "dark" | "light";
  userLocation: { lat: number; lng: number } | null;
  onUpdateUserLocation: (coords: { lat: number; lng: number }) => void;
  onMapCenterChange?: (coords: { lat: number; lng: number }) => void;
}

export default function IzakayaMap({
  izakayas,
  selectedIzakaya,
  onSelectIzakaya,
  pickingLocation,
  pickedCoords,
  onPickCoords,
  flyToTarget,
  themeMode,
  userLocation,
  onUpdateUserLocation,
  onMapCenterChange,
}: IzakayaMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14.2);
  const [currentBearing, setCurrentBearing] = useState<number>(0);
  const [locating, setLocating] = useState(false);

  // ベクター地図の邪魔なPOIアイコン・ランドマーク・3D建物を非表示にし、道路・線路・駅名だけをスッキリ残す
  const customizeVectorLayers = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const style = map.getStyle();
    if (!style || !style.layers) return;

    for (const layer of style.layers) {
      const id = layer.id.toLowerCase();
      // 観光名所・一般店舗POI・空港などの巨大ラベルを非表示にして赤提灯ピンを最前面で目立たせる
      if (
        id.includes("poi") ||
        id.includes("place_other") ||
        id.includes("aeroway")
      ) {
        try {
          map.setLayoutProperty(layer.id, "visibility", "none");
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // 外部からのフライ移動指示に追従
  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      const targetZoom = flyToTarget.zoom ?? 16;
      mapRef.current.flyTo({
        center: [flyToTarget.lng, flyToTarget.lat],
        zoom: targetZoom,
        duration: 850,
        essential: true,
      });
      setCurrentZoom(targetZoom);
    }
  }, [flyToTarget]);

  // 選択された店舗があればそこへスムーズに移動（オフセットを最小限にして画面中央に見やすく配置）
  useEffect(() => {
    if (selectedIzakaya && mapRef.current) {
      const nextZoom = Math.max(mapRef.current.getZoom(), 15.5);
      mapRef.current.flyTo({
        center: [selectedIzakaya.lng, selectedIzakaya.lat],
        zoom: nextZoom,
        offset: [0, -30],
        duration: 650,
        essential: true,
      });
      setCurrentZoom(nextZoom);
    }
  }, [selectedIzakaya]);

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (pickingLocation) {
        onPickCoords({
          lat: Number(e.lngLat.lat.toFixed(6)),
          lng: Number(e.lngLat.lng.toFixed(6)),
        });
        return;
      }
      onSelectIzakaya(null);
    },
    [pickingLocation, onPickCoords, onSelectIzakaya]
  );

  // 回転（方角）を北向き（0度）にリセット
  const handleResetNorth = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.easeTo({ bearing: 0, pitch: 0, duration: 400 });
      setCurrentBearing(0);
    }
  }, []);

  // 現在地を取得してフライ移動
  const handleLocateCurrentPosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      alert("お使いの端末・ブラウザでは位置情報取得がサポートされていません。");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        onUpdateUserLocation(coords);
        setLocating(false);
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [coords.lng, coords.lat],
            zoom: 15.8,
            duration: 900,
            essential: true,
          });
          setCurrentZoom(15.8);
        }
      },
      (err) => {
        setLocating(false);
        alert(
          `現在地を取得できませんでした（${err.message}）。iPhoneの設定 > プライバシー > 位置情報サービスをご確認ください。`
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000,
      }
    );
  }, [onUpdateUserLocation]);

  // 広域表示かどうか（ピンチアウト時はラベルを隠してピンだけにする）
  const isWideView = currentZoom < LABEL_VISIBLE_MIN_ZOOM;

  return (
    <div
      className={`relative w-full h-full bg-sumi-950 select-none vector-map-${themeMode}`}
    >
      {/* Googleマップ風の明瞭な配色（ダークモード時はGoogleマップのダークテーマ同等のコントラストに変換） */}
      <style jsx global>{`
        .vector-map-light .maplibregl-canvas {
          filter: contrast(1.03) saturate(1.05);
        }
        .vector-map-dark .maplibregl-canvas {
          filter: invert(90%) hue-rotate(185deg) brightness(104%) contrast(105%)
            saturate(0.75);
        }
      `}</style>

      <Map
        ref={mapRef}
        initialViewState={{
          latitude: 35.67205,
          longitude: 139.7962,
          zoom: 14.2,
        }}
        pitchWithRotate={false}
        onLoad={customizeVectorLayers}
        onMove={(evt) => {
          setCurrentZoom(evt.viewState.zoom);
          setCurrentBearing(evt.viewState.bearing);
          if (onMapCenterChange) {
            onMapCenterChange({
              lat: evt.viewState.latitude,
              lng: evt.viewState.longitude,
            });
          }
        }}
        mapStyle={VECTOR_MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        onClick={handleMapClick}
        attributionControl={false}
        cursor={pickingLocation ? "crosshair" : "grab"}
      >
        {/* PC/タブレット向けズームコントロール */}
        <div className="hidden sm:block">
          <NavigationControl position="bottom-right" showCompass={true} />
        </div>

        {/* 現在地マーカー（Googleマップ風の青い現在地ドット） */}
        {userLocation && (
          <Marker
            latitude={userLocation.lat}
            longitude={userLocation.lng}
            anchor="center"
            rotationAlignment="viewport"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-4 h-4 rounded-full bg-[#4285F4] border-2 border-white shadow" />
            </div>
          </Marker>
        )}

        {/* 新規登録・編集時の座標指定ピン */}
        {pickedCoords && (
          <Marker
            latitude={pickedCoords.lat}
            longitude={pickedCoords.lng}
            anchor="bottom"
            rotationAlignment="viewport"
          >
            <div className="flex flex-col items-center">
              <div className="px-2 py-0.5 bg-sumi-950 border border-karashi text-karashi text-[11px] font-bold mb-1 whitespace-nowrap">
                指定地点
              </div>
              <div className="w-4 h-4 bg-karashi border-2 border-sumi-950 rotate-45" />
            </div>
          </Marker>
        )}

        {/* 居酒屋カスタム提灯ピン（rotationAlignment="viewport" で地図を回転しても常に水平を維持） */}
        {izakayas.map((shop) => {
          const isSelected = selectedIzakaya?.id === shop.id;
          const isVisited = shop.visited;
          const showShopLabel = !isWideView || isSelected;

          return (
            <Marker
              key={shop.id}
              latitude={shop.lat}
              longitude={shop.lng}
              anchor="bottom"
              rotationAlignment="viewport"
              pitchAlignment="viewport"
              style={{ zIndex: isSelected ? 30 : 10 }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                if (pickingLocation) {
                  onPickCoords({ lat: shop.lat, lng: shop.lng });
                  return;
                }
                onSelectIzakaya(shop);
              }}
            >
              <button
                type="button"
                aria-label={shop.name}
                className="group flex flex-col items-center focus:outline-none"
              >
                {/* 店舗名ラベル（広域ピンチアウト時は非表示にして重なりを防止） */}
                {showShopLabel && (
                  <div
                    className={`px-2 py-0.5 text-[11px] font-bold tracking-tight border transition-colors whitespace-nowrap mb-1 ${
                      isSelected
                        ? isVisited
                          ? "bg-chochin text-white border-white"
                          : "bg-karashi text-neutral-950 border-white"
                        : "bg-sumi-900/95 text-kinari-100 border-sumi-500 group-hover:border-chochin"
                    }`}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 mr-1 align-middle ${
                        isVisited ? "bg-chochin" : "bg-karashi"
                      } ${isSelected ? "bg-white" : ""}`}
                    />
                    {shop.name}
                    {shop.visit_count > 0 && (
                      <span className="ml-1 text-[10px] opacity-85 font-mono">
                        ({shop.visit_count}回)
                      </span>
                    )}
                  </div>
                )}

                {/* 提灯モチーフのソリッドピン本体 */}
                <div className="relative flex flex-col items-center">
                  {/* 上部金具 */}
                  <div className="w-2.5 h-0.5 bg-neutral-800 dark:bg-neutral-200" />
                  {/* 提灯胴体 */}
                  <div
                    className={`flex items-center justify-center border transition-transform ${
                      isSelected
                        ? "w-7 h-8 scale-110"
                        : isWideView
                        ? "w-5 h-6"
                        : "w-6 h-7"
                    } ${
                      isVisited
                        ? "bg-chochin border-white text-white"
                        : "bg-karashi border-neutral-900 text-neutral-950"
                    }`}
                  >
                    <span
                      className={`font-serif font-black leading-none ${
                        isWideView && !isSelected ? "text-[9px]" : "text-[11px]"
                      }`}
                    >
                      {isVisited ? "酒" : "未"}
                    </span>
                  </div>
                  {/* 下部金具＋針 */}
                  <div className="w-2.5 h-0.5 bg-neutral-800 dark:bg-neutral-200" />
                  <div className="w-0.5 h-1.5 bg-neutral-900 dark:bg-white" />
                </div>
              </button>
            </Marker>
          );
        })}
      </Map>

      {/* 地図タップで座標選択中のバナー */}
      {pickingLocation && (
        <div className="absolute top-4 left-3 right-3 z-20 pointer-events-none flex justify-center">
          <div className="bg-sumi-900 border border-karashi px-3 py-2 flex items-center gap-2 text-xs text-kinari-100">
            <Crosshair className="w-4 h-4 text-karashi shrink-0" />
            <span>
              マップ上の任意地点をタップして店舗の位置を指定してください
            </span>
          </div>
        </div>
      )}

      {/* 右下フローティング操作群：コンパス（回転時のみ） & 凡例 & 現在地取得ボタン */}
      <div className="absolute right-3 bottom-4 z-10 flex flex-col items-end gap-2">
        {/* 地図が回転している時だけ表示される「北へ戻す」ボタン */}
        {Math.abs(currentBearing) > 1 && (
          <button
            type="button"
            onClick={handleResetNorth}
            aria-label="北を上に戻す"
            className="h-9 px-2.5 bg-sumi-800 hover:bg-sumi-700 border border-sumi-500 text-kinari-100 flex items-center gap-1.5 text-[11px] font-bold"
          >
            <Compass
              className="w-4 h-4 text-chochin"
              style={{ transform: `rotate(${-currentBearing}deg)` }}
            />
            <span>北へ戻す</span>
          </button>
        )}

        {/* 凡例バッジ */}
        <div className="bg-sumi-900/95 border border-sumi-500 px-2.5 py-1.5 flex items-center gap-3 text-[11px] text-kinari-200">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-chochin inline-block border border-white/40" />
            訪問済
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-karashi inline-block border border-neutral-900" />
            未訪問
          </span>
        </div>

        {/* 現在地へフライ移動ボタン */}
        <button
          type="button"
          onClick={handleLocateCurrentPosition}
          disabled={locating}
          aria-label="現在地へ移動"
          className="h-11 px-3.5 bg-sumi-700 hover:bg-sumi-600 active:bg-sumi-800 border border-sumi-500 text-kinari-100 flex items-center gap-2 text-xs font-bold transition-colors"
        >
          <LocateFixed
            className={`w-4 h-4 text-chochin ${locating ? "animate-spin" : ""}`}
          />
          <span>{locating ? "測位中..." : "現在地"}</span>
        </button>
      </div>
    </div>
  );
}
