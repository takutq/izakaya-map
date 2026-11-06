"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Izakaya, IzakayaInput } from "@/types/izakaya";
import { INITIAL_MOCK_IZAKAYAS } from "@/lib/mock-data";
import { getIzakayaRepository } from "@/lib/repository";

export function useIzakayas() {
  const repository = useMemo(() => getIzakayaRepository(), []);
  const [izakayas, setIzakayas] = useState<Izakaya[]>(INITIAL_MOCK_IZAKAYAS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await repository.getAll();
      setIzakayas(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの読み込みに失敗しました。"
      );
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addIzakaya = useCallback(
    async (input: IzakayaInput) => {
      const created = await repository.create(input);
      setIzakayas((prev) => [created, ...prev]);
      return created;
    },
    [repository]
  );

  const updateIzakaya = useCallback(
    async (id: string, input: Partial<IzakayaInput>) => {
      const updated = await repository.update(id, input);
      setIzakayas((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    [repository]
  );

  const deleteIzakaya = useCallback(
    async (id: string) => {
      await repository.remove(id);
      setIzakayas((prev) => prev.filter((item) => item.id !== id));
    },
    [repository]
  );

  const toggleVisited = useCallback(
    async (izakaya: Izakaya) => {
      const nextVisited = !izakaya.visited;
      const nextCount = nextVisited
        ? Math.max(1, izakaya.visit_count ?? 0)
        : 0;
      return updateIzakaya(izakaya.id, {
        visited: nextVisited,
        visit_count: nextCount,
      });
    },
    [updateIzakaya]
  );

  const incrementVisitCount = useCallback(
    async (izakaya: Izakaya, delta: number) => {
      const nextCount = Math.max(0, (izakaya.visit_count ?? 0) + delta);
      return updateIzakaya(izakaya.id, {
        visit_count: nextCount,
        visited: nextCount > 0 ? true : izakaya.visited,
      });
    },
    [updateIzakaya]
  );

  const resetDemoData = useCallback(async () => {
    if (repository.resetLocalToDefault) {
      const data = await repository.resetLocalToDefault();
      setIzakayas(data);
    }
  }, [repository]);

  const importIzakayas = useCallback(
    async (records: Izakaya[]) => {
      if (repository.importBulk) {
        const data = await repository.importBulk(records);
        setIzakayas(data);
      }
    },
    [repository]
  );

  return {
    izakayas,
    loading,
    error,
    mode: repository.mode,
    refresh: fetchAll,
    addIzakaya,
    updateIzakaya,
    deleteIzakaya,
    toggleVisited,
    incrementVisitCount,
    resetDemoData,
    importIzakayas,
  };
}

