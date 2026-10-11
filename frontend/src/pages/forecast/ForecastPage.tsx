import { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import {
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Package,
  DollarSign,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ForecastItem {
  sku_id: string;
  location_id: string;
  forecast_period: string;
  predicted_demand: number;
  recommended_reorder_qty: number;
}

interface ReorderSuggestion {
  sku_id: string;
  product_name: string;
  location_id: string;
  quantity_on_hand: number;
  reorder_point: number;
  predicted_demand: number;
  suggested_order_qty: number;
  supplier_id: string;
  suggested_po_payload: {
    supplier_id: string;
    expected_date: string;
    lines: Array<{
      sku_id: string;
      location_id: string;
      quantity: number;
      unit_price: number;
    }>;
  };
}

interface AccuracyRow {
  accuracyId: string;
  skuId: string;
  productName: string;
  period: string;
  predictedDemand: number;
  actualDemand: number;
  percentageError: number;
  accuracyRate: number;
}

interface RevenueGroup {
  group: string;
  revenue: number;
  order_count: number;
}

interface RevenueData {
  group_by: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  breakdown: RevenueGroup[];
}

interface StockItem {
  sku_id: string;
  name: string;
  location_id: string;
  quantity_on_hand: number;
  reorder_point: number;
  unit_price: number;
}

interface StockData {
  total_products: number;
  total_stock_records: number;
  total_units_on_hand: number;
  total_inventory_valuation: number;
  low_stock_count: number;
  out_of_stock_count: number;
  overstock_count: number;
  low_stock_items: StockItem[];
  out_of_stock_items: StockItem[];
  overstock_items: StockItem[];
}

export default function ForecastPage() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'reorder' | 'accuracy' | 'revenue' | 'stock'>('forecast');
  const [loading, setLoading] = useState(false);
  const [runningJob, setRunningJob] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forecast state
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [selectedSku, setSelectedSku] = useState('');

  // Reorder Suggestions state
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [creatingPoSku, setCreatingPoSku] = useState<string | null>(null);

  // Revenue Analytics state
  const [revenueGroupBy, setRevenueGroupBy] = useState<'channel' | 'location' | 'period'>('channel');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);

  // Stock Analytics state
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyRow[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'accuracy') {
      apiRequest<{ data: AccuracyRow[] }>('/api/v1/forecast/accuracy')
        .then((r) => setAccuracy(r.data || []))
        .catch((err) => setErrorMsg(err.message || 'Failed to load accuracy'));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'revenue') {
      loadRevenueData(revenueGroupBy);
    }
  }, [revenueGroupBy, activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await Promise.all([
        loadForecasts(),
        loadReorderSuggestions(),
        loadRevenueData(revenueGroupBy),
        loadStockData(),
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  const loadForecasts = async () => {
    const res = await apiRequest<{ data: ForecastItem[] }>('/api/v1/forecast');
    setForecasts(res.data || []);
  };

  const loadReorderSuggestions = async () => {
    const res = await apiRequest<{ data: ReorderSuggestion[] }>('/api/v1/forecast/reorder-suggestions');
    setReorderSuggestions(res.data || []);
  };

  const loadRevenueData = async (groupBy: string) => {
    const res = await apiRequest<{ data: RevenueData }>(`/api/v1/analytics/revenue?group_by=${groupBy}`);
    setRevenueData(res.data || null);
  };

  const loadStockData = async () => {
    const res = await apiRequest<{ data: StockData }>('/api/v1/analytics/stock');
    setStockData(res.data || null);
  };

  // Run Forecast Pipeline (E1.1)
  const handleRunForecast = async () => {
    setRunningJob(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiRequest<{ status: string; processed_items?: number }>('/api/v1/forecast/run', {
        method: 'POST',
      });
      setSuccessMsg(`Demand forecast job completed successfully! Updated ${res.processed_items ?? 'all'} items.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Forecast run failed');
    } finally {
      setRunningJob(false);
    }
  };

  // 1-Click Create PO from Suggestion (E1.4)
  const handleCreatePoDraft = async (suggestion: ReorderSuggestion) => {
    setCreatingPoSku(suggestion.sku_id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiRequest<any>('/api/v1/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(suggestion.suggested_po_payload),
      });

      const poId = res.poId || res.data?.po_id || 'PO';
      setSuccessMsg(`Draft Purchase Order ${poId} created for ${suggestion.sku_id}! Available in Purchase Orders tab.`);
      await loadReorderSuggestions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create PO from suggestion');
    } finally {
      setCreatingPoSku(null);
    }
  };

  const filteredForecasts = selectedSku
    ? forecasts.filter((f) => f.sku_id.toLowerCase().includes(selectedSku.toLowerCase()))
    : forecasts;

  return (
    <div>
      {/* Page Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, borderBottom:'1px solid var(--color-hairline)', paddingBottom:20, marginBottom:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <TrendingUp size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color:'var(--color-ink)' }}>Forecasting &amp; Analytics</span>
          </div>
          <div style={{ fontSize:14, color:'var(--color-ink-mute)', fontWeight:300 }}>Holt-Winters demand forecasting, reorder automation, revenue &amp; stock analytics</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={handleRunForecast} disabled={runningJob} className="btn-primary" style={{ gap:6 }}>
            <Sparkles size={13} style={{ animation: runningJob ? 'spin 1s linear infinite' : 'none' }} />
            {runningJob ? 'Computing Holt-Winters…' : 'Run Forecast Job'}
          </button>
          <button onClick={loadAllData} disabled={loading} className="btn-ghost-sm" title="Refresh">
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, backgroundColor:'var(--color-canvas-soft)', border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-pill)', padding:4, alignSelf:'flex-start', marginBottom:16 }}>
        {([
          { key:'forecast', label:'Demand Forecasts' },
          { key:'reorder', label:`Reorder ${reorderSuggestions.length > 0 ? `(${reorderSuggestions.length})` : ''}` },
          { key:'accuracy', label:'Forecast Accuracy' },
          { key:'revenue', label:'Revenue Analytics' },
          { key:'stock', label:'Stock Views' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            style={{ padding:'5px 14px', borderRadius:'var(--radius-pill)', fontSize:13, fontWeight: activeTab===t.key ? 400 : 300,
              backgroundColor: activeTab===t.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab===t.key ? '#fff' : 'var(--color-ink-mute)',
              border:'none', cursor:'pointer', transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Banners */}
      {errorMsg && (
        <div className="banner-error" style={{ marginBottom:16 }}>
          <AlertTriangle size={14} style={{ flexShrink:0 }} />
          <span style={{ flex:1 }}>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit' }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="banner-success" style={{ marginBottom:16 }}>
          <CheckCircle2 size={14} style={{ flexShrink:0 }} />
          <span style={{ flex:1 }}>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit' }}>✕</button>
        </div>
      )}

      {/* TAB 1: DEMAND FORECASTS */}
      {activeTab === 'forecast' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:400, color:'var(--color-ink)', marginBottom:3 }}>Demand Forecast Predictions</div>
              <div style={{ fontSize:13, color:'var(--color-ink-mute)', fontWeight:300 }}>Holt-Winters Additive (α=0.2, β=0.1, γ=0.2) with seasonal-naive fallback</div>
            </div>
            <input type="text" placeholder="Filter by SKU ID…" value={selectedSku}
              onChange={e => setSelectedSku(e.target.value)}
              className="input" style={{ width:220, fontSize:13, fontFamily:'monospace' }} />
          </div>
          <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow-1)' }}>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>SKU ID</th><th>Location</th><th>Forecast Period</th>
                  <th style={{textAlign:'right'}}>Predicted Demand</th>
                  <th style={{textAlign:'right'}}>Rec. Reorder</th>
                  <th style={{textAlign:'center'}}>Cycle</th>
                </tr></thead>
                <tbody>
                  {filteredForecasts.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--color-ink-mute)', padding:40 }}>
                      No forecast records. Click &ldquo;Run Forecast Job&rdquo; to compute demand.
                    </td></tr>
                  ) : filteredForecasts.map(f => (
                    <tr key={`${f.sku_id}-${f.location_id}-${f.forecast_period}`}>
                      <td><span className="tnum" style={{ fontFamily:'monospace', color:'var(--color-primary)', fontWeight:400 }}>{f.sku_id}</span></td>
                      <td><span className="pill-tag pill-neutral" style={{fontSize:9}}>{f.location_id}</span></td>
                      <td><span className="tnum" style={{ fontSize:13, color:'var(--color-ink-mute)', fontFamily:'monospace' }}>{f.forecast_period}</span></td>
                      <td style={{textAlign:'right'}}><span className="tnum" style={{ fontWeight:400, color:'var(--color-ink)' }}>{f.predicted_demand} <span style={{color:'var(--color-ink-mute)',fontSize:11}}>units/wk</span></span></td>
                      <td style={{textAlign:'right'}}><span className="tnum" style={{ fontWeight:400, color:'var(--c-warn-fg)' }}>{f.recommended_reorder_qty} <span style={{color:'var(--color-ink-mute)',fontSize:11}}>units</span></span></td>
                      <td style={{textAlign:'center'}}><span className="pill-tag" style={{fontSize:9,backgroundColor:'var(--c-ok-bg)',color:'var(--c-ok-fg)',borderColor:'var(--c-ok-border)'}}>Weekly 7d</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REORDER SUGGESTIONS */}
      {activeTab === 'reorder' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:400, color:'var(--color-ink)', marginBottom:3 }}>Automated Reorder Suggestions</div>
            <div style={{ fontSize:13, color:'var(--color-ink-mute)', fontWeight:300 }}>SKUs at or near reorder thresholds. Click &ldquo;Create Draft PO&rdquo; to auto-generate a pre-filled Purchase Order.</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
            {reorderSuggestions.length === 0 ? (
              <div style={{ gridColumn:'1/-1', padding:48, textAlign:'center', border:'1px dashed var(--color-hairline)', borderRadius:'var(--radius-lg)', color:'var(--color-ink-mute)', fontSize:14 }}>
                No items currently require reordering. All stock levels are healthy!
              </div>
            ) : reorderSuggestions.map(item => (
              <div key={`${item.sku_id}-${item.location_id}`}
                style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:18, boxShadow:'var(--shadow-1)', display:'flex', flexDirection:'column', gap:14, backgroundColor:'var(--color-canvas-soft)' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <span className="tnum" style={{ fontFamily:'monospace', fontSize:13, color:'var(--color-primary)', fontWeight:400 }}>{item.sku_id}</span>
                    <span className="pill-tag pill-neutral" style={{fontSize:9}}>{item.location_id}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:400, color:'var(--color-ink)', marginBottom:12 }}>{item.product_name}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, paddingTop:12, borderTop:'1px solid var(--color-hairline)', fontSize:12 }}>
                    <div>
                      <div style={{ color:'var(--color-ink-mute)', fontSize:11, marginBottom:2 }}>On Hand</div>
                      <div className="tnum" style={{ fontWeight:400, color:'var(--c-err-fg)', fontSize:16 }}>{item.quantity_on_hand}</div>
                    </div>
                    <div>
                      <div style={{ color:'var(--color-ink-mute)', fontSize:11, marginBottom:2 }}>Reorder Point</div>
                      <div className="tnum" style={{ fontWeight:400, color:'var(--color-ink)', fontSize:16 }}>{item.reorder_point}</div>
                    </div>
                    <div>
                      <div style={{ color:'var(--color-ink-mute)', fontSize:11, marginBottom:2 }}>Weekly Demand</div>
                      <div className="tnum" style={{ fontWeight:400, color:'var(--color-ink-secondary)', fontSize:14 }}>{item.predicted_demand}</div>
                    </div>
                    <div>
                      <div style={{ color:'var(--color-ink-mute)', fontSize:11, marginBottom:2 }}>Suggested PO</div>
                      <div className="tnum" style={{ fontWeight:400, color:'var(--c-warn-fg)', fontSize:14 }}>+{item.suggested_order_qty} units</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleCreatePoDraft(item)} disabled={creatingPoSku === item.sku_id}
                  className="btn-primary" style={{ width:'100%', justifyContent:'center', opacity: creatingPoSku===item.sku_id ? 0.6 : 1 }}>
                  <ShoppingCart size={12} />
                  {creatingPoSku === item.sku_id ? 'Creating Draft PO…' : 'Create Draft PO'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: FORECAST ACCURACY (E1.7) */}
      {activeTab === 'accuracy' && (
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:15, color:'var(--color-ink)', marginBottom:3 }}>Predicted vs actual demand</div>
          <div style={{ fontSize:13, color:'var(--color-ink-mute)', fontWeight:300, marginBottom:16 }}>
            Recorded automatically when sales are processed and compared to the weekly forecast.
          </div>
          {accuracy.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'var(--color-ink-mute)', fontSize:14 }}>
              No accuracy data yet. Run a forecast, then record sales — comparisons appear here.
            </div>
          ) : (
            <>
              <div style={{ width:'100%', height:240, marginBottom:16 }}>
                <ResponsiveContainer>
                  <BarChart data={accuracy.slice(0, 12).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,140,160,0.25)" vertical={false} />
                    <XAxis dataKey="skuId" tick={{ fontSize:11, fill:'var(--color-ink-mute)' }} />
                    <YAxis tick={{ fontSize:11, fill:'var(--color-ink-mute)' }} />
                    <Tooltip contentStyle={{ background:'var(--color-canvas)', border:'1px solid var(--color-hairline)', borderRadius:8, color:'var(--color-ink)', fontSize:12 }} labelStyle={{ color:'var(--color-ink)' }} cursor={{ fill:'rgba(128,140,160,0.12)' }} />
                    <Legend />
                    <Bar dataKey="predictedDemand" name="Predicted" fill="#ccfbf1" radius={[4,4,0,0]} />
                    <Bar dataKey="actualDemand" name="Actual" fill="#0d9488" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="data-table" style={{ width:'100%' }}>
                <thead><tr><th>SKU</th><th>Period</th><th style={{textAlign:'right'}}>Predicted</th><th style={{textAlign:'right'}}>Actual</th><th style={{textAlign:'right'}}>Error %</th><th style={{textAlign:'right'}}>Accuracy</th></tr></thead>
                <tbody>
                  {accuracy.map((a) => (
                    <tr key={a.accuracyId}>
                      <td>{a.productName} <span style={{ color:'var(--color-ink-mute)', fontSize:11 }}>{a.skuId}</span></td>
                      <td>{a.period}</td>
                      <td className="tnum" style={{textAlign:'right'}}>{a.predictedDemand}</td>
                      <td className="tnum" style={{textAlign:'right'}}>{a.actualDemand}</td>
                      <td className="tnum" style={{textAlign:'right'}}>{Number(a.percentageError).toFixed(1)}</td>
                      <td style={{textAlign:'right'}}><span className={`pill-tag ${a.accuracyRate >= 80 ? 'pill-success' : a.accuracyRate >= 60 ? 'pill-warning' : 'pill-error'}`} style={{ fontSize:9 }}>{a.accuracyRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* TAB 3: REVENUE ANALYTICS */}
      {activeTab === 'revenue' && revenueData && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
            {[
              { label:'Total Gross Revenue', value:`₹${Number(revenueData.total_revenue).toFixed(2)}`, icon:<DollarSign size={16} color="var(--color-primary)" strokeWidth={1.5}/>, note:'Completed & confirmed orders' },
              { label:'Completed Orders', value:String(revenueData.total_orders), icon:<Package size={16} color="var(--color-primary)" strokeWidth={1.5}/>, note:'Physical POS & Marketplace' },
              { label:'Avg Order Value', value:`₹${Number(revenueData.average_order_value).toFixed(2)}`, icon:<BarChart3 size={16} color="var(--color-primary)" strokeWidth={1.5}/>, note:'Per completed order' },
            ].map(card => (
              <div key={card.label} style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:18, boxShadow:'var(--shadow-1)', backgroundColor:'var(--color-canvas-soft)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:12, color:'var(--color-ink-mute)', fontWeight:300 }}>{card.label}</span>
                  {card.icon}
                </div>
                <div className="tnum" style={{ fontSize:24, fontWeight:400, color:'var(--color-ink)', letterSpacing:'-0.02em', marginBottom:4 }}>{card.value}</div>
                <div style={{ fontSize:11, color:'var(--color-ink-mute)', fontWeight:300 }}>{card.note}</div>
              </div>
            ))}
          </div>
          {/* Breakdown */}
          <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:20, boxShadow:'var(--shadow-1)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--color-hairline)' }}>
              <span style={{ fontSize:15, fontWeight:400, color:'var(--color-ink)' }}>Revenue Breakdown</span>
              <div style={{ display:'flex', gap:4, backgroundColor:'var(--color-canvas-soft)', border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-pill)', padding:3 }}>
                {(['channel','location','period'] as const).map(g => (
                  <button key={g} onClick={() => setRevenueGroupBy(g)}
                    style={{ padding:'4px 12px', borderRadius:'var(--radius-pill)', fontSize:12, border:'none', cursor:'pointer', transition:'all 0.15s',
                      backgroundColor: revenueGroupBy===g ? 'var(--color-primary)' : 'transparent',
                      color: revenueGroupBy===g ? '#fff' : 'var(--color-ink-mute)', fontWeight: revenueGroupBy===g ? 400 : 300 }}>
                    {g==='channel'?'By Channel':g==='location'?'By Location':'By Date'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {revenueData.breakdown.length === 0 ? (
                <div style={{ textAlign:'center', padding:32, color:'var(--color-ink-mute)', fontSize:13 }}>No revenue data for this grouping. Complete a sale or simulate orders.</div>
              ) : revenueData.breakdown.map(item => {
                const pct = revenueData.total_revenue > 0 ? Math.round((Number(item.revenue)/Number(revenueData.total_revenue))*100) : 0;
                return (
                  <div key={item.group}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                      <span style={{ fontWeight:400, color:'var(--color-ink)' }}>{item.group}</span>
                      <span className="tnum" style={{ color:'var(--color-ink-mute)' }}>₹{Number(item.revenue).toFixed(2)} &middot; {item.order_count} orders &middot; {pct}%</span>
                    </div>
                    <div style={{ width:'100%', height:6, backgroundColor:'var(--color-hairline)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${Math.max(3,pct)}%`, height:'100%', backgroundColor:'var(--color-primary)', borderRadius:3, transition:'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK ANALYTICS */}
      {activeTab === 'stock' && stockData && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Stat pills */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
            {[
              { label:'Products', value:stockData.total_products, color:'var(--color-ink)' },
              { label:'Total Units', value:stockData.total_units_on_hand, color:'var(--color-ink)' },
              { label:'Valuation', value:`₹${Number(stockData.total_inventory_valuation).toFixed(0)}`, color:'var(--color-primary)' },
              { label:'Low Stock', value:stockData.low_stock_count, color:'var(--c-warn-fg)' },
              { label:'Out of Stock', value:stockData.out_of_stock_count, color:'var(--c-err-fg)' },
              { label:'Overstock', value:stockData.overstock_count, color:'var(--color-primary)' },
            ].map(c => (
              <div key={c.label} style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:'14px 16px', boxShadow:'var(--shadow-1)', backgroundColor:'var(--color-canvas-soft)' }}>
                <div style={{ fontSize:11, color:'var(--color-ink-mute)', marginBottom:6, fontWeight:300 }}>{c.label}</div>
                <div className="tnum" style={{ fontSize:22, fontWeight:400, color:c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          {/* Low stock table */}
          <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow-1)' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--color-hairline)', backgroundColor:'var(--color-canvas-soft)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:400, color:'var(--color-ink)' }}>
                <AlertTriangle size={14} color="var(--c-warn-fg)" /> Low Stock Alerts ({stockData.low_stock_items.length})
              </div>
              <span style={{ fontSize:11, color:'var(--color-ink-mute)' }}>Stock &le; Reorder Point</span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Product / SKU</th><th>Location</th>
                  <th style={{textAlign:'center'}}>On Hand</th>
                  <th style={{textAlign:'center'}}>Threshold</th>
                  <th style={{textAlign:'right'}}>Unit Price</th>
                </tr></thead>
                <tbody>
                  {stockData.low_stock_items.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--color-ink-mute)', padding:32 }}>No low-stock alerts. Inventory is healthy.</td></tr>
                  ) : stockData.low_stock_items.map(item => (
                    <tr key={`${item.sku_id}-${item.location_id}`}>
                      <td>
                        <div style={{ fontWeight:400, color:'var(--color-ink)' }}>{item.name}</div>
                        <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--color-primary)' }}>{item.sku_id}</div>
                      </td>
                      <td><span className="pill-tag pill-neutral" style={{fontSize:9}}>{item.location_id}</span></td>
                      <td style={{textAlign:'center'}}><span className="tnum" style={{ fontWeight:400, color:'var(--c-err-fg)', fontSize:15 }}>{item.quantity_on_hand}</span></td>
                      <td style={{textAlign:'center'}}><span className="tnum" style={{ color:'var(--color-ink-mute)' }}>{item.reorder_point}</span></td>
                      <td style={{textAlign:'right'}}><span className="tnum" style={{ color:'var(--color-ink)', fontWeight:400 }}>₹{Number(item.unit_price).toFixed(2)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

