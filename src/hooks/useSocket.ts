"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export function useSocket(): Socket {
  return getSocket();
}

export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void,
  deps: unknown[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const cb = (data: T) => handlerRef.current(data);
    socket.on(event, cb);
    return () => { socket.off(event, cb); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

export function useSocketEmit() {
  return useCallback((event: string, ...args: unknown[]) => {
    getSocket().emit(event, ...args);
  }, []);
}
