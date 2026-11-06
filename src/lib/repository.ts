import { Izakaya, IzakayaInput } from "@/types/izakaya";
import { INITIAL_MOCK_IZAKAYAS } from "@/lib/mock-data";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

// アップデートしても既存データが消えないよう永続キーを固定（旧キーからの自動引き継ぎ対応）
const LOCAL_STORAGE_KEY = "izakaya_map_records_persistent";
const LEGACY_KEYS = [
  "izakaya_map_records_v3",
  "izakaya_map_records_v2",
  "izakaya_map_records_v1",
];

export interface IIzakayaRepository {
  readonly mode: "local" | "supabase";
  getAll(): Promise<Izakaya[]>;
  create(input: IzakayaInput): Promise<Izakaya>;
  update(id: string, input: Partial<IzakayaInput>): Promise<Izakaya>;
  remove(id: string): Promise<void>;
  resetLocalToDefault?(): Promise<Izakaya[]>;
  importBulk?(records: Izakaya[]): Promise<Izakaya[]>;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * LocalStorage + 初期モックデータで完結するリポジトリ実装
 */
class LocalStorageIzakayaRepository implements IIzakayaRepository {
  readonly mode = "local" as const;

  private readFromStorage(): Izakaya[] {
    if (typeof window === "undefined") {
      return INITIAL_MOCK_IZAKAYAS;
    }
    try {
      let raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      // 旧バージョンのキーにデータが残っていれば自動マイグレーション（引き継ぎ）
      if (!raw) {
        for (const oldKey of LEGACY_KEYS) {
          const oldData = window.localStorage.getItem(oldKey);
          if (oldData) {
            raw = oldData;
            window.localStorage.setItem(LOCAL_STORAGE_KEY, oldData);
            break;
          }
        }
      }
      if (!raw) {
        window.localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(INITIAL_MOCK_IZAKAYAS)
        );
        return INITIAL_MOCK_IZAKAYAS;
      }
      const parsed = JSON.parse(raw) as Izakaya[];
      if (!Array.isArray(parsed)) {
        return INITIAL_MOCK_IZAKAYAS;
      }
      return parsed;
    } catch {
      return INITIAL_MOCK_IZAKAYAS;
    }
  }

  private writeToStorage(records: Izakaya[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  }

  async getAll(): Promise<Izakaya[]> {
    const records = this.readFromStorage();
    return [...records].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async create(input: IzakayaInput): Promise<Izakaya> {
    const records = this.readFromStorage();
    const newRecord: Izakaya = {
      ...input,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    const updated = [newRecord, ...records];
    this.writeToStorage(updated);
    return newRecord;
  }

  async update(id: string, input: Partial<IzakayaInput>): Promise<Izakaya> {
    const records = this.readFromStorage();
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("指定された店舗データが見つかりません。");
    }
    const updatedItem: Izakaya = {
      ...records[index],
      ...input,
    };
    records[index] = updatedItem;
    this.writeToStorage(records);
    return updatedItem;
  }

  async remove(id: string): Promise<void> {
    const records = this.readFromStorage();
    const filtered = records.filter((item) => item.id !== id);
    this.writeToStorage(filtered);
  }

  async resetLocalToDefault(): Promise<Izakaya[]> {
    this.writeToStorage(INITIAL_MOCK_IZAKAYAS);
    return INITIAL_MOCK_IZAKAYAS;
  }

  async importBulk(records: Izakaya[]): Promise<Izakaya[]> {
    this.writeToStorage(records);
    return records;
  }
}

/**
 * Supabase (PostgreSQL + RLS) と通信するリポジトリ実装
 */
class SupabaseIzakayaRepository implements IIzakayaRepository {
  readonly mode = "supabase" as const;

  private getClient() {
    const client = createSupabaseBrowserClient();
    if (!client) {
      throw new Error("Supabase client is not configured.");
    }
    return client;
  }

  async getAll(): Promise<Izakaya[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("izakayas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`データ取得エラー: ${error.message}`);
    }

    return (data ?? []) as Izakaya[];
  }

  async create(input: IzakayaInput): Promise<Izakaya> {
    const supabase = this.getClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("ログインセッションが見つかりません。再ログインしてください。");
    }

    const { data, error } = await supabase
      .from("izakayas")
      .insert([
        {
          ...input,
          user_id: user.id,
        },
      ])
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`登録エラー: ${error?.message ?? "不明なエラー"}`);
    }

    return data as Izakaya;
  }

  async update(id: string, input: Partial<IzakayaInput>): Promise<Izakaya> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("izakayas")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`更新エラー: ${error?.message ?? "不明なエラー"}`);
    }

    return data as Izakaya;
  }

  async remove(id: string): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase.from("izakayas").delete().eq("id", id);

    if (error) {
      throw new Error(`削除エラー: ${error.message}`);
    }
  }
}

export function getIzakayaRepository(): IIzakayaRepository {
  if (isSupabaseConfigured()) {
    return new SupabaseIzakayaRepository();
  }
  return new LocalStorageIzakayaRepository();
}

