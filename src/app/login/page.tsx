"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { KeyRound, Mail, ArrowRight, ShieldCheck, Database } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [authMethod, setAuthMethod] = useState<"password" | "magic">(
    "password"
  );
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.push("/");
      return;
    }

    setLoading(true);
    try {
      if (authMethod === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (otpError) throw otpError;
        setMessage(
          "ログイン用マジックリンクをメールに送信しました。受信トレイをご確認ください。"
        );
      } else if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage(
          "アカウント登録を受け付けました。確認メールまたはそのままログインをお試しください。"
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "認証中にエラーが発生しました。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-sumi-950 text-kinari-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-sumi-800 border border-sumi-500 p-6 space-y-6">
        {/* タイトル・赤提灯ヘッダー */}
        <div className="border-b border-sumi-500 pb-4 flex items-center gap-3">
          <div className="w-10 h-12 bg-chochin border-2 border-kinari-100 flex items-center justify-center shrink-0">
            <span className="font-serif text-lg font-black text-kinari-100">
              酒
            </span>
          </div>
          <div>
            <p className="text-[11px] font-mono text-karashi tracking-wider uppercase">
              PRIVATE IZAKAYA ARCHIVE
            </p>
            <h1 className="font-serif text-xl font-bold text-kinari-100 tracking-tight">
              居酒屋開拓マップ 認証
            </h1>
          </div>
        </div>

        {!configured ? (
          /* ローカルモード時の案内 */
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-sumi-900 border border-karashi space-y-2">
              <div className="flex items-center gap-1.5 text-karashi font-bold">
                <Database className="w-4 h-4" />
                <span>現在「ローカルモード」で動作中です</span>
              </div>
              <p className="text-kinari-200 leading-relaxed">
                環境変数（<code className="font-mono text-kinari-100">NEXT_PUBLIC_SUPABASE_URL</code>）が未設定のため、ログイン不要でモック初期データ＋端末の
                <code className="font-mono text-kinari-100">localStorage</code>
                にて即座に全機能をご利用いただけます。
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full py-3 bg-chochin hover:bg-chochin-hover text-kinari-100 font-bold text-xs flex items-center justify-center gap-2"
            >
              <span>マップ画面へ戻る</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Supabase Auth フォーム */
          <form onSubmit={handleAuth} className="space-y-4 text-xs">
            {/* 認証方式タブ切替 */}
            <div className="grid grid-cols-2 border border-sumi-500 bg-sumi-900 p-0.5">
              <button
                type="button"
                onClick={() => setAuthMethod("password")}
                className={`py-2 font-bold flex items-center justify-center gap-1.5 ${
                  authMethod === "password"
                    ? "bg-sumi-700 text-kinari-100 border border-sumi-500"
                    : "text-kinari-400"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>メール＋パスワード</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod("magic")}
                className={`py-2 font-bold flex items-center justify-center gap-1.5 ${
                  authMethod === "magic"
                    ? "bg-sumi-700 text-kinari-100 border border-sumi-500"
                    : "text-kinari-400"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Magic Link</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-chochin/20 border border-chochin text-kinari-100">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-karashi/20 border border-karashi text-kinari-100">
                {message}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-kinari-400 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 bg-sumi-900 border border-sumi-500 text-kinari-100 text-sm focus:outline-none focus:border-chochin"
              />
            </div>

            {authMethod === "password" && (
              <div>
                <label className="block text-[11px] font-bold text-kinari-400 mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  className="w-full px-3 py-2.5 bg-sumi-900 border border-sumi-500 text-kinari-100 text-sm focus:outline-none focus:border-chochin"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-chochin hover:bg-chochin-hover text-kinari-100 border border-kinari-100/20 font-bold text-xs flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {loading
                  ? "通信中..."
                  : authMethod === "magic"
                  ? "マジックリンクを送信"
                  : isSignUp
                  ? "新規アカウントを作成"
                  : "暖簾をくぐる（ログイン）"}
              </span>
            </button>

            {authMethod === "password" && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsSignUp((prev) => !prev)}
                  className="text-kinari-400 hover:text-kinari-100 underline"
                >
                  {isSignUp
                    ? "すでにアカウントをお持ちの方はこちら"
                    : "初回アカウント登録はこちら"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

