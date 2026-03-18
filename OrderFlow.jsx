import React, { useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────
//  ORDERFLOW — Complete App
//  Staff: PIN login → live order queue → fulfil → billing
//  Admin: PIN login → users / orders / analytics
//
//  TO WIRE FIREBASE: replace the S.orders / S.users arrays
//  with Firebase Realtime DB reads/writes (see comments below)
// ─────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);
const YDAY  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const TWO   = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d) =>
  d === TODAY ? "Today"
  : d === YDAY ? "Yesterday"
  : new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const cl    = (x) => JSON.parse(JSON.stringify(x));
const genId = () =>
  "ABCDEFGHJKLMNPQR"[Math.floor(Math.random() * 16)] +
  (Math.floor(Math.random() * 9) + 1);

// ─── INITIAL STATE ────────────────────────────────────────────
// FIREBASE NOTE: Replace these seed arrays with Firebase listeners:
//   ref(db, 'orders').on('value', snap => setOrders(snap.val()))
//   ref(db, 'users').on('value',  snap => setUsers(snap.val()))

const SEED_USERS = [
  { id: 1, name: "Ravi",   pin: "1234", active: true,  itemsHandled: 42, ordersToday: 8, lastSeen: "09:45" },
  { id: 2, name: "Priya",  pin: "1234", active: true,  itemsHandled: 38, ordersToday: 6, lastSeen: "10:12" },
  { id: 3, name: "Suresh", pin: "1234", active: true,  itemsHandled: 31, ordersToday: 5, lastSeen: "08:55" },
  { id: 4, name: "Anita",  pin: "1234", active: false, itemsHandled: 0,  ordersToday: 0, lastSeen: "Yesterday" },
  { id: 5, name: "Mohan",  pin: "1234", active: true,  itemsHandled: 19, ordersToday: 3, lastSeen: "11:02" },
];

const SEED_ORDERS = [
  {
    id: "A1", date: TODAY, scannedAt: "09:14", status: "live",
    sections: [
      { name: "Rama Plywood", items: [
        { id: 101, sku: "MG 7310-12",    origQty: 12, qty: 12, status: "pending",     note: "", handledBy: null },
        { id: 102, sku: "Taper 1204-56", origQty: 56, qty: 56, status: "pending",     note: "", handledBy: null },
        { id: 103, sku: "Tag 1102-56",   origQty: 56, qty: 56, status: "pending",     note: "", handledBy: null },
        { id: 104, sku: "MEC 745-2",     origQty: 2,  qty: 0,  status: "unavailable", note: "", handledBy: "Ravi" },
      ]},
      { name: "Mahavir", items: [
        { id: 105, sku: "MBS 7407-9", origQty: 9, qty: 5, status: "partial",     note: "Only 5 in stock", handledBy: "Priya" },
        { id: 106, sku: "MF 106-1",   origQty: 3, qty: 0, status: "unavailable", note: "",               handledBy: "Ravi"  },
      ]},
    ],
  },
  {
    id: "B2", date: TODAY, scannedAt: "10:30", status: "live",
    sections: [
      { name: "Rightways", items: [
        { id: 201, sku: "ASA 137-5", origQty: 5, qty: 5, status: "fulfilled", note: "", handledBy: "Priya" },
        { id: 202, sku: "ASA 139-8", origQty: 8, qty: 8, status: "fulfilled", note: "", handledBy: "Priya" },
      ]},
      { name: "Gurushakti", items: [
        { id: 203, sku: "ASA 101-6", origQty: 6, qty: 3, status: "partial", note: "3 available", handledBy: "Suresh" },
      ]},
    ],
  },
  {
    id: "C3", date: YDAY, scannedAt: "11:02", status: "billed",
    sections: [
      { name: "DMS Design", items: [
        { id: 301, sku: "ASA 135-5", origQty: 5, qty: 5, status: "fulfilled",   note: "", handledBy: "Suresh" },
        { id: 302, sku: "MF FG4-4",  origQty: 4, qty: 4, status: "fulfilled",   note: "", handledBy: "Suresh" },
        { id: 303, sku: "MF 106-1",  origQty: 1, qty: 0, status: "unavailable", note: "", handledBy: "Ravi"   },
      ]},
    ],
  },
  {
    id: "D4", date: YDAY, scannedAt: "14:45", status: "billed",
    sections: [
      { name: "VK Agency", items: [
        { id: 401, sku: "HC 7273-2", origQty: 2, qty: 2, status: "fulfilled", note: "",              handledBy: "Mohan" },
        { id: 402, sku: "MB 7256-5", origQty: 5, qty: 3, status: "partial",   note: "2 backordered", handledBy: "Mohan" },
      ]},
    ],
  },
];

const DEMO_SCAN = {
  sections: [
    { name: "DMS Design", items: [
      { sku: "ASA 135-5",  qty: 5, confidence: 97, skipped: false },
      { sku: "MF FG4-4",   qty: 4, confidence: 91, skipped: false },
      { sku: "MF 106-1",   qty: 1, confidence: 88, skipped: false },
      { sku: "SAM 3635-2", qty: 2, confidence: 62, skipped: false },
    ]},
    { name: "Mahavir", items: [
      { sku: "MBS 7407-9", qty: 9, confidence: 95, skipped: false },
      { sku: "MEC 745-2",  qty: 2, confidence: 45, skipped: true  },
    ]},
  ],
};

const DAILY_VOLUME = [
  { date: "Mon", count: 4 }, { date: "Tue", count: 7 }, { date: "Wed", count: 5 },
  { date: "Thu", count: 9 }, { date: "Fri", count: 6 }, { date: "Sat", count: 11 },
  { date: "Sun", count: 3 },
];

// ─── HELPERS ──────────────────────────────────────────────────
const allItems   = (o) => o.sections.flatMap((s) => s.items);
const isReady    = (o) => allItems(o).filter((i) => i.status === "pending").length === 0;
const progData   = (o) => {
  const it = allItems(o);
  const done = it.filter((i) => i.status !== "pending").length;
  return { done, total: it.length, pct: Math.round((done / it.length) * 100) };
};

// ─── DESIGN TOKENS ────────────────────────────────────────────
const C = {
  bg: "#F7F8FA", surface: "#FFFFFF", card: "#FFFFFF",
  border: "#E4E7ED", borderMd: "#D1D5DB",
  amber: "#D97706", amberBg: "#FFFBEB", amberBd: "#FCD34D",
  green: "#059669", greenBg: "#ECFDF5", greenBd: "#6EE7B7",
  red: "#DC2626",   redBg: "#FEF2F2",   redBd: "#FCA5A5",
  blue: "#2563EB",  blueBg: "#EFF6FF",  blueBd: "#93C5FD",
  gray: "#6B7280",  grayBg: "#F9FAFB",
  text: "#111827",  textDim: "#6B7280", textFaint: "#D1D5DB",
  mono: "'JetBrains Mono','Fira Mono',monospace",
  sans: "'Inter',system-ui,sans-serif",
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────
function Pill({ status, small = false }) {
  const m = {
    fulfilled:   { l: "Fulfilled", c: C.green, bg: C.greenBg, bd: C.greenBd },
    unavailable: { l: "N/A",       c: C.red,   bg: C.redBg,   bd: C.redBd   },
    partial:     { l: "Partial",   c: C.amber, bg: C.amberBg, bd: C.amberBd },
    pending:     { l: "Pending",   c: C.gray,  bg: C.grayBg,  bd: C.border  },
    billed:      { l: "Billed",    c: C.blue,  bg: C.blueBg,  bd: C.blueBd  },
    live:        { l: "Live",      c: C.amber, bg: C.amberBg, bd: C.amberBd },
  };
  const s = m[status] || m.pending;
  return (
    <span style={{
      fontFamily: C.mono, fontSize: small ? 9 : 10, fontWeight: 600,
      padding: small ? "2px 6px" : "3px 8px", borderRadius: 4,
      background: s.bg, color: s.c, border: `1px solid ${s.bd}`, whiteSpace: "nowrap",
    }}>{s.l}</span>
  );
}

function PBar({ pct, ready }) {
  return (
    <div style={{ background: C.border, borderRadius: 4, height: 5, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4,
        background: ready ? C.green : C.amber, transition: "width .3s" }} />
    </div>
  );
}

function Btn({ children, onClick, color = "amber", outline = false, style: sx = {} }) {
  const colors = {
    amber:  { bg: C.amber,  text: "#fff", border: C.amber  },
    green:  { bg: C.green,  text: "#fff", border: C.green  },
    ghost:  { bg: "#fff",   text: C.gray, border: C.border },
    greenO: { bg: C.greenBg, text: C.green, border: C.greenBd },
    redO:   { bg: C.redBg,   text: C.red,   border: C.redBd   },
    amberO: { bg: C.amberBg, text: C.amber, border: C.amberBd },
  };
  const v = colors[color] || colors.amber;
  return (
    <button onClick={onClick} style={{
      background: v.bg, color: v.text, border: `1px solid ${v.border}`,
      fontFamily: C.sans, fontWeight: 600, fontSize: 13, borderRadius: 8,
      padding: "10px 14px", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 5, ...sx,
    }}>{children}</button>
  );
}

function GrpLabel({ label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 4 }}>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: C.textDim }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

function Numpad({ onTap }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, width: 240 }}>
      {keys.map((k, i) =>
        k === "" ? <div key={i} /> : (
          <button key={k} onClick={() => onTap(k)} style={{
            height: 58, borderRadius: 12, border: `1px solid ${C.border}`, background: "#fff",
            fontSize: k === "del" ? 18 : 22, fontWeight: 600, color: C.text,
            cursor: "pointer", fontFamily: C.sans, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>{k === "del" ? "⌫" : k}</button>
        )
      )}
    </div>
  );
}

function OrderCard({ order, onOpen, dim = false, isAdmin = false }) {
  const { done, total, pct } = progData(order);
  const ready  = isReady(order);
  const billed = order.status === "billed";
  const names  = order.sections.map((s) => s.name).join(", ");
  const idBg   = billed ? C.grayBg  : ready ? C.greenBg  : C.amberBg;
  const idC    = billed ? C.gray    : ready ? C.green     : C.amber;
  const idBd   = billed ? C.border  : ready ? C.greenBd   : C.amberBd;
  return (
    <div onClick={() => onOpen(order.id)} style={{
      background: C.card, border: `1px solid ${ready && !billed ? C.greenBd : C.border}`,
      borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer",
      opacity: dim ? 0.65 : 1, boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 8, flexShrink: 0,
          background: idBg, border: `1px solid ${idBd}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: C.mono, fontWeight: 700, fontSize: 15, color: idC,
        }}>{order.id}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{names}</div>
            <Pill status={billed ? "billed" : ready ? "fulfilled" : "pending"} />
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{order.scannedAt} · {total} items</div>
        </div>
      </div>
      <PBar pct={pct} ready={ready} />
      <div style={{ fontSize: 11, color: C.textDim, marginTop: 5 }}>{done}/{total} handled</div>
    </div>
  );
}

// ─── CHOOSE SCREEN ────────────────────────────────────────────
function ChooseScreen({ onStaff, onAdmin }) {
  return (
    <div style={{ minHeight: 620, background: "#fff", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 22, color: C.amber, letterSpacing: 1 }}>ORDER</span>
        <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 22, color: C.gray,  letterSpacing: 1 }}>FLOW</span>
      </div>
      <div style={{ fontSize: 13, color: C.textDim, marginBottom: 40 }}>Order management · Error prevention</div>
      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={onStaff} style={{
          width: "100%", padding: 20, borderRadius: 12, border: `1px solid ${C.border}`,
          background: "#fff", cursor: "pointer", fontFamily: C.sans,
          display: "flex", alignItems: "center", gap: 16, textAlign: "left",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>👷</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 2 }}>Staff</div>
            <div style={{ fontSize: 12, color: C.textDim }}>Assemble and fulfil orders</div>
          </div>
        </button>
        <button onClick={onAdmin} style={{
          width: "100%", padding: 20, borderRadius: 12, border: `1px solid ${C.amberBd}`,
          background: C.amberBg, cursor: "pointer", fontFamily: C.sans,
          display: "flex", alignItems: "center", gap: 16, textAlign: "left",
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🔐</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.amber, marginBottom: 2 }}>Admin</div>
            <div style={{ fontSize: 12, color: "#92610A" }}>Manage users, orders and analytics</div>
          </div>
        </button>
      </div>
      <div style={{ marginTop: 24, fontSize: 11, color: C.textFaint }}>Staff PIN: 1234 · Admin PIN: 0000</div>
    </div>
  );
}

// ─── PIN SCREEN ───────────────────────────────────────────────
function PinScreen({ title, subtitle, avatar, hint, correctPin, onSuccess, onBack }) {
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");

  const handleTap = (k) => {
    if (k === "del") { setEntry((e) => e.slice(0, -1)); setError(""); return; }
    if (entry.length >= 4) return;
    const next = entry + k;
    setEntry(next);
    if (next.length === 4) {
      if (next === correctPin) { onSuccess(); }
      else { setEntry(""); setError("Incorrect PIN. Try again."); }
    }
  };

  const dots = Array(4).fill(null).map((_, i) => (
    <div key={i} style={{
      width: 14, height: 14, borderRadius: 7,
      background: i < entry.length ? C.amber : C.border,
    }} />
  ));

  return (
    <div style={{ minHeight: 620, background: "#fff", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 32, position: "relative" }}>
      <button onClick={onBack} style={{
        position: "absolute", top: 16, left: 16, background: "none", border: "none",
        color: C.textDim, cursor: "pointer", fontSize: 20, padding: 4,
      }}>←</button>
      <div style={{
        width: 52, height: 52, borderRadius: 26, background: C.amberBg,
        border: `2px solid ${C.amberBd}`, display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 700, fontSize: 18, color: C.amber, marginBottom: 12,
      }}>{avatar}</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: C.textDim, marginBottom: 28 }}>
        {subtitle}{hint && <span style={{ color: C.textFaint }}> {hint}</span>}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>{dots}</div>
      <div style={{ fontSize: 12, color: C.red, minHeight: 28, display: "flex", alignItems: "center", marginBottom: 8 }}>
        {error}
      </div>
      <Numpad onTap={handleTap} />
    </div>
  );
}

// ─── STAFF HOME ───────────────────────────────────────────────
function StaffHome({ orders, staffName, onNewOrder, onOpenOrder, onSignOut }) {
  const [tab, setTab] = useState("live");
  const live    = orders.filter((o) => o.status === "live" && o.date === TODAY);
  const hist    = orders.filter((o) => o.status === "billed" || o.date !== TODAY);
  const inProg  = live.filter((o) => !isReady(o));
  const ready   = live.filter((o) => isReady(o));
  const grouped = hist.reduce((acc, o) => { (acc[o.date] = acc[o.date] || []).push(o); return acc; }, {});
  const dates   = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const tabSt   = (a) => ({
    flex: 1, padding: 7, borderRadius: 6, border: "none", cursor: "pointer",
    fontFamily: C.sans, fontSize: 13,
    background: a ? "#fff" : "transparent",
    color: a ? C.text : C.textDim,
    fontWeight: a ? 600 : 400,
    boxShadow: a ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
  });

  return (
    <div style={{ minHeight: 620, display: "flex", flexDirection: "column", background: C.bg }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}`, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div>
              <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 16, color: C.amber, letterSpacing: 1 }}>ORDER</span>
              <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 16, color: C.gray,  letterSpacing: 1 }}>FLOW</span>
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
              {live.length} active · <span style={{ color: C.text, fontWeight: 600 }}>{staffName}</span>
            </div>
          </div>
          <button onClick={onSignOut} style={{
            background: "#fff", border: `1px solid ${C.borderMd}`, borderRadius: 8,
            padding: "5px 10px", cursor: "pointer", color: C.textDim, fontSize: 11, fontFamily: C.sans,
          }}>Sign out</button>
        </div>
        <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
          <button onClick={() => setTab("live")}    style={tabSt(tab === "live")}>
            Live Orders{live.length > 0 && (
              <span style={{ background: C.amber, color: "#fff", borderRadius: 10,
                padding: "1px 6px", fontSize: 10, fontWeight: 700, fontFamily: C.mono, marginLeft: 4 }}>
                {live.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab("history")} style={tabSt(tab === "history")}>History</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 40px" }}>
        {tab === "live" && (
          <>
            <Btn onClick={onNewOrder} color="amber" sx={{ width: "100%", padding: 13, borderRadius: 10,
              fontSize: 14, marginBottom: 20, boxShadow: "0 2px 8px rgba(217,119,6,0.2)" }}>
              + New Order
            </Btn>
            {inProg.length > 0 && <><GrpLabel label="In Progress"    color={C.amber} />{inProg.map((o) => <OrderCard key={o.id} order={o} onOpen={onOpenOrder} />)}</>}
            {ready.length  > 0 && <><GrpLabel label="Ready for Billing" color={C.green} />{ready.map((o) => <OrderCard key={o.id} order={o} onOpen={onOpenOrder} />)}</>}
            {live.length  === 0 && <div style={{ textAlign: "center", color: C.textFaint, padding: "60px 0", fontSize: 13 }}>No orders yet today.</div>}
          </>
        )}
        {tab === "history" && (
          <>
            {dates.length === 0 && <div style={{ textAlign: "center", color: C.textFaint, padding: "60px 0", fontSize: 13 }}>No past orders.</div>}
            {dates.map((d) => (
              <div key={d} style={{ marginBottom: 20 }}>
                <GrpLabel label={fmtDate(d)} color={C.textDim} />
                {grouped[d].map((o) => <OrderCard key={o.id} order={o} onOpen={onOpenOrder} dim />)}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── SCAN SCREEN ──────────────────────────────────────────────
function ScanScreen({ actorName, onBack, onConfirm }) {
  const [stage, setStage]     = useState("choose"); // choose|preview|analysing|reviewing
  const [imgSrc, setImgSrc]   = useState(null);
  const [ext, setExt]         = useState(null);
  const fileRef               = useRef();

  const triggerCamera  = () => { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); };
  const triggerUpload  = () => { fileRef.current.removeAttribute("capture"); fileRef.current.click(); };
  const handleFile     = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImgSrc(ev.target.result); setStage("preview"); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const analyse = () => {
    setStage("analysing");
    // FIREBASE NOTE: Replace this timeout with your actual Anthropic API call:
    //   const response = await fetch("https://api.anthropic.com/v1/messages", { ... })
    //   then parse and setExt(parsed); setStage("reviewing");
    setTimeout(() => { setExt(cl(DEMO_SCAN)); setStage("reviewing"); }, 1800);
  };
  const skipItem = (sIdx, iIdx) =>
    setExt((p) => { const n = cl(p); n.sections[sIdx].items[iIdx].skipped = true; return n; });

  const confirm = () => {
    const order = {
      id: genId(), date: TODAY, scannedAt: nowTime(), status: "live",
      sections: ext.sections.map((sec) => ({
        name: sec.name,
        items: sec.items.filter((i) => !i.skipped).map((i) => ({
          id: Date.now() + Math.random(),
          sku: i.sku, origQty: i.qty, qty: i.qty,
          status: "pending", note: "", handledBy: null, confidence: i.confidence,
        })),
      })).filter((s) => s.items.length > 0),
    };
    onConfirm(order);
  };

  const lowConf = ext ? ext.sections.flatMap((s) => s.items.filter((i) => !i.skipped && i.confidence < 70)) : [];

  return (
    <div style={{ minHeight: 620, display: "flex", flexDirection: "column", background: C.bg }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: "#fff",
        display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0 }}>←</button>
        <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 13, color: C.text, letterSpacing: "0.5px" }}>NEW ORDER</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim, background: C.grayBg,
          border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px" }}>{actorName}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px" }}>
        {stage === "choose" && (
          <>
            <div style={{ fontSize: 13, color: C.textDim, textAlign: "center", marginBottom: 16 }}>
              How would you like to add the order?
            </div>
            <button onClick={triggerCamera} style={{
              width: "100%", padding: 20, borderRadius: 12, border: `1px solid ${C.amberBd}`,
              background: C.amberBg, cursor: "pointer", fontFamily: C.sans,
              display: "flex", alignItems: "center", gap: 16, textAlign: "left", marginBottom: 12,
            }}>
              <span style={{ fontSize: 30, flexShrink: 0 }}>📷</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.amber, marginBottom: 2 }}>Take a Photo</div>
                <div style={{ fontSize: 12, color: C.textDim }}>Open camera to photograph order slip</div>
              </div>
            </button>
            <button onClick={triggerUpload} style={{
              width: "100%", padding: 20, borderRadius: 12, border: `1px solid ${C.border}`,
              background: "#fff", cursor: "pointer", fontFamily: C.sans,
              display: "flex", alignItems: "center", gap: 16, textAlign: "left",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
            }}>
              <span style={{ fontSize: 30, flexShrink: 0 }}>🖼️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 2 }}>Upload from Gallery</div>
                <div style={{ fontSize: 12, color: C.textDim }}>Choose an existing photo from your device</div>
              </div>
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 8 }}>— Preview only —</div>
              <Btn onClick={() => { setExt(cl(DEMO_SCAN)); setStage("reviewing"); }} color="ghost">
                ⚡ Simulate with sample data
              </Btn>
            </div>
          </>
        )}

        {stage === "preview" && (
          <>
            <img src={imgSrc} alt="slip" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, display: "block", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setStage("choose")} color="ghost" sx={{ flex: 1 }}>↩ Retake</Btn>
              <Btn onClick={analyse} color="amber" sx={{ flex: 2 }}>⚡ Analyse Order</Btn>
            </div>
          </>
        )}

        {stage === "analysing" && (
          <>
            {imgSrc && <img src={imgSrc} alt="slip" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, display: "block", marginBottom: 12, opacity: 0.5 }} />}
            <div style={{ background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 700, color: C.amber, fontSize: 14, marginBottom: 4 }}>Reading handwriting…</div>
              <div style={{ fontSize: 12, color: C.textDim }}>Extracting SKUs and quantities</div>
            </div>
          </>
        )}

        {stage === "reviewing" && ext && (
          <>
            {imgSrc && <img src={imgSrc} alt="slip" style={{ width: "100%", borderRadius: 10, border: `1px solid ${C.border}`, display: "block", maxHeight: 160, objectFit: "cover", marginBottom: 12 }} />}
            {lowConf.length > 0 && (
              <div style={{ background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: C.amber, fontSize: 13, marginBottom: 3 }}>⚠ {lowConf.length} item{lowConf.length > 1 ? "s" : ""} need review</div>
                <div style={{ fontSize: 12, color: C.textDim }}>AI was uncertain — verify before confirming.</div>
              </div>
            )}
            {ext.sections.map((sec, sIdx) => (
              <div key={sIdx} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", color: C.textDim, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.amber }}>§</span>{sec.name.toUpperCase()}
                </div>
                {sec.items.map((item, iIdx) => {
                  const cc = item.confidence >= 90 ? C.green : item.confidence >= 70 ? C.textDim : C.amber;
                  return (
                    <div key={iIdx} style={{
                      background: item.skipped ? "#fff" : item.confidence < 70 ? C.amberBg : "#fff",
                      border: `1px solid ${item.skipped ? C.border : item.confidence < 70 ? C.amberBd : C.border}`,
                      borderRadius: 10, padding: "11px 13px", marginBottom: 8,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      opacity: item.skipped ? 0.45 : 1,
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: C.mono, fontWeight: 600, fontSize: 13, color: C.text, textDecoration: item.skipped ? "line-through" : "none" }}>{item.sku}</span>
                          <span style={{ fontFamily: C.mono, fontSize: 10, color: cc }}>{item.confidence}%</span>
                          {item.skipped && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textFaint }}>SKIPPED</span>}
                        </div>
                        {!item.skipped && <div style={{ fontSize: 12, color: C.textDim }}>Qty: <span style={{ fontFamily: C.mono, fontWeight: 700, color: C.amber }}>×{item.qty}</span></div>}
                      </div>
                      {!item.skipped && (
                        <button onClick={() => skipItem(sIdx, iIdx)} style={{
                          background: C.redBg, border: `1px solid ${C.redBd}`, borderRadius: 6,
                          padding: "5px 8px", cursor: "pointer", color: C.red, fontSize: 13, fontFamily: C.sans,
                        }}>✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              <Btn onClick={confirm} color="green" sx={{ width: "100%", padding: 13, fontSize: 14 }}>✓ Confirm & Create Order</Btn>
              <Btn onClick={() => setStage("choose")} color="ghost" sx={{ width: "100%", padding: 11 }}>↩ Start over</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ORDER DETAIL (shared staff + admin) ──────────────────────
function OrderDetail({ order, actorName, onBack, onUpdate, onBilled }) {
  const [expandedKey, setExpandedKey] = useState(null);
  const [billingOpen,  setBillingOpen]  = useState(false);
  const [editQty,  setEditQty]  = useState("");
  const [editNote, setEditNote] = useState("");

  const isBilled = order.status === "billed";
  const all      = allItems(order);
  const pending  = all.filter((i) => i.status === "pending");
  const handled  = all.filter((i) => i.status !== "pending");
  const ready    = pending.length === 0;
  const pct      = Math.round((handled.length / all.length) * 100);

  const findIdx = (item) => {
    let sIdx = -1, iIdx = -1;
    order.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { if (it.id === item.id) { sIdx = si; iIdx = ii; } }));
    return [sIdx, iIdx];
  };

  const setStatus = (sIdx, iIdx, status) => {
    onUpdate(sIdx, iIdx, { status, handledBy: actorName });
    if (expandedKey === `${sIdx}-${iIdx}`) setExpandedKey(null);
  };
  const undoItem = (sIdx, iIdx) => onUpdate(sIdx, iIdx, { status: "pending", handledBy: null });
  const openOverride = (key, item) => { setExpandedKey(key); setEditQty(String(item.qty || item.origQty)); setEditNote(item.note || ""); };
  const saveOverride = (sIdx, iIdx, origQty) => {
    const qty = parseInt(editQty);
    if (!isNaN(qty) && qty > 0) {
      onUpdate(sIdx, iIdx, { qty, note: editNote, status: qty >= origQty ? "fulfilled" : "partial", handledBy: actorName });
    }
    setExpandedKey(null);
  };

  // By-staff grouping
  const byStaff = {};
  handled.forEach((item) => { const k = item.handledBy || "Unknown"; (byStaff[k] = byStaff[k] || []).push(item); });

  const idBg = ready ? C.greenBg : C.amberBg;
  const idC  = ready ? C.green   : C.amber;
  const idBd = ready ? C.greenBd : C.amberBd;

  return (
    <div style={{ minHeight: 620, display: "flex", flexDirection: "column", background: C.bg, position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0 }}>←</button>
          <div style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 14, background: idBg, color: idC, border: `1px solid ${idBd}`, borderRadius: 6, padding: "2px 10px" }}>{order.id}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{order.sections.map((s) => s.name).join(" · ")}</div>
            <div style={{ fontSize: 11, color: C.textDim }}>{order.scannedAt}{isBilled && <span style={{ color: C.blue, marginLeft: 6 }}>· Billed</span>}</div>
          </div>
        </div>
        <PBar pct={pct} ready={ready} />
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 5 }}>{handled.length}/{all.length} handled · {pending.length} remaining</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 100px" }}>
        {/* Pending queue */}
        {pending.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: "0.8px", marginBottom: 10 }}>PENDING ({pending.length})</div>
            {pending.map((item) => {
              const [sIdx, iIdx] = findIdx(item);
              const key = `${sIdx}-${iIdx}`;
              const isOpen = expandedKey === key;
              return (
                <div key={item.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 8, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isOpen ? 0 : 10 }}>
                      <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 15, color: C.text }}>{item.sku}</span>
                      <span style={{ fontFamily: C.mono, fontSize: 13, color: C.textDim, fontWeight: 600 }}>×{item.origQty}</span>
                    </div>
                    {!isOpen && (
                      <div style={{ display: "flex", gap: 7 }}>
                        <Btn onClick={() => setStatus(sIdx, iIdx, "fulfilled")}   color="greenO" sx={{ flex: 1, padding: "9px 6px", fontSize: 12, borderRadius: 8 }}>✓ Fulfilled</Btn>
                        <Btn onClick={() => setStatus(sIdx, iIdx, "unavailable")} color="redO"   sx={{ flex: 1, padding: "9px 6px", fontSize: 12, borderRadius: 8 }}>✕ N/A</Btn>
                        <Btn onClick={() => openOverride(key, item)} color="amberO" sx={{ padding: "9px 12px", fontSize: 12, borderRadius: 8 }}>Qty</Btn>
                      </div>
                    )}
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: 14, background: C.bg }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 8 }}>QUANTITY TO SEND <span style={{ color: C.textFaint, fontFamily: C.mono, fontWeight: 400 }}>(req ×{item.origQty})</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <button onClick={() => setEditQty((v) => String(Math.max(1, parseInt(v || 1) - 1)))} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 20, color: C.textDim, fontFamily: C.sans }}>−</button>
                        <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} style={{ width: 76, padding: "8px 0", borderRadius: 8, border: `1px solid ${C.amberBd}`, color: C.amber, fontFamily: C.mono, fontWeight: 700, fontSize: 22, textAlign: "center", background: "#fff", outline: "none" }} />
                        <button onClick={() => setEditQty((v) => String(parseInt(v || 0) + 1))} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 20, color: C.textDim, fontFamily: C.sans }}>+</button>
                        <button onClick={() => setEditQty(String(item.origQty))} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: C.textDim, fontSize: 11, fontFamily: C.mono }}>Full ×{item.origQty}</button>
                      </div>
                      {(() => { const q = parseInt(editQty); if (q > 0 && q < item.origQty) return <div style={{ fontSize: 11, color: C.amber, marginBottom: 10 }}>Partial — sending {q} of {item.origQty}</div>; if (q >= item.origQty) return <div style={{ fontSize: 11, color: C.green, marginBottom: 10 }}>Fulfilled</div>; return <div style={{ height: 21, marginBottom: 10 }} />; })()}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 5 }}>NOTE (optional)</div>
                        <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="e.g. 3 available, 2 coming tomorrow" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: C.sans, outline: "none", color: C.text, background: "#fff", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn onClick={() => saveOverride(sIdx, iIdx, item.origQty)} color="amber" sx={{ flex: 1, padding: 10 }}>Save</Btn>
                        <Btn onClick={() => setExpandedKey(null)} color="ghost" sx={{ padding: "10px 16px" }}>Cancel</Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {pending.length === 0 && !isBilled && (
          <div style={{ background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 10, padding: 16, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>✓</div>
            <div style={{ fontWeight: 700, color: C.green, fontSize: 14 }}>All items handled</div>
            <div style={{ fontSize: 12, color: C.green, opacity: 0.8, marginTop: 2 }}>Ready to send to billing</div>
          </div>
        )}

        {/* Handled items */}
        {handled.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: "0.8px", marginTop: pending.length ? 20 : 4, marginBottom: 10 }}>HANDLED ({handled.length})</div>
            {Object.entries(byStaff).map(([name, items]) => (
              <div key={name} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: C.grayBg, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.textDim }}>{name[0]}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>{name}</span>
                </div>
                {items.map((item) => {
                  const [sIdx, iIdx] = findIdx(item);
                  const statusBg = { fulfilled: C.greenBg, unavailable: C.redBg, partial: C.amberBg }[item.status] || "#fff";
                  const statusBd = { fulfilled: C.greenBd, unavailable: C.redBd, partial: C.amberBd }[item.status] || C.border;
                  return (
                    <div key={item.id} style={{ background: statusBg, border: `1px solid ${statusBd}`, borderRadius: 10, padding: "11px 14px", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 14, color: C.text }}>{item.sku}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: C.textDim }}>Req <span style={{ fontFamily: C.mono, fontWeight: 600, color: C.text }}>×{item.origQty}</span></span>
                            {item.qty !== item.origQty && <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, fontFamily: C.mono, background: "#fff", border: `1px solid ${C.amberBd}`, borderRadius: 4, padding: "1px 6px" }}>↳ Send ×{item.qty}</span>}
                            {item.note && <span style={{ fontSize: 11, color: C.textDim, fontStyle: "italic" }}>"{item.note}"</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <Pill status={item.status} />
                          {!isBilled && (
                            <button onClick={() => undoItem(sIdx, iIdx)} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: C.textDim, fontSize: 11, fontFamily: C.sans }}>↩</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Billing bar */}
      {!isBilled && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 20px 16px", background: "#fff" }}>
          {ready
            ? <Btn onClick={() => setBillingOpen(true)} color="green" sx={{ width: "100%", padding: 13, fontSize: 14, gap: 7, boxShadow: "0 2px 8px rgba(5,150,105,0.2)" }}>📄 Send to Billing</Btn>
            : <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontSize: 13, color: C.textDim }}>{pending.length} item{pending.length !== 1 ? "s" : ""} pending</span>
                <Btn onClick={() => setBillingOpen(true)} color="ghost" sx={{ padding: "8px 14px", fontSize: 12, gap: 5 }}>📄 Bill anyway</Btn>
              </div>
          }
        </div>
      )}

      {/* Billing modal */}
      {billingOpen && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setBillingOpen(false); }}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 20px 28px", maxHeight: "80%", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 14, color: C.text }}>BILLING SUMMARY · {order.id}</span>
              <button onClick={() => setBillingOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.textDim, lineHeight: 1 }}>✕</button>
            </div>
            {pending.length > 0 && <div style={{ background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: C.amber }}>⚠ {pending.length} items still pending — will be excluded</div>}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: "0.8px", marginBottom: 8 }}>TO BILL</div>
            {handled.filter((i) => i.status !== "unavailable").map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: C.mono, fontSize: 13, color: C.text }}>{item.sku}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: C.mono, fontSize: 13, color: C.amber, fontWeight: 700 }}>×{item.qty}</div>
                  {item.qty !== item.origQty && <div style={{ fontSize: 10, color: C.textDim }}>req ×{item.origQty}</div>}
                </div>
              </div>
            ))}
            {handled.filter((i) => i.status === "unavailable").length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.red, letterSpacing: "0.8px", marginTop: 16, marginBottom: 8 }}>NOT AVAILABLE</div>
                {handled.filter((i) => i.status === "unavailable").map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}`, opacity: 0.5 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 13, color: C.text, textDecoration: "line-through" }}>{item.sku}</span>
                    <span style={{ fontFamily: C.mono, fontSize: 13, color: C.red }}>×{item.origQty}</span>
                  </div>
                ))}
              </>
            )}
            <div style={{ fontSize: 11, color: C.textDim, padding: "10px 0 4px" }}>Billed by <strong style={{ color: C.text }}>{actorName}</strong> · {nowTime()}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <Btn onClick={() => { setBillingOpen(false); onBilled(); }} color="green" sx={{ width: "100%", padding: 13, fontSize: 14 }}>✓ Confirm & Push to Billing</Btn>
              <Btn onClick={() => setBillingOpen(false)} color="ghost" sx={{ width: "100%", padding: 11 }}>Back to Order</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN APP ────────────────────────────────────────────────
function AdminApp({ orders, users, onSignOut, onOrderUpdate, onOrderBilled, onAddOrder, onUserChange }) {
  const [tab,        setTab]        = useState("analytics");
  const [activeOId,  setActiveOId]  = useState(null);
  const [expandSku,  setExpandSku]  = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newPin,     setNewPin]     = useState("");
  const [scanning,   setScanning]   = useState(false);

  const activeOrder = orders.find((o) => o.id === activeOId);

  if (scanning) return (
    <ScanScreen actorName="Admin" onBack={() => setScanning(false)} onConfirm={(o) => { onAddOrder(o); setActiveOId(o.id); setScanning(false); }} />
  );

  if (activeOrder) return (
    <OrderDetail
      order={activeOrder}
      actorName="Admin"
      onBack={() => setActiveOId(null)}
      onUpdate={(sIdx, iIdx, changes) => onOrderUpdate(activeOrder.id, sIdx, iIdx, changes)}
      onBilled={() => { onOrderBilled(activeOrder.id); setActiveOId(null); }}
    />
  );

  const tabs = [["users","👥 Users"],["orders","📋 Orders"],["analytics","📊 Analytics"]];
  const tabSt = (a) => ({
    flex: 1, padding: "8px 4px", borderRadius: 7, border: "none", cursor: "pointer",
    fontFamily: C.sans, fontSize: 12, fontWeight: a ? 700 : 400,
    background: a ? "#fff" : "transparent", color: a ? C.text : C.textDim,
    boxShadow: a ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
  });

  const today  = orders.filter((o) => o.date === TODAY);
  const older  = orders.filter((o) => o.date !== TODAY);

  // analytics
  const unfulfilled = [];
  orders.forEach((o) => o.sections.forEach((sec) => sec.items.forEach((item) => {
    if (item.status === "unavailable" || item.status === "partial") {
      unfulfilled.push({ sku: item.sku, customer: sec.name, orderId: o.id, date: o.date, type: item.status, reqQty: item.origQty, sentQty: item.qty });
    }
  })));
  const skuMap = {};
  unfulfilled.forEach((e) => {
    if (!skuMap[e.sku]) skuMap[e.sku] = { sku: e.sku, naCount: 0, partialCount: 0, totalMissed: 0, occurrences: [] };
    if (e.type === "unavailable") skuMap[e.sku].naCount++;
    else skuMap[e.sku].partialCount++;
    skuMap[e.sku].totalMissed += e.reqQty - e.sentQty;
    skuMap[e.sku].occurrences.push(e);
  });
  const skus       = Object.values(skuMap).sort((a, b) => (b.naCount + b.partialCount) - (a.naCount + a.partialCount));
  const totalNA    = unfulfilled.filter((e) => e.type === "unavailable").length;
  const totalPart  = unfulfilled.filter((e) => e.type === "partial").length;
  const totalMiss  = unfulfilled.reduce((s, e) => s + e.reqQty - e.sentQty, 0);
  const maxVol     = Math.max(...DAILY_VOLUME.map((d) => d.count));

  return (
    <div style={{ minHeight: 620, display: "flex", flexDirection: "column", background: C.bg }}>
      {/* Header */}
      <div style={{ padding: "14px 20px 12px", borderBottom: `1px solid ${C.border}`, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div>
              <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 15, color: C.amber, letterSpacing: 1 }}>ORDER</span>
              <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 15, color: C.gray,  letterSpacing: 1 }}>FLOW</span>
              <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBd}`, borderRadius: 4, padding: "2px 6px", marginLeft: 6 }}>ADMIN</span>
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
          <button onClick={onSignOut} style={{ background: "#fff", border: `1px solid ${C.borderMd}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: C.textDim, fontSize: 11, fontFamily: C.sans }}>Sign out</button>
        </div>
        <div style={{ display: "flex", gap: 3, background: C.bg, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
          {tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} style={tabSt(tab === key)}>{label}</button>)}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 40px" }}>

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: "0.8px" }}>STAFF ({users.length})</div>
              <Btn onClick={() => setShowAdd(!showAdd)} color="amber" sx={{ padding: "7px 12px", fontSize: 12 }}>+ Add Staff</Btn>
            </div>
            {showAdd && (
              <div style={{ background: "#fff", border: `1px solid ${C.amberBd}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 12 }}>NEW STAFF MEMBER</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4, fontWeight: 600 }}>NAME</div>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Staff name" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.borderMd}`, fontSize: 14, fontFamily: C.sans, outline: "none", color: C.text, background: "#fff", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4, fontWeight: 600 }}>4-DIGIT PIN</div>
                  <input value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="e.g. 4821" maxLength={4} type="tel" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.borderMd}`, fontSize: 16, fontFamily: C.mono, outline: "none", color: C.text, background: "#fff", boxSizing: "border-box", letterSpacing: 4 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => {
                    if (!newName.trim() || newPin.length !== 4) { alert("Enter a name and a 4-digit PIN."); return; }
                    onUserChange("add", { id: Date.now(), name: newName.trim(), pin: newPin, active: true, itemsHandled: 0, ordersToday: 0, lastSeen: "Never" });
                    setNewName(""); setNewPin(""); setShowAdd(false);
                  }} color="green" sx={{ flex: 1, padding: 10 }}>Create Account</Btn>
                  <Btn onClick={() => setShowAdd(false)} color="ghost" sx={{ padding: "10px 14px" }}>Cancel</Btn>
                </div>
              </div>
            )}
            {users.map((u) => {
              const ac = u.active, c = ac ? C.green : C.red, bg = ac ? C.greenBg : C.redBg, bd = ac ? C.greenBd : C.redBd;
              return (
                <div key={u.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 20, background: bg, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: c }}>{u.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>Last seen: {u.lastSeen}</div>
                    </div>
                    <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg, color: c, border: `1px solid ${bd}` }}>{ac ? "ACTIVE" : "INACTIVE"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, paddingTop: 10, borderTop: `1px solid #F3F4F6` }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 16, color: C.text }}>{u.itemsHandled}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>items today</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center", borderLeft: `1px solid #F3F4F6` }}>
                      <div style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 16, color: C.text }}>{u.ordersToday}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>orders today</div>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, borderLeft: `1px solid #F3F4F6`, paddingLeft: 8 }}>
                      <Btn onClick={() => onUserChange("toggle", u.id)} color={ac ? "redO" : "greenO"} sx={{ padding: "5px 10px", fontSize: 11 }}>{ac ? "Deactivate" : "Activate"}</Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === "orders" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, flex: 1 }}>
                {[[today.length,"Total",C.text],[today.filter((o)=>o.status==="live").length,"Live",C.amber],[today.filter((o)=>o.status==="billed").length,"Billed",C.green]].map(([v,l,c])=>(
                  <div key={l} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 20, color: c }}>{v}</div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{l}</div>
                  </div>
                ))}
              </div>
              <Btn onClick={() => setScanning(true)} color="amber" sx={{ padding: "10px 14px", fontSize: 12, flexShrink: 0, whiteSpace: "nowrap" }}>+ New</Btn>
            </div>
            {today.length > 0 && <><GrpLabel label="Today"   color={C.amber} />{today.map((o)=><OrderCard key={o.id} order={o} onOpen={setActiveOId} isAdmin />)}</>}
            {older.length > 0 && <><GrpLabel label="Earlier" color={C.gray}  />{older.map((o)=><OrderCard key={o.id} order={o} onOpen={setActiveOId} dim isAdmin />)}</>}
          </>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              {[[totalNA,"N/A items",C.red],[totalPart,"Partial fills",C.amber],[totalMiss,"Units missed",C.text]].map(([v,l,c])=>(
                <div key={l} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <div style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 22, color: c }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Volume chart */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: "0.8px", marginBottom: 14 }}>ORDER VOLUME — LAST 7 DAYS</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                {DAILY_VOLUME.map((d) => {
                  const bh = Math.round((d.count / maxVol) * 68);
                  return (
                    <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: 10, color: C.textDim, fontFamily: C.mono }}>{d.count}</div>
                      <div style={{ width: "100%", height: bh, background: C.amber, borderRadius: "4px 4px 0 0", opacity: 0.8 }} />
                      <div style={{ fontSize: 10, color: C.textDim }}>{d.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unfulfilled SKUs */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: "0.8px", marginBottom: 8 }}>UNFULFILLED ITEMS</div>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>Tap any SKU to see affected orders and customers.</div>
            {skus.length === 0 && <div style={{ textAlign: "center", color: C.textFaint, padding: "32px 0", fontSize: 13 }}>No unfulfilled items yet.</div>}
            {skus.map((skuData) => {
              const isExp   = expandSku === skuData.sku;
              const total   = skuData.naCount + skuData.partialCount;
              const naW     = total > 0 ? Math.round((skuData.naCount / total) * 100) : 0;
              return (
                <div key={skuData.sku} style={{ background: "#fff", border: `1px solid ${isExp ? C.redBd : C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div onClick={() => setExpandSku(isExp ? null : skuData.sku)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 14, color: C.text }}>{skuData.sku}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {skuData.naCount > 0      && <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: C.redBg,   color: C.red,   border: `1px solid ${C.redBd}`   }}>{skuData.naCount} N/A</span>}
                        {skuData.partialCount > 0 && <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBd}` }}>{skuData.partialCount} partial</span>}
                        <span style={{ color: "#9CA3AF", fontSize: 13 }}>{isExp ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    <div style={{ background: "#F3F4F6", borderRadius: 4, height: 6, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${naW}%`, height: "100%", background: C.red }} />
                      <div style={{ flex: 1, height: "100%", background: C.amber, opacity: 0.7 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: C.textDim }}>{total} occurrence{total !== 1 ? "s" : ""} · {skuData.totalMissed} units missed</span>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{isExp ? "collapse" : "expand"}</span>
                    </div>
                  </div>
                  {isExp && (
                    <div style={{ borderTop: `1px solid #F3F4F6`, background: "#FAFAFA" }}>
                      {[...skuData.occurrences].sort((a, b) => b.date.localeCompare(a.date)).map((occ, i, arr) => (
                        <div key={i} style={{ padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid #F3F4F6` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{occ.customer}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim }}>{occ.orderId}</span>
                              <span style={{ fontSize: 11, color: "#9CA3AF" }}>·</span>
                              <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(occ.date)}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <Pill status={occ.type} small />
                            <div style={{ fontSize: 11, marginTop: 4 }}>
                              {occ.type === "unavailable"
                                ? <span style={{ color: C.red,   fontWeight: 600 }}>req ×{occ.reqQty} · sent ×0</span>
                                : <span>req ×{occ.reqQty} · <span style={{ color: C.amber, fontWeight: 600 }}>sent ×{occ.sentQty}</span></span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App() {
  const [screen,  setScreen]  = useState("choose"); // choose|staff-select|staff-pin|staff-app|admin-pin|admin-app
  const [staffId, setStaffId] = useState(null);
  const [orders,  setOrders]  = useState(SEED_ORDERS);
  const [users,   setUsers]   = useState(SEED_USERS);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [orderReturnTo, setOrderReturnTo] = useState("home");

  const staffUser   = users.find((u) => u.id === staffId);
  const actorName   = screen === "admin-app" ? "Admin" : (staffUser?.name || "Staff");
  const activeOrder = orders.find((o) => o.id === activeOrderId);

  // ── Order mutations ──────────────────────────────────────────
  // FIREBASE NOTE: Each of these should also call:
  //   set(ref(db, `orders/${orderId}`), updatedOrder)

  const updateItem = (orderId, sIdx, iIdx, changes) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const n = cl(o);
      Object.assign(n.sections[sIdx].items[iIdx], changes);
      return n;
    }));
  };

  const billOrder = (orderId) => {
    setOrders((prev) => prev.map((o) =>
      o.id === orderId ? { ...o, status: "billed", billedBy: actorName, billedAt: nowTime() } : o
    ));
  };

  const addOrder = (order) => {
    setOrders((prev) => [order, ...prev]);
  };

  const updateUser = (action, payload) => {
    if (action === "add") setUsers((prev) => [...prev, payload]);
    if (action === "toggle") setUsers((prev) => prev.map((u) => u.id === payload ? { ...u, active: !u.active } : u));
  };

  // ── Screens ──────────────────────────────────────────────────
  if (screen === "choose") return (
    <ChooseScreen onStaff={() => setScreen("staff-select")} onAdmin={() => setScreen("admin-pin")} />
  );

  if (screen === "staff-select") {
    const active = users.filter((u) => u.active);
    return (
      <div style={{ minHeight: 620, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, position: "relative" }}>
        <button onClick={() => setScreen("choose")} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 20, padding: 4 }}>←</button>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim, marginBottom: 20, letterSpacing: "0.5px" }}>WHO ARE YOU?</div>
        <div style={{ width: "100%", maxWidth: 320, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {active.map((u) => (
            <button key={u.id} onClick={() => { setStaffId(u.id); setScreen("staff-pin"); }} style={{ padding: 14, borderRadius: 10, cursor: "pointer", background: "#fff", border: `1px solid ${C.borderMd}`, color: C.text, fontWeight: 600, fontSize: 15, fontFamily: C.sans }}>{u.name}</button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "staff-pin") return (
    <PinScreen
      title={staffUser?.name || ""}
      subtitle="Enter your 4-digit PIN"
      avatar={staffUser?.name?.[0] || "?"}
      correctPin={staffUser?.pin || ""}
      onSuccess={() => setScreen("staff-app")}
      onBack={() => setScreen("staff-select")}
    />
  );

  if (screen === "admin-pin") return (
    <PinScreen
      title="Admin Access"
      subtitle="Enter admin PIN"
      hint="(hint: 0000)"
      avatar="🔐"
      correctPin="0000"
      onSuccess={() => setScreen("admin-app")}
      onBack={() => setScreen("choose")}
    />
  );

  if (screen === "staff-app") {
    if (activeOrder) return (
      <OrderDetail
        order={activeOrder}
        actorName={actorName}
        onBack={() => setActiveOrderId(null)}
        onUpdate={(sIdx, iIdx, changes) => updateItem(activeOrder.id, sIdx, iIdx, changes)}
        onBilled={() => { billOrder(activeOrder.id); setActiveOrderId(null); }}
      />
    );
    if (screen === "staff-app" && orderReturnTo === "scan") return null; // handled below
    return (
      <StaffHome
        orders={orders}
        staffName={actorName}
        onSignOut={() => setScreen("choose")}
        onNewOrder={() => setOrderReturnTo("home")}
        onOpenOrder={(id) => setActiveOrderId(id)}
      />
    );
  }

  if (screen === "admin-app") return (
    <AdminApp
      orders={orders}
      users={users}
      onSignOut={() => setScreen("choose")}
      onOrderUpdate={updateItem}
      onOrderBilled={billOrder}
      onAddOrder={addOrder}
      onUserChange={updateUser}
    />
  );

  // Scan screen for staff (triggered from home)
  return (
    <ScanScreen
      actorName={actorName}
      onBack={() => setScreen("staff-app")}
      onConfirm={(o) => { addOrder(o); setActiveOrderId(o.id); setScreen("staff-app"); }}
    />
  );
}
