import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Building2,
  Home,
  Warehouse,
  AlertTriangle,
  Navigation,
  Phone,
  ShieldCheck,
  Copy,
  Check,
  Key,
  Truck,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SubOrderStatus } from "@/types";

interface RouteStation {
  status: SubOrderStatus;
  title: string;
  facility: string;
  location: string;
  distanceKm: string;
  desc: string;
  icon: typeof Warehouse;
}

const ROUTE_STATIONS: RouteStation[] = [
  {
    status: "confirmed",
    title: "Pending",
    facility: "Origin Fulfillment Hub",
    location: "Electronic City, BLR",
    distanceKm: "0 KM",
    desc: "Order verified, barcoded & packaged for dispatch",
    icon: Warehouse,
  },
  {
    status: "shipped",
    title: "Shipped",
    facility: "Express Cargo Trunk Line",
    location: "National Expressway 44",
    distanceKm: "140 KM",
    desc: "Dispatched on express freight highway transit",
    icon: Navigation,
  },
  {
    status: "packed",
    title: "Reached Around",
    facility: "Regional Logistics Gateway",
    location: "Central Sorting Terminal",
    distanceKm: "320 KM",
    desc: "Inbound scanned, sorted & routed to destination hub",
    icon: Building2,
  },
  {
    status: "out_for_delivery",
    title: "Reached",
    facility: "Local Distribution Center",
    location: "Neighborhood Depot",
    distanceKm: "440 KM",
    desc: "Loaded onto last-mile delivery vehicle; associate dispatched",
    icon: Truck,
  },
  {
    status: "delivered",
    title: "Delivered",
    facility: "Customer Destination",
    location: "Recipient Residence",
    distanceKm: "485 KM",
    desc: "Package handed over safely with digital OTP verification",
    icon: Home,
  },
];

export function getStationIndex(status: string): number {
  switch (status) {
    case "confirmed":
    case "processing":
    case "pending_payment":
      return 0; // Station 1: Pending (Origin Hub)
    case "shipped":
      return 1; // Station 2: Shipped (Express Transit)
    case "packed":
      return 2; // Station 3: Reached Around (Regional Gateway)
    case "out_for_delivery":
      return 3; // Station 4: Reached (Local Depot / Out for Delivery)
    case "delivered":
      return 4; // Station 5: Delivered (Customer Destination)
    default:
      return 0;
  }
}

interface DeliveryRouteTruckTrackerProps {
  status: SubOrderStatus | string;
  courierPartner?: string | null;
  trackingNumber?: string | null;
  className?: string;
}

export function DeliveryRouteTruckTracker({
  status,
  courierPartner,
  trackingNumber,
  className = "",
}: DeliveryRouteTruckTrackerProps) {
  const isCancelled = status === "cancelled";
  const activeStationIndex = useMemo(() => getStationIndex(status), [status]);
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeliveryNoteModal, setShowDeliveryNoteModal] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("Leave package with building security or at doorstep.");

  const awbCode = trackingNumber || `BD-${Math.abs(hashString(String(status)) % 899999 + 100000)}`;
  const carrierName = courierPartner || "BlueDart Express Air";

  // Truck position percentage along the highway road (clamped between 4% and 96%)
  const truckPercentage = useMemo(() => {
    if (activeStationIndex === 0) return 6;
    if (activeStationIndex === 1) return 28;
    if (activeStationIndex === 2) return 50;
    if (activeStationIndex === 3) return 74;
    return 94; // Delivered
  }, [activeStationIndex]);

  const currentStation = ROUTE_STATIONS[activeStationIndex] || ROUTE_STATIONS[0];

  const handleCopyAwb = () => {
    navigator.clipboard?.writeText(awbCode);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2500);
  };

  if (isCancelled) {
    return (
      <div className={`p-6 rounded-2xl border-2 border-destructive/30 bg-destructive/5 text-destructive text-xs space-y-3 ${className}`}>
        <div className="flex items-center gap-3 font-bold text-base">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <span>Fulfillment Terminated: Package Cancelled</span>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
          Transit on this route was cancelled. Any authorized charges will be refunded to your source payment method within 3–5 working days.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm ${className}`}>
      {/* =================================================================== */}
      {/* 1. ENTERPRISE DELIVERY STATUS HERO HEADER                           */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge
              className={`text-xs px-3 py-1 font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                status === "delivered"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : status === "out_for_delivery"
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                  : "bg-primary text-primary-foreground shadow-xs"
              }`}
            >
              {status === "delivered" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Delivered</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  <span>{currentStation.title}</span>
                </>
              )}
            </Badge>

            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Telemetry Active • Updated Just Now</span>
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
            {status === "delivered"
              ? "Package Handed Over Safely to Recipient"
              : status === "out_for_delivery"
              ? "Out for Final Doorstep Delivery"
              : status === "packed"
              ? "Arrived at Regional Distribution Gateway"
              : status === "shipped"
              ? "Dispatched on Express Freight Highway"
              : "Order Prepared & Awaiting Carrier Dispatch"}
          </h3>

          <p className="text-xs text-muted-foreground">
            Facility: <strong className="text-foreground">{currentStation.facility}</strong> ({currentStation.location})
          </p>
        </div>

        {/* Carrier Details & AWB Copy */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs bg-muted/40 p-2.5 rounded-xl border self-stretch lg:self-auto justify-between lg:justify-end">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <div>
              <div className="font-bold text-foreground text-[11px] leading-tight">{carrierName}</div>
              <div className="text-[10px] text-muted-foreground font-mono">AWB: {awbCode}</div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs gap-1"
            onClick={handleCopyAwb}
            title="Copy Tracking AWB Code"
          >
            {copiedAwb ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy AWB</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. REALISTIC HIGHWAY ROUTE WITH PROFESSIONAL COURIER VEHICLE         */}
      {/* =================================================================== */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span className="font-bold uppercase tracking-wider text-[11px] text-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Transit Highway Trajectory</span>
          </span>
          <span className="font-mono text-[11px]">
            Progress: {activeStationIndex + 1}/5 Waypoints Cleared ({currentStation.distanceKm})
          </span>
        </div>

        <div className="relative py-8 px-1">
          {/* Asphalt Highway Road Surface */}
          <div className="relative h-20 w-full rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-700/80 shadow-2xl overflow-hidden flex items-center">
            {/* Upper & Lower Road Curbs */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700" />
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700" />

            {/* Continuous White Boundary Lines */}
            <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-white/20" />
            <div className="absolute bottom-2.5 left-0 right-0 h-0.5 bg-white/20" />

            {/* Animated Yellow Highway Dividing Line */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 border-t-2 border-dashed border-amber-400/90 z-0 opacity-80" />

            {/* Completed Emerald Route Lighting Underlay */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500/25 via-emerald-500/20 to-emerald-400/35 border-r-2 border-emerald-400 transition-all duration-700 ease-out z-0"
              style={{ width: `${truckPercentage}%` }}
            />

            {/* Waypoint Markers on Road Surface */}
            <div className="absolute inset-0 flex justify-between items-center px-6 sm:px-12 pointer-events-none z-10">
              {ROUTE_STATIONS.map((stn, idx) => {
                const isCleared = idx <= activeStationIndex;
                const isCurrent = idx === activeStationIndex;

                return (
                  <div key={stn.title} className="flex flex-col items-center">
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCurrent
                          ? "bg-emerald-500 border-white ring-4 ring-emerald-400/50 shadow-xl scale-125"
                          : isCleared
                          ? "bg-emerald-600 border-emerald-200"
                          : "bg-slate-800 border-slate-600 opacity-50"
                      }`}
                    >
                      {isCleared ? (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      ) : (
                        <div className="h-1 w-1 rounded-full bg-slate-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* =============================================================== */}
            {/* HIGH-PRECISION COMMERCIAL COURIER TRUCK WITH REALISTIC LIGHTING */}
            {/* =============================================================== */}
            <div
              className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-700 ease-out pointer-events-none"
              style={{
                left: `${truckPercentage}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Floating Real-Time GPS HUD Card */}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight shadow-xl flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {status === "delivered"
                    ? "Delivered at Destination"
                    : `${currentStation.distanceKm} • 64 km/h • GPS Active`}
                </span>
              </div>

              {/* Vehicle Body Graphic with Forward Illuminated Headlight Beam */}
              <div className="relative flex items-center">
                {/* Projected LED Headlight Beam on Pavement */}
                <div
                  className={`absolute left-14 top-1/2 -translate-y-1/2 w-24 h-12 bg-gradient-to-r from-amber-200/50 via-yellow-200/25 to-transparent pointer-events-none blur-xs ${
                    status === "delivered" ? "opacity-20" : "opacity-95 animate-pulse"
                  }`}
                  style={{
                    clipPath: "polygon(0 35%, 100% 0, 100% 100%, 0 65%)",
                  }}
                />

                {/* Professional Commercial Courier Van Graphic */}
                <div className="relative drop-shadow-2xl flex items-center">
                  <svg
                    className="w-16 h-10 overflow-visible"
                    viewBox="0 0 64 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Shadow underneath vehicle */}
                    <ellipse cx="32" cy="33" rx="28" ry="3" fill="#000000" fillOpacity="0.6" />

                    {/* Main Van Cargo Box (Aerodynamic high-top) */}
                    <rect x="2" y="6" width="38" height="23" rx="3" fill="#FFFFFF" />
                    <rect x="3" y="7" width="36" height="21" rx="2" fill="#F8FAFC" />

                    {/* Courier Express Brand Stripe */}
                    <path d="M4 14H38" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                    <path d="M4 18H28" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />

                    {/* Driver Cabin */}
                    <path
                      d="M38 10H48C51.5 10 54 13 56 16.5L59 21C59.7 22.1 60 23.4 60 24.7V29H38V10Z"
                      fill="#0F172A"
                    />

                    {/* Cabin Aerodynamic Windshield Window (Glass Reflection) */}
                    <path
                      d="M40 12H47C49 12 51 14 52.5 16.5L54.5 20H40V12Z"
                      fill="#38BDF8"
                      fillOpacity="0.8"
                    />

                    {/* Side Mirror */}
                    <rect x="42" y="18" width="2" height="4" rx="1" fill="#94A3B8" />

                    {/* Front LED Headlight */}
                    <rect x="58.5" y="23" width="2.5" height="3.5" rx="1" fill="#FEF08A" />

                    {/* Rear Taillight */}
                    <rect x="1" y="22" width="2" height="4" rx="1" fill="#EF4444" />

                    {/* Front Wheel */}
                    <circle cx="50" cy="29" r="5" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="50" cy="29" r="2.5" fill="#94A3B8" />
                    <circle cx="50" cy="29" r="1" fill="#FFFFFF" />

                    {/* Rear Wheel (Dual axle) */}
                    <circle cx="14" cy="29" r="5" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="14" cy="29" r="2.5" fill="#94A3B8" />
                    <circle cx="14" cy="29" r="1" fill="#FFFFFF" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. EXPANSIVE 5-STAGE LOGISTICS AUDIT TIMELINE                       */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ROUTE_STATIONS.map((station, idx) => {
          const isCleared = idx <= activeStationIndex;
          const isCurrent = idx === activeStationIndex;
          const StationIcon = station.icon;

          return (
            <div
              key={station.status}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative ${
                isCurrent
                  ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-md"
                  : isCleared
                  ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                  : "border-muted bg-muted/20 opacity-60 text-muted-foreground"
              }`}
            >
              <div>
                {/* Station Top Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                    Stage {idx + 1} • {station.distanceKm}
                  </span>

                  {isCleared ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Station Icon & Title */}
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? "bg-emerald-600 text-white shadow-xs"
                        : isCleared
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <StationIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight line-clamp-1">{station.title}</h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{station.location}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">
                  {station.desc}
                </p>
              </div>

              {/* Status Pill */}
              <div className="pt-3 mt-3 border-t">
                {isCurrent ? (
                  <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-2 font-bold w-full justify-center">
                    Active Checkpoint
                  </Badge>
                ) : isCleared ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-center">
                    <Check className="h-3 w-3" /> Milestone Cleared
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground text-center block">
                    Pending Inbound Arrival
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* 4. COURIER SECURITY & CONTACT INTELLIGENCE BAR                     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
        {/* Associate Details */}
        <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Assigned Associate</span>
            <div className="font-bold text-foreground">Rajesh Kumar</div>
            <div className="text-[10px] text-muted-foreground font-mono">ID: BD-4820 • Van KA-01-EA-4921</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={() => setShowContactModal(true)}
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Contact</span>
          </Button>
        </div>

        {/* Secure OTP / Pin */}
        <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Key className="h-3 w-3 text-amber-500" />
              <span>Doorstep Verification PIN</span>
            </span>
            <div className="font-mono text-base font-black text-primary tracking-widest">
              4892
            </div>
            <div className="text-[10px] text-muted-foreground">Share with courier associate only upon delivery</div>
          </div>
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">
            Secure OTP
          </Badge>
        </div>

        {/* Delivery Instructions */}
        <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Delivery Instructions</span>
            </span>
            <div className="text-foreground text-[11px] font-semibold line-clamp-1">{deliveryNote}</div>
            <div className="text-[10px] text-muted-foreground">Insured contactless drop-off supported</div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-primary"
            onClick={() => setShowDeliveryNoteModal(true)}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Simulated Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Contact Courier Associate</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Rajesh Kumar is actively on route with your parcel.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-xs font-mono font-bold">
              Hotline: +91 98765 43210 (Direct Dispatch Line)
            </div>
            <Button className="w-full" onClick={() => setShowContactModal(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Delivery Instructions Modal */}
      {showDeliveryNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold">Update Doorstep Instructions</h3>
            <p className="text-xs text-muted-foreground">
              Provide specific drop-off preferences for the delivery associate.
            </p>
            <textarea
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              className="w-full p-3 rounded-lg border bg-muted/40 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" onClick={() => setShowDeliveryNoteModal(false)}>
                Save Instructions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
