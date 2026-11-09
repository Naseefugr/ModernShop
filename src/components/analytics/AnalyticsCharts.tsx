import { useState } from "react";
import { TrendingUp, Store } from "lucide-react";

// ============================================================================
// 1. REVENUE & EARNINGS TREND AREA CHART (SVG Interactive)
// ============================================================================
export interface RevenuePoint {
  label: string; // e.g. "Mon", "Tue", "Day 1", etc.
  date: string;
  gross: number;
  net: number;
  commission: number;
}

interface RevenueTrendAreaChartProps {
  data: RevenuePoint[];
  title?: string;
  subtitle?: string;
  isSalesman?: boolean; // If true, shows Seller Net vs Platform cut; If false, shows Admin GMV vs Platform Profit
}

export function RevenueTrendAreaChart({
  data,
  title = "Revenue & Fund Inflow Trend",
  subtitle = "Daily financial volume breakdown across 7 active cycles",
  isSalesman = false,
}: RevenueTrendAreaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs border rounded-xl bg-card">
        No transaction history available to plot trend graph.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.gross), 1000);
  const chartHeight = 180;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 25;
  const effectiveWidth = chartWidth - paddingX * 2;
  const effectiveHeight = chartHeight - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / Math.max(data.length - 1, 1)) * effectiveWidth;
  const getY = (val: number) => chartHeight - paddingY - (val / maxVal) * effectiveHeight;

  // Build SVG Path for Gross (Area + Line)
  const grossPoints = data.map((d, i) => `${getX(i)},${getY(d.gross)}`).join(" ");
  const grossAreaPath = `${grossPoints} ${getX(data.length - 1)},${chartHeight - paddingY} ${getX(0)},${chartHeight - paddingY} Z`;

  // Build SVG Path for Net/Profit Line
  const netPoints = data.map((d, i) => `${getX(i)},${getY(isSalesman ? d.net : d.commission)}`).join(" ");

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span>{title}</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-foreground">
              {isSalesman ? "Gross Sales" : "Marketplace GMV"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="font-semibold text-foreground">
              {isSalesman ? "Net Payout (90%)" : "Platform Profit (10%)"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Card */}
      {activePoint && (
        <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-muted/40 border text-xs gap-3">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Timeline Segment</span>
            <div className="font-bold text-foreground">{activePoint.date} ({activePoint.label})</div>
          </div>
          <div className="text-right sm:text-left">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              {isSalesman ? "Total Sales" : "GMV"}
            </span>
            <div className="font-black text-emerald-600">₹{activePoint.gross.toLocaleString("en-IN")}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              {isSalesman ? "Net Earned (90%)" : "Platform Cut (10%)"}
            </span>
            <div className="font-black text-blue-600">
              ₹{(isSalesman ? activePoint.net : activePoint.commission).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      )}

      {/* SVG Chart Graphic */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-44 overflow-visible"
        >
          <defs>
            <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - paddingY - ratio * effectiveHeight;
            const val = Math.round(ratio * maxVal);
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[8px] font-mono"
                >
                  ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Area Fill for Gross */}
          <polygon points={grossAreaPath} fill="url(#grossGradient)" />

          {/* Line for Gross */}
          <polyline
            points={grossPoints}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Line for Net / Profit */}
          <polyline
            points={netPoints}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Interactive Hover Nodes */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cyGross = getY(d.gross);
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={d.label + i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Invisible hover zone column */}
                <rect
                  x={cx - 15}
                  y={0}
                  width={30}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Vertical hover indicator line */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingY}
                    x2={cx}
                    y2={chartHeight - paddingY}
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Gross point circle */}
                <circle
                  cx={cx}
                  cy={cyGross}
                  r={isHovered ? 5 : 3.5}
                  className={`transition-all duration-200 ${
                    isHovered
                      ? "fill-white stroke-emerald-600 stroke-2 ring-4 ring-emerald-500/30"
                      : "fill-emerald-600 stroke-white stroke-1"
                  }`}
                />

                {/* X-axis Label */}
                <text
                  x={cx}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className={`text-[9px] font-mono transition-colors ${
                    isHovered ? "fill-foreground font-bold" : "fill-muted-foreground"
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// 2. ORDER STATUS DISTRIBUTION PROGRESS CHART
// ============================================================================
interface StatusItem {
  stage: string;
  count: number;
  colorClass: string;
  bgClass: string;
}

interface StatusDistributionChartProps {
  items: StatusItem[];
  totalOrders: number;
  title?: string;
}

export function StatusDistributionChart({
  items,
  totalOrders,
  title = "Fulfillment Pipeline Distribution",
}: StatusDistributionChartProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Live volume across 5 fulfillment milestone stages
          </p>
        </div>
        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-muted rounded border">
          {totalOrders} Total Orders
        </span>
      </div>

      {/* Segmented Cumulative Bar */}
      <div className="h-4 w-full rounded-full bg-muted/60 overflow-hidden flex border">
        {items.map((it) => {
          const pct = totalOrders > 0 ? (it.count / totalOrders) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={it.stage}
              style={{ width: `${pct}%` }}
              title={`${it.stage}: ${it.count} (${pct.toFixed(1)}%)`}
              className={`h-full transition-all duration-500 ${it.bgClass}`}
            />
          );
        })}
      </div>

      {/* Status Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-1">
        {items.map((it) => {
          const pct = totalOrders > 0 ? Math.round((it.count / totalOrders) * 100) : 0;
          return (
            <div
              key={it.stage}
              className="p-2.5 rounded-lg border bg-muted/20 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`h-2.5 w-2.5 rounded-full ${it.bgClass}`} />
                <span className="font-semibold text-foreground text-[11px] line-clamp-1">{it.stage}</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-base font-black text-foreground">{it.count}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 3. FINANCIAL FUND ALLOCATION BREAKDOWN (Donut Style SVG)
// ============================================================================
interface FundSlice {
  label: string;
  amount: number;
  color: string;
  desc: string;
}

interface FinancialFundDonutChartProps {
  slices: FundSlice[];
  totalAmount: number;
  title?: string;
}

export function FinancialFundDonutChart({
  slices,
  totalAmount,
  title = "Fund Allocation & Realization",
}: FinancialFundDonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<FundSlice | null>(null);

  // SVG Donut calculation
  const radius = 60;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
      <div>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Proportional fund distribution across payout streams
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative h-40 w-40 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
            {/* Background Circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Slices */}
            {slices.map((slice) => {
              const percent = totalAmount > 0 ? slice.amount / totalAmount : 0;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativePercent * circumference;
              cumulativePercent += percent;

              return (
                <circle
                  key={slice.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  onMouseEnter={() => setHoveredSlice(slice)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="cursor-pointer transition-all duration-300 hover:opacity-80"
                />
              );
            })}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total GMV</span>
            <span className="text-base font-black text-foreground">
              ₹{totalAmount >= 1000 ? `${(totalAmount / 1000).toFixed(1)}k` : totalAmount}
            </span>
          </div>
        </div>

        {/* Legend & Details */}
        <div className="space-y-2 text-xs flex-1 w-full">
          {slices.map((slice) => {
            const pct = totalAmount > 0 ? ((slice.amount / totalAmount) * 100).toFixed(1) : "0";
            const isHovered = hoveredSlice?.label === slice.label;

            return (
              <div
                key={slice.label}
                onMouseEnter={() => setHoveredSlice(slice)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  isHovered ? "bg-muted/60 border-primary/40 shadow-xs" : "bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                    <span className="font-bold text-foreground text-[11px]">{slice.label}</span>
                  </div>
                  <span className="font-black text-foreground">₹{slice.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-0.5">
                  <span>{slice.desc}</span>
                  <span className="font-mono font-bold">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MERCHANT STORES PERFORMANCE COMPARISON RANKING (for Admin)
// ============================================================================
interface MerchantStoreStats {
  storeName: string;
  storeSlug: string;
  grossSales: number;
  orderCount: number;
  commissionGenerated: number;
}

interface MerchantPerformanceRankingProps {
  merchants: MerchantStoreStats[];
  title?: string;
}

export function MerchantPerformanceRanking({
  merchants,
  title = "Merchant Store Revenue Leaderboard",
}: MerchantPerformanceRankingProps) {
  if (!merchants || merchants.length === 0) return null;

  const maxRevenue = Math.max(...merchants.map((m) => m.grossSales), 1);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
      <div>
        <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
          <Store className="h-4 w-4 text-primary" />
          <span>{title}</span>
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Comparative sales performance and platform commission contribution by store
        </p>
      </div>

      <div className="space-y-3 pt-1">
        {merchants.map((m, idx) => {
          const widthPct = (m.grossSales / maxRevenue) * 100;
          return (
            <div key={m.storeSlug || m.storeName} className="p-3 rounded-lg border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-foreground">{m.storeName}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({m.orderCount} orders)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-foreground">₹{m.grossSales.toLocaleString("en-IN")}</span>
                  <span className="text-[10px] text-emerald-600 block">
                    +₹{m.commissionGenerated.toLocaleString("en-IN")} (10% Fee)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-700 rounded-full"
                  style={{ width: `${Math.max(widthPct, 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
