import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, PackageX, AlertTriangle, IndianRupee, Bell, ShoppingCart, ArrowRight, Users, TrendingUp, ClipboardList, Building2, Mic } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';

interface StockItem { sku_id: string; name: string; location_id: string; quantity_on_hand: number; reorder_point: number }
interface StockData {
  total_products: number; total_units_on_hand: number; total_inventory_valuation: number;
  low_stock_count: number; out_of_stock_count: number; overstock_count: number; low_stock_items: StockItem[];
}
interface RevenueData { total_revenue: number; total_orders: number; average_order_value: number; breakdown: { group: string; revenue: number; order_count: number }[] }
interface Notif { status: string }

const HERO: Record<string, { title: string; text: string }> = {
  Administrator: { title: 'Administrator Dashboard', text: 'Full system access: manage users, review the audit trail, approve purchase orders and monitor forecasts.' },
  Manager: { title: 'Manager Dashboard', text: 'Approve purchase orders, manage suppliers and act on demand forecasts and reorder suggestions.' },
  'Warehouse Staff': { title: 'Warehouse Dashboard', text: 'Keep stock accurate: adjust inventory, use voice commands and receive purchase orders.' },
  'Sales Personnel': { title: 'Sales Dashboard', text: 'Ring up sales, generate invoices and process customer returns.' },
};

const QUICK: Record<string, { label: string; sub: string; path: string; icon: typeof Boxes }[]> = {
  Administrator: [
    { label: 'Manage users', sub: 'Roles, status, unlock accounts', path: '/users', icon: Users },
    { label: 'Purchase orders', sub: 'Review and approve', path: '/purchase-orders', icon: ClipboardList },
    { label: 'Forecasting', sub: 'Demand, reorder, revenue', path: '/forecast', icon: TrendingUp },
    { label: 'Suppliers', sub: 'Ratings and history', path: '/suppliers', icon: Building2 },
  ],
  Manager: [
    { label: 'Forecasting', sub: 'Run forecast, create draft POs', path: '/forecast', icon: TrendingUp },
    { label: 'Purchase orders', sub: 'Create and approve', path: '/purchase-orders', icon: ClipboardList },
    { label: 'Suppliers', sub: 'Manage the vendor network', path: '/suppliers', icon: Building2 },
    { label: 'Inventory', sub: 'Monitor stock levels', path: '/inventory', icon: Boxes },
  ],
  'Warehouse Staff': [
    { label: 'Inventory', sub: 'Products and stock by location', path: '/inventory', icon: Boxes },
    { label: 'Voice commands', sub: 'Update stock hands-free', path: '/voice', icon: Mic },
    { label: 'Receive goods', sub: 'Confirm purchase-order receipts', path: '/purchase-orders', icon: ClipboardList },
    { label: 'Alerts', sub: 'Low-stock warnings', path: '/notifications', icon: Bell },
  ],
  'Sales Personnel': [
    { label: 'Point of sale', sub: 'Create a sale and invoice', path: '/sales', icon: ShoppingCart },
    { label: 'Inventory', sub: 'Check availability', path: '/inventory', icon: Boxes },
    { label: 'Alerts', sub: 'Order confirmations', path: '/notifications', icon: Bell },
  ],
};

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

function Stat({ icon: Icon, label, value, sub, color }: { icon: typeof Boxes; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1px', color: 'var(--color-ink-mute)' }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} strokeWidth={1.5} />
        </div>
      </div>
      <div className="tnum" style={{ fontSize: 22, color: 'var(--color-ink)', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 300 }}>{sub}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stock, setStock] = useState<StockData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [unread, setUnread] = useState<number | null>(null);

  const canStock = !!user && ['Administrator', 'Manager', 'Warehouse Staff'].includes(user.role);
  const canRevenue = !!user && ['Administrator', 'Manager'].includes(user.role);

  useEffect(() => {
    if (!user) return;
    if (canStock) apiRequest<{ data: StockData }>('/api/v1/analytics/stock').then((r) => setStock(r.data)).catch(() => {});
    if (canRevenue) apiRequest<{ data: RevenueData }>('/api/v1/analytics/revenue?group_by=channel').then((r) => setRevenue(r.data)).catch(() => {});
    apiRequest<Notif[]>('/api/v1/notifications').then((n) => setUnread(n.filter((x) => x.status === 'Unread').length)).catch(() => {});
  }, [user, canStock, canRevenue]);

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="card-primary" style={{ padding: '26px 30px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          {(HERO[user.role] ?? HERO.Manager).title}
        </div>
        <div style={{ fontSize: 26, fontWeight: 300, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>Welcome back, {user.name}</div>
        <div style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.8)', maxWidth: 560 }}>{(HERO[user.role] ?? HERO.Manager).text}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        {stock && <Stat icon={Boxes} label="Units on hand" value={stock.total_units_on_hand.toLocaleString('en-IN')} sub={`${stock.total_products} products · ${inr(stock.total_inventory_valuation)} value`} color="#0d9488" />}
        {stock && <Stat icon={AlertTriangle} label="Low stock" value={String(stock.low_stock_count)} sub={`${stock.overstock_count} overstocked`} color="#9b6829" />}
        {stock && <Stat icon={PackageX} label="Out of stock" value={String(stock.out_of_stock_count)} sub="SKUs needing replenishment" color="#ea2261" />}
        {revenue && <Stat icon={IndianRupee} label="Revenue" value={inr(revenue.total_revenue)} sub={`${revenue.total_orders} orders · AOV ${inr(revenue.average_order_value)}`} color="#166534" />}
        <Stat icon={Bell} label="Unread alerts" value={unread === null ? '…' : String(unread)} sub="Low stock, delays, PO updates" color="#0f766e" />
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-ink-mute)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Quick actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {(QUICK[user.role] ?? []).map((q) => (
            <Link key={q.path + q.label} to={q.path} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--color-nav-active-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <q.icon size={17} color="var(--color-primary)" strokeWidth={1.7} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{q.label}</div>
                <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--color-ink-mute)' }}>{q.sub}</div>
              </div>
              <ArrowRight size={14} color="var(--color-ink-mute)" />
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {revenue && revenue.breakdown.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div className="text-heading-sm" style={{ color: 'var(--color-ink)', marginBottom: 12 }}>Revenue by channel</div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={revenue.breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,140,160,0.25)" vertical={false} />
                  <XAxis dataKey="group" tick={{ fontSize: 11, fill: 'var(--color-ink-mute)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-mute)' }} tickFormatter={(v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : String(v))} />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background:'var(--color-canvas)', border:'1px solid var(--color-hairline)', borderRadius:8, color:'var(--color-ink)', fontSize:12 }} labelStyle={{ color:'var(--color-ink)' }} cursor={{ fill:'rgba(128,140,160,0.12)' }} />
                  <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {stock && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="text-heading-sm" style={{ color: 'var(--color-ink)' }}>Needs attention</div>
              <Link to="/inventory" style={{ fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none' }}>Inventory <ArrowRight size={11} /></Link>
            </div>
            {stock.low_stock_items.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-ink-mute)' }}>All stock levels are healthy.</div>
            ) : stock.low_stock_items.slice(0, 6).map((i) => (
              <div key={i.sku_id + i.location_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--color-hairline)', fontSize: 13 }}>
                <span>{i.name} <span style={{ color: 'var(--color-ink-mute)', fontSize: 11 }}>{i.sku_id}</span></span>
                <span className="tnum" style={{ color: '#92400e' }}>{i.quantity_on_hand} / {i.reorder_point}</span>
              </div>
            ))}
          </div>
        )}

        {!stock && !revenue && (
          <div className="card-dark" style={{ gridColumn: '1 / -1' }}>
            <div className="text-heading-sm" style={{ color: '#fff', marginBottom: 6 }}><ShoppingCart size={15} style={{ verticalAlign: -2 }} /> Sales workspace</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 300 }}>
              Use the Sales &amp; POS page to record walk-in sales, generate invoices and process returns.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
