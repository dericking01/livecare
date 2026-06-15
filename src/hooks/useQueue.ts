"use client";

import { useQuery } from "@tanstack/react-query";
import type { QueueEntryWithVisitor } from "@/types";

export function useQueue(status?: string) {
  return useQuery<QueueEntryWithVisitor[]>({
    queryKey: ["queue", status],
    queryFn: async () => {
      const url = status ? `/api/queue?status=${status}` : "/api/queue";
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 15_000,
  });
}

export function useQueueEntry(id: string) {
  return useQuery({
    queryKey: ["queue-entry", id],
    queryFn: async () => {
      const res = await fetch(`/api/queue/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 10_000,
    enabled: !!id,
  });
}
