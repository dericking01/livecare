"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import { ShieldOff } from "lucide-react";

export function ForceLogoutWatcher() {
  const { data: session } = useSession();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = getSocket();
    socket.emit("user:session:join", session.user.id);

    const handler = () => {
      setBlocked(true);
      // Give the user 4 seconds to read the message then sign out
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 4000);
    };

    socket.on("user:force-logout", handler);
    return () => { socket.off("user:force-logout", handler); };
  }, [session?.user?.id]);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldOff className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Account Deactivated</h2>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Your account has been deactivated by an administrator.
            Kindly contact your Admin for assistance.
          </p>
        </div>
        <p className="text-xs text-gray-400">You will be signed out automatically…</p>
      </div>
    </div>
  );
}
