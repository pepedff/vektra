"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { getBrowserClient } from "@/lib/supabase/client";
import type { NotificationType, Order } from "@/lib/supabase/types";
import { dismissNotification, markNotificationsSeen } from "@/server/client-actions";

export type PanelNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  pinned: boolean;
  created_at: string;
  seen: boolean;
  dismissed: boolean;
};

type Ctx = {
  variant: "client" | "admin";
  items: PanelNotification[];
  unread: number;
  clearUnread: () => void;
  dismiss: (id: string) => void;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications precisa de <NotificationsProvider>");
  return ctx;
}

export function NotificationsProvider({
  variant,
  initial,
  children,
}: {
  variant: "client" | "admin";
  initial: PanelNotification[];
  children: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<PanelNotification[]>(initial);
  const [unreadIds, setUnreadIds] = useState<string[]>(() => initial.filter((n) => !n.seen).map((n) => n.id));
  const known = useRef(new Set(initial.map((n) => n.id)));

  const announce = useCallback(
    (fresh: PanelNotification[]) => {
      fresh.slice(0, 3).forEach((n, i) => {
        window.setTimeout(() => toast({ type: n.type, title: n.title, description: n.message, duration: 7000 }), 350 + i * 250);
      });
      const ids = fresh.map((n) => n.id);
      void markNotificationsSeen(ids).then((res) => {
        if (!res.ok) console.error("[notifications] markSeen", res.error);
      });
    },
    [toast],
  );

  const announcedInitial = useRef(false);
  useEffect(() => {
    if (variant !== "client" || announcedInitial.current) return;
    announcedInitial.current = true;
    const unseen = initial.filter((n) => !n.seen);
    if (unseen.length) announce(unseen);
  }, [variant, initial, announce]);

  useEffect(() => {
    const supabase = getBrowserClient();

    const refetchMine = async () => {
      const { data, error } = await supabase.rpc("my_notifications", { p_limit: 30 });
      if (error) {
        console.error("[notifications] refetch", error);
        return;
      }
      const list = data as PanelNotification[];
      const fresh = list.filter((n) => !known.current.has(n.id));
      fresh.forEach((n) => known.current.add(n.id));
      setItems(list);
      if (fresh.length) {
        setUnreadIds((prev) => [...prev, ...fresh.map((n) => n.id)]);
        announce(fresh);
        router.refresh();
      }
    };

    const channel = supabase
      .channel(`notifications-${variant}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        if (variant === "client") {
          void refetchMine();
          return;
        }
        const row = payload.new as PanelNotification;
        known.current.add(row.id);
        setItems((prev) => [{ ...row, seen: true, dismissed: false }, ...prev].slice(0, 30));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setItems((prev) => prev.filter((n) => n.id !== id));
      });

    if (variant === "admin") {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const row = payload.new as Partial<Order>;
        if (payload.eventType === "UPDATE" && row.status === "aguardando") {
          toast({ type: "info", title: "Cliente informou pagamento", description: `Confira o PIX ${row.pix_txid ?? ""} e confirme em Pedidos.`, duration: 9000 });
        }
        router.refresh();
      });
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [variant, announce, router, toast]);

  const dismiss = useCallback(
    (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n)));
      void dismissNotification(id).then((res) => {
        if (!res.ok) toast({ type: "error", title: "Não foi possível dispensar", description: res.error });
      });
    },
    [toast],
  );

  const value = useMemo<Ctx>(
    () => ({ variant, items, unread: unreadIds.length, clearUnread: () => setUnreadIds([]), dismiss }),
    [variant, items, unreadIds.length, dismiss],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
