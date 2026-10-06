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
  const [activeTab, setActiveTab] = useState<'forecast' | 'reorder' | 'revenue' | 'stock'>('forecast');
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

  useEffect(() => {
    loadAllData();
  }, []);

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

      const poId = res.data?.po_id || 'PO';
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Forecasting & Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            In-process Holt-Winters demand forecasting, seasonality detection, automated reorder suggestions, and analytics dashboards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunForecast}
            disabled={runningJob}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${runningJob ? 'animate-spin' : ''}`} />
            {runningJob ? 'Computing Holt-Winters...' : 'Run Forecast Job'}
          </button>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            title="Refresh All Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-medium w-full sm:w-auto self-start">
        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
            activeTab === 'forecast' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Demand Forecasts
        </button>
        <button
          onClick={() => setActiveTab('reorder')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'reorder' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Reorder Suggestions
          {reorderSuggestions.length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {reorderSuggestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
            activeTab === 'revenue' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Revenue Analytics
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
            activeTab === 'stock' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Stock & Inventory Views
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: DEMAND FORECASTS */}
      {activeTab === 'forecast' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Demand Forecast Predictions</h2>
              <p className="text-xs text-slate-400">
                Calculated via Holt-Winters Additive smoothing (α=0.2, β=0.1, γ=0.2) with seasonal-naive fallback.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter by SKU ID..."
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">SKU ID</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Forecast Period</th>
                    <th className="py-3 px-4 text-right">Predicted Demand</th>
                    <th className="py-3 px-4 text-right">Recommended Reorder</th>
                    <th className="py-3 px-4 text-center">Seasonality Cycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredForecasts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                        No forecast records found. Click &quot;Run Forecast Job&quot; to compute demand.
                      </td>
                    </tr>
                  ) : (
                    filteredForecasts.map((f) => (
                      <tr key={`${f.sku_id}-${f.location_id}-${f.forecast_period}`} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                          {f.sku_id}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                            {f.location_id}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {f.forecast_period}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {f.predicted_demand} units/wk
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                          {f.recommended_reorder_qty} units
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-950/50 text-teal-400 border border-teal-800/50">
                            Weekly (7-Day Cycle)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REORDER SUGGESTIONS (E1.4) */}
      {activeTab === 'reorder' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Automated Reorder Suggestions (1-Click PO Draft)</h2>
            <p className="text-xs text-slate-400">
              SKUs at or near reorder thresholds. Click &quot;Create Draft PO&quot; to automatically generate a pre-filled Purchase Order.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reorderSuggestions.length === 0 ? (
              <div className="col-span-full py-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No items currently require reordering. All stock levels are healthy!
              </div>
            ) : (
              reorderSuggestions.map((item) => (
                <div
                  key={`${item.sku_id}-${item.location_id}`}
                  className="bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-4 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-400">{item.sku_id}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60">
                        {item.location_id}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white">{item.product_name}</div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">On Hand</span>
                        <span className="font-mono font-bold text-rose-400">{item.quantity_on_hand}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Reorder Point</span>
                        <span className="font-mono font-bold text-slate-300">{item.reorder_point}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Weekly Demand</span>
                        <span className="font-mono font-bold text-slate-300">{item.predicted_demand}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Suggested PO</span>
                        <span className="font-mono font-bold text-amber-400">+{item.suggested_order_qty} units</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCreatePoDraft(item)}
                    disabled={creatingPoSku === item.sku_id}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {creatingPoSku === item.sku_id ? 'Creating Draft PO...' : 'Create Draft PO'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REVENUE ANALYTICS */}
      {activeTab === 'revenue' && revenueData && (
        <div className="space-y-6">
          {/* Revenue Top Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 font-medium">Total Gross Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                ${Number(revenueData.total_revenue).toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Completed & confirmed orders</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 font-medium">Completed Orders</span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {revenueData.total_orders}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Physical POS & Marketplace sales</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 font-medium">Average Order Value</span>
                <BarChart3 className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                ${Number(revenueData.average_order_value).toFixed(2)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Per completed order</p>
            </div>
          </div>

          {/* Group-by Switcher & Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Revenue Breakdown</h3>
              <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setRevenueGroupBy('channel')}
                  className={`px-3 py-1 rounded transition ${
                    revenueGroupBy === 'channel' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  By Channel
                </button>
                <button
                  onClick={() => setRevenueGroupBy('location')}
                  className={`px-3 py-1 rounded transition ${
                    revenueGroupBy === 'location' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  By Location
                </button>
                <button
                  onClick={() => setRevenueGroupBy('period')}
                  className={`px-3 py-1 rounded transition ${
                    revenueGroupBy === 'period' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  By Date
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {revenueData.breakdown.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No revenue data found for this grouping. Complete a sale or simulate orders to see metrics.
                </div>
              ) : (
                revenueData.breakdown.map((item) => {
                  const pct = revenueData.total_revenue > 0
                    ? Math.round((Number(item.revenue) / Number(revenueData.total_revenue)) * 100)
                    : 0;

                  return (
                    <div key={item.group} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-white">{item.group}</span>
                        <span className="text-slate-300 font-mono">
                          ${Number(item.revenue).toFixed(2)} ({item.order_count} orders • {pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK ANALYTICS */}
      {activeTab === 'stock' && stockData && (
        <div className="space-y-6">
          {/* Stock Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-[11px] text-slate-400 font-medium">Total Products</div>
              <div className="text-xl font-bold font-mono text-white mt-1">{stockData.total_products}</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-[11px] text-slate-400 font-medium">Total Units</div>
              <div className="text-xl font-bold font-mono text-white mt-1">{stockData.total_units_on_hand}</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-[11px] text-slate-400 font-medium">Inventory Valuation</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                ${Number(stockData.total_inventory_valuation).toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-[11px] text-slate-400 font-medium">Low Stock</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">{stockData.low_stock_count}</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-[11px] text-slate-400 font-medium">Out of Stock</div>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">{stockData.out_of_stock_count}</div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-[11px] text-slate-400 font-medium">Overstock</div>
              <div className="text-xl font-bold font-mono text-blue-400 mt-1">{stockData.overstock_count}</div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Low Stock Alerts ({stockData.low_stock_items.length})
              </h3>
              <span className="text-[10px] text-slate-400">Stock &le; Reorder Point</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Product / SKU</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4 text-center">On Hand</th>
                    <th className="py-2.5 px-4 text-center">Threshold</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stockData.low_stock_items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                        No low-stock alerts. Inventory is well-balanced.
                      </td>
                    </tr>
                  ) : (
                    stockData.low_stock_items.map((item) => (
                      <tr key={`${item.sku_id}-${item.location_id}`} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-[10px] font-mono text-emerald-400">{item.sku_id}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">{item.location_id}</td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-rose-400">
                          {item.quantity_on_hand}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                          {item.reorder_point}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-white">
                          ${Number(item.unit_price).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
