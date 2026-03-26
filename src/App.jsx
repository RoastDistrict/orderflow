import React, { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, remove, update } from "firebase/database";
import skuData from "./skus.json";
import buyerData from "./buyers.json";
import buyerGroupData from "./buyerGroups.json";

// ─── FIREBASE ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBVB_v9fYMzOs_FsdMmfyNzLqc0fP9r6XA",
  authDomain:        "orderflow-defa4.firebaseapp.com",
  databaseURL:       "https://orderflow-defa4-default-rtdb.firebaseio.com",
  projectId:         "orderflow-defa4",
  storageBucket:     "orderflow-defa4.firebasestorage.app",
  messagingSenderId: "596338428100",
  appId:             "1:596338428100:web:7f6af203922e459ea0e191",
};
const fbApp = initializeApp(firebaseConfig);
const db    = getDatabase(fbApp);

// ─── CONSTANTS ────────────────────────────────────────────────
const TODAY          = new Date().toISOString().slice(0, 10);
const YDAY           = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d) => d === TODAY ? "Today" : d === YDAY ? "Yesterday"
  : new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const cl    = (x) => JSON.parse(JSON.stringify(x));
const genId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:5}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
};
const purgeOldOrders = (orders) => orders.filter((o) => o.date >= SEVEN_DAYS_AGO);

// ─── MASTER DATA (imported from json files) ──────────────────
const SKU_CATEGORIES    = skuData.categories;
const SEED_SKUS         = skuData.skus;
const SEED_BUYERS       = buyerData;
const SEED_BUYER_GROUPS = buyerGroupData;

// ─── SEED DATA ────────────────────────────────────────────────
const SEED_USERS = [
  { id: 1, name: "Ravi",   active: true,  itemsHandled: 42, ordersToday: 8,  lastSeen: "09:45" },
  { id: 2, name: "Priya",  active: true,  itemsHandled: 38, ordersToday: 6,  lastSeen: "10:12" },
  { id: 3, name: "Suresh", active: true,  itemsHandled: 31, ordersToday: 5,  lastSeen: "08:55" },
  { id: 4, name: "Anita",  active: false, itemsHandled: 0,  ordersToday: 0,  lastSeen: "Yesterday" },
  { id: 5, name: "Mohan",  active: true,  itemsHandled: 19, ordersToday: 3,  lastSeen: "11:02" },
];

const SEED_ORDERS = purgeOldOrders([
  { id: "A1", date: TODAY, scannedAt: "09:14", status: "live", sections: [
      { name: "Rama Plywood", items: [
        { id: 101, sku: "HG 1102", origQty: 12, qty: 12, status: "pending",     note: "", handledBy: null },
        { id: 102, sku: "SF 3611", origQty: 6,  qty: 6,  status: "pending",     note: "", handledBy: null },
        { id: 104, sku: "MF 106",  origQty: 2,  qty: 0,  status: "unavailable", note: "", handledBy: "Ravi" },
      ]},
  ]},
  { id: "A2", date: TODAY, scannedAt: "09:14", status: "live", sections: [
      { name: "Mahavir", items: [
        { id: 105, sku: "SM 1241", origQty: 9, qty: 5, status: "partial",     note: "Only 5 in stock", handledBy: "Priya" },
        { id: 106, sku: "SA 3620", origQty: 3, qty: 0, status: "unavailable", note: "",               handledBy: "Ravi"  },
      ]},
  ]},
  { id: "B2", date: TODAY, scannedAt: "10:30", status: "live", sections: [
      { name: "Rightways", items: [
        { id: 201, sku: "HG 3615", origQty: 5, qty: 5, status: "fulfilled", note: "", handledBy: "Priya" },
        { id: 202, sku: "SF 5165", origQty: 8, qty: 8, status: "fulfilled", note: "", handledBy: "Priya" },
      ]},
  ]},
  { id: "B3", date: TODAY, scannedAt: "10:30", status: "live", sections: [
      { name: "Gurushakti", items: [
        { id: 203, sku: "SM 3601", origQty: 6, qty: 3, status: "partial", note: "3 available", handledBy: "Suresh" },
      ]},
  ]},
  { id: "C3", date: YDAY, scannedAt: "11:02", status: "billed", sections: [
      { name: "DMS Design", items: [
        { id: 301, sku: "HG 5210", origQty: 5, qty: 5, status: "fulfilled",   note: "", handledBy: "Suresh" },
        { id: 302, sku: "MF F31",  origQty: 4, qty: 4, status: "fulfilled",   note: "", handledBy: "Suresh" },
        { id: 303, sku: "MF 106",  origQty: 1, qty: 0, status: "unavailable", note: "", handledBy: "Ravi"   },
      ]},
  ]},
  { id: "D4", date: YDAY, scannedAt: "14:45", status: "billed", sections: [
      { name: "VK Agency", items: [
        { id: 401, sku: "SA 8235", origQty: 2, qty: 2, status: "fulfilled", note: "",              handledBy: "Mohan" },
        { id: 402, sku: "HG 8786", origQty: 5, qty: 3, status: "partial",   note: "2 backordered", handledBy: "Mohan" },
      ]},
  ]},
]);

const DAILY_VOLUME = [
  {date:"Mon",count:4},{date:"Tue",count:7},{date:"Wed",count:5},
  {date:"Thu",count:9},{date:"Fri",count:6},{date:"Sat",count:11},{date:"Sun",count:3},
];

// ─── TRANSLATIONS ─────────────────────────────────────────────
const T = {
  en: {
    tagline:"Order management · Error prevention",
    staff:"Staff", staffSub:"Assemble and fulfil orders",
    admin:"Admin", adminSub:"Manage users, orders and SKUs",
    whoAreYou:"WHO ARE YOU?",
    signOut:"Sign out",
    liveOrders:"Live Orders", pendingSkus:"📦 Pending SKUs", history:"History",
    newOrder:"+ New Order",
    inProgress:"In Progress", readyForBilling:"Ready for Billing",
    noOrdersToday:"No orders yet today.", noPastOrders:"No past orders.",
    noPendingItems:"No pending items across live orders.",
    pendingSkusHeader:"PENDING SKUS — ACROSS ALL LIVE ORDERS",
    done:"✓ Done", na:"✕ N/A",
    newOrderTitle:"NEW ORDER",
    takePhoto:"Take a Photo", takePhotoSub:"Open camera to photograph order slip",
    uploadGallery:"Upload from Gallery", uploadGallerySub:"Choose an existing photo",
    enterManually:"Enter Manually", enterManuallySub:"Type SKU codes and quantities directly",
    chooseMethod:"Choose extraction method:",
    chooseOrder:"How would you like to add the order?",
    free:"Free", freeSub:"Google Vision (fast OCR)",
    premium:"Premium", premiumSub:"Claude Vision (AI understanding)",
    back:"↩ Back", startOver:"↩ Start over",
    cropTitle:"CROP ORDER SLIP", cropHint:"Drag corners to frame the order slip tightly", analyse:"Analyse →", retake:"↩ Retake",
    reading:"Reading handwriting…",
    extractionFailed:"⚠ Extraction failed",
    adjustCrop:"✂ Adjust Crop & Retry", retakePhoto:"↩ Retake Photo",
    itemsExtracted:"items extracted", needReview:"need review", allVerified:"All verified ✓",
    notesCaptured:"NOTES CAPTURED FROM SLIP",
    addMissedSku:"+ Add missed SKU to",
    reviewWarning:"Review and edit the", uncertainItems:"uncertain item",
    createOrders:"✓ Create", orders:"Order",
    customerName:"CUSTOMER / SECTION NAME",
    items:"ITEMS", addSku:"+ Add Another SKU",
    pending:"PENDING", handled:"HANDLED",
    allHandled:"All items handled", readyToBill:"Ready to send to billing",
    fulfilled:"✓ Fulfilled", unavailable:"✕ N/A", qty:"Qty",
    editSku:"Edit SKU", editQtyBtn:"Edit Qty", remove:"Remove",
    sendToBilling:"📄 Send to Billing", billAnyway:"📄 Bill anyway",
    itemsPending:"items pending", reopenLive:"↩ Reopen as Live Order",
    confirmBilling:"✓ Confirm & Push to Billing", exportTally:"📊 Export to Tally (CSV)", backToOrder:"Back to Order",
    saveAlias:"+ Save alias",
    unmatched:"UNMATCHED",
    noMatchFound:"No match found — please enter the correct SKU.",
    aiMatched:"AI matched at",verifyConfirm:"% — verify and confirm.",
    addOrderNotes:"+ Add order notes", orderNotes:"ORDER NOTES", save:"Save", cancel:"Cancel",
    active:"active",
  },
  hi: {
    tagline:"ऑर्डर प्रबंधन · त्रुटि निवारण",
    staff:"स्टाफ", staffSub:"ऑर्डर इकट्ठा करें और पूरा करें",
    admin:"एडमिन", adminSub:"यूज़र, ऑर्डर और SKU प्रबंधित करें",
    whoAreYou:"आप कौन हैं?",
    signOut:"साइन आउट",
    liveOrders:"लाइव ऑर्डर", pendingSkus:"📦 बाकी SKU", history:"इतिहास",
    newOrder:"+ नया ऑर्डर",
    inProgress:"प्रगति में", readyForBilling:"बिलिंग के लिए तैयार",
    noOrdersToday:"आज कोई ऑर्डर नहीं।", noPastOrders:"कोई पुराना ऑर्डर नहीं।",
    noPendingItems:"लाइव ऑर्डर में कोई बाकी आइटम नहीं।",
    pendingSkusHeader:"बाकी SKU — सभी लाइव ऑर्डर",
    done:"✓ हो गया", na:"✕ नहीं है",
    newOrderTitle:"नया ऑर्डर",
    takePhoto:"फ़ोटो लें", takePhotoSub:"ऑर्डर स्लिप की फ़ोटो खींचें",
    uploadGallery:"गैलरी से अपलोड करें", uploadGallerySub:"कोई मौजूदा फ़ोटो चुनें",
    enterManually:"हाथ से दर्ज करें", enterManuallySub:"SKU कोड और मात्रा सीधे टाइप करें",
    chooseMethod:"तरीका चुनें:",
    chooseOrder:"ऑर्डर कैसे जोड़ना चाहते हैं?",
    free:"मुफ़्त", freeSub:"Google Vision (तेज़ OCR)",
    premium:"प्रीमियम", premiumSub:"Claude Vision (AI समझ)",
    back:"↩ वापस", startOver:"↩ फिर से शुरू",
    cropTitle:"स्लिप काटें", cropHint:"ऑर्डर स्लिप को कसकर फ्रेम करने के लिए कोने खींचें", analyse:"विश्लेषण करें →", retake:"↩ दोबारा लें",
    reading:"हस्तलेख पढ़ रहे हैं…",
    extractionFailed:"⚠ निष्कर्षण विफल",
    adjustCrop:"✂ काट समायोजित करें और पुनः प्रयास करें", retakePhoto:"↩ दोबारा फ़ोटो लें",
    itemsExtracted:"आइटम निकाले", needReview:"समीक्षा जरूरी", allVerified:"सब सत्यापित ✓",
    notesCaptured:"स्लिप से नोट",
    addMissedSku:"+ छूटा SKU जोड़ें",
    reviewWarning:"समीक्षा करें", uncertainItems:"अनिश्चित आइटम",
    createOrders:"✓ बनाएं", orders:"ऑर्डर",
    customerName:"ग्राहक / सेक्शन नाम",
    items:"आइटम", addSku:"+ और SKU जोड़ें",
    pending:"बाकी", handled:"हो गया",
    allHandled:"सभी आइटम हो गए", readyToBill:"बिलिंग के लिए तैयार",
    fulfilled:"✓ मिल गया", unavailable:"✕ नहीं है", qty:"मात्रा",
    editSku:"SKU बदलें", editQtyBtn:"मात्रा बदलें", remove:"हटाएं",
    sendToBilling:"📄 बिलिंग भेजें", billAnyway:"📄 फिर भी बिल करें",
    itemsPending:"आइटम बाकी", reopenLive:"↩ लाइव ऑर्डर में वापस लाएं",
    confirmBilling:"✓ पुष्टि करें और बिलिंग में भेजें", exportTally:"📊 Tally में एक्सपोर्ट करें", backToOrder:"ऑर्डर पर वापस",
    saveAlias:"+ उपनाम सहेजें",
    unmatched:"नहीं मिला",
    noMatchFound:"कोई मिलान नहीं — सही SKU दर्ज करें।",
    aiMatched:"AI ने मिलाया",verifyConfirm:"% — जांचें और पुष्टि करें।",
    addOrderNotes:"+ ऑर्डर नोट जोड़ें", orderNotes:"ऑर्डर नोट", save:"सहेजें", cancel:"रद्द करें",
    active:"सक्रिय",
  }
};

// ─── HELPERS ──────────────────────────────────────────────────
const allItems = (o) => o.sections.flatMap((s) => s.items);
const isReady  = (o) => allItems(o).filter((i) => i.status === "pending").length === 0;
const progData = (o) => {
  const it = allItems(o), done = it.filter((i) => i.status !== "pending").length;
  return { done, total: it.length, pct: Math.round((done / it.length) * 100) };
};

// Look up rate for a SKU code from skus list
const getRateForSku = (skuCode, skuList) => {
  const found = skuList.find((s) => s.id.toUpperCase() === skuCode.toUpperCase());
  if (!found) return 0;
  return found.rate ?? 0;
};

// ─── FUZZY SKU MATCHER ────────────────────────────────────────
// ─── SKU MATCHER ──────────────────────────────────────────────
// Splits a SKU string into its alpha prefix and numeric body.
// e.g. "HC 7813"  → { prefix:"HC",  num:"7813" }
//      "FL2 1406" → { prefix:"FL2", num:"1406" }
//      "MFF F37"  → { prefix:"MFF", num:"F37"  }
//      "72-129"   → { prefix:"72",  num:"129"  }  (numeric prefix ok)
const splitSku = (s) => {
  const clean = s.toUpperCase().replace(/[^A-Z0-9]/g, " ").trim();
  // Has explicit space: prefix is everything before first space, num is rest
  const m = clean.match(/^([A-Z0-9]{1,6})\s+(.+)$/);
  if (m) return { prefix: m[1], num: m[2].replace(/\s+/g,"") };
  // No space — split alpha prefix from numeric body
  const m2 = clean.match(/^([A-Z]+)(\d.*)$/);
  if (m2) return { prefix: m2[1], num: m2[2] };
  // Numeric-led (e.g. "72F64" with no space) — treat whole thing as num, prefix=""
  // This case shouldn't normally occur after the space-normalisation above
  return { prefix: clean, num: "" };
};

// Levenshtein distance (for numeric part comparison)
const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, (_,i) => Array.from({length:n+1}, (_,j) => i===0?j:j===0?i:0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
};

const fuzzyMatchSku = (raw, skuList) => {
  const clean = raw.toUpperCase().trim();
  const {prefix:rawPfx, num:rawNum} = splitSku(clean);

  let best = null, bestScore = 0;

  for (const sku of skuList) {
    const {prefix:skuPfx, num:skuNum} = splitSku(sku.id);

    // ── Rule 1: prefix MUST match exactly (HC≠FC, HG≠HGG allowed with penalty)
    if (rawPfx !== skuPfx) {
      // Allow 1-char OCR error in prefix only if lengths are equal
      if (rawPfx.length !== skuPfx.length) continue;
      if (levenshtein(rawPfx, skuPfx) > 1) continue;
    }

    // ── Rule 2: score numeric part similarity
    const rawN = rawNum.replace(/[^A-Z0-9]/g,"");
    const skuN = skuNum.replace(/[^A-Z0-9]/g,"");
    if (!rawN || !skuN) continue;

    let score = 0;
    if (rawN === skuN) {
      score = rawPfx===skuPfx ? 1.0 : 0.95; // exact num, exact/near prefix
    } else if (rawN.startsWith(skuN) || skuN.startsWith(rawN)) {
      score = 0.88;
    } else if (rawN.includes(skuN) || skuN.includes(rawN)) {
      score = 0.82;
    } else {
      // Levenshtein on numeric part — allow up to 2 char differences
      const dist = levenshtein(rawN, skuN);
      const maxLen = Math.max(rawN.length, skuN.length);
      if (dist > 2) continue; // too different
      score = (1 - dist / maxLen) * (rawPfx===skuPfx ? 0.9 : 0.8);
    }

    if (score > bestScore) { bestScore = score; best = sku.id; }
  }

  // Only return a match if score is meaningful
  if (bestScore >= 0.80) {
    return { matched: best, confidence: Math.round(bestScore * 100) };
  }
  // No good match — return raw OCR text as custom SKU
  return { matched: clean, confidence: 0 };
};

// ─── DESIGN TOKENS ────────────────────────────────────────────
const C = {
  bg:"#F7F8FA", surface:"#FFFFFF", card:"#FFFFFF",
  border:"#E4E7ED", borderMd:"#D1D5DB",
  amber:"#D97706", amberBg:"#FFFBEB", amberBd:"#FCD34D",
  green:"#059669", greenBg:"#ECFDF5", greenBd:"#6EE7B7",
  red:"#DC2626",   redBg:"#FEF2F2",   redBd:"#FCA5A5",
  blue:"#2563EB",  blueBg:"#EFF6FF",  blueBd:"#93C5FD",
  indigo:"#7C3AED",indigoBg:"#F5F3FF",indigoBd:"#C4B5FD",
  gray:"#6B7280",  grayBg:"#F9FAFB",
  text:"#111827",  textDim:"#6B7280", textFaint:"#D1D5DB",
  mono:"'JetBrains Mono','Fira Mono',monospace",
  sans:"'Inter',system-ui,sans-serif",
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────
function Pill({ status, small=false }) {
  const m={fulfilled:{l:"Fulfilled",c:C.green,bg:C.greenBg,bd:C.greenBd},unavailable:{l:"N/A",c:C.red,bg:C.redBg,bd:C.redBd},partial:{l:"Partial",c:C.amber,bg:C.amberBg,bd:C.amberBd},pending:{l:"Pending",c:C.gray,bg:C.grayBg,bd:C.border},billed:{l:"Billed",c:C.blue,bg:C.blueBg,bd:C.blueBd}};
  const s=m[status]||m.pending;
  return <span style={{fontFamily:C.mono,fontSize:small?9:10,fontWeight:600,padding:small?"2px 6px":"3px 8px",borderRadius:4,background:s.bg,color:s.c,border:`1px solid ${s.bd}`,whiteSpace:"nowrap"}}>{s.l}</span>;
}
function PBar({pct,ready}){return <div style={{background:C.border,borderRadius:4,height:5,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:ready?C.green:C.amber,transition:"width .3s"}}/></div>;}
function Btn({children,onClick,color="amber",sx={}}){
  const colors={amber:{bg:C.amber,text:"#fff",border:C.amber},green:{bg:C.green,text:"#fff",border:C.green},ghost:{bg:"#fff",text:C.gray,border:C.border},danger:{bg:C.redBg,text:C.red,border:C.redBd},greenO:{bg:C.greenBg,text:C.green,border:C.greenBd},redO:{bg:C.redBg,text:C.red,border:C.redBd},amberO:{bg:C.amberBg,text:C.amber,border:C.amberBd}};
  const v=colors[color]||colors.amber;
  return <button onClick={onClick} style={{background:v.bg,color:v.text,border:`1px solid ${v.border}`,fontFamily:C.sans,fontWeight:600,fontSize:13,borderRadius:8,padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,...sx}}>{children}</button>;
}
function GrpLabel({label,color}){return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:4}}><div style={{width:6,height:6,borderRadius:3,background:color,flexShrink:0}}/><span style={{fontFamily:C.mono,fontSize:10,fontWeight:600,letterSpacing:"1px",color:C.textDim}}>{label.toUpperCase()}</span></div>;}
function Numpad({onTap}){const keys=["1","2","3","4","5","6","7","8","9","","0","del"];return <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,width:240}}>{keys.map((k,i)=>k===""?<div key={i}/>:<button key={k} onClick={()=>onTap(k)} style={{height:58,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",fontSize:k==="del"?18:22,fontWeight:600,color:C.text,cursor:"pointer",fontFamily:C.sans,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>{k==="del"?"⌫":k}</button>)}</div>;}

function OrderCard({order,onOpen,onDelete,onEdit,onReopen,dim=false}){
  const {done,total,pct}=progData(order);
  const ready=isReady(order),billed=order.status==="billed";
  const names=order.sections.map(s=>s.name).join(", ");
  const idBg=billed?C.grayBg:ready?C.greenBg:C.amberBg,idC=billed?C.gray:ready?C.green:C.amber,idBd=billed?C.border:ready?C.greenBd:C.amberBd;
  const [menuOpen,setMenuOpen]=useState(false);
  const pressTimer=useRef(null);

  const startPress=e=>{
    e.preventDefault();
    pressTimer.current=setTimeout(()=>setMenuOpen(true),500);
  };
  const endPress=e=>{
    clearTimeout(pressTimer.current);
  };

  return <div style={{position:"relative",marginBottom:10}}>
    {menuOpen&&<div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:50}}/>}
    {menuOpen&&<div style={{position:"absolute",top:0,right:0,zIndex:100,background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",minWidth:180,overflow:"hidden"}}>
      {onEdit&&<button onClick={()=>{setMenuOpen(false);onEdit(order.id);}} style={{width:"100%",padding:"13px 16px",border:"none",borderBottom:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:13,fontFamily:C.sans,fontWeight:600,color:C.text,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>✏️ Edit Order</button>}
      {billed&&onReopen&&<button onClick={()=>{setMenuOpen(false);onReopen(order.id);}} style={{width:"100%",padding:"13px 16px",border:"none",borderBottom:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:13,fontFamily:C.sans,fontWeight:600,color:C.amber,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>↩ Reopen as Live</button>}
      {onDelete&&<button onClick={()=>{setMenuOpen(false);if(window.confirm(`Delete order ${order.id}?`))onDelete(order.id);}} style={{width:"100%",padding:"13px 16px",border:"none",background:"#fff",cursor:"pointer",fontSize:13,fontFamily:C.sans,fontWeight:600,color:C.red,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>🗑 Delete Order</button>}
    </div>}
    <div
      style={{background:C.card,border:`1px solid ${ready&&!billed?C.greenBd:C.border}`,borderRadius:12,padding:"14px 16px",opacity:dim?0.65:1,boxShadow:"0 1px 3px rgba(0,0,0,0.05)",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"}}
      onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
      onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={endPress}
      onContextMenu={e=>e.preventDefault()}
    >
      <div onClick={()=>{if(!menuOpen)onOpen(order.id);}} style={{cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
          <div style={{width:42,height:42,borderRadius:8,flexShrink:0,background:idBg,border:`1px solid ${idBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:C.mono,fontWeight:700,fontSize:15,color:idC}}>{order.id}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.4}}>{names}</div>
              <Pill status={billed?"billed":ready?"fulfilled":"pending"}/>
            </div>
            <div style={{fontSize:11,color:C.textDim,marginTop:3}}>{order.scannedAt} · {total} items</div>
          </div>
        </div>
        <PBar pct={pct} ready={ready}/>
        <div style={{fontSize:11,color:C.textDim,marginTop:5}}>{done}/{total} handled</div>
      </div>
    </div>
  </div>;
}

// ─── LANG TOGGLE ──────────────────────────────────────────────
function LangToggle({lang,setLang}){
  return <button onClick={()=>setLang(l=>l==="en"?"hi":"en")}
    style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:C.sans,fontWeight:600,color:C.textDim,display:"flex",alignItems:"center",gap:5}}>
    {lang==="en"?"🇮🇳 हिंदी":"🇬🇧 English"}
  </button>;
}

// ─── CHOOSE SCREEN (no PIN) ───────────────────────────────────
function ChooseScreen({onStaff,onAdmin,lang,setLang}){
  const t=T[lang];
  return <div style={{minHeight:620,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,position:"relative"}}>
    <div style={{position:"absolute",top:16,right:16}}><LangToggle lang={lang} setLang={setLang}/></div>
    <div style={{marginBottom:6}}><span style={{fontFamily:C.mono,fontWeight:700,fontSize:22,color:C.amber,letterSpacing:1}}>ORDER</span><span style={{fontFamily:C.mono,fontWeight:700,fontSize:22,color:C.gray,letterSpacing:1}}>FLOW</span></div>
    <div style={{fontSize:13,color:C.textDim,marginBottom:40}}>{t.tagline}</div>
    <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:12}}>
      <button onClick={onStaff} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
        <span style={{fontSize:28,flexShrink:0}}>👷</span>
        <div><div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:2}}>{t.staff}</div><div style={{fontSize:12,color:C.textDim}}>{t.staffSub}</div></div>
      </button>
      <button onClick={onAdmin} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.amberBd}`,background:C.amberBg,cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left"}}>
        <span style={{fontSize:28,flexShrink:0}}>🔐</span>
        <div><div style={{fontWeight:700,fontSize:15,color:C.amber,marginBottom:2}}>{t.admin}</div><div style={{fontSize:12,color:"#92610A"}}>{t.adminSub}</div></div>
      </button>
    </div>
  </div>;
}

// ─── STAFF SELECT (no PIN) ────────────────────────────────────
function StaffSelect({users,onSelect,onBack,lang}){
  const t=T[lang];
  const active=users.filter(u=>u.active);
  return <div style={{minHeight:620,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,position:"relative"}}>
    <button onClick={onBack} style={{position:"absolute",top:16,left:16,background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:20,padding:4}}>←</button>
    <div style={{fontSize:13,fontWeight:600,color:C.textDim,marginBottom:20,letterSpacing:"0.5px"}}>{t.whoAreYou}</div>
    <div style={{width:"100%",maxWidth:320,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {active.map(u=><button key={u.id} onClick={()=>onSelect(u.id)} style={{padding:14,borderRadius:10,cursor:"pointer",background:"#fff",border:`1px solid ${C.borderMd}`,color:C.text,fontWeight:600,fontSize:15,fontFamily:C.sans}}>{u.name}</button>)}
    </div>
  </div>;
}

function PendingSkuTab({orders,onUpdate,lang="en"}){
  const t=T[lang];
  const [expandSku,setExpandSku]=useState(null);
  const liveOrders=orders.filter(o=>o.status==="live");
  const skuMap={};
  liveOrders.forEach(order=>{
    order.sections.forEach((sec,sIdx)=>{
      sec.items.forEach((item,iIdx)=>{
        if(item.status!=="pending")return;
        if(!skuMap[item.sku])skuMap[item.sku]={sku:item.sku,totalQty:0,orders:[]};
        skuMap[item.sku].totalQty+=item.origQty;
        skuMap[item.sku].orders.push({orderId:order.id,buyer:sec.name,qty:item.origQty,sIdx,iIdx,orderRef:order});
      });
    });
  });
  const skus=Object.values(skuMap).sort((a,b)=>b.totalQty-a.totalQty);

  if(skus.length===0)return <div style={{textAlign:"center",color:C.textFaint,padding:"60px 0",fontSize:13}}>{t.noPendingItems}</div>;

  return <>
    <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginBottom:12}}>{t.pendingSkusHeader}</div>
    {skus.map(skuRow=>{
      const isExp=expandSku===skuRow.sku;
      const allFulfilled=skuRow.orders.every(o=>o.orderRef.sections[o.sIdx].items[o.iIdx].status!=="pending");
      return <div key={skuRow.sku} style={{background:"#fff",border:`1px solid ${isExp?C.amberBd:C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div onClick={()=>setExpandSku(isExp?null:skuRow.sku)} style={{padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:allFulfilled?C.green:C.text}}>{skuRow.sku}</div>
            <div style={{fontSize:11,color:C.textDim,marginTop:3}}>{skuRow.orders.length} order{skuRow.orders.length>1?"s":""}</div>
          </div>
          <div style={{fontFamily:C.mono,fontWeight:700,fontSize:18,color:allFulfilled?C.green:C.amber}}>×{skuRow.totalQty}</div>
          <span style={{color:C.textDim,fontSize:13}}>{isExp?"▲":"▼"}</span>
        </div>
        {isExp&&<div style={{borderTop:`1px solid ${C.border}`,background:C.bg}}>
          {skuRow.orders.map((occ,i)=>{
            const liveItem=occ.orderRef.sections[occ.sIdx].items[occ.iIdx];
            const isPending=liveItem.status==="pending";
            return <div key={i} style={{padding:"12px 16px",borderBottom:i<skuRow.orders.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{occ.buyer}</div>
                <div style={{fontFamily:C.mono,fontSize:11,color:C.textDim,marginTop:2}}>{occ.orderId} · ×{occ.qty}</div>
              </div>
              {isPending
                ?<div style={{display:"flex",gap:6}}>
                    <Btn onClick={()=>onUpdate(occ.orderId,occ.sIdx,occ.iIdx,{status:"fulfilled",handledBy:"Staff"})} color="greenO" sx={{padding:"6px 10px",fontSize:11}}>{t.done}</Btn>
                    <Btn onClick={()=>onUpdate(occ.orderId,occ.sIdx,occ.iIdx,{status:"unavailable",handledBy:"Staff"})} color="redO" sx={{padding:"6px 10px",fontSize:11}}>{t.na}</Btn>
                  </div>
                :<Pill status={liveItem.status}/>
              }
            </div>;
          })}
        </div>}
      </div>;
    })}
  </>;
}

// ─── STAFF HOME ───────────────────────────────────────────────
function StaffHome({orders,staffName,onNewOrder,onOpenOrder,onSignOut,onEditOrder,onReopenOrder,onItemUpdate,lang,setLang}){
  const t=T[lang];
  const [tab,setTab]=useState("live");
  const live=orders.filter(o=>o.status==="live");
  const hist=orders.filter(o=>o.status==="billed");
  const inProg=live.filter(o=>!isReady(o)),ready=live.filter(o=>isReady(o));
  const grouped=hist.reduce((acc,o)=>{(acc[o.date]=acc[o.date]||[]).push(o);return acc;},{});
  const dates=Object.keys(grouped).sort((a,b)=>b.localeCompare(a));
  const tabSt=a=>({flex:1,padding:7,borderRadius:6,border:"none",cursor:"pointer",fontFamily:C.sans,fontSize:13,background:a?"#fff":"transparent",color:a?C.text:C.textDim,fontWeight:a?600:400,boxShadow:a?"0 1px 3px rgba(0,0,0,0.08)":"none"});
  return <div style={{minHeight:620,display:"flex",flexDirection:"column",background:C.bg}}>
    <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${C.border}`,background:"#fff"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <div><span style={{fontFamily:C.mono,fontWeight:700,fontSize:16,color:C.amber,letterSpacing:1}}>ORDER</span><span style={{fontFamily:C.mono,fontWeight:700,fontSize:16,color:C.gray,letterSpacing:1}}>FLOW</span></div>
          <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{live.length} {t.active} · <span style={{color:C.text,fontWeight:600}}>{staffName}</span></div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <LangToggle lang={lang} setLang={setLang}/>
          <button onClick={onSignOut} style={{background:"#fff",border:`1px solid ${C.borderMd}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:C.sans}}>{t.signOut}</button>
        </div>
      </div>
      <div style={{display:"flex",gap:4,background:C.bg,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
        <button onClick={()=>setTab("live")} style={tabSt(tab==="live")}>
          {t.liveOrders}{live.length>0&&<span style={{background:C.amber,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700,fontFamily:C.mono,marginLeft:4}}>{live.length}</span>}
        </button>
        <button onClick={()=>setTab("pending")} style={tabSt(tab==="pending")}>{t.pendingSkus}</button>
        <button onClick={()=>setTab("history")} style={tabSt(tab==="history")}>{t.history}</button>
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"14px 20px 40px"}}>
      {tab==="live"&&<>
        <Btn onClick={onNewOrder} color="amber" sx={{width:"100%",padding:13,borderRadius:10,fontSize:14,marginBottom:20,boxShadow:"0 2px 8px rgba(217,119,6,0.2)"}}>{t.newOrder}</Btn>
        {inProg.length>0&&<><GrpLabel label={t.inProgress} color={C.amber}/>{inProg.map(o=><OrderCard key={o.id} order={o} onOpen={onOpenOrder} onEdit={onEditOrder} onReopen={onReopenOrder}/>)}</>}
        {ready.length>0&&<><GrpLabel label={t.readyForBilling} color={C.green}/>{ready.map(o=><OrderCard key={o.id} order={o} onOpen={onOpenOrder} onEdit={onEditOrder} onReopen={onReopenOrder}/>)}</>}
        {live.length===0&&<div style={{textAlign:"center",color:C.textFaint,padding:"60px 0",fontSize:13}}>{t.noOrdersToday}</div>}
      </>}
      {tab==="pending"&&<PendingSkuTab orders={orders} onUpdate={onItemUpdate} lang={lang}/>}
      {tab==="history"&&<>
        {dates.length===0&&<div style={{textAlign:"center",color:C.textFaint,padding:"60px 0",fontSize:13}}>{t.noPastOrders}</div>}
        {dates.map(d=><div key={d} style={{marginBottom:20}}><GrpLabel label={fmtDate(d)} color={C.textDim}/>{grouped[d].map(o=><OrderCard key={o.id} order={o} onOpen={onOpenOrder} onEdit={onEditOrder} onReopen={onReopenOrder} dim/>)}</div>)}
      </>}
    </div>
  </div>;
}

// ─── GOOGLE VISION (via Vercel serverless proxy) ─────────────
async function extractOrderFromImage(base64Image,skuList,mode="free",buyerList=[],catList=[]){
  if(mode==="premium"){
    const res=await fetch("/api/claude-vision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:base64Image,buyers:buyerList,skus:skuList,catList:catList})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Claude extraction failed");
    return parseClaudeExtraction(data,skuList,buyerList);
  }else{
    const res=await fetch("/api/vision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:base64Image})});
    const data=await res.json();
    const rawText=data.responses?.[0]?.fullTextAnnotation?.text||"";
    return parseOrderText(rawText,skuList);
  }
}
function parseOrderText(text,skuList){
  // ── Step 1: clean each line ──────────────────────────────────
  // Remove tick marks, checkmarks, crosses, slashes from anywhere in line
  // Vision often OCRs ✓ as 'y', '/', or 'J' — strip those too when adjacent to digits
  const NOISE_CHARS=/[✓✗✘✔☑✕•~↗→←↓]/g;
  const cleanLine=raw=>{
    let s=raw.replace(NOISE_CHARS,"");
    // Strip trailing alpha chars that are OCR noise after a number: "88406-4y" → "88406-4"
    s=s.replace(/([-–]\s*\d{1,3})[a-zA-Z]+\s*$/,"$1");
    // Strip leading slashes/backslashes
    s=s.replace(/^[/\\]+\s*/,"");
    return s.replace(/\s+/g," ").trim();
  };

  // ── Step 2: SKU detection ─────────────────────────────────────
  // Pattern: LETTERS/NUMS followed by dash and 1-3 digit quantity
  // e.g. "HC 7813-18", "HC 7813 - 18", "SMT 88406-4", "72-129-1"
  const SKU_PATTERN=/([A-Z0-9][A-Z0-9\s]{1,10}?)\s*[-–]\s*(\d{1,3})(?=\s*(?:[A-Z]|$))/gi;

  const extractSkusFromLine=line=>{
    const results=[];
    const upper=line.toUpperCase();
    let m;
    const re=new RegExp(SKU_PATTERN.source,"gi");
    while((m=re.exec(upper))!==null){
      const code=m[1].replace(/\s+/g," ").trim();
      const qty=parseInt(m[2]);
      // Reject: purely numeric code (dates), too short, or qty=0
      if(/^\d+$/.test(code)||code.length<2||qty===0)continue;
      results.push({code,qty});
    }
    return results;
  };

  const isSectionHeader=line=>{
    if(line.length<2||/^\d+$/.test(line))return false;
    // Has SKU pattern → not a header
    if(extractSkusFromLine(line).length>0)return false;
    // Hindi/Devanagari = customer name
    if(/[\u0900-\u097F]/.test(line))return true;
    // All-caps English words (shop names like RISHTWAYS, S.GAJMER)
    if(/^[A-Z][A-Z\s.&\/]{2,}$/i.test(line)&&!/\d/.test(line))return true;
    return false;
  };

  // ── Step 3: Process lines ─────────────────────────────────────
  const rawLines=text.split("\n").map(l=>l.trim()).filter(Boolean);
  const sections=[];let currentSection=null;const notesRaw=[];

  for(const rawLine of rawLines){
    const line=cleanLine(rawLine);
    if(!line||line.length<2)continue;

    const skusFound=extractSkusFromLine(line);

    if(skusFound.length>0){
      // One line may contain multiple SKUs (two-column slips)
      if(!currentSection){currentSection={name:"General",items:[]};sections.push(currentSection);}
      for(const {code,qty} of skusFound){
        const {matched,confidence}=skuList.length>0
          ?fuzzyMatchSku(code,skuList)
          :{matched:code,confidence:0};
        // confidence=0 means no match found → raw OCR as custom
        currentSection.items.push({
          sku:matched,qty,confidence,
          skipped:false,
          confirmed:confidence>=95,
          custom:confidence===0
        });
      }
    } else if(isSectionHeader(line)){
      currentSection={name:line,_raw:line,items:[]};sections.push(currentSection);
    } else {
      // Notes: skip very short or pure-numeric fragments
      if(line.length>4&&!/^[\d\s]+$/.test(line))notesRaw.push(line);
    }
  }

  const filtered=sections.filter(s=>s.items.length>0);
  if(filtered.length===0)return{sections:[{name:"Unrecognised",items:[]}],parseError:true};
  return{sections:filtered,notes:notesRaw.join(" · "),parseError:false};
}
function parseClaudeExtraction(claudeData,skuList,buyerList){
  const sections=[];
  if(!claudeData.orders||!Array.isArray(claudeData.orders))return{sections:[{name:"Unrecognised",items:[]}],parseError:true};
  for(const order of claudeData.orders){
    const buyerMatch=buyerList.find(b=>b.name.toUpperCase()===order.buyer?.toUpperCase());
    const sectionName=buyerMatch?.name||order.buyer||"Unknown Buyer";
    // _raw: use order._raw if provided, else fall back to the raw buyer string from Claude
    // This ensures the "Save alias" button works even when Claude returns no _raw field
    const rawBuyer=order._raw||(!buyerMatch&&order.buyer?order.buyer:null);
    const section={name:sectionName,items:[],_raw:rawBuyer,_confidence:order.confidence||0};
    if(order.items&&Array.isArray(order.items)){
      for(const item of order.items){
        const rawSku=(item.sku||item._raw||"").trim();
        if(!rawSku)continue;
        // Always fuzzy-match against SKU master — catches Claude OCR errors (H4→HG, OR→CR etc.)
        const {matched,confidence:matchConf}=skuList.length>0
          ?fuzzyMatchSku(rawSku,skuList)
          :{matched:rawSku,confidence:0};
        const isCustom=matchConf===0;
        // If Claude had a high confidence but fuzzy found a better match, trust fuzzy
        // If fuzzy found nothing, fall back to Claude's raw text as custom
        const finalSku=isCustom?rawSku.toUpperCase():matched;
        const finalConf=isCustom?0:matchConf;
        section.items.push({
          sku:finalSku,qty:parseInt(item.qty)||1,
          confidence:finalConf,skipped:false,confirmed:finalConf>=95,
          custom:isCustom,_raw:rawSku
        });
      }
    }
    if(section.items.length>0)sections.push(section);
  }
  if(sections.length===0)return{sections:[{name:"Unrecognised",items:[]}],parseError:true};
  return{sections,notes:"",parseError:false};
}
// ─── SKU TYPEAHEAD ────────────────────────────────────────────
// Shared typeahead input used in manual entry + order SKU editing
function SkuTypeahead({value,onChange,onSelect,onBlur,skuList,placeholder,autoFocus,style={}}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState(value||"");
  const wrapRef=useRef();

  // Sync query when value changes from outside (e.g. edit opens with existing sku)
  useEffect(()=>{setQuery(value||"");},[value]);

  // Normalize: strip all spaces for loose matching (SAP8113 matches SAP 8113)
  const normQ=query.replace(/\s+/g,"").toUpperCase();
  const suggestions=query.trim().length>0
    ?skuList.filter(s=>{
        const qRaw=query.toUpperCase();
        const idUp=s.id.toUpperCase();
        const idNorm=idUp.replace(/\s+/g,"");
        const nameUp=(s.name||"").toUpperCase();
        return idUp.includes(qRaw)||idNorm.includes(normQ)||nameUp.includes(qRaw)||(s._catName||"").toUpperCase().includes(qRaw);
      }).sort((a,b)=>{
        // Exact match or starts-with first
        const aN=a.id.replace(/\s+/g,"").toUpperCase();
        const bN=b.id.replace(/\s+/g,"").toUpperCase();
        const aStarts=aN.startsWith(normQ)?0:1;
        const bStarts=bN.startsWith(normQ)?0:1;
        return aStarts-bStarts;
      }).slice(0,8)
    :[];

  const isCustom=query.trim().length>0&&!skuList.find(s=>s.id.replace(/\s+/g,"").toUpperCase()===normQ||s.id.toUpperCase()===query.trim().toUpperCase());
  const exactMatch=skuList.find(s=>s.id.replace(/\s+/g,"").toUpperCase()===normQ||s.id.toUpperCase()===query.trim().toUpperCase());

  const handleChange=e=>{
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };
  const handleSelect=sku=>{
    setQuery(sku.id);
    onSelect(sku.id,false,sku.cat);
    setOpen(false);
  };
  const handleBlur=e=>{
    // Small delay so click on suggestion registers first
    setTimeout(()=>{
      setOpen(false);
      if(onBlur)onBlur(query.trim(),isCustom&&!exactMatch);
    },150);
  };
  const handleKeyDown=e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      if(suggestions.length>0&&!exactMatch)handleSelect(suggestions[0]);
      else{onSelect(query.trim(),isCustom&&!exactMatch,null);setOpen(false);}
    }
    if(e.key==="Escape")setOpen(false);
  };

  const borderColor=isCustom?C.indigo:query&&exactMatch?C.green:query?C.amber:C.border;

  return <div ref={wrapRef} style={{position:"relative",flex:1,...style}}>
    <div style={{position:"relative"}}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={()=>setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        placeholder={placeholder||"Type SKU code…"}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        style={{width:"100%",padding:"9px 12px",paddingRight:isCustom?88:query&&exactMatch?72:12,borderRadius:8,border:`1.5px solid ${borderColor}`,fontFamily:C.mono,fontSize:13,color:isCustom?C.indigo:C.text,fontWeight:isCustom?600:400,background:"#fff",outline:"none",boxSizing:"border-box",transition:"border-color .15s"}}
      />
      {isCustom&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontFamily:C.mono,fontSize:9,fontWeight:700,color:C.indigo,background:C.indigoBg,border:`1px solid ${C.indigoBd}`,borderRadius:4,padding:"2px 5px",whiteSpace:"nowrap",pointerEvents:"none"}}>CUSTOM</span>}
      {!isCustom&&query&&exactMatch&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontFamily:C.mono,fontSize:9,fontWeight:700,color:C.green,background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:4,padding:"2px 5px",pointerEvents:"none"}}>✓</span>}
    </div>
    {open&&suggestions.length>0&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:999,maxHeight:240,overflowY:"auto"}}>
      {suggestions.map(sku=>{
        const catObj=sku._catName;
        return <div key={sku.id} onMouseDown={e=>{e.preventDefault();handleSelect(sku);}}
          style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background=C.amberBg}
          onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
          <span style={{fontFamily:C.mono,fontWeight:600,fontSize:13,color:C.text}}>{sku.id}</span>
          {sku._catName&&<span style={{fontFamily:C.sans,fontSize:10,color:C.textDim,background:C.grayBg,border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 6px",flexShrink:0}}>{sku._catName}</span>}
        </div>;
      })}
      {query.trim()&&<div onMouseDown={e=>{e.preventDefault();onSelect(query.trim().toUpperCase(),true,null);setOpen(false);setQuery(query.trim().toUpperCase());}}
        style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}
        onMouseEnter={e=>e.currentTarget.style.background=C.indigoBg}
        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
        <span style={{fontFamily:C.mono,fontSize:12,color:C.indigo,fontWeight:600}}>+ Use "{query.trim().toUpperCase()}" as custom SKU</span>
        <span style={{fontFamily:C.mono,fontSize:9,color:C.indigo,background:C.indigoBg,border:`1px solid ${C.indigoBd}`,borderRadius:4,padding:"2px 5px",marginLeft:"auto"}}>CUSTOM</span>
      </div>}
    </div>}
    {open&&query.trim().length>0&&suggestions.length===0&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",border:`1px solid ${C.indigoBd}`,borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:999}}>
      <div onMouseDown={e=>{e.preventDefault();onSelect(query.trim().toUpperCase(),true,null);setOpen(false);}}
        style={{padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}
        onMouseEnter={e=>e.currentTarget.style.background=C.indigoBg}
        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
        <span style={{fontFamily:C.mono,fontSize:12,color:C.indigo,fontWeight:600}}>+ Add "{query.trim().toUpperCase()}" as custom SKU</span>
        <span style={{fontFamily:C.mono,fontSize:9,color:"#fff",background:C.indigo,borderRadius:4,padding:"2px 6px",marginLeft:"auto"}}>NEW</span>
      </div>
    </div>}
  </div>;
}

// ─── BUYER TYPEAHEAD ──────────────────────────────────────────
function BuyerTypeahead({value,onChange,onSelect,placeholder,autoFocus,style={},buyerList=[]}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState(value||"");
  const wrapRef=useRef();
  useEffect(()=>{setQuery(value||"");},[value]);
  const normQ=query.replace(/\s+/g,"").toUpperCase();
  const sourceList=buyerList.length>0?buyerList:SEED_BUYERS;
  const suggestions=query.trim().length>0
    ?sourceList.filter(b=>{
        const n=b.name.toUpperCase();
        const aliases=(b.aliases||[]).map(a=>a.toUpperCase());
        return n.includes(query.toUpperCase())||n.replace(/\s+/g,"").includes(normQ)||aliases.some(a=>a.includes(query.toUpperCase()));
      }).slice(0,8)
    :[];
  const handleChange=e=>{setQuery(e.target.value);onChange&&onChange(e.target.value);setOpen(true);};
  const handleSelect=b=>{setQuery(b.name);onSelect&&onSelect(b);setOpen(false);};
  const handleBlur=()=>setTimeout(()=>setOpen(false),150);
  const handleKeyDown=e=>{
    if(e.key==="Enter"){e.preventDefault();if(suggestions.length>0)handleSelect(suggestions[0]);else{onSelect&&onSelect({name:query.trim(),aliases:[]});setOpen(false);}}
    if(e.key==="Escape")setOpen(false);
  };
  return <div ref={wrapRef} style={{position:"relative",flex:1,...style}}>
    <input value={query} onChange={handleChange} onFocus={()=>setOpen(true)} onBlur={handleBlur} onKeyDown={handleKeyDown}
      autoFocus={autoFocus} placeholder={placeholder||"Type buyer name…"} autoComplete="off" spellCheck={false}
      style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${query?C.amberBd:C.border}`,fontFamily:C.sans,fontSize:13,color:C.text,background:"#fff",outline:"none",boxSizing:"border-box"}}/>
    {open&&suggestions.length>0&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:999,maxHeight:240,overflowY:"auto"}}>
      {suggestions.map(b=><div key={b.id} onMouseDown={e=>{e.preventDefault();handleSelect(b);}}
        style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}
        onMouseEnter={e=>e.currentTarget.style.background=C.amberBg}
        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
        <span style={{fontFamily:C.sans,fontSize:13,color:C.text}}>{b.name}</span>
        <span style={{fontFamily:C.mono,fontSize:9,color:C.textDim,background:C.grayBg,border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 6px",flexShrink:0}}>{b.group}</span>
      </div>)}
    </div>}
  </div>;
}

// ─── REVIEW ITEM ROW ──────────────────────────────────────────
function ReviewItemRow({item,sIdx,iIdx,onChange,onSkip,skuList=[],lang="en"}){
  const t=T[lang];
  const [editSku,setEditSku]=useState(!item.confirmed);
  const [skuVal,setSkuVal]=useState(item.sku);
  const [editQty,setEditQty]=useState(false);
  const [qtyVal,setQtyVal]=useState(String(item.qty));
  const isLow=!item.confirmed&&!(!item.sku||!item.sku.trim()); // unconfirmed non-blank items need review
  const saveSku=()=>{onChange(sIdx,iIdx,"sku",skuVal.trim().toUpperCase());onChange(sIdx,iIdx,"confirmed",true);setEditSku(false);};
  const saveQty=()=>{const n=parseInt(qtyVal);if(!isNaN(n)&&n>0)onChange(sIdx,iIdx,"qty",n);setEditQty(false);};
  return <div style={{background:item.skipped?"#fff":isLow?C.amberBg:item.confirmed?C.greenBg:"#fff",border:`1px solid ${item.skipped?C.border:isLow?C.amberBd:item.confirmed?C.greenBd:C.border}`,borderRadius:10,padding:"12px 13px",marginBottom:8,opacity:item.skipped?0.4:1}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
      {editSku&&!item.skipped?<div style={{display:"flex",gap:6,flex:1,alignItems:"center"}}>
        <SkuTypeahead
          value={skuVal}
          onChange={v=>setSkuVal(v)}
          onSelect={(id,isCustom)=>{setSkuVal(id);onChange(sIdx,iIdx,"sku",id);onChange(sIdx,iIdx,"confirmed",true);onChange(sIdx,iIdx,"custom",isCustom);setEditSku(false);}}
          skuList={skuList}
          placeholder="e.g. HG 3615"
          autoFocus
          style={{flex:1}}
        />
        <button onClick={saveSku} style={{padding:"7px 10px",borderRadius:7,border:"none",background:C.green,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13,flexShrink:0}}>✓</button>
        <button onClick={()=>setEditSku(false)} style={{padding:"7px 10px",borderRadius:7,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:13,flexShrink:0}}>✕</button>
      </div>:<>
        <span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:item.custom?C.indigo:C.text,textDecoration:item.skipped?"line-through":"none",flex:1}}>{item.sku}{item.custom&&<span style={{fontFamily:C.mono,fontSize:9,fontWeight:700,background:C.indigoBg,border:`1px solid ${C.indigoBd}`,borderRadius:3,padding:"1px 5px",marginLeft:6,color:C.indigo}}>CUSTOM</span>}</span>
        {!item.skipped&&<>
          <span style={{fontFamily:C.mono,fontSize:10,color:item.confidence>=85?C.green:item.confidence>=70?C.textDim:C.amber}}>{item.confidence}%</span>
          {item.confirmed&&!item.custom&&<span style={{fontFamily:C.mono,fontSize:10,color:C.green}}>✓</span>}
          <button onClick={()=>{setSkuVal(item.sku);setEditSku(true);}} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:11}}>{t.editSku}</button>
        </>}
      </>}
    </div>
    {!item.skipped&&<div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:12,color:C.textDim}}>{t.qty}:</span>
      {editQty?<div style={{display:"flex",gap:6}}>
        <input type="text" inputMode="numeric" value={qtyVal} onChange={e=>setQtyVal(e.target.value.replace(/[^0-9]/g,""))} onKeyDown={e=>e.key==="Enter"&&saveQty()} autoFocus style={{width:60,padding:"4px 8px",borderRadius:7,border:`1px solid ${C.amber}`,fontFamily:C.mono,fontSize:14,color:C.amber,fontWeight:700,background:"#fff",outline:"none",textAlign:"center"}}/>
        <button onClick={saveQty} style={{padding:"4px 10px",borderRadius:7,border:"none",background:C.green,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>✓</button>
        <button onClick={()=>setEditQty(false)} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:13}}>✕</button>
      </div>:<>
        <span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.amber}}>×{item.qty}</span>
        <button onClick={()=>{setQtyVal(String(item.qty));setEditQty(true);}} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:11}}>{t.editQtyBtn}</button>
      </>}
      <div style={{flex:1}}/>
      <button onClick={onSkip} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${C.redBd}`,background:C.redBg,color:C.red,cursor:"pointer",fontSize:11}}>{t.remove}</button>
    </div>}
    {isLow&&!item.skipped&&<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.amberBd}`}}>
      <div style={{fontSize:11,color:C.amber,marginBottom:8}}>⚠ {item.confidence>0?`${t.aiMatched} ${item.confidence}${t.verifyConfirm}`:t.noMatchFound}</div>\n      {!editSku&&<button onClick={()=>{onChange(sIdx,iIdx,"confirmed",true);}} style={{padding:"5px 12px",borderRadius:7,border:"none",background:C.green,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>✓ Confirm SKU</button>}
    </div>}
  </div>;
}

// ─── IMAGE CROP ───────────────────────────────────────────────
function CropScreen({imgSrc,onCrop,onRetake,lang="en"}){
  const t=T[lang];
  const canvasRef=useRef();
  const imgRef=useRef(new Image());
  const [crop,setCrop]=useState({x:10,y:10,w:80,h:80}); // % of display size
  const [dragging,setDragging]=useState(null); // null | 'move' | 'tl'|'tr'|'bl'|'br'
  const [dragStart,setDragStart]=useState({x:0,y:0,crop:null});
  const canvasSize={w:320,h:420};

  useEffect(()=>{
    const img=imgRef.current;
    img.onload=()=>draw();
    img.src=imgSrc;
  },[imgSrc]);

  useEffect(()=>{draw();},[crop]);

  const draw=()=>{
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext("2d");
    const img=imgRef.current;if(!img.complete||!img.naturalWidth)return;
    const {w,h}=canvasSize;
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(img,0,0,w,h);
    // dim overlay
    ctx.fillStyle="rgba(0,0,0,0.5)";
    const cx=crop.x/100*w,cy=crop.y/100*h,cw=crop.w/100*w,ch=crop.h/100*h;
    ctx.fillRect(0,0,w,cy);
    ctx.fillRect(0,cy+ch,w,h-cy-ch);
    ctx.fillRect(0,cy,cx,ch);
    ctx.fillRect(cx+cw,cy,w-cx-cw,ch);
    // border
    ctx.strokeStyle="#D97706";ctx.lineWidth=2;
    ctx.strokeRect(cx,cy,cw,ch);
    // corner handles
    const hs=12;
    [[cx,cy],[cx+cw-hs,cy],[cx,cy+ch-hs],[cx+cw-hs,cy+ch-hs]].forEach(([hx,hy])=>{
      ctx.fillStyle="#D97706";ctx.fillRect(hx,hy,hs,hs);
    });
  };

  const getXY=(e,c)=>{
    const r=c.getBoundingClientRect();
    const src=e.touches?e.touches[0]:e;
    return{x:((src.clientX-r.left)/r.width)*100,y:((src.clientY-r.top)/r.height)*100};
  };

  const hitTest=(px,py)=>{
    const {x,y,w,h}=crop;const hs=4;
    if(Math.abs(px-x)<hs&&Math.abs(py-y)<hs)return"tl";
    if(Math.abs(px-(x+w))<hs&&Math.abs(py-y)<hs)return"tr";
    if(Math.abs(px-x)<hs&&Math.abs(py-(y+h))<hs)return"bl";
    if(Math.abs(px-(x+w))<hs&&Math.abs(py-(y+h))<hs)return"br";
    if(px>x&&px<x+w&&py>y&&py<y+h)return"move";
    return null;
  };

  const onDown=e=>{
    e.preventDefault();
    const c=canvasRef.current;const{x,y}=getXY(e,c);
    const hit=hitTest(x,y);
    if(hit){setDragging(hit);setDragStart({x,y,crop:{...crop}});}
  };
  const onMove=e=>{
    e.preventDefault();
    if(!dragging)return;
    const c=canvasRef.current;const{x,y}=getXY(e,c);
    const dx=x-dragStart.x,dy=y-dragStart.y;
    const p=dragStart.crop;
    const clamp=(v,mn,mx)=>Math.max(mn,Math.min(mx,v));
    let nc={...p};
    if(dragging==="move"){nc.x=clamp(p.x+dx,0,100-p.w);nc.y=clamp(p.y+dy,0,100-p.h);}
    else if(dragging==="tl"){nc.x=clamp(p.x+dx,0,p.x+p.w-10);nc.y=clamp(p.y+dy,0,p.y+p.h-10);nc.w=p.w-dx+clamp(0,-(p.x+dx),0);nc.h=p.h-dy+clamp(0,-(p.y+dy),0);nc.w=clamp(nc.w,10,100);nc.h=clamp(nc.h,10,100);}
    else if(dragging==="tr"){nc.w=clamp(p.w+dx,10,100-p.x);nc.y=clamp(p.y+dy,0,p.y+p.h-10);nc.h=p.h-dy+clamp(0,-(p.y+dy),0);nc.h=clamp(nc.h,10,100);}
    else if(dragging==="bl"){nc.x=clamp(p.x+dx,0,p.x+p.w-10);nc.w=p.w-dx+clamp(0,-(p.x+dx),0);nc.h=clamp(p.h+dy,10,100-p.y);nc.w=clamp(nc.w,10,100);}
    else if(dragging==="br"){nc.w=clamp(p.w+dx,10,100-p.x);nc.h=clamp(p.h+dy,10,100-p.y);}
    setCrop(nc);
  };
  const onUp=()=>setDragging(null);

  const confirmCrop=()=>{
    const img=imgRef.current;
    const oc=document.createElement("canvas");
    const sw=img.naturalWidth*crop.w/100,sh=img.naturalHeight*crop.h/100;
    const sx=img.naturalWidth*crop.x/100,sy=img.naturalHeight*crop.y/100;
    oc.width=sw;oc.height=sh;
    oc.getContext("2d").drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
    const b64=oc.toDataURL("image/jpeg",0.92).split(",")[1];
    onCrop(b64,oc.toDataURL("image/jpeg",0.92));
  };

  return <div style={{minHeight:620,display:"flex",flexDirection:"column",background:"#000"}}>
    <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#111"}}>
      <button onClick={onRetake} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:13,fontFamily:"sans-serif"}}>{t.retake}</button>
      <span style={{color:"#D97706",fontWeight:700,fontSize:13,fontFamily:"monospace"}}>{t.cropTitle}</span>
      <button onClick={confirmCrop} style={{background:"#D97706",border:"none",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,padding:"6px 14px",borderRadius:8,fontFamily:"sans-serif"}}>{t.analyse}</button>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{fontSize:12,color:"#aaa",marginBottom:12,textAlign:"center"}}>{t.cropHint}</div>
      <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h}
        style={{borderRadius:8,touchAction:"none",maxWidth:"100%"}}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}/>
    </div>
  </div>;
}

// ─── SCAN SCREEN ──────────────────────────────────────────────
function ScanScreen({actorName,onBack,onConfirm,skuList,catList,buyerList=[],onAddAlias,lang="en"}){
  const t=T[lang];
  const [stage,setStage]=useState("choose"); // choose|crop|vision-mode|analysing|reviewing|manual
  const [rawImgSrc,setRawImgSrc]=useState(null);
  const [imgSrc,setImgSrc]=useState(null);
  const [imgB64,setImgB64]=useState(null);
  const [ext,setExt]=useState(null);
  const [error,setError]=useState(null);
  const [visionMode,setVisionMode]=useState(null);
  const [imgExpanded,setImgExpanded]=useState(false);
  // Manual entry state
  const [manualLines,setManualLines]=useState([{cat:"",sku:"",qty:"1"}]);
  const [manualSection,setManualSection]=useState("");
  const fileRef=useRef();
  const triggerCamera=()=>{fileRef.current.setAttribute("capture","environment");fileRef.current.click();};
  const triggerUpload=()=>{fileRef.current.removeAttribute("capture");fileRef.current.click();};
  const handleFile=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{setRawImgSrc(ev.target.result);setStage("crop");};
    reader.readAsDataURL(file);e.target.value="";
  };
  const handleCrop=(b64,previewSrc)=>{setImgB64(b64);setImgSrc(previewSrc);setStage("vision-mode");};
  const selectVisionMode=mode=>{setVisionMode(mode);analyse(imgB64,mode);};
  const analyse=async(b64,mode="free")=>{
    setStage("analysing");setError(null);
    try{
      const result=await extractOrderFromImage(b64,skuList,mode,buyerList,catList);
      if(result.parseError||result.sections.every(s=>s.items.length===0)){
        setError(lang==="hi"?"SKU नहीं निकाले जा सके। फसल को और कसकर समायोजित करें।":"Couldn't extract SKUs. Adjust the crop more tightly and try again.");
        setStage("analyseError");
        return;
      }
      setExt(result);setStage("reviewing");
    }catch(err){setError(lang==="hi"?"छवि पढ़ने में विफल। कनेक्शन जांचें।":"Failed to read image. Check connection.");setStage("analyseError");}
  };
  const updateItem=(sIdx,iIdx,field,value)=>setExt(prev=>{const n=cl(prev);n.sections[sIdx].items[iIdx][field]=value;return n;});
  if(stage==="crop"&&rawImgSrc)return <CropScreen key="crop" imgSrc={rawImgSrc} onCrop={handleCrop} onRetake={()=>{setRawImgSrc(null);setStage("choose");setError(null);}} lang={lang}/>;
  const skipItem=(sIdx,iIdx)=>updateItem(sIdx,iIdx,"skipped",true);
  // Items needing review: unconfirmed AND have a non-empty SKU (blank new rows excluded)
  const lowConfPending=ext?ext.sections.flatMap(s=>s.items.filter(i=>!i.skipped&&!i.confirmed&&i.sku&&i.sku.trim())):[];
  const canConfirm=lowConfPending.length===0;
  const confirm=()=>{
    const validSections=ext.sections.map(sec=>({
      name:sec.name,
      items:sec.items.filter(i=>!i.skipped&&i.sku&&i.sku.trim()).map(i=>({id:Date.now()+Math.random(),sku:i.sku.trim().toUpperCase(),origQty:i.qty,qty:i.qty,status:"pending",note:"",handledBy:null,confidence:i.confidence,custom:i.custom||false}))
    })).filter(s=>s.items.length>0);
    validSections.forEach(sec=>{
      onConfirm({id:genId(),date:TODAY,scannedAt:nowTime(),status:"live",notes:ext.notes||"",sections:[sec]});
    });
  };
  const totalItems=ext?ext.sections.reduce((s,sec)=>s+sec.items.filter(i=>!i.skipped).length,0):0;
  return <div style={{minHeight:620,display:"flex",flexDirection:"column",background:C.bg}}>
    <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
    <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,background:"#fff",display:"flex",alignItems:"center",gap:12}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>←</button>
      <span style={{fontFamily:C.mono,fontWeight:700,fontSize:13,color:C.text,letterSpacing:"0.5px"}}>{t.newOrderTitle}</span>
      <div style={{flex:1}}/>
      <span style={{fontFamily:C.mono,fontSize:11,color:C.textDim,background:C.grayBg,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px"}}>{actorName}</span>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      {stage==="choose"&&<>
        <div style={{fontSize:13,color:C.textDim,textAlign:"center",marginBottom:16}}>{t.chooseOrder}</div>
        <button onClick={triggerCamera} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.amberBd}`,background:C.amberBg,cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left",marginBottom:12}}>
          <span style={{fontSize:30,flexShrink:0}}>📷</span>
          <div><div style={{fontWeight:700,fontSize:15,color:C.amber,marginBottom:2}}>{t.takePhoto}</div><div style={{fontSize:12,color:C.textDim}}>{t.takePhotoSub}</div></div>
        </button>
        <button onClick={triggerUpload} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",marginBottom:12}}>
          <span style={{fontSize:30,flexShrink:0}}>🖼️</span>
          <div><div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:2}}>{t.uploadGallery}</div><div style={{fontSize:12,color:C.textDim}}>{t.uploadGallerySub}</div></div>
        </button>
        <button onClick={()=>{setManualLines([{cat:"",sku:"",qty:1}]);setManualSection("");setStage("manual");}} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
          <span style={{fontSize:30,flexShrink:0}}>✏️</span>
          <div><div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:2}}>{t.enterManually}</div><div style={{fontSize:12,color:C.textDim}}>{t.enterManuallySub}</div></div>
        </button>
      </>}
      {stage==="vision-mode"&&imgSrc&&<>
        <img src={imgSrc} alt="slip" style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`,display:"block",marginBottom:12}}/>
        <div style={{fontSize:13,color:C.textDim,textAlign:"center",marginBottom:16,fontWeight:600}}>{t.chooseMethod}</div>
        <button onClick={()=>selectVisionMode("free")} style={{width:"100%",padding:16,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:12,textAlign:"left",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
          <span style={{fontSize:24,flexShrink:0}}>🆓</span>
          <div><div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>{t.free}</div><div style={{fontSize:11,color:C.textDim}}>{t.freeSub}</div></div>
        </button>
        <button onClick={()=>selectVisionMode("premium")} style={{width:"100%",padding:16,borderRadius:12,border:`1px solid ${C.amberBd}`,background:C.amberBg,cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:12,textAlign:"left",marginBottom:12}}>
          <span style={{fontSize:24,flexShrink:0}}>⭐</span>
          <div><div style={{fontWeight:700,fontSize:14,color:C.amber,marginBottom:2}}>{t.premium}</div><div style={{fontSize:11,color:"#92610A"}}>{t.premiumSub}</div></div>
        </button>
        <Btn onClick={()=>{setStage("choose");setRawImgSrc(null);setImgSrc(null);setError(null);}} color="ghost" sx={{width:"100%",padding:11}}>{t.back}</Btn>
      </>}
      {stage==="manual"&&<>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:5}}>{t.customerName}</div>
          <BuyerTypeahead value={manualSection} onChange={v=>setManualSection(v)} onSelect={b=>setManualSection(b.name)} placeholder="e.g. Mahavir Traders" buyerList={buyerList}/>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginBottom:10}}>{t.items}</div>
        {manualLines.map((line,idx)=>{
          const isCustomSku=line.sku&&!skuList.find(s=>s.id.toUpperCase()===line.sku.toUpperCase());
          return <div key={idx} style={{background:isCustomSku?C.indigoBg:"#fff",border:`1px solid ${isCustomSku?C.indigoBd:C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:10}}>
              <SkuTypeahead
                value={line.sku}
                onChange={val=>{const n=[...manualLines];n[idx]={...n[idx],sku:val};setManualLines(n);}}
                onSelect={(skuId,isCustom,cat)=>{const n=[...manualLines];n[idx]={...n[idx],sku:skuId,cat:cat||n[idx].cat,custom:isCustom};setManualLines(n);}}
                skuList={skuList}
                autoFocus={idx===manualLines.length-1&&!line.sku}
                placeholder="Type SKU code…"
              />
              {manualLines.length>1&&<button onClick={()=>setManualLines(manualLines.filter((_,i)=>i!==idx))}
                style={{padding:"9px 11px",borderRadius:8,border:`1px solid ${C.redBd}`,background:C.redBg,color:C.red,cursor:"pointer",fontSize:13,flexShrink:0}}>✕</button>}
            </div>
            {isCustomSku&&line.sku&&<div style={{fontSize:11,color:C.indigo,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontFamily:C.mono,fontSize:9,fontWeight:700,background:C.indigoBg,border:`1px solid ${C.indigoBd}`,borderRadius:3,padding:"1px 5px"}}>CUSTOM SKU</span>
              <span>Not in master list — will be saved as-is</span>
            </div>}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12,color:C.textDim,flexShrink:0}}>{t.qty}:</span>
              <button onClick={()=>{const n=[...manualLines];n[idx].qty=String(Math.max(1,(parseInt(n[idx].qty)||1)-1));setManualLines(n);}} style={{width:32,height:32,borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:C.textDim}}>−</button>
              <input type="text" inputMode="numeric" value={line.qty} onChange={e=>{const n=[...manualLines];n[idx].qty=e.target.value.replace(/[^0-9]/g,"");setManualLines(n);}}
                style={{width:60,padding:"4px 0",borderRadius:7,border:`1px solid ${C.amberBd}`,fontFamily:C.mono,fontWeight:700,fontSize:18,textAlign:"center",color:C.amber,background:"#fff",outline:"none"}}/>
              <button onClick={()=>{const n=[...manualLines];n[idx].qty=String((parseInt(n[idx].qty)||0)+1);setManualLines(n);}} style={{width:32,height:32,borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:C.textDim}}>+</button>
            </div>
          </div>;
        })}
        <Btn onClick={()=>setManualLines([...manualLines,{cat:"",sku:"",qty:"1"}])} color="ghost" sx={{width:"100%",padding:10,marginBottom:16}}>{t.addSku}</Btn>
        {(()=>{
          const validLines=manualLines.filter(l=>l.sku&&l.sku.trim());
          const canSubmit=validLines.length>0;
          return <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Btn onClick={()=>{
              if(!canSubmit)return;
              const order={id:genId(),date:TODAY,scannedAt:nowTime(),status:"live",notes:"",sections:[{
                name:manualSection.trim()||"Manual Entry",
                items:validLines.map(l=>({id:Date.now()+Math.random(),sku:l.sku.trim().toUpperCase(),origQty:parseInt(l.qty)||1,qty:parseInt(l.qty)||1,status:"pending",note:"",handledBy:null,confidence:100,custom:l.custom||false}))
              }]};
              onConfirm(order);
            }} color={canSubmit?"green":"ghost"} sx={{width:"100%",padding:13,fontSize:14,opacity:canSubmit?1:0.5,cursor:canSubmit?"pointer":"not-allowed"}}>
              {canSubmit?`${t.createOrders} ${t.orders} (${validLines.length})`:"Type at least one SKU"}
            </Btn>
            <Btn onClick={()=>setStage("choose")} color="ghost" sx={{width:"100%",padding:11}}>{t.back}</Btn>
          </div>;
        })()}
      </>}
      {stage==="preview"&&<>
        <img src={imgSrc} alt="slip" style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`,display:"block",marginBottom:12}}/>
        {error&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:10,padding:"12px 14px",marginBottom:12,fontSize:13,color:C.red}}>{error}</div>}
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>{setImgSrc(null);setImgB64(null);setError(null);setStage("choose");}} color="ghost" sx={{flex:1}}>↩ Retake</Btn>
          <Btn onClick={analyse} color="amber" sx={{flex:2}}>⚡ Analyse Order</Btn>
        </div>
      </>}
      {stage==="analysing"&&<>
        {imgSrc&&<img src={imgSrc} alt="slip" style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`,display:"block",marginBottom:12,opacity:0.5}}/>}
        <div style={{background:C.amberBg,border:`1px solid ${C.amberBd}`,borderRadius:10,padding:16,textAlign:"center"}}>
          <div style={{fontSize:22,marginBottom:8}}>{visionMode==="premium"?"⭐":"🔍"}</div>
          <div style={{fontWeight:700,color:C.amber,fontSize:14,marginBottom:4}}>{t.reading}</div>
          <div style={{fontSize:12,color:C.textDim}}>{visionMode==="premium"?t.premiumSub:t.freeSub}</div>
        </div>
      </>}
      {stage==="analyseError"&&<>
        {imgSrc&&<img src={imgSrc} alt="slip" style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`,display:"block",marginBottom:12}}/>}
        <div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontWeight:700,color:C.red,fontSize:13,marginBottom:4}}>⚠ Extraction failed</div>
          <div style={{fontSize:12,color:C.red,opacity:0.85}}>{error}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <Btn onClick={()=>{setStage("crop");setError(null);}} color="amber" sx={{width:"100%",padding:12,fontSize:14}}>{t.adjustCrop}</Btn>
          <Btn onClick={()=>{setRawImgSrc(null);setImgSrc(null);setImgB64(null);setError(null);setStage("choose");}} color="ghost" sx={{width:"100%",padding:11}}>{t.retakePhoto}</Btn>
        </div>
      </>}
      {stage==="reviewing"&&ext&&<>
        {imgSrc&&<img src={imgSrc} alt="slip" onClick={()=>setImgExpanded(true)} style={{width:"100%",borderRadius:10,border:`1px solid ${C.border}`,display:"block",maxHeight:160,objectFit:"cover",marginBottom:14,cursor:"zoom-in"}}/>}
        {imgExpanded&&<div onClick={()=>setImgExpanded(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <img src={imgSrc} alt="slip" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:8,objectFit:"contain"}}/>
          <button onClick={()=>setImgExpanded(false)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13,fontFamily:C.sans}}>✕ Close</button>
        </div>}
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,fontSize:13,color:C.text,fontWeight:600}}>{totalItems} {t.itemsExtracted}</div>
          {lowConfPending.length>0?<span style={{fontFamily:C.mono,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,background:C.amberBg,color:C.amber,border:`1px solid ${C.amberBd}`}}>{lowConfPending.length} {t.needReview}</span>:<span style={{fontFamily:C.mono,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,background:C.greenBg,color:C.green,border:`1px solid ${C.greenBd}`}}>{t.allVerified}</span>}
        </div>
        {ext.notes&&<div style={{background:C.blueBg,border:`1px solid ${C.blueBd}`,borderRadius:10,padding:"10px 14px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.blue,letterSpacing:"0.8px",marginBottom:4}}>{t.notesCaptured}</div>
          <div style={{fontSize:12,color:C.text}}>{ext.notes}</div>
        </div>}
        {ext.sections.map((sec,sIdx)=><div key={sIdx} style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.8px",color:C.textDim,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:C.amber}}>§</span>
            <BuyerTypeahead
              value={sec.name}
              onChange={v=>setExt(prev=>{const n=cl(prev);n.sections[sIdx].name=v;n.sections[sIdx]._pendingAlias=v;return n;})}
              onSelect={b=>setExt(prev=>{const n=cl(prev);n.sections[sIdx].name=b.name;n.sections[sIdx]._resolvedBuyer=b;delete n.sections[sIdx]._pendingAlias;return n;})}
              placeholder="Buyer name…"
              style={{flex:1}}
              buyerList={buyerList}
            />
            {(sec._confidence!==undefined&&sec._confidence<95)||(!sec._confidence&&sec._raw)?<span style={{fontFamily:C.mono,fontSize:9,fontWeight:700,background:C.amberBg,border:`1px solid ${C.amberBd}`,borderRadius:4,padding:"2px 6px",color:C.amber,whiteSpace:"nowrap"}}>{t.unmatched}</span>:null}
          </div>
          {sec._raw&&sec._resolvedBuyer&&sec._resolvedBuyer.name!==sec._raw&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:-4,paddingLeft:18}}>
            <span style={{fontSize:11,color:C.textDim}}>"{sec._raw}" → <strong style={{color:C.text}}>{sec._resolvedBuyer.name}</strong></span>
            <button onMouseDown={e=>{e.preventDefault();onAddAlias(sec._resolvedBuyer,sec._raw);setExt(prev=>{const n=cl(prev);delete n.sections[sIdx]._raw;delete n.sections[sIdx]._resolvedBuyer;return n;});}}
              style={{padding:"2px 8px",borderRadius:5,border:`1px solid ${C.greenBd}`,background:C.greenBg,color:C.green,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:C.mono,whiteSpace:"nowrap"}}>
              {t.saveAlias}
            </button>
          </div>}
          {sec.items.map((item,iIdx)=><ReviewItemRow key={iIdx} item={item} sIdx={sIdx} iIdx={iIdx} onChange={updateItem} onSkip={()=>skipItem(sIdx,iIdx)} skuList={skuList} lang={lang}/>)}
          <button onClick={()=>setExt(prev=>{const n=cl(prev);n.sections[sIdx].items.push({sku:"",qty:1,confidence:0,skipped:false,confirmed:false,custom:false});return n;})}
            style={{width:"100%",padding:"8px",borderRadius:8,border:`1px dashed ${C.border}`,background:"transparent",color:C.textDim,cursor:"pointer",fontSize:12,fontFamily:C.sans,marginTop:6}}>
            {t.addMissedSku} {sec.name}
          </button>
        </div>)}
        {!canConfirm&&<div style={{background:C.amberBg,border:`1px solid ${C.amberBd}`,borderRadius:10,padding:"12px 14px",marginBottom:12,fontSize:12,color:C.amber}}>⚠ {t.reviewWarning} {lowConfPending.length} {t.uncertainItems}{lowConfPending.length>1?"s":""}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
          {(()=>{const cnt=ext.sections.filter(s=>s.items.some(i=>!i.skipped&&i.sku)).length;return<Btn onClick={confirm} color={canConfirm?"green":"ghost"} sx={{width:"100%",padding:13,fontSize:14,opacity:canConfirm?1:0.5,cursor:canConfirm?"pointer":"not-allowed"}}>{canConfirm?`${t.createOrders} ${cnt} ${t.orders}`:`${t.reviewWarning} ${lowConfPending.length} ${t.uncertainItems}`}</Btn>;})}
          <Btn onClick={()=>{setStage("choose");setExt(null);setError(null);}} color="ghost" sx={{width:"100%",padding:11}}>{t.startOver}</Btn>
        </div>
      </>}
    </div>
  </div>;
}

// ─── ORDER NOTES CALLOUT ──────────────────────────────────────
function OrderNotesCallout({notes,onSave,lang="en"}){
  const t=T[lang];
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(notes||"");
  useState(()=>{setVal(notes||"");},[notes]);
  const hasNotes=notes&&notes.trim();
  if(!hasNotes&&!editing)return(
    <button onClick={()=>setEditing(true)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:11,fontFamily:C.sans,marginBottom:12,padding:0}}>
      {t.addOrderNotes}
    </button>
  );
  return(
    <div style={{background:C.blueBg,border:`1px solid ${C.blueBd}`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:10,fontWeight:700,color:C.blue,letterSpacing:"0.8px"}}>{t.orderNotes}</span>
        {!editing&&<button onClick={()=>{setVal(notes||"");setEditing(true);}} style={{background:"none",border:"none",color:C.blue,cursor:"pointer",fontSize:11,fontFamily:C.sans}}>{lang==="hi"?"बदलें":"Edit"}</button>}
      </div>
      {editing?<>
        <textarea value={val} onChange={e=>setVal(e.target.value)} rows={3}
          style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1px solid ${C.blueBd}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box",resize:"vertical"}}/>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <Btn onClick={()=>{onSave(val.trim());setEditing(false);}} color="green" sx={{flex:1,padding:8,fontSize:12}}>{t.save}</Btn>
          <Btn onClick={()=>setEditing(false)} color="ghost" sx={{padding:"8px 12px",fontSize:12}}>{t.cancel}</Btn>
        </div>
      </>:<div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{notes}</div>}
    </div>
  );
}

// ─── EDIT ORDER SCREEN ────────────────────────────────────────
function EditOrderScreen({order,skuList,onSave,onCancel}){
  // Deep-clone order sections into local editable state
  const [sections,setSections]=useState(()=>order.sections.map(sec=>({
    name:sec.name,
    items:sec.items.map(it=>({...it,_qtyStr:String(it.origQty)}))
  })));

  const updateSecName=(sIdx,val)=>setSections(prev=>{const n=cl(prev);n[sIdx].name=val;return n;});
  const updateItemSku=(sIdx,iIdx,val,isCustom)=>setSections(prev=>{const n=cl(prev);n[sIdx].items[iIdx].sku=val;n[sIdx].items[iIdx].custom=isCustom||false;return n;});
  const updateItemQty=(sIdx,iIdx,val)=>setSections(prev=>{const n=cl(prev);n[sIdx].items[iIdx]._qtyStr=val;n[sIdx].items[iIdx].origQty=parseInt(val)||1;n[sIdx].items[iIdx].qty=parseInt(val)||1;return n;});
  const removeItem=(sIdx,iIdx)=>setSections(prev=>{const n=cl(prev);n[sIdx].items=n[sIdx].items.filter((_,i)=>i!==iIdx);return n.filter(s=>s.items.length>0);});
  const addItem=(sIdx)=>setSections(prev=>{
    const n=cl(prev);
    n[sIdx].items.push({id:Date.now()+Math.random(),sku:"",origQty:1,qty:1,_qtyStr:"1",status:"pending",note:"",handledBy:null,confidence:100,custom:false});
    return n;
  });
  const addSection=()=>setSections(prev=>[...prev,{name:"New Section",items:[{id:Date.now()+Math.random(),sku:"",origQty:1,qty:1,_qtyStr:"1",status:"pending",note:"",handledBy:null,confidence:100,custom:false}]}]);

  const save=()=>{
    // Filter out blank SKUs, fix qtys
    const cleaned=sections.map(sec=>({
      ...sec,
      items:sec.items
        .filter(it=>it.sku&&it.sku.trim())
        .map(it=>({...it,sku:it.sku.trim().toUpperCase(),origQty:parseInt(it._qtyStr)||1,qty:parseInt(it._qtyStr)||1}))
    })).filter(s=>s.items.length>0);
    if(cleaned.length===0){alert("Order needs at least one SKU.");return;}
    onSave(cleaned);
  };

  return <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,display:"flex",flexDirection:"column"}}>
    {/* Header */}
    <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,background:"#fff",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
      <button onClick={onCancel} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>✕</button>
      <div style={{flex:1}}>
        <span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.text}}>EDIT ORDER</span>
        <span style={{fontFamily:C.mono,fontSize:12,color:C.textDim,marginLeft:8}}>{order.id}</span>
      </div>
      <Btn onClick={save} color="green" sx={{padding:"8px 16px",fontSize:13}}>Save</Btn>
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"16px 20px 40px"}}>
      {sections.map((sec,sIdx)=><div key={sIdx} style={{marginBottom:20}}>
        {/* Section name */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{color:C.amber,fontSize:14,flexShrink:0}}>§</span>
          <BuyerTypeahead
            value={sec.name}
            onChange={v=>updateSecName(sIdx,v)}
            onSelect={b=>updateSecName(sIdx,b.name)}
            placeholder="Buyer name…"
            style={{flex:1}}
          />
        </div>

        {/* Items */}
        {sec.items.map((item,iIdx)=>{
          const isCustom=item.custom||(!skuList.find(s=>s.id.toUpperCase()===(item.sku||"").toUpperCase())&&item.sku);
          return <div key={item.id||iIdx} style={{background:isCustom?C.indigoBg:"#fff",border:`1px solid ${isCustom?C.indigoBd:C.border}`,borderRadius:10,padding:"11px 14px",marginBottom:8}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8}}>
              <SkuTypeahead
                value={item.sku}
                onChange={val=>updateItemSku(sIdx,iIdx,val,false)}
                onSelect={(id,isC)=>updateItemSku(sIdx,iIdx,id,isC)}
                skuList={skuList}
                placeholder="SKU code…"
                style={{flex:1}}
              />
              <button onClick={()=>removeItem(sIdx,iIdx)}
                style={{padding:"9px 11px",borderRadius:8,border:`1px solid ${C.redBd}`,background:C.redBg,color:C.red,cursor:"pointer",fontSize:13,flexShrink:0}}>✕</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12,color:C.textDim,flexShrink:0}}>Qty:</span>
              <button onClick={()=>updateItemQty(sIdx,iIdx,String(Math.max(1,(parseInt(item._qtyStr)||1)-1)))}
                style={{width:32,height:32,borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:C.textDim}}>−</button>
              <input type="text" inputMode="numeric" value={item._qtyStr} min={1}
                onChange={e=>updateItemQty(sIdx,iIdx,e.target.value.replace(/[^0-9]/g,""))}
                style={{width:60,padding:"4px 0",borderRadius:7,border:`1px solid ${C.amberBd}`,fontFamily:C.mono,fontWeight:700,fontSize:18,textAlign:"center",color:C.amber,background:"#fff",outline:"none"}}/>
              <button onClick={()=>updateItemQty(sIdx,iIdx,String((parseInt(item._qtyStr)||1)+1))}
                style={{width:32,height:32,borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:C.textDim}}>+</button>
              {item.status!=="pending"&&<span style={{fontFamily:C.mono,fontSize:10,color:C.textDim,marginLeft:4}}>({item.status})</span>}
            </div>
          </div>;
        })}

        {/* Add SKU to this section */}
        <button onClick={()=>addItem(sIdx)}
          style={{width:"100%",padding:"9px",borderRadius:8,border:`1px dashed ${C.border}`,background:"transparent",color:C.textDim,cursor:"pointer",fontSize:12,fontFamily:C.sans}}>
          + Add SKU to {sec.name}
        </button>
      </div>)}

      {/* Add new section */}
      <button onClick={addSection}
        style={{width:"100%",padding:12,borderRadius:10,border:`1px dashed ${C.amberBd}`,background:C.amberBg,color:C.amber,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:C.sans,marginTop:8}}>
        + Add New Section / Customer
      </button>
    </div>
  </div>;
}

// ─── ORDER DETAIL ─────────────────────────────────────────────
function OrderDetail({order,actorName,isAdmin,onBack,onUpdate,onBilled,onReopen,skuList,catList,lang="en"}){
  const t=T[lang];
  const [expandedKey,setExpandedKey]=useState(null);
  const [billingOpen,setBillingOpen]=useState(false);
  const [editQty,setEditQty]=useState("");
  const [editNote,setEditNote]=useState("");
  const [editMode,setEditMode]=useState(false);
  // Edit mode for order metadata
  const [editingSec,setEditingSec]=useState(null); // sIdx
  const [secName,setSecName]=useState("");
  const [editingItemSku,setEditingItemSku]=useState(null); // {sIdx,iIdx}
  const [itemSkuVal,setItemSkuVal]=useState("");

  const isBilled=order.status==="billed";
  const all=allItems(order),pending=all.filter(i=>i.status==="pending"),handled=all.filter(i=>i.status!=="pending");
  const ready=pending.length===0,pct=Math.round((handled.length/all.length)*100);
  const findIdx=item=>{let sI=-1,iI=-1;order.sections.forEach((sec,si)=>sec.items.forEach((it,ii)=>{if(it.id===item.id){sI=si;iI=ii;}}));return[sI,iI];};

  // Undo unrestricted — any staff or admin can undo
  const undoItem=(sIdx,iIdx)=>onUpdate(sIdx,iIdx,{status:"pending",handledBy:null});
  const setStatus=(sIdx,iIdx,status)=>{onUpdate(sIdx,iIdx,{status,handledBy:actorName});if(expandedKey===`${sIdx}-${iIdx}`)setExpandedKey(null);};
  const openOverride=(key,item)=>{setExpandedKey(key);setEditQty(String(item.qty||item.origQty));setEditNote(item.note||"");};
  const saveOverride=(sIdx,iIdx,origQty)=>{const qty=parseInt(editQty);if(!isNaN(qty)&&qty>0)onUpdate(sIdx,iIdx,{qty,note:editNote,status:qty>=origQty?"fulfilled":"partial",handledBy:actorName});setExpandedKey(null);};

  // Edit section name
  const saveSectionName=sIdx=>{if(secName.trim())onUpdate(sIdx,-1,{_sectionName:secName.trim()});setEditingSec(null);};
  // Edit item SKU
  const saveItemSku=(sIdx,iIdx)=>{if(itemSkuVal.trim())onUpdate(sIdx,iIdx,{sku:itemSkuVal.trim().toUpperCase()});setEditingItemSku(null);};
  const saveItemSkuCustom=(sIdx,iIdx,id,isCustom)=>{onUpdate(sIdx,iIdx,{sku:id.toUpperCase(),custom:isCustom||false});setEditingItemSku(null);};

  const byStaff={};handled.forEach(item=>{const k=item.handledBy||"Unknown";(byStaff[k]=byStaff[k]||[]).push(item);});
  const idBg=ready?C.greenBg:C.amberBg,idC=ready?C.green:C.amber,idBd=ready?C.greenBd:C.amberBd;

  // Tally export
  const exportTally=()=>{
    const rows=["SKU,Qty Requested,Qty Sent,Rate,Amount,Status"];
    handled.filter(i=>i.status!=="unavailable").forEach(i=>{
      const rate=getRateForSku(i.sku,skuList,catList)||0;
      const amt=rate*i.qty;
      rows.push(`"${i.sku}",${i.origQty},${i.qty},${rate},${amt},${i.status}`);
    });
    handled.filter(i=>i.status==="unavailable").forEach(i=>{rows.push(`"${i.sku}",${i.origQty},0,0,0,N/A`);});
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`order_${order.id}_tally.csv`;a.click();URL.revokeObjectURL(url);
  };

  if(editMode)return <EditOrderScreen
    order={order}
    skuList={skuList}
    onCancel={()=>setEditMode(false)}
    onSave={sections=>{onUpdate(-1,-1,{_fullReplace:sections});setEditMode(false);}}
  />;

  return <div style={{minHeight:620,display:"flex",flexDirection:"column",background:C.bg,position:"relative"}}>
    <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,background:"#fff"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>←</button>
        <div style={{fontFamily:C.mono,fontWeight:700,fontSize:14,background:idBg,color:idC,border:`1px solid ${idBd}`,borderRadius:6,padding:"2px 10px"}}>{order.id}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text}}>{order.sections.map(s=>s.name).join(" · ")}</div>
          <div style={{fontSize:11,color:C.textDim}}>{order.scannedAt}{isBilled&&<span style={{color:C.blue,marginLeft:6}}>· Billed</span>}</div>
        </div>
        {!isBilled&&<button onClick={()=>setEditMode(true)} style={{background:C.grayBg,border:`1px solid ${C.borderMd}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:C.sans,fontWeight:600,flexShrink:0}}>✏️ Edit Order</button>}
        {isAdmin&&<span style={{fontFamily:C.mono,fontSize:10,fontWeight:700,background:C.amberBg,color:C.amber,border:`1px solid ${C.amberBd}`,borderRadius:4,padding:"2px 6px"}}>ADMIN</span>}
      </div>
      <PBar pct={pct} ready={ready}/>
      <div style={{fontSize:11,color:C.textDim,marginTop:5}}>{handled.length}/{all.length} handled · {pending.length} remaining</div>
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"14px 20px 100px"}}>
      {/* Order notes callout — editable */}
      <OrderNotesCallout notes={order.notes} onSave={v=>onUpdate(-1,-1,{_notes:v})} lang={lang}/>
      {pending.length>0&&<>
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginBottom:10}}>{t.pending} ({pending.length})</div>
        {order.sections.map((sec,sIdx)=>{
          const secPending=sec.items.filter(i=>i.status==="pending");
          if(!secPending.length)return null;
          return <div key={sIdx} style={{marginBottom:16}}>
            {/* Editable section name */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              {editingSec===sIdx?<div style={{display:"flex",gap:6,flex:1}}>
                <input value={secName} onChange={e=>setSecName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveSectionName(sIdx)} autoFocus style={{flex:1,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.amber}`,fontFamily:C.sans,fontSize:13,outline:"none"}}/>
                <button onClick={()=>saveSectionName(sIdx)} style={{padding:"4px 8px",borderRadius:6,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontSize:12}}>✓</button>
                <button onClick={()=>setEditingSec(null)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:12}}>✕</button>
              </div>:<>
                <span style={{color:C.amber}}>§</span>
                <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.8px",color:C.textDim}}>{sec.name.toUpperCase()}</span>
                {!isBilled&&<button onClick={()=>{setEditingSec(sIdx);setSecName(sec.name);}} style={{padding:"2px 7px",borderRadius:5,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:10}}>Edit</button>}
              </>}
            </div>
            {secPending.map(item=>{
              const[sI,iI]=findIdx(item);const key=`${sI}-${iI}`;const isOpen=expandedKey===key;
              const editingThis=editingItemSku&&editingItemSku.sIdx===sI&&editingItemSku.iIdx===iI;
              return <div key={item.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}>
                <div style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:isOpen?0:10}}>
                    {editingThis?<div style={{display:"flex",gap:6,flex:1,marginRight:8,alignItems:"center"}}>
                      <SkuTypeahead value={itemSkuVal} onChange={v=>setItemSkuVal(v)} onSelect={(id,isCustom)=>saveItemSkuCustom(sI,iI,id,isCustom)} skuList={skuList} autoFocus style={{flex:1}}/>
                      <button onClick={()=>saveItemSku(sI,iI)} style={{padding:"4px 8px",borderRadius:6,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontSize:12,flexShrink:0}}>✓</button>
                      <button onClick={()=>setEditingItemSku(null)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:12,flexShrink:0}}>✕</button>
                    </div>:<div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:item.custom?C.indigo:C.text}}>{item.sku}{item.custom&&<span style={{fontFamily:C.mono,fontSize:9,fontWeight:700,background:C.indigoBg,border:`1px solid ${C.indigoBd}`,borderRadius:3,padding:"1px 5px",marginLeft:6,color:C.indigo}}>CUSTOM</span>}</span>
                      <button onClick={()=>{setEditingItemSku({sIdx:sI,iIdx:iI});setItemSkuVal(item.sku);}} style={{padding:"2px 7px",borderRadius:5,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:10}}>Edit SKU</button>
                    </div>}
                    <span style={{fontFamily:C.mono,fontSize:13,color:C.textDim,fontWeight:600,flexShrink:0}}>×{item.origQty}</span>
                  </div>
                  {!isOpen&&<div style={{display:"flex",gap:7}}>
                    <Btn onClick={()=>setStatus(sI,iI,"fulfilled")}   color="greenO" sx={{flex:1,padding:"9px 6px",fontSize:12,borderRadius:8}}>{t.fulfilled}</Btn>
                    <Btn onClick={()=>setStatus(sI,iI,"unavailable")} color="redO"   sx={{flex:1,padding:"9px 6px",fontSize:12,borderRadius:8}}>{t.unavailable}</Btn>
                    <Btn onClick={()=>openOverride(key,item)} color="amberO" sx={{padding:"9px 12px",fontSize:12,borderRadius:8}}>{t.qty}</Btn>
                  </div>}
                </div>
                {isOpen&&<div style={{borderTop:`1px solid ${C.border}`,padding:14,background:C.bg}}>
                  <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:8}}>{lang==="hi"?"भेजने की मात्रा":"QUANTITY TO SEND"} <span style={{color:C.textFaint,fontFamily:C.mono,fontWeight:400}}>(req ×{item.origQty})</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <button onClick={()=>setEditQty(v=>String(Math.max(1,parseInt(v||1)-1)))} style={{width:40,height:40,borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:20,color:C.textDim,fontFamily:C.sans}}>−</button>
                    <input type="text" inputMode="numeric" value={editQty} onChange={e=>setEditQty(e.target.value.replace(/[^0-9]/g,""))} style={{width:76,padding:"8px 0",borderRadius:8,border:`1px solid ${C.amberBd}`,color:C.amber,fontFamily:C.mono,fontWeight:700,fontSize:22,textAlign:"center",background:"#fff",outline:"none"}}/>
                    <button onClick={()=>setEditQty(v=>String(parseInt(v||0)+1))} style={{width:40,height:40,borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:20,color:C.textDim,fontFamily:C.sans}}>+</button>
                    <button onClick={()=>setEditQty(String(item.origQty))} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:C.mono}}>Full ×{item.origQty}</button>
                  </div>
                  {(()=>{const q=parseInt(editQty);if(q>0&&q<item.origQty)return <div style={{fontSize:11,color:C.amber,marginBottom:10}}>Partial — sending {q} of {item.origQty}</div>;if(q>=item.origQty)return <div style={{fontSize:11,color:C.green,marginBottom:10}}>Fulfilled</div>;return <div style={{height:21,marginBottom:10}}/>;})()}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:5}}>NOTE (optional)</div>
                    <input type="text" value={editNote} onChange={e=>setEditNote(e.target.value)} placeholder="e.g. 3 available, rest tomorrow" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn onClick={()=>saveOverride(sI,iI,item.origQty)} color="amber" sx={{flex:1,padding:10}}>{t.save}</Btn>
                    <Btn onClick={()=>setExpandedKey(null)} color="ghost" sx={{padding:"10px 16px"}}>{t.cancel}</Btn>
                  </div>
                </div>}
              </div>;
            })}
          </div>;
        })}
      </>}

      {pending.length===0&&!isBilled&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:10,padding:16,textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:18,marginBottom:4}}>✓</div>
        <div style={{fontWeight:700,color:C.green,fontSize:14}}>{t.allHandled}</div>
        <div style={{fontSize:12,color:C.green,opacity:0.8,marginTop:2}}>{t.readyToBill}</div>
      </div>}

      {handled.length>0&&<>
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginTop:pending.length?20:4,marginBottom:10}}>{t.handled} ({handled.length})</div>
        {Object.entries(byStaff).map(([name,items])=><div key={name} style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:12,background:C.grayBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.textDim}}>{name[0]}</div>
            <span style={{fontSize:12,fontWeight:600,color:C.textDim}}>{name}</span>
          </div>
          {items.map(item=>{
            const[sI,iI]=findIdx(item);
            const statusBg={fulfilled:C.greenBg,unavailable:C.redBg,partial:C.amberBg}[item.status]||"#fff";
            const statusBd={fulfilled:C.greenBd,unavailable:C.redBd,partial:C.amberBd}[item.status]||C.border;
            const editingThis=editingItemSku&&editingItemSku.sIdx===sI&&editingItemSku.iIdx===iI;
            return <div key={item.id} style={{background:statusBg,border:`1px solid ${statusBd}`,borderRadius:10,padding:"11px 14px",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  {editingThis?<div style={{display:"flex",gap:6,marginBottom:4,alignItems:"center"}}>
                    <SkuTypeahead value={itemSkuVal} onChange={v=>setItemSkuVal(v)} onSelect={(id,isCustom)=>{saveItemSkuCustom(sI,iI,id,isCustom);}} skuList={skuList} autoFocus style={{flex:1}}/>
                    <button onClick={()=>saveItemSku(sI,iI)} style={{padding:"4px 8px",borderRadius:6,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontSize:12,flexShrink:0}}>✓</button>
                    <button onClick={()=>setEditingItemSku(null)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:12,flexShrink:0}}>✕</button>
                  </div>:<span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:item.custom?C.indigo:C.text}}>{item.sku}{item.custom&&<span style={{fontFamily:C.mono,fontSize:9,fontWeight:700,background:C.indigoBg,border:`1px solid ${C.indigoBd}`,borderRadius:3,padding:"1px 5px",marginLeft:6,color:C.indigo}}>CUSTOM</span>}</span>}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:C.textDim}}>Req <span style={{fontFamily:C.mono,fontWeight:600,color:C.text}}>×{item.origQty}</span></span>
                    {item.qty!==item.origQty&&<span style={{fontSize:11,fontWeight:700,color:C.amber,fontFamily:C.mono,background:"#fff",border:`1px solid ${C.amberBd}`,borderRadius:4,padding:"1px 6px"}}>↳ Send ×{item.qty}</span>}
                    {item.note&&<span style={{fontSize:11,color:C.textDim,fontStyle:"italic"}}>"{item.note}"</span>}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <Pill status={item.status}/>
                  {/* Undo unrestricted */}
                  {!isBilled&&<button onClick={()=>undoItem(sI,iI)} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 8px",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:C.sans}} title="Undo">↩</button>}
                  {!isBilled&&!editingThis&&<button onClick={()=>{setEditingItemSku({sIdx:sI,iIdx:iI});setItemSkuVal(item.sku);}} style={{padding:"3px 7px",borderRadius:5,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:10}}>Edit</button>}
                </div>
              </div>
            </div>;
          })}
        </div>)}
      </>}
    </div>

    {/* Billing bar */}
    {!isBilled&&<div style={{borderTop:`1px solid ${C.border}`,padding:"12px 20px 16px",background:"#fff"}}>
      {ready?<Btn onClick={()=>setBillingOpen(true)} color="green" sx={{width:"100%",padding:13,fontSize:14,gap:7,boxShadow:"0 2px 8px rgba(5,150,105,0.2)"}}>{t.sendToBilling}</Btn>
        :<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{fontSize:13,color:C.textDim}}>{pending.length} {t.itemsPending}</span>
          <Btn onClick={()=>setBillingOpen(true)} color="ghost" sx={{padding:"8px 14px",fontSize:12,gap:5}}>{t.billAnyway}</Btn>
        </div>}
    </div>}
    {isBilled&&onReopen&&<div style={{borderTop:`1px solid ${C.border}`,padding:"12px 20px 16px",background:"#fff"}}>
      <Btn onClick={()=>{if(window.confirm("Move this order back to Live? Billing record will be cleared."))onReopen();}} color="amberO" sx={{width:"100%",padding:11,fontSize:13,gap:6}}>{t.reopenLive}</Btn>
    </div>}

    {/* Billing modal with rates + Tally export */}
    {billingOpen&&<div onClick={e=>{if(e.target===e.currentTarget)setBillingOpen(false);}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 28px",maxHeight:"85%",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.text}}>BILLING SUMMARY · {order.id}</span>
          <button onClick={()=>setBillingOpen(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.textDim,lineHeight:1}}>✕</button>
        </div>
        {pending.length>0&&<div style={{background:C.amberBg,border:`1px solid ${C.amberBd}`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.amber}}>⚠ {pending.length} items still pending — excluded from billing</div>}

        <div style={{fontSize:11,fontWeight:700,color:C.green,letterSpacing:"0.8px",marginBottom:8}}>TO BILL</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:"0 12px",marginBottom:4}}>
          {["SKU","Qty","Rate","Amount"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,color:C.textDim,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>{h}</span>)}
          {(() => {
            let grandTotal=0;
            const rows=handled.filter(i=>i.status!=="unavailable").map(item=>{
              const rate=getRateForSku(item.sku,skuList)||0;
              const amt=rate*item.qty;grandTotal+=amt;
              return <React.Fragment key={item.id}>
                <span style={{fontFamily:C.mono,fontSize:12,color:C.text,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>{item.sku}{item.qty!==item.origQty&&<span style={{fontSize:10,color:C.textDim,marginLeft:4}}>(req ×{item.origQty})</span>}</span>
                <span style={{fontFamily:C.mono,fontSize:12,color:C.amber,fontWeight:700,padding:"8px 0",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}>×{item.qty}</span>
                <span style={{fontFamily:C.mono,fontSize:12,color:C.textDim,padding:"8px 0",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}>₹{rate>0?rate:"—"}</span>
                <span style={{fontFamily:C.mono,fontSize:12,color:rate>0?C.text:C.textFaint,fontWeight:rate>0?700:400,padding:"8px 0",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}>{rate>0?`₹${amt.toLocaleString("en-IN")}`:"—"}</span>
              </React.Fragment>;
            });
            return <>{rows}{grandTotal>0&&<><span style={{fontFamily:C.mono,fontWeight:700,fontSize:13,color:C.text,padding:"10px 0 4px",gridColumn:"1/3"}}>TOTAL</span><span/><span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.green,padding:"10px 0 4px",textAlign:"right"}}>₹{grandTotal.toLocaleString("en-IN")}</span></>}</>;
          })()}
        </div>

        {handled.filter(i=>i.status==="unavailable").length>0&&<>
          <div style={{fontSize:11,fontWeight:700,color:C.red,letterSpacing:"0.8px",marginTop:16,marginBottom:8}}>NOT AVAILABLE</div>
          {handled.filter(i=>i.status==="unavailable").map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`,opacity:0.5}}>
            <span style={{fontFamily:C.mono,fontSize:13,color:C.text,textDecoration:"line-through"}}>{item.sku}</span>
            <span style={{fontFamily:C.mono,fontSize:13,color:C.red}}>×{item.origQty}</span>
          </div>)}
        </>}

        <div style={{fontSize:11,color:C.textDim,padding:"10px 0 4px"}}>Billed by <strong style={{color:C.text}}>{actorName}</strong> · {nowTime()}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
          <Btn onClick={()=>{setBillingOpen(false);onBilled();}} color="green" sx={{width:"100%",padding:13,fontSize:14}}>{t.confirmBilling}</Btn>
          <Btn onClick={exportTally} color="ghost" sx={{width:"100%",padding:11,gap:6}}>{t.exportTally}</Btn>
          <Btn onClick={()=>setBillingOpen(false)} color="ghost" sx={{width:"100%",padding:11}}>{t.backToOrder}</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

// ─── ADMIN APP ────────────────────────────────────────────────
function AdminApp({orders,users,skuList,catList,onSignOut,onOrderUpdate,onOrderBilled,onOrderReopen,onAddOrder,onUserChange,onDeleteOrder,onSkuChange,skuListEnriched,buyerList,onBuyerChange,buyerGroups,onBuyerGroupChange}){
  const [tab,setTab]=useState("orders");
  const [activeOId,setActiveOId]=useState(null);
  const [expandSku,setExpandSku]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [newName,setNewName]=useState("");
  const [scanning,setScanning]=useState(false);
  const [editingUser,setEditingUser]=useState(null);
  const [editUserName,setEditUserName]=useState("");
  const [selectedOrders,setSelectedOrders]=useState(new Set());
  const toggleOrderSelect=id=>setSelectedOrders(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  // SKU tab state
  const [skuPage,setSkuPage]=useState("cats");
  const [activeCat,setActiveCat]=useState(null);
  const [skuSearch,setSkuSearch]=useState("");
  const [activeSku,setActiveSku]=useState(null);
  const [editSkuId,setEditSkuId]=useState("");
  const [editSkuRate,setEditSkuRate]=useState("");
  const [editSkuCat,setEditSkuCat]=useState("");
  const [showAddSku,setShowAddSku]=useState(false);
  const [newSkuId,setNewSkuId]=useState("");
  const [newSkuCat,setNewSkuCat]=useState("lam8");
  const [newSkuRate,setNewSkuRate]=useState("");
  // Buyers tab state
  const [buyerSearch,setBuyerSearch]=useState("");
  const [activeBuyer,setActiveBuyer]=useState(null);
  const [editBuyerName,setEditBuyerName]=useState("");
  const [editBuyerAlias,setEditBuyerAlias]=useState("");
  const [editBuyerGroup,setEditBuyerGroup]=useState("");
  const [showAddBuyer,setShowAddBuyer]=useState(false);
  const [newBuyerName,setNewBuyerName]=useState("");
  const [newBuyerGroup,setNewBuyerGroup]=useState("SD");
  // Buyer groups (categories for buyers)
  const [buyerGroupPage,setBuyerGroupPage]=useState("groups"); // groups | list
  const [activeBuyerGroup,setActiveBuyerGroup]=useState(null);
  const [showAddBuyerGroup,setShowAddBuyerGroup]=useState(false);
  const [newGroupName,setNewGroupName]=useState("");
  const [newGroupAbbr,setNewGroupAbbr]=useState("");
  const [editingGroup,setEditingGroup]=useState(null);
  const [editGroupName,setEditGroupName]=useState("");
  const [editGroupAbbr,setEditGroupAbbr]=useState("");
  // Master Data sub-nav
  const [mdSection,setMdSection]=useState("users"); // users | skus | buyers
  // Orders tab filter
  const [orderFilter,setOrderFilter]=useState("all"); // all | live | billed

  const activeOrder=orders.find(o=>o.id===activeOId);

  const eSkus=skuListEnriched||skuList;
  if(scanning)return <ScanScreen actorName="Admin" onBack={()=>setScanning(false)} onConfirm={o=>{onAddOrder(o);setScanning(false);}} skuList={eSkus} catList={catList} buyerList={buyerList} lang="en"/>;
  if(activeOrder)return <OrderDetail order={activeOrder} actorName="Admin" isAdmin={true} onBack={()=>setActiveOId(null)} onUpdate={(sIdx,iIdx,changes)=>onOrderUpdate(activeOrder.id,sIdx,iIdx,changes)} onBilled={()=>{onOrderBilled(activeOrder.id);setActiveOId(null);}} onReopen={()=>onOrderReopen(activeOrder.id)} skuList={eSkus} catList={catList}/>;

  const tabs=[["orders","📋 Orders"],["analytics","📊 Analytics"],["masterdata","⚙️ Master Data"]];
  const tabSt=a=>({flex:1,padding:"8px 4px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:C.sans,fontSize:11,fontWeight:a?700:400,background:a?"#fff":"transparent",color:a?C.text:C.textDim,boxShadow:a?"0 1px 3px rgba(0,0,0,0.08)":"none"});
  const today=orders.filter(o=>o.date===TODAY),older=orders.filter(o=>o.date!==TODAY);

  // Analytics
  const unfulfilled=[];orders.forEach(o=>o.sections.forEach(sec=>sec.items.forEach(item=>{if(item.status==="unavailable"||item.status==="partial")unfulfilled.push({sku:item.sku,customer:sec.name,orderId:o.id,date:o.date,type:item.status,reqQty:item.origQty,sentQty:item.qty});})));
  const skuMap={};unfulfilled.forEach(e=>{if(!skuMap[e.sku])skuMap[e.sku]={sku:e.sku,naCount:0,partialCount:0,totalMissed:0,occurrences:[]};if(e.type==="unavailable")skuMap[e.sku].naCount++;else skuMap[e.sku].partialCount++;skuMap[e.sku].totalMissed+=e.reqQty-e.sentQty;skuMap[e.sku].occurrences.push(e);});
  const skus=Object.values(skuMap).sort((a,b)=>(b.naCount+b.partialCount)-(a.naCount+a.partialCount));
  const totalNA=unfulfilled.filter(e=>e.type==="unavailable").length,totalPart=unfulfilled.filter(e=>e.type==="partial").length,totalMiss=unfulfilled.reduce((s,e)=>s+(e.reqQty-(e.sentQty||0)),0);
  const maxVol=Math.max(...DAILY_VOLUME.map(d=>d.count));

  // Filtered SKUs for SKU tab
  const catSkus=activeCat?skuList.filter(s=>s.cat===activeCat.id):[];
  const filteredSkus=catSkus.filter(s=>!skuSearch||s.id.toLowerCase().includes(skuSearch.toLowerCase())||(s.name||"").toLowerCase().includes(skuSearch.toLowerCase()));

  return <div style={{minHeight:620,display:"flex",flexDirection:"column",background:C.bg}}>
    <div style={{padding:"14px 20px 12px",borderBottom:`1px solid ${C.border}`,background:"#fff"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <div><span style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:C.amber,letterSpacing:1}}>ORDER</span><span style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:C.gray,letterSpacing:1}}>FLOW</span> <span style={{fontFamily:C.mono,fontSize:11,fontWeight:700,background:C.amberBg,color:C.amber,border:`1px solid ${C.amberBd}`,borderRadius:4,padding:"2px 6px"}}>ADMIN</span></div>
          <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
        </div>
        <button onClick={onSignOut} style={{background:"#fff",border:`1px solid ${C.borderMd}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:C.sans}}>Sign out</button>
      </div>
      <div style={{display:"flex",gap:3,background:C.bg,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
        {tabs.map(([key,label])=><button key={key} onClick={()=>setTab(key)} style={tabSt(tab===key)}>{label}</button>)}
      </div>
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"16px 20px 40px"}}>

      {/* ── ORDERS TAB ── */}
      {tab==="orders"&&(()=>{
        const allOrders=orders;
        const liveOrders=orders.filter(o=>o.status==="live");
        const billedOrders=orders.filter(o=>o.status==="billed");
        const filteredOrders=orderFilter==="live"?liveOrders:orderFilter==="billed"?billedOrders:allOrders;
        const tileSt=(active,color)=>({background:"#fff",border:`2px solid ${active?color:C.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center",cursor:"pointer",transition:"border-color .15s"});
        return <>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,flex:1}}>
              {[[allOrders.length,"All",C.text,"all"],[liveOrders.length,"Live",C.amber,"live"],[billedOrders.length,"Billed",C.green,"billed"]].map(([v,l,c,f])=><div key={l} onClick={()=>setOrderFilter(f)} style={tileSt(orderFilter===f,c)}>
                <div style={{fontFamily:C.mono,fontWeight:700,fontSize:20,color:c}}>{v}</div>
                <div style={{fontSize:10,color:orderFilter===f?c:C.textDim,marginTop:1,fontWeight:orderFilter===f?700:400}}>{l}</div>
              </div>)}
            </div>
            <Btn onClick={()=>setScanning(true)} color="amber" sx={{padding:"10px 14px",fontSize:12,flexShrink:0,whiteSpace:"nowrap"}}>+ New</Btn>
          </div>
          {filteredOrders.length===0&&<div style={{textAlign:"center",color:C.textFaint,padding:"60px 0",fontSize:13}}>No {orderFilter==="all"?"":orderFilter} orders.</div>}
          {filteredOrders.map(o=><OrderCard key={o.id} order={o} onOpen={setActiveOId} onDelete={onDeleteOrder} onEdit={setActiveOId} onReopen={id=>onOrderReopen(id)} dim={o.status==="billed"}/>)}
        </>;
      })()}

      {/* ── MASTER DATA TAB ── */}
      {tab==="masterdata"&&<>
        {/* Sub-nav */}
        <div style={{display:"flex",gap:3,background:C.bg,borderRadius:8,padding:3,border:`1px solid ${C.border}`,marginBottom:16}}>
          {[["users","👥 Users"],["skus","🏷 SKUs"],["buyers","👤 Buyers"]].map(([k,l])=><button key={k} onClick={()=>setMdSection(k)} style={{flex:1,padding:"7px 4px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:C.sans,fontSize:11,fontWeight:mdSection===k?700:400,background:mdSection===k?"#fff":"transparent",color:mdSection===k?C.text:C.textDim,boxShadow:mdSection===k?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{l}</button>)}
        </div>

        {/* USERS SECTION */}
        {mdSection==="users"&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px"}}>STAFF ({users.length})</div>
            <Btn onClick={()=>setShowAdd(!showAdd)} color="amber" sx={{padding:"7px 12px",fontSize:12}}>+ Add Staff</Btn>
          </div>
          {showAdd&&<div style={{background:"#fff",border:`1px solid ${C.amberBd}`,borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:12}}>NEW STAFF MEMBER</div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>NAME</div>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Staff name" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>{if(!newName.trim()){alert("Enter a name.");return;}onUserChange("add",{id:Date.now(),name:newName.trim(),active:true,itemsHandled:0,ordersToday:0,lastSeen:"Never"});setNewName("");setShowAdd(false);}} color="green" sx={{flex:1,padding:10}}>Create Account</Btn>
              <Btn onClick={()=>setShowAdd(false)} color="ghost" sx={{padding:"10px 14px"}}>Cancel</Btn>
            </div>
          </div>}
          {users.map(u=>{
            const ac=u.active,c=ac?C.green:C.red,bg=ac?C.greenBg:C.redBg,bd=ac?C.greenBd:C.redBd;
            return <div key={u.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{width:40,height:40,borderRadius:20,background:bg,border:`1px solid ${bd}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,color:c}}>{u.name[0]}</div>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:C.text}}>{u.name}</div><div style={{fontSize:11,color:C.textDim}}>Last seen: {u.lastSeen}</div></div>
                <span style={{fontFamily:C.mono,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,background:bg,color:c,border:`1px solid ${bd}`}}>{ac?"ACTIVE":"INACTIVE"}</span>
              </div>
              <div style={{display:"flex",gap:6,paddingTop:10,borderTop:"1px solid #F3F4F6"}}>
                <div style={{flex:1,textAlign:"center"}}><div style={{fontFamily:C.mono,fontWeight:700,fontSize:16,color:C.text}}>{u.itemsHandled}</div><div style={{fontSize:10,color:C.textDim}}>items today</div></div>
                <div style={{flex:1,textAlign:"center",borderLeft:"1px solid #F3F4F6"}}><div style={{fontFamily:C.mono,fontWeight:700,fontSize:16,color:C.text}}>{u.ordersToday}</div><div style={{fontSize:10,color:C.textDim}}>orders today</div></div>
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,borderLeft:"1px solid #F3F4F6",paddingLeft:8}}>
                  <Btn onClick={()=>{setEditingUser(u);setEditUserName(u.name);}} color="ghost" sx={{padding:"5px 10px",fontSize:11}}>Edit</Btn>
                  <Btn onClick={()=>onUserChange("toggle",u.id)} color={ac?"redO":"greenO"} sx={{padding:"5px 10px",fontSize:11}}>{ac?"Deactivate":"Activate"}</Btn>
                </div>
              </div>
            </div>;
          })}
          {editingUser&&<div onClick={e=>{if(e.target===e.currentTarget)setEditingUser(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <span style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:C.text}}>EDIT STAFF</span>
                <button onClick={()=>setEditingUser(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.textDim,lineHeight:1}}>✕</button>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>NAME</div>
                <input value={editUserName} onChange={e=>setEditUserName(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{if(!editUserName.trim()){alert("Name cannot be empty.");return;}onUserChange("edit",{...editingUser,name:editUserName.trim()});setEditingUser(null);}} color="green" sx={{flex:1,padding:12,fontSize:14}}>Save</Btn>
                <Btn onClick={()=>{if(window.confirm(`Delete ${editingUser.name}? This cannot be undone.`)){onUserChange("delete",editingUser.id);setEditingUser(null);}}} color="danger" sx={{padding:"12px 14px",fontSize:13}}>Delete</Btn>
              </div>
            </div>
          </div>}
        </>}

        {/* SKUS SECTION */}
        {mdSection==="skus"&&<>
          {skuPage==="cats"&&<>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px"}}>SKU CATEGORIES ({catList.length})</div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>setShowAddSku(!showAddSku)} color="ghost" sx={{padding:"6px 12px",fontSize:11}}>+ Add SKU</Btn>
                <Btn onClick={()=>{setShowAddSku(false);setSkuPage("addcat");}} color="amber" sx={{padding:"6px 12px",fontSize:11}}>+ Category</Btn>
              </div>
            </div>
            {showAddSku&&<div style={{background:"#fff",border:`1px solid ${C.amberBd}`,borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:12}}>NEW SKU</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>SKU CODE</div>
                <input value={newSkuId} onChange={e=>setNewSkuId(e.target.value)} placeholder="e.g. HG 9999" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:13,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>CATEGORY</div>
                <select value={newSkuCat} onChange={e=>setNewSkuCat(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}>
                  {catList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>RATE (Rs)</div>
                <input type="number" value={newSkuRate} onChange={e=>setNewSkuRate(e.target.value)} placeholder="Enter rate" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:13,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{if(!newSkuId.trim()){alert("Enter a SKU code.");return;}const sku={id:newSkuId.trim().toUpperCase(),cat:newSkuCat,rate:newSkuRate?parseInt(newSkuRate):undefined};onSkuChange("add",sku);setNewSkuId("");setNewSkuRate("");setShowAddSku(false);}} color="green" sx={{flex:1,padding:10}}>Add SKU</Btn>
                <Btn onClick={()=>setShowAddSku(false)} color="ghost" sx={{padding:"10px 14px"}}>Cancel</Btn>
              </div>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {catList.map(cat=>{
                const count=skuList.filter(s=>s.cat===cat.id).length;
                return <div key={cat.id} onClick={()=>{setActiveCat(cat);setSkuSearch("");setSkuPage("list");}}
                  style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.amberBd}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4,lineHeight:1.3}}>{cat.name}</div>
                  <div style={{fontSize:11,color:C.textDim}}>Rs{cat.rate?.toLocaleString("en-IN")||"--"} default · {count} SKUs</div>
                </div>;
              })}
            </div>
          </>}
          {skuPage==="addcat"&&<>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <button onClick={()=>setSkuPage("cats")} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:20,padding:0,lineHeight:1}}>←</button>
              <span style={{fontWeight:700,fontSize:15,color:C.text}}>New SKU Category</span>
            </div>
            <div style={{background:"#fff",border:`1px solid ${C.amberBd}`,borderRadius:12,padding:16}}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>CATEGORY NAME</div>
                <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="e.g. 2mm Board" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>DEFAULT RATE (Rs)</div>
                <input type="number" value={newSkuRate} onChange={e=>setNewSkuRate(e.target.value)} placeholder="e.g. 800" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{
                  if(!newGroupName.trim()){alert("Enter a category name.");return;}
                  const id=newGroupName.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
                  set(ref(db,"categories/"+id),{id,name:newGroupName.trim(),rate:newSkuRate?parseInt(newSkuRate):0});
                  setNewGroupName("");setNewSkuRate("");setSkuPage("cats");
                }} color="green" sx={{flex:1,padding:10}}>Create Category</Btn>
                <Btn onClick={()=>setSkuPage("cats")} color="ghost" sx={{padding:"10px 14px"}}>Cancel</Btn>
              </div>
            </div>
          </>}
          {skuPage==="list"&&activeCat&&<>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <button onClick={()=>{setSkuPage("cats");setSkuSearch("");}} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:20,padding:0,lineHeight:1}}>←</button>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:C.text}}>{activeCat.name}</div>
                <div style={{fontSize:11,color:C.textDim}}>Rs{activeCat.rate?.toLocaleString("en-IN")||"--"} default · {skuList.filter(s=>s.cat===activeCat.id).length} SKUs</div>
              </div>
              <Btn onClick={()=>{
                const count=skuList.filter(s=>s.cat===activeCat.id).length;
                if(count>0){alert("Cannot delete -- "+count+" SKU"+(count>1?"s":"")+" in this category. Move or delete them first.");return;}
                if(window.confirm("Delete category "+activeCat.name+"?")){remove(ref(db,"categories/"+activeCat.id));setSkuPage("cats");}
              }} color="danger" sx={{padding:"6px 10px",fontSize:11}}>Delete Category</Btn>
            </div>
            <input value={skuSearch} onChange={e=>setSkuSearch(e.target.value)} placeholder={"Search in "+activeCat.name+"..."} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box",marginBottom:12}}/>
            <div style={{fontSize:11,color:C.textDim,marginBottom:10}}>{filteredSkus.length} SKUs</div>
            {filteredSkus.slice(0,150).map(sku=>{
              const effectiveRate=sku.rate!==undefined?sku.rate:activeCat.rate;
              return <div key={sku.id} onClick={()=>{setActiveSku(sku);setEditSkuId(sku.id);setEditSkuRate(String(sku.rate!==undefined?sku.rate:""));setEditSkuCat(sku.cat);}}
                style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.amberBd}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{flex:1}}><div style={{fontFamily:C.mono,fontWeight:600,fontSize:13,color:C.text}}>{sku.id}</div></div>
                <span style={{fontFamily:C.mono,fontWeight:700,fontSize:13,color:sku.rate!==undefined?C.amber:C.textDim}}>Rs{effectiveRate?.toLocaleString("en-IN")||"--"}</span>
                <span style={{color:C.textDim,fontSize:14}}>›</span>
              </div>;
            })}
            {filteredSkus.length>150&&<div style={{textAlign:"center",color:C.textDim,fontSize:12,padding:"10px 0"}}>Showing 150 of {filteredSkus.length} -- type to search</div>}
            {filteredSkus.length===0&&<div style={{textAlign:"center",color:C.textFaint,padding:"40px 0",fontSize:13}}>No SKUs found.</div>}
          </>}
          {activeSku&&<div onClick={e=>{if(e.target===e.currentTarget)setActiveSku(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <span style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:C.text}}>EDIT SKU</span>
                <button onClick={()=>setActiveSku(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.textDim,lineHeight:1}}>✕</button>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>SKU CODE</div>
                <input value={editSkuId} onChange={e=>setEditSkuId(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>CATEGORY</div>
                <select value={editSkuCat} onChange={e=>setEditSkuCat(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}>
                  {catList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>RATE (Rs per sheet)</div>
                <input type="number" value={editSkuRate} onChange={e=>setEditSkuRate(e.target.value)} placeholder="Leave blank for category default" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
                <div style={{fontSize:11,color:editSkuRate?C.amber:C.textDim,marginTop:4}}>{editSkuRate?"Custom rate overrides category default":"Blank = use category default"}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{const updates={...activeSku,id:editSkuId.trim().toUpperCase(),cat:editSkuCat};if(editSkuRate)updates.rate=parseInt(editSkuRate);else delete updates.rate;if(updates.id!==activeSku.id)onSkuChange("delete",activeSku.id);onSkuChange("add",updates);setActiveSku(null);}} color="green" sx={{flex:1,padding:12,fontSize:14}}>Save Changes</Btn>
                <Btn onClick={()=>{if(window.confirm("Delete "+activeSku.id+"?")){onSkuChange("delete",activeSku.id);setActiveSku(null);}}} color="danger" sx={{padding:"12px 14px",fontSize:13}}>Delete</Btn>
              </div>
            </div>
          </div>}
        </>}

        {/* BUYERS SECTION */}
        {mdSection==="buyers"&&<>
          {buyerGroupPage==="groups"&&<>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px"}}>BUYER GROUPS ({buyerGroups.length})</div>
              <Btn onClick={()=>setShowAddBuyerGroup(!showAddBuyerGroup)} color="amber" sx={{padding:"6px 12px",fontSize:11}}>+ Group</Btn>
            </div>
            {showAddBuyerGroup&&<div style={{background:"#fff",border:`1px solid ${C.amberBd}`,borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:12}}>NEW BUYER GROUP</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>FULL NAME</div>
                <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="e.g. Export Clients" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>ABBREVIATION</div>
                <input value={newGroupAbbr} onChange={e=>setNewGroupAbbr(e.target.value.toUpperCase())} placeholder="e.g. EXP" maxLength={6} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{if(!newGroupName.trim()||!newGroupAbbr.trim()){alert("Enter both name and abbreviation.");return;}const id=newGroupAbbr.trim().toUpperCase();onBuyerGroupChange("add",{id,name:newGroupName.trim(),abbr:id});setNewGroupName("");setNewGroupAbbr("");setShowAddBuyerGroup(false);}} color="green" sx={{flex:1,padding:10}}>Create Group</Btn>
                <Btn onClick={()=>setShowAddBuyerGroup(false)} color="ghost" sx={{padding:"10px 14px"}}>Cancel</Btn>
              </div>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {buyerGroups.map(grp=>{
                const count=buyerList.filter(b=>b.group===grp.id).length;
                return <div key={grp.id} onClick={()=>{setActiveBuyerGroup(grp);setBuyerSearch("");setBuyerGroupPage("list");}}
                  style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.amberBd}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:2}}>{grp.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
                    <span style={{fontFamily:C.mono,fontSize:10,color:C.textDim,background:C.grayBg,border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 6px"}}>{grp.abbr}</span>
                    <span style={{fontSize:11,color:C.textDim}}>{count} buyers</span>
                  </div>
                </div>;
              })}
            </div>
          </>}
          {buyerGroupPage==="list"&&activeBuyerGroup&&<>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <button onClick={()=>{setBuyerGroupPage("groups");setBuyerSearch("");}} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:20,padding:0,lineHeight:1}}>←</button>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:C.text}}>{activeBuyerGroup.name}</div>
                <div style={{fontSize:11,color:C.textDim}}>{buyerList.filter(b=>b.group===activeBuyerGroup.id).length} buyers <span style={{fontFamily:C.mono}}>· {activeBuyerGroup.abbr}</span></div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Btn onClick={()=>{setEditingGroup(activeBuyerGroup);setEditGroupName(activeBuyerGroup.name);setEditGroupAbbr(activeBuyerGroup.abbr);}} color="ghost" sx={{padding:"6px 10px",fontSize:11}}>Edit</Btn>
                <Btn onClick={()=>{const count=buyerList.filter(b=>b.group===activeBuyerGroup.id).length;if(count>0){alert("Cannot delete -- "+count+" buyer"+(count>1?"s":"")+" in this group. Move or delete them first.");return;}if(window.confirm("Delete group "+activeBuyerGroup.name+"?")){onBuyerGroupChange("delete",activeBuyerGroup.id);setBuyerGroupPage("groups");}}} color="danger" sx={{padding:"6px 10px",fontSize:11}}>Delete</Btn>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <input value={buyerSearch} onChange={e=>setBuyerSearch(e.target.value)} placeholder="Search buyers..." style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              <Btn onClick={()=>{setShowAddBuyer(true);setNewBuyerGroup(activeBuyerGroup.id);}} color="amber" sx={{padding:"9px 12px",fontSize:12,flexShrink:0}}>+ Buyer</Btn>
            </div>
            {showAddBuyer&&<div style={{background:"#fff",border:`1px solid ${C.amberBd}`,borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:12}}>NEW BUYER</div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>NAME</div>
                <input value={newBuyerName} onChange={e=>setNewBuyerName(e.target.value)} placeholder="e.g. Mahavir Traders" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{if(!newBuyerName.trim()){alert("Enter a name.");return;}onBuyerChange("add",{id:Date.now(),name:newBuyerName.trim(),group:newBuyerGroup,aliases:[]});setNewBuyerName("");setShowAddBuyer(false);}} color="green" sx={{flex:1,padding:10}}>Add Buyer</Btn>
                <Btn onClick={()=>setShowAddBuyer(false)} color="ghost" sx={{padding:"10px 14px"}}>Cancel</Btn>
              </div>
            </div>}
            {buyerList.filter(b=>b.group===activeBuyerGroup.id&&(!buyerSearch||b.name.toLowerCase().includes(buyerSearch.toLowerCase())||(b.aliases||[]).some(a=>a.toLowerCase().includes(buyerSearch.toLowerCase())))).map(b=><div key={b.id}
              onClick={()=>{setActiveBuyer(b);setEditBuyerName(b.name);setEditBuyerGroup(b.group);setEditBuyerAlias("");}}
              style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.amberBd}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{b.name}</div>
                {(b.aliases||[]).length>0&&<div style={{fontSize:11,color:C.textDim,marginTop:2}}>aka: {b.aliases.join(", ")}</div>}
              </div>
              <span style={{color:C.textDim,fontSize:14}}>›</span>
            </div>)}
          </>}
          {editingGroup&&<div onClick={e=>{if(e.target===e.currentTarget)setEditingGroup(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <span style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:C.text}}>EDIT GROUP</span>
                <button onClick={()=>setEditingGroup(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.textDim,lineHeight:1}}>✕</button>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>FULL NAME</div>
                <input value={editGroupName} onChange={e=>setEditGroupName(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>ABBREVIATION</div>
                <input value={editGroupAbbr} onChange={e=>setEditGroupAbbr(e.target.value.toUpperCase())} maxLength={6} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <Btn onClick={()=>{onBuyerGroupChange("edit",{...editingGroup,name:editGroupName.trim(),abbr:editGroupAbbr.trim()});setActiveBuyerGroup({...editingGroup,name:editGroupName.trim(),abbr:editGroupAbbr.trim()});setEditingGroup(null);}} color="green" sx={{width:"100%",padding:12,fontSize:14}}>Save Changes</Btn>
            </div>
          </div>}
          {activeBuyer&&<div onClick={e=>{if(e.target===e.currentTarget)setActiveBuyer(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",boxSizing:"border-box"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.text}}>EDIT BUYER</span>
                <button onClick={()=>setActiveBuyer(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.textDim,lineHeight:1}}>✕</button>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:4}}>CANONICAL NAME</div>
                <input value={editBuyerName} onChange={e=>setEditBuyerName(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.amberBd}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:4}}>GROUP</div>
                <select value={editBuyerGroup} onChange={e=>setEditBuyerGroup(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff"}}>
                  {buyerGroups.map(g=><option key={g.id} value={g.id}>{g.name} · {g.abbr}</option>)}
                </select>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:8}}>ALIASES ({(activeBuyer.aliases||[]).length})</div>
                {(activeBuyer.aliases||[]).map((alias,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{flex:1,padding:"7px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:13,fontFamily:C.sans,color:C.text,background:C.grayBg}}>{alias}</span>
                  <button onClick={()=>{const updated={...activeBuyer,aliases:activeBuyer.aliases.filter((_,j)=>j!==i)};setActiveBuyer(updated);onBuyerChange("edit",updated);}} style={{padding:"6px 10px",borderRadius:7,border:`1px solid ${C.redBd}`,background:C.redBg,color:C.red,cursor:"pointer",fontSize:12}}>✕</button>
                </div>)}
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <input value={editBuyerAlias} onChange={e=>setEditBuyerAlias(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&editBuyerAlias.trim()){const updated={...activeBuyer,aliases:[...(activeBuyer.aliases||[]),editBuyerAlias.trim()]};setActiveBuyer(updated);onBuyerChange("edit",updated);setEditBuyerAlias("");}}} placeholder="Add alias..." style={{flex:1,padding:"8px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff"}}/>
                  <Btn onClick={()=>{if(!editBuyerAlias.trim())return;const updated={...activeBuyer,aliases:[...(activeBuyer.aliases||[]),editBuyerAlias.trim()]};setActiveBuyer(updated);onBuyerChange("edit",updated);setEditBuyerAlias("");}} color="amber" sx={{padding:"8px 12px",fontSize:12}}>Add</Btn>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{const updated={...activeBuyer,name:editBuyerName.trim(),group:editBuyerGroup};onBuyerChange("edit",updated);setActiveBuyer(null);}} color="green" sx={{flex:1,padding:12,fontSize:14}}>Save Changes</Btn>
                <Btn onClick={()=>{if(window.confirm("Delete "+activeBuyer.name+"?")){onBuyerChange("delete",activeBuyer.id);setActiveBuyer(null);}}} color="danger" sx={{padding:"12px 14px",fontSize:13}}>Delete</Btn>
              </div>
            </div>
          </div>}
        </>}
      </>}

      {/* ── ANALYTICS TAB ── */}
      {tab==="analytics"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>
          {[[totalNA,"N/A items",C.red],[totalPart,"Partial fills",C.amber],[totalMiss,"Units missed",C.text]].map(([v,l,c])=><div key={l} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
            <div style={{fontFamily:C.mono,fontWeight:700,fontSize:22,color:c}}>{v}</div>
            <div style={{fontSize:10,color:C.textDim,marginTop:2}}>{l}</div>
          </div>)}
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginBottom:14}}>ORDER VOLUME — LAST 7 DAYS</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80}}>
            {DAILY_VOLUME.map(d=>{const bh=Math.round((d.count/maxVol)*68);return <div key={d.date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:10,color:C.textDim,fontFamily:C.mono}}>{d.count}</div>
              <div style={{width:"100%",height:bh,background:C.amber,borderRadius:"4px 4px 0 0",opacity:0.8}}/>
              <div style={{fontSize:10,color:C.textDim}}>{d.date}</div>
            </div>;})}
          </div>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:C.amber,letterSpacing:"0.8px",marginBottom:8}}>PENDING ITEMS — LIVE ORDERS</div>
        <PendingSkuTab orders={orders} onUpdate={(orderId,sIdx,iIdx,changes)=>onOrderUpdate(orderId,sIdx,iIdx,changes)}/>
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginBottom:8,marginTop:20}}>HISTORICAL — N/A & PARTIAL</div>
        <div style={{fontSize:12,color:C.textDim,marginBottom:12}}>Tap any SKU to see affected orders.</div>
        {skus.length===0&&<div style={{textAlign:"center",color:C.textFaint,padding:"32px 0",fontSize:13}}>No unfulfilled items yet.</div>}
        {skus.map(skuData=>{
          const isExp=expandSku===skuData.sku,total=skuData.naCount+skuData.partialCount,naW=total>0?Math.round(skuData.naCount/total*100):0;
          return <div key={skuData.sku} style={{background:"#fff",border:`1px solid ${isExp?C.redBd:C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <div onClick={()=>setExpandSku(isExp?null:skuData.sku)} style={{padding:"14px 16px",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.text}}>{skuData.sku}</span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {skuData.naCount>0&&<span style={{fontFamily:C.mono,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:4,background:C.redBg,color:C.red,border:`1px solid ${C.redBd}`}}>{skuData.naCount} N/A</span>}
                  {skuData.partialCount>0&&<span style={{fontFamily:C.mono,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:4,background:C.amberBg,color:C.amber,border:`1px solid ${C.amberBd}`}}>{skuData.partialCount} partial</span>}
                  <span style={{color:"#9CA3AF",fontSize:13}}>{isExp?"▲":"▼"}</span>
                </div>
              </div>
              <div style={{background:"#F3F4F6",borderRadius:4,height:6,overflow:"hidden",display:"flex"}}>
                <div style={{width:`${naW}%`,height:"100%",background:C.red}}/><div style={{flex:1,height:"100%",background:C.amber,opacity:0.7}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                <span style={{fontSize:11,color:C.textDim}}>{total} occurrence{total!==1?"s":""} · {skuData.totalMissed} units missed</span>
                <span style={{fontSize:11,color:"#9CA3AF"}}>{isExp?"collapse":"expand"}</span>
              </div>
            </div>
            {isExp&&<div style={{borderTop:"1px solid #F3F4F6",background:"#FAFAFA"}}>
              {[...skuData.occurrences].sort((a,b)=>b.date.localeCompare(a.date)).map((occ,i,arr)=><div key={i} style={{padding:"10px 16px",borderBottom:i<arr.length-1?"1px solid #F3F4F6":"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{occ.customer}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
                    <span style={{fontFamily:C.mono,fontSize:11,color:C.textDim}}>{occ.orderId}</span>
                    <span style={{fontSize:11,color:"#9CA3AF"}}>·</span>
                    <span style={{fontSize:11,color:C.textDim}}>{fmtDate(occ.date)}</span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <Pill status={occ.type} small/>
                  <div style={{fontSize:11,marginTop:4}}>{occ.type==="unavailable"?<span style={{color:C.red,fontWeight:600}}>req ×{occ.reqQty} · sent ×0</span>:<span>req ×{occ.reqQty} · <span style={{color:C.amber,fontWeight:600}}>sent ×{occ.sentQty}</span></span>}</div>
                </div>
              </div>)}
            </div>}
          </div>;
        })}
      </>}
    </div>
  </div>;
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState("choose");
  const [staffId,setStaffId]=useState(null);
  const [activeOrderId,setActiveOrderId]=useState(null);
  const [orders,setOrders]=useState([]);
  const [users,setUsers]=useState([]);
  const [skuList,setSkuList]=useState([]);
  const [catList,setCatList]=useState([]);
  const [buyerList,setBuyerList]=useState([]);
  const [buyerGroups,setBuyerGroups]=useState([]);
  const [loading,setLoading]=useState(true);
  const [lang,setLang]=useState(()=>localStorage.getItem("of_lang")||"en");
  useEffect(()=>{localStorage.setItem("of_lang",lang);},[lang]);

  useEffect(()=>{
    // Orders listener
    const ordersRef=ref(db,"orders");
    const unsubOrders=onValue(ordersRef,snap=>{
      const val=snap.val();
      if(val){setOrders(purgeOldOrders(Object.values(val)));}
      else{setOrders([]);}
      setLoading(false);
    });
    // Users listener
    const usersRef=ref(db,"users");
    const unsubUsers=onValue(usersRef,snap=>{
      const val=snap.val();
      if(val){setUsers(Object.values(val));}
      else{SEED_USERS.forEach(u=>set(ref(db,`users/${u.id}`),u));setUsers(SEED_USERS);}
    });
    // SKUs listener
    const skusRef=ref(db,"skus");
    const unsubSkus=onValue(skusRef,snap=>{
      const val=snap.val();
      if(val){setSkuList(Object.values(val));}
      else{SEED_SKUS.forEach(s=>set(ref(db,`skus/${s.id.replace(/[^a-zA-Z0-9]/g,"_")}`),s));setSkuList(SEED_SKUS);}
    });
    // Categories listener
    const catsRef=ref(db,"categories");
    const unsubCats=onValue(catsRef,snap=>{
      const val=snap.val();
      if(val){setCatList(Object.values(val));}
      else{SKU_CATEGORIES.forEach(c=>set(ref(db,`categories/${c.id}`),c));setCatList(SKU_CATEGORIES);}
    });
    // Buyers listener
    const buyersRef=ref(db,"buyers");
    const unsubBuyers=onValue(buyersRef,snap=>{
      const val=snap.val();
      if(val){setBuyerList(Object.values(val));}
      else{SEED_BUYERS.forEach(b=>set(ref(db,`buyers/${b.id}`),b));setBuyerList(SEED_BUYERS);}
    });
    // Buyer groups listener
    const buyerGroupsRef=ref(db,"buyerGroups");
    const unsubBuyerGroups=onValue(buyerGroupsRef,snap=>{
      const val=snap.val();
      if(val){setBuyerGroups(Object.values(val));}
      else{SEED_BUYER_GROUPS.forEach(g=>set(ref(db,`buyerGroups/${g.id}`),g));setBuyerGroups(SEED_BUYER_GROUPS);}
    });
    // Hourly purge
    const purgeInterval=setInterval(()=>{
      setOrders(prev=>{
        const purged=purgeOldOrders(prev);
        prev.filter(o=>!purged.find(p=>p.id===o.id)).forEach(o=>remove(ref(db,`orders/${o.id}`)));
        return purged;
      });
    },60*60*1000);
    return()=>{unsubOrders();unsubUsers();unsubSkus();unsubCats();unsubBuyers();unsubBuyerGroups();clearInterval(purgeInterval);};
  },[]);

  const staffUser=users.find(u=>u.id===staffId);
  const actorName=screen==="admin-app"?"Admin":(staffUser?.name||"Staff");
  const isAdmin=screen==="admin-app";
  const activeOrder=orders.find(o=>o.id===activeOrderId);
  // Enrich skuList with category names for typeahead display
  const enrichedSkuList=skuList.map(s=>{const cat=catList.find(c=>c.id===s.cat);return{...s,_catName:cat?.name||""};});

  // Mutations
  const updateItem=(orderId,sIdx,iIdx,changes)=>{
    const order=orders.find(o=>o.id===orderId);if(!order)return;
    const updated=cl(order);
    if(changes._sectionName){updated.sections[sIdx].name=changes._sectionName;}
    else if(changes._notes!==undefined){updated.notes=changes._notes;}
    else if(changes._fullReplace){
      // Replace entire sections array (used by Edit Order mode)
      updated.sections=changes._fullReplace;
    }
    else{Object.assign(updated.sections[sIdx].items[iIdx],changes);}
    set(ref(db,`orders/${orderId}`),updated);
  };
  const billOrder=orderId=>{const order=orders.find(o=>o.id===orderId);if(!order)return;set(ref(db,`orders/${orderId}`),{...order,status:"billed",billedBy:actorName,billedAt:nowTime()});};
  const reopenOrder=orderId=>{const order=orders.find(o=>o.id===orderId);if(!order)return;const u={...order,status:"live"};delete u.billedBy;delete u.billedAt;set(ref(db,`orders/${orderId}`),u);};
  const addOrder=order=>set(ref(db,`orders/${order.id}`),order);
  const deleteOrder=orderId=>remove(ref(db,`orders/${orderId}`));
  const updateUser=(action,payload)=>{
    if(action==="add")set(ref(db,`users/${payload.id}`),payload);
    if(action==="toggle"){const user=users.find(u=>u.id===payload);if(user)set(ref(db,`users/${payload}`),{...user,active:!user.active});}
    if(action==="edit")set(ref(db,`users/${payload.id}`),payload);
    if(action==="delete")remove(ref(db,`users/${payload}`));
  };
  const onSkuChange=(action,payload)=>{
    if(action==="add"){const key=payload.id.replace(/[^a-zA-Z0-9]/g,"_");set(ref(db,`skus/${key}`),payload);}
    if(action==="delete"){const key=payload.replace(/[^a-zA-Z0-9]/g,"_");remove(ref(db,`skus/${key}`));}
    if(action==="setRate"){const key=payload.skuId.replace(/[^a-zA-Z0-9]/g,"_");const sku=skuList.find(s=>s.id===payload.skuId);if(sku)set(ref(db,`skus/${key}`),{...sku,rate:payload.rate});}
    if(action==="setCatRate"){const cat=catList.find(c=>c.id===payload.catId);if(cat)set(ref(db,`categories/${payload.catId}`),{...cat,rate:payload.rate});}
  };
  const onBuyerChange=(action,payload)=>{
    if(action==="add")set(ref(db,`buyers/${payload.id}`),payload);
    if(action==="edit")set(ref(db,`buyers/${payload.id}`),payload);
    if(action==="delete")remove(ref(db,`buyers/${payload}`));
  };
  const onBuyerGroupChange=(action,payload)=>{
    if(action==="add")set(ref(db,`buyerGroups/${payload.id}`),payload);
    if(action==="edit")set(ref(db,`buyerGroups/${payload.id}`),payload);
    if(action==="delete")remove(ref(db,`buyerGroups/${payload}`));
  };

  const addAlias=(buyer,rawText)=>{
    if(!buyer||!buyer.id||!rawText)return;
    const trimmed=rawText.trim();
    const existing=(buyer.aliases||[]);
    if(existing.includes(trimmed))return;
    const updated={...buyer,aliases:[...existing,trimmed]};
    set(ref(db,`buyers/${buyer.id}`),updated);
  };

  if(loading)return <div style={{minHeight:620,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
    <div style={{fontFamily:C.mono,fontWeight:700,fontSize:20,color:C.amber}}>ORDER<span style={{color:C.gray}}>FLOW</span></div>
    <div style={{fontSize:13,color:C.textDim}}>Connecting…</div>
  </div>;

  if(screen==="choose")return <ChooseScreen onStaff={()=>setScreen("staff-select")} onAdmin={()=>setScreen("admin-app")} lang={lang} setLang={setLang}/>;
  if(screen==="staff-select")return <StaffSelect users={users} onSelect={id=>{setStaffId(id);setScreen("staff-app");}} onBack={()=>setScreen("choose")} lang={lang}/>;
  if(screen==="staff-scan")return <ScanScreen actorName={actorName} onBack={()=>setScreen("staff-app")} onConfirm={o=>{addOrder(o);setScreen("staff-app");}} skuList={enrichedSkuList} catList={catList} buyerList={buyerList} onAddAlias={addAlias} lang={lang}/>;
  if(screen==="staff-app"){
    if(activeOrder)return <OrderDetail order={activeOrder} actorName={actorName} isAdmin={false} onBack={()=>setActiveOrderId(null)} onUpdate={(sIdx,iIdx,changes)=>updateItem(activeOrder.id,sIdx,iIdx,changes)} onBilled={()=>{billOrder(activeOrder.id);setActiveOrderId(null);}} onReopen={()=>reopenOrder(activeOrder.id)} skuList={enrichedSkuList} catList={catList} lang={lang}/>;
    return <StaffHome orders={orders} staffName={actorName} onSignOut={()=>{setStaffId(null);setScreen("choose");}} onNewOrder={()=>setScreen("staff-scan")} onOpenOrder={id=>setActiveOrderId(id)} onEditOrder={id=>{setActiveOrderId(id);}} onReopenOrder={id=>reopenOrder(id)} onItemUpdate={(orderId,sIdx,iIdx,changes)=>updateItem(orderId,sIdx,iIdx,changes)} lang={lang} setLang={setLang}/>;
  }
  if(screen==="admin-app")return <AdminApp orders={orders} users={users} skuList={skuList} catList={catList} onSignOut={()=>setScreen("choose")} onOrderUpdate={updateItem} onOrderBilled={billOrder} onOrderReopen={reopenOrder} onAddOrder={addOrder} onUserChange={updateUser} onDeleteOrder={deleteOrder} onSkuChange={onSkuChange} skuListEnriched={enrichedSkuList} buyerList={buyerList} onBuyerChange={onBuyerChange} buyerGroups={buyerGroups} onBuyerGroupChange={onBuyerGroupChange}/>;
  return null;
}
