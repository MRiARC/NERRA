"use client";

import React, { useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/useAuthStore";
import { Laptop, Smartphone, Globe, ShieldAlert, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SessionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionsDrawer({ isOpen, onClose }: SessionsDrawerProps) {
  const { sessions, fetchSessions, revokeSession, revokeAllOtherSessions } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Active Device Sessions"
      subtitle="Cryptographic session tokens and active workstations"
      width="md"
    >
      <div className="space-y-5">
        <p className="text-xs text-ink-bone leading-relaxed">
          NERRA uses rotating session tokens bound to your browser device. If you suspect an unauthorized login, revoke individual sessions or reset all secondary devices.
        </p>

        {/* Sessions List */}
        <div className="space-y-2.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="p-3.5 rounded-[4px] bg-surface-card border border-border-subtle flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-[4px] bg-surface-subtle border border-border-quiet text-ink-bone shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-parchment">
                      {session.user_agent ? session.user_agent.split("/")[0] : "Browser Session"}
                    </span>
                    {session.is_current && (
                      <Badge variant="thread" size="xs">
                        Current Device
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-ash">
                    IP: {session.ip_address || "Localhost"} • Active {formatDate(session.last_active_at)}
                  </p>
                </div>
              </div>

              {!session.is_current && (
                <button
                  onClick={() => revokeSession(session.id)}
                  className="p-1.5 text-ink-ash hover:text-severity-contradiction hover:bg-severity-contradiction-bg rounded-[4px] transition-colors"
                  title="Revoke session"
                  aria-label="Revoke session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-6 text-xs text-ink-ash">
              No secondary sessions recorded.
            </div>
          )}
        </div>

        {sessions.length > 1 && (
          <div className="pt-3 border-t border-border-quiet">
            <Button
              variant="danger"
              size="sm"
              onClick={revokeAllOtherSessions}
              className="w-full gap-2"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Revoke All Other Devices</span>
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
