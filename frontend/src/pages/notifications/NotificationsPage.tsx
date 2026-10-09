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
    <div>
      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, borderBottom:'1px solid var(--color-hairline)', paddingBottom:20, marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <Bell size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color:'var(--color-ink)' }}>Alerts &amp; Notifications</span>
          </div>
          <div style={{ fontSize:14, color:'var(--color-ink-mute)', fontWeight:300 }}>System notifications, low-stock warnings, and broadcast alerts via WebSocket (F2)</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 12px', borderRadius:'var(--radius-pill)', border:'1px solid var(--color-hairline)', backgroundColor:'var(--color-canvas-soft)' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', backgroundColor: wsConnected ? '#16a34a' : 'var(--color-ink-mute)', display:'inline-block', boxShadow: wsConnected ? '0 0 0 3px rgba(22,163,74,0.18)' : 'none' }} />
          <span style={{ fontSize:12, color:'var(--color-ink-mute)', fontWeight:300 }}>{wsConnected ? 'Live /ws/alerts connected' : 'WebSocket standby'}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--color-ink-mute)', fontSize:14 }}>Loading notifications&hellip;</div>
      ) : notifications.length === 0 ? (
        <div style={{ padding:48, border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', textAlign:'center', backgroundColor:'var(--color-canvas-soft)' }}>
          <CheckCircle2 size={32} color="var(--color-ink-mute)" style={{ margin:'0 auto 10px' }} />
          <div style={{ fontSize:16, fontWeight:400, color:'var(--color-ink)', marginBottom:4 }}>Inbox is clear</div>
          <div style={{ fontSize:14, color:'var(--color-ink-mute)', fontWeight:300 }}>No alerts or notifications recorded yet.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {notifications.map((item) => {
            const isUnread = item.status === 'Unread';
            const isLowStock = item.type === 'LOW_STOCK';
            return (
              <div key={item.notificationId}
                style={{
                  padding:16, borderRadius:'var(--radius-lg)', border:'1px solid',
                  borderColor: isUnread ? (isLowStock ? '#fde68a' : 'rgba(83,58,253,0.35)') : 'var(--color-hairline)',
                  backgroundColor: isUnread ? (isLowStock ? '#fffbeb' : 'rgba(83,58,253,0.03)') : 'var(--color-canvas-soft)',
                  display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16,
                  boxShadow: isUnread ? 'var(--shadow-1)' : 'none', transition:'background 0.15s',
                }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ padding:8, borderRadius:8, marginTop:2, flexShrink:0,
                    backgroundColor: isLowStock ? '#fef9c3' : 'rgba(83,58,253,0.08)',
                    color: isLowStock ? '#92400e' : 'var(--color-primary)' }}>
                    {isLowStock ? <AlertTriangle size={14} /> : <Info size={14} />}
                  </div>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                      <span className="pill-tag" style={{ fontSize:9,
                        backgroundColor: isLowStock ? '#fef9c3' : 'rgba(83,58,253,0.08)',
                        color: isLowStock ? '#92400e' : 'var(--color-primary)',
                        borderColor: isLowStock ? '#fde68a' : 'rgba(83,58,253,0.25)' }}>
                        {item.type}
                      </span>
                      {isUnread && (
                        <span style={{ fontSize:9, padding:'2px 6px', borderRadius:4, backgroundColor:'rgba(83,58,253,0.12)', color:'var(--color-primary)', fontWeight:400, letterSpacing:'0.06em' }}>NEW</span>
                      )}
                    </div>
                    <div style={{ fontSize:14, color:'var(--color-ink)', fontWeight:300, marginBottom:6 }}>{item.message}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--color-ink-mute)' }}>
                      <Clock size={11} />
                      <span className="tnum">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {isUnread && (
                  <button onClick={() => handleMarkAsRead(item.notificationId)} className="btn-ghost-sm" style={{ fontSize:12, flexShrink:0 }}>
                    Mark read
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
