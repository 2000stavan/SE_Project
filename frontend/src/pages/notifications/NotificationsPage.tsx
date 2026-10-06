import { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { Bell, CheckCircle2, AlertTriangle, Info, Clock } from 'lucide-react';

interface NotificationItem {
  notificationId: string;
  type: string;
  message: string;
  status: 'Unread' | 'Read';
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<NotificationItem[]>('/api/v1/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/alerts`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ALERT' || payload.type === 'LOW_STOCK') {
            const newItem: NotificationItem = {
              notificationId: payload.notificationId || `ws-${Date.now()}`,
              type: payload.type,
              message: payload.message || JSON.stringify(payload),
              status: 'Unread',
              createdAt: new Date().toISOString(),
            };
            setNotifications((prev) => [newItem, ...prev]);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, status: 'Read' } : n))
      );
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-emerald-400" />
            Alerts & Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System notifications, low-stock reorder warnings, and broadcast alerts (F2)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-xs text-slate-400">
            {wsConnected ? 'Live stream connected (/ws/alerts)' : 'Stream standby'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/40 text-center">
          <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-300 font-medium">Inbox is empty</p>
          <p className="text-xs text-slate-500 mt-1">No alerts or notifications recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const isUnread = item.status === 'Unread';
            const isLowStock = item.type === 'LOW_STOCK';
            return (
              <div
                key={item.notificationId}
                className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                  isUnread
                    ? 'border-emerald-800/60 bg-emerald-950/20 shadow-sm'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      isLowStock
                        ? 'bg-amber-950/70 text-amber-400'
                        : 'bg-emerald-950/70 text-emerald-400'
                    }`}
                  >
                    {isLowStock ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">
                        {item.type}
                      </span>
                      {isUnread && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 mt-1">{item.message}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {isUnread && (
                  <button
                    onClick={() => handleMarkAsRead(item.notificationId)}
                    className="shrink-0 text-xs text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded border border-emerald-800/60 hover:bg-emerald-950/40 transition"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
