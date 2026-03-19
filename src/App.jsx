import React, { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, remove, update } from "firebase/database";

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
const genId = () => "ABCDEFGHJKLMNPQR"[Math.floor(Math.random() * 16)] + (Math.floor(Math.random() * 9) + 1);
const purgeOldOrders = (orders) => orders.filter((o) => o.date >= SEVEN_DAYS_AGO);

// ─── SKU MASTER DATA ──────────────────────────────────────────
// Categories with default rates (₹ per sheet, wholesale 2026)
const SKU_CATEGORIES = [
  { id: "lam8",    name: ".8mm Laminate",     rate: 600  },
  { id: "mica92",  name: "MICA .92mm (1010)", rate: 700  },
  { id: "lin72",   name: "Liner .72mm",       rate: 400  },
  { id: "lin80",   name: "Liner .80mm",       rate: 420  },
  { id: "lin92",   name: "Liner .92mm",       rate: 450  },
  { id: "pvc",     name: "PVC Liner",         rate: 1600 },
  { id: "blink",   name: "1mm Blink/Makers",  rate: 950  },
  { id: "door",    name: "Door Skin",         rate: 1000 },
  { id: "acrylic", name: "Acrylic (1.5mm)",   rate: 3500 },
  { id: "louver",  name: "Louvers",           rate: 850  },
  { id: "adhesive",name: "Adhesive",          rate: 280  },
];

// SKU list extracted from StkSum.xls — code + category
const SEED_SKUS = [
  // ── .8mm Laminate ──
  {id:"CF 3161",cat:"lam8"},{id:"CF 3162",cat:"lam8"},{id:"CF 726",cat:"lam8"},
  {id:"C&M 7101",cat:"lam8"},{id:"C&M 7102",cat:"lam8"},
  {id:"CO 3632",cat:"lam8"},{id:"CO 3635",cat:"lam8"},{id:"CO 3641",cat:"lam8"},{id:"CO 3645",cat:"lam8"},{id:"CO 3654",cat:"lam8"},{id:"CO 3701",cat:"lam8"},{id:"CO 3702",cat:"lam8"},{id:"CO 5216",cat:"lam8"},
  {id:"CS 1102",cat:"lam8"},{id:"CS 4115",cat:"lam8"},{id:"CS 4125",cat:"lam8"},
  {id:"CT2 4149",cat:"lam8"},{id:"CT2 5207",cat:"lam8"},
  {id:"CW 3631",cat:"lam8"},{id:"CW 3636",cat:"lam8"},{id:"CW 3653",cat:"lam8"},{id:"CW 3654",cat:"lam8"},{id:"CW 3706",cat:"lam8"},{id:"CW 4145",cat:"lam8"},{id:"CW 4146",cat:"lam8"},
  {id:"DG1 5201",cat:"lam8"},{id:"DG1 5202",cat:"lam8"},{id:"DG2 5203",cat:"lam8"},{id:"DG2 5204",cat:"lam8"},
  {id:"DM 1102",cat:"lam8"},{id:"DM 4111",cat:"lam8"},{id:"DM 4115",cat:"lam8"},
  {id:"EB 3111",cat:"lam8"},{id:"EB 3635",cat:"lam8"},{id:"EB 4115",cat:"lam8"},
  {id:"FB 1102",cat:"lam8"},{id:"FB 4111",cat:"lam8"},{id:"FB 4115",cat:"lam8"},
  {id:"FC 1135",cat:"lam8"},{id:"FC 1141",cat:"lam8"},{id:"FC 1151",cat:"lam8"},{id:"FC 3111",cat:"lam8"},
  {id:"FL1 1231",cat:"lam8"},{id:"FL1 1236",cat:"lam8"},{id:"FL1 1237",cat:"lam8"},{id:"FL1 1238",cat:"lam8"},{id:"FL1 1240",cat:"lam8"},{id:"FL1 1241",cat:"lam8"},{id:"FL1 1406",cat:"lam8"},{id:"FL1 4144",cat:"lam8"},{id:"FL1 4147",cat:"lam8"},{id:"FL1 5205",cat:"lam8"},{id:"FL1 5210",cat:"lam8"},{id:"FL1 5219",cat:"lam8"},{id:"FL1 5221",cat:"lam8"},{id:"FL1 5222",cat:"lam8"},{id:"FL1 5223",cat:"lam8"},{id:"FL1 5224",cat:"lam8"},{id:"FL1 5225",cat:"lam8"},
  {id:"FL2 1231",cat:"lam8"},{id:"FL2 1236",cat:"lam8"},{id:"FL2 1237",cat:"lam8"},{id:"FL2 1238",cat:"lam8"},{id:"FL2 1240",cat:"lam8"},{id:"FL2 1241",cat:"lam8"},{id:"FL2 1406",cat:"lam8"},
  {id:"FL3 3585",cat:"lam8"},{id:"FL3 3641",cat:"lam8"},{id:"FL3 3642",cat:"lam8"},{id:"FL3 3665",cat:"lam8"},{id:"FL3 725",cat:"lam8"},
  {id:"FL4 1112",cat:"lam8"},{id:"FL4 1231",cat:"lam8"},{id:"FL4 1240",cat:"lam8"},{id:"FL4 1241",cat:"lam8"},{id:"FL4 194",cat:"lam8"},
  {id:"FO 3620",cat:"lam8"},{id:"FO 3632",cat:"lam8"},{id:"FO 3651",cat:"lam8"},{id:"FO 3652",cat:"lam8"},{id:"FO 5208",cat:"lam8"},
  {id:"FR 3525",cat:"lam8"},
  {id:"GM 1102",cat:"lam8"},{id:"GM 1112",cat:"lam8"},{id:"GM 1406",cat:"lam8"},
  {id:"GW 3552",cat:"lam8"},{id:"GW 3555",cat:"lam8"},{id:"GW 3615",cat:"lam8"},{id:"GW 3620",cat:"lam8"},{id:"GW 3652",cat:"lam8"},{id:"GW 5146",cat:"lam8"},
  {id:"HG 1101",cat:"lam8"},{id:"HG 1102",cat:"lam8"},{id:"HG 1111",cat:"lam8"},{id:"HG 1112",cat:"lam8"},{id:"HG 1121",cat:"lam8"},{id:"HG 1122",cat:"lam8"},{id:"HG 1125",cat:"lam8"},{id:"HG 1131",cat:"lam8"},{id:"HG 1134",cat:"lam8"},{id:"HG 1135",cat:"lam8"},{id:"HG 1141",cat:"lam8"},{id:"HG 1145",cat:"lam8"},{id:"HG 1151",cat:"lam8"},{id:"HG 1155",cat:"lam8"},{id:"HG 1161",cat:"lam8"},{id:"HG 1182",cat:"lam8"},
  {id:"HG 1231",cat:"lam8"},{id:"HG 1233",cat:"lam8"},{id:"HG 1234",cat:"lam8"},{id:"HG 1235",cat:"lam8"},{id:"HG 1236",cat:"lam8"},{id:"HG 1237",cat:"lam8"},{id:"HG 1238",cat:"lam8"},{id:"HG 1239",cat:"lam8"},{id:"HG 1240",cat:"lam8"},{id:"HG 1241",cat:"lam8"},{id:"HG 1406",cat:"lam8"},{id:"HG 1407",cat:"lam8"},
  {id:"HG 3116",cat:"lam8"},{id:"HG 3141",cat:"lam8"},{id:"HG 3151",cat:"lam8"},{id:"HG 3321",cat:"lam8"},{id:"HG 3501",cat:"lam8"},{id:"HG 3502",cat:"lam8"},{id:"HG 3505",cat:"lam8"},{id:"HG 3506",cat:"lam8"},{id:"HG 3511",cat:"lam8"},
  {id:"HG 3525",cat:"lam8"},{id:"HG 3526",cat:"lam8"},{id:"HG 3531",cat:"lam8"},{id:"HG 3532",cat:"lam8"},{id:"HG 3535",cat:"lam8"},{id:"HG 3541",cat:"lam8"},{id:"HG 3542",cat:"lam8"},{id:"HG 3545",cat:"lam8"},{id:"HG 3546",cat:"lam8"},{id:"HG 3551",cat:"lam8"},{id:"HG 3552",cat:"lam8"},{id:"HG 3555",cat:"lam8"},{id:"HG 3556",cat:"lam8"},
  {id:"HG 3601",cat:"lam8"},{id:"HG 3602",cat:"lam8"},{id:"HG 3605",cat:"lam8"},{id:"HG 3606",cat:"lam8"},{id:"HG 3607",cat:"lam8"},{id:"HG 3608",cat:"lam8"},{id:"HG 3610",cat:"lam8"},{id:"HG 3615",cat:"lam8"},{id:"HG 3617",cat:"lam8"},{id:"HG 3618",cat:"lam8"},{id:"HG 3619",cat:"lam8"},
  {id:"HG 3691",cat:"lam8"},{id:"HG 3692",cat:"lam8"},{id:"HG 3693",cat:"lam8"},{id:"HG 3694",cat:"lam8"},{id:"HG 3704",cat:"lam8"},{id:"HG 3705",cat:"lam8"},
  {id:"HG 4111",cat:"lam8"},{id:"HG 4125",cat:"lam8"},{id:"HG 4135",cat:"lam8"},{id:"HG 4136",cat:"lam8"},{id:"HG 4148",cat:"lam8"},
  {id:"HG 5125",cat:"lam8"},{id:"HG 5126",cat:"lam8"},{id:"HG 5130",cat:"lam8"},{id:"HG 5131",cat:"lam8"},{id:"HG 5135",cat:"lam8"},{id:"HG 5136",cat:"lam8"},{id:"HG 5140",cat:"lam8"},{id:"HG 5141",cat:"lam8"},{id:"HG 5145",cat:"lam8"},{id:"HG 5146",cat:"lam8"},{id:"HG 5151",cat:"lam8"},{id:"HG 5171",cat:"lam8"},{id:"HG 5175",cat:"lam8"},{id:"HG 5176",cat:"lam8"},{id:"HG 5195",cat:"lam8"},{id:"HG 5196",cat:"lam8"},
  {id:"HG 5208",cat:"lam8"},{id:"HG 5209",cat:"lam8"},{id:"HG 5210",cat:"lam8"},{id:"HG 5211",cat:"lam8"},{id:"HG 5215",cat:"lam8"},{id:"HG 5222",cat:"lam8"},{id:"HG 5223",cat:"lam8"},{id:"HG 5224",cat:"lam8"},{id:"HG 5225",cat:"lam8"},{id:"HG 6015",cat:"lam8"},{id:"HG 6065",cat:"lam8"},
  {id:"HGG 1102",cat:"lam8"},{id:"HGG 1135",cat:"lam8"},{id:"HGG 1145",cat:"lam8"},{id:"HGG 1151",cat:"lam8"},
  {id:"HGG/2 1102",cat:"lam8"},{id:"HGG/2 1135",cat:"lam8"},{id:"HGG/2 1145",cat:"lam8"},{id:"HGG/2 1151",cat:"lam8"},
  {id:"LB 1102",cat:"lam8"},{id:"LB 3155",cat:"lam8"},{id:"LB 3661",cat:"lam8"},{id:"LB 4141",cat:"lam8"},
  {id:"LF 3121",cat:"lam8"},{id:"LF 3611",cat:"lam8"},{id:"LF 3635",cat:"lam8"},{id:"LF 3645",cat:"lam8"},{id:"LF 3652",cat:"lam8"},{id:"LF 5140",cat:"lam8"},{id:"LF 5166",cat:"lam8"},{id:"LF 5171",cat:"lam8"},
  {id:"MB 1102",cat:"lam8"},{id:"MB 3121",cat:"lam8"},{id:"MB 3155",cat:"lam8"},{id:"MB 3616",cat:"lam8"},{id:"MB 4111",cat:"lam8"},{id:"MB 4115",cat:"lam8"},
  {id:"MF 7105",cat:"lam8"},{id:"MF 7106",cat:"lam8"},{id:"MF 7107",cat:"lam8"},{id:"MF 7108",cat:"lam8"},
  {id:"MHG 1221",cat:"lam8"},{id:"MHG 1222",cat:"lam8"},{id:"MHG 1223",cat:"lam8"},{id:"MHG 1224",cat:"lam8"},{id:"MHG 1229",cat:"lam8"},{id:"MHG 1230",cat:"lam8"},
  {id:"NV 3609",cat:"lam8"},
  {id:"PS 3301",cat:"lam8"},{id:"PS 3302",cat:"lam8"},{id:"PS 3505",cat:"lam8"},{id:"PS 3506",cat:"lam8"},{id:"PS 3545",cat:"lam8"},{id:"PS 6105",cat:"lam8"},{id:"PS 6106",cat:"lam8"},
  {id:"PS2 3704",cat:"lam8"},{id:"PS2 3705",cat:"lam8"},{id:"PS2 5207",cat:"lam8"},{id:"PS2 5212",cat:"lam8"},{id:"PS2 5213",cat:"lam8"},
  {id:"RG 3111",cat:"lam8"},{id:"RG 3620",cat:"lam8"},{id:"RG 4121",cat:"lam8"},
  {id:"RR 1102",cat:"lam8"},{id:"RR 1135",cat:"lam8"},{id:"RR 3111",cat:"lam8"},{id:"RR 4111",cat:"lam8"},{id:"RR 4135",cat:"lam8"},
  {id:"SA 3121",cat:"lam8"},{id:"SA 3122",cat:"lam8"},{id:"SA 3151",cat:"lam8"},{id:"SA 3155",cat:"lam8"},{id:"SA 3531",cat:"lam8"},{id:"SA 3532",cat:"lam8"},{id:"SA 3611",cat:"lam8"},{id:"SA 3615",cat:"lam8"},{id:"SA 3620",cat:"lam8"},{id:"SA 3624",cat:"lam8"},{id:"SA 3645",cat:"lam8"},{id:"SA 4125",cat:"lam8"},{id:"SA 5165",cat:"lam8"},{id:"SA 5171",cat:"lam8"},{id:"SA 6005",cat:"lam8"},{id:"SA 6036",cat:"lam8"},
  {id:"SF 1101",cat:"lam8"},{id:"SF 1102",cat:"lam8"},{id:"SF 1111",cat:"lam8"},{id:"SF 1112",cat:"lam8"},{id:"SF 1115",cat:"lam8"},{id:"SF 1121",cat:"lam8"},{id:"SF 1135",cat:"lam8"},{id:"SF 1141",cat:"lam8"},{id:"SF 1151",cat:"lam8"},{id:"SF 1155",cat:"lam8"},{id:"SF 1161",cat:"lam8"},{id:"SF 1406",cat:"lam8"},{id:"SF 1407",cat:"lam8"},
  {id:"SF 2104",cat:"lam8"},{id:"SF 2106",cat:"lam8"},{id:"SF 2108",cat:"lam8"},{id:"SF 2109",cat:"lam8"},{id:"SF 2111",cat:"lam8"},{id:"SF 2112",cat:"lam8"},
  {id:"SF 3101",cat:"lam8"},{id:"SF 3111",cat:"lam8"},{id:"SF 3115",cat:"lam8"},{id:"SF 3116",cat:"lam8"},{id:"SF 3121",cat:"lam8"},{id:"SF 3125",cat:"lam8"},{id:"SF 3126",cat:"lam8"},{id:"SF 3135",cat:"lam8"},{id:"SF 3141",cat:"lam8"},{id:"SF 3151",cat:"lam8"},{id:"SF 3155",cat:"lam8"},{id:"SF 3161",cat:"lam8"},{id:"SF 3162",cat:"lam8"},{id:"SF 3165",cat:"lam8"},{id:"SF 3175",cat:"lam8"},{id:"SF 3176",cat:"lam8"},{id:"SF 3181",cat:"lam8"},
  {id:"SF 3305",cat:"lam8"},{id:"SF 3525",cat:"lam8"},{id:"SF 3526",cat:"lam8"},{id:"SF 3551",cat:"lam8"},{id:"SF 3552",cat:"lam8"},{id:"SF 3555",cat:"lam8"},{id:"SF 3556",cat:"lam8"},{id:"SF 3611",cat:"lam8"},{id:"SF 3620",cat:"lam8"},{id:"SF 3624",cat:"lam8"},{id:"SF 3645",cat:"lam8"},{id:"SF 3652",cat:"lam8"},
  {id:"SF 4115",cat:"lam8"},{id:"SF 4121",cat:"lam8"},{id:"SF 4125",cat:"lam8"},{id:"SF 4136",cat:"lam8"},{id:"SF 4146",cat:"lam8"},
  {id:"SF 5125",cat:"lam8"},{id:"SF 5126",cat:"lam8"},{id:"SF 5130",cat:"lam8"},{id:"SF 5131",cat:"lam8"},{id:"SF 5135",cat:"lam8"},{id:"SF 5136",cat:"lam8"},{id:"SF 5140",cat:"lam8"},{id:"SF 5141",cat:"lam8"},{id:"SF 5161",cat:"lam8"},{id:"SF 5162",cat:"lam8"},{id:"SF 5163",cat:"lam8"},{id:"SF 5164",cat:"lam8"},{id:"SF 5165",cat:"lam8"},{id:"SF 5166",cat:"lam8"},{id:"SF 5171",cat:"lam8"},
  {id:"SH 5215",cat:"lam8"},
  {id:"SM 1101",cat:"lam8"},{id:"SM 1102",cat:"lam8"},{id:"SM 1112",cat:"lam8"},{id:"SM 1151",cat:"lam8"},{id:"SM 1182",cat:"lam8"},
  {id:"SM 1231",cat:"lam8"},{id:"SM 1232",cat:"lam8"},{id:"SM 1233",cat:"lam8"},{id:"SM 1234",cat:"lam8"},{id:"SM 1235",cat:"lam8"},{id:"SM 1236",cat:"lam8"},{id:"SM 1237",cat:"lam8"},{id:"SM 1238",cat:"lam8"},{id:"SM 1239",cat:"lam8"},{id:"SM 1240",cat:"lam8"},{id:"SM 1241",cat:"lam8"},{id:"SM 1242",cat:"lam8"},{id:"SM 1406",cat:"lam8"},{id:"SM 1407",cat:"lam8"},{id:"SM 1410",cat:"lam8"},{id:"SM 1411",cat:"lam8"},{id:"SM 1412",cat:"lam8"},{id:"SM 1413",cat:"lam8"},{id:"SM 1414",cat:"lam8"},
  {id:"SM 3545",cat:"lam8"},{id:"SM 3546",cat:"lam8"},{id:"SM 3551",cat:"lam8"},{id:"SM 3552",cat:"lam8"},{id:"SM 3555",cat:"lam8"},{id:"SM 3556",cat:"lam8"},{id:"SM 3601",cat:"lam8"},{id:"SM 3602",cat:"lam8"},{id:"SM 3605",cat:"lam8"},{id:"SM 3606",cat:"lam8"},{id:"SM 3616",cat:"lam8"},{id:"SM 3635",cat:"lam8"},
  {id:"SM 5145",cat:"lam8"},{id:"SM 5146",cat:"lam8"},{id:"SM 5155",cat:"lam8"},{id:"SM 5158",cat:"lam8"},{id:"SM 5205",cat:"lam8"},{id:"SM 5219",cat:"lam8"},{id:"SM 6065",cat:"lam8"},
  {id:"T-11 1112",cat:"lam8"},{id:"T-11 1233",cat:"lam8"},{id:"T-11 1236",cat:"lam8"},{id:"T-11 1241",cat:"lam8"},{id:"T-11 1406",cat:"lam8"},
  {id:"T-12 1112",cat:"lam8"},{id:"T-12 1182",cat:"lam8"},{id:"T-12 1238",cat:"lam8"},{id:"T-12 1241",cat:"lam8"},{id:"T-12 1242",cat:"lam8"},
  {id:"TB 3111",cat:"lam8"},{id:"TB 4111",cat:"lam8"},{id:"TB 4115",cat:"lam8"},
  {id:"TS 1102",cat:"lam8"},{id:"TS 3101",cat:"lam8"},{id:"TS 3111",cat:"lam8"},{id:"TS 4111",cat:"lam8"},{id:"TS 4141",cat:"lam8"},
  {id:"VB 1102",cat:"lam8"},{id:"VB 1125",cat:"lam8"},{id:"VB 1131",cat:"lam8"},{id:"VB 1135",cat:"lam8"},{id:"VB 1145",cat:"lam8"},{id:"VB 1151",cat:"lam8"},{id:"VB 3111",cat:"lam8"},
  {id:"W3 5208",cat:"lam8"},{id:"W3 5209",cat:"lam8"},{id:"W3 5216",cat:"lam8"},{id:"W3 5217",cat:"lam8"},
  {id:"W5 3701",cat:"lam8"},{id:"W5 3702",cat:"lam8"},{id:"W5 3703",cat:"lam8"},{id:"W5 5206",cat:"lam8"},
  {id:"WC 3111",cat:"lam8"},{id:"WC 3112",cat:"lam8"},{id:"WC 3121",cat:"lam8"},{id:"WC 3122",cat:"lam8"},{id:"WC 3619",cat:"lam8"},
  {id:"ZP 1102",cat:"lam8"},{id:"ZP 1151",cat:"lam8"},{id:"ZP 3111",cat:"lam8"},{id:"ZP 4115",cat:"lam8"},
  // ── MICA .92mm ──
  {id:"CK 8112",cat:"mica92"},{id:"CK 8125",cat:"mica92"},{id:"CK 8165",cat:"mica92"},{id:"CK 8166",cat:"mica92"},{id:"CK 8235",cat:"mica92"},{id:"CK 8236",cat:"mica92"},
  {id:"CT 8151",cat:"mica92"},{id:"CT 8152",cat:"mica92"},{id:"CT 8155",cat:"mica92"},{id:"CT 8156",cat:"mica92"},{id:"CT 8361",cat:"mica92"},{id:"CT 8362",cat:"mica92"},
  {id:"FL1 8372",cat:"mica92"},{id:"FL1 8931",cat:"mica92"},{id:"FL1 8932",cat:"mica92"},{id:"FL1 8933",cat:"mica92"},
  {id:"FL2 81120",cat:"mica92"},{id:"FL2 81137",cat:"mica92"},{id:"FL2 81188",cat:"mica92"},{id:"FL2 81190",cat:"mica92"},{id:"FL2 8785",cat:"mica92"},{id:"FL2 8786",cat:"mica92"},{id:"FL2 8787",cat:"mica92"},{id:"FL2 8788",cat:"mica92"},
  {id:"HG 81101",cat:"mica92"},{id:"HG 81102",cat:"mica92"},{id:"HG 81111",cat:"mica92"},{id:"HG 81112",cat:"mica92"},{id:"HG 81113",cat:"mica92"},{id:"HG 81116",cat:"mica92"},{id:"HG 81137",cat:"mica92"},{id:"HG 81147",cat:"mica92"},{id:"HG 81149",cat:"mica92"},{id:"HG 81150",cat:"mica92"},
  {id:"HG 8115",cat:"mica92"},{id:"HG 8116",cat:"mica92"},{id:"HG 81185",cat:"mica92"},{id:"HG 8135",cat:"mica92"},{id:"HG 81406",cat:"mica92"},{id:"HG 8151",cat:"mica92"},{id:"HG 8152",cat:"mica92"},{id:"HG 8184",cat:"mica92"},{id:"HG 8187",cat:"mica92"},{id:"HG 8190",cat:"mica92"},{id:"HG 8235",cat:"mica92"},{id:"HG 8236",cat:"mica92"},{id:"HG 8241",cat:"mica92"},{id:"HG 8246",cat:"mica92"},{id:"HG 8721",cat:"mica92"},{id:"HG 8785",cat:"mica92"},{id:"HG 8786",cat:"mica92"},{id:"HG 8787",cat:"mica92"},{id:"HG 8788",cat:"mica92"},{id:"HG 8915",cat:"mica92"},{id:"HG 8916",cat:"mica92"},
  {id:"NV 8115",cat:"mica92"},{id:"NV 8116",cat:"mica92"},{id:"NV 8125",cat:"mica92"},{id:"NV 8171",cat:"mica92"},{id:"NV 8173",cat:"mica92"},{id:"NV 8174",cat:"mica92"},{id:"NV 8175",cat:"mica92"},{id:"NV 8178",cat:"mica92"},{id:"NV 8181",cat:"mica92"},{id:"NV 8183",cat:"mica92"},{id:"NV 8245",cat:"mica92"},{id:"NV 8246",cat:"mica92"},{id:"NV 8384",cat:"mica92"},
  {id:"SA 8111",cat:"mica92"},{id:"SA 8112",cat:"mica92"},{id:"SA 8113",cat:"mica92"},{id:"SA 8115",cat:"mica92"},{id:"SA 8116",cat:"mica92"},{id:"SA 8121",cat:"mica92"},{id:"SA 8122",cat:"mica92"},{id:"SA 8125",cat:"mica92"},{id:"SA 8135",cat:"mica92"},{id:"SA 8161",cat:"mica92"},{id:"SA 8165",cat:"mica92"},{id:"SA 8166",cat:"mica92"},{id:"SA 8171",cat:"mica92"},{id:"SA 8172",cat:"mica92"},{id:"SA 8175",cat:"mica92"},{id:"SA 8176",cat:"mica92"},{id:"SA 8177",cat:"mica92"},{id:"SA 8178",cat:"mica92"},{id:"SA 8179",cat:"mica92"},{id:"SA 8181",cat:"mica92"},{id:"SA 8182",cat:"mica92"},{id:"SA 8188",cat:"mica92"},{id:"SA 8190",cat:"mica92"},{id:"SA 8231",cat:"mica92"},{id:"SA 8235",cat:"mica92"},{id:"SA 8236",cat:"mica92"},{id:"SA 8241",cat:"mica92"},{id:"SA 8242",cat:"mica92"},{id:"SA 8246",cat:"mica92"},{id:"SA 8247",cat:"mica92"},{id:"SA 8251",cat:"mica92"},{id:"SA 8252",cat:"mica92"},{id:"SA 8255",cat:"mica92"},{id:"SA 8261",cat:"mica92"},{id:"SA 8265",cat:"mica92"},{id:"SA 8271",cat:"mica92"},{id:"SA 8735",cat:"mica92"},{id:"SA 8741",cat:"mica92"},{id:"SA 8742",cat:"mica92"},
  {id:"SAP 8112",cat:"mica92"},{id:"SAP 8113",cat:"mica92"},{id:"SAP 8125",cat:"mica92"},{id:"SAP 8235",cat:"mica92"},{id:"SAP 8241",cat:"mica92"},{id:"SAP 8265",cat:"mica92"},{id:"SAP 8731",cat:"mica92"},
  {id:"SM 81101",cat:"mica92"},{id:"SM 81102",cat:"mica92"},{id:"SM 81112",cat:"mica92"},{id:"SM 81113",cat:"mica92"},{id:"SM 81114",cat:"mica92"},{id:"SM 81116",cat:"mica92"},{id:"SM 81128",cat:"mica92"},{id:"SM 81129",cat:"mica92"},{id:"SM 81136",cat:"mica92"},{id:"SM 81137",cat:"mica92"},{id:"SM 81147",cat:"mica92"},{id:"SM 81148",cat:"mica92"},{id:"SM 81149",cat:"mica92"},{id:"SM 81150",cat:"mica92"},{id:"SM 81151",cat:"mica92"},{id:"SM 81181",cat:"mica92"},{id:"SM 81182",cat:"mica92"},{id:"SM 81184",cat:"mica92"},{id:"SM 81185",cat:"mica92"},{id:"SM 81188",cat:"mica92"},{id:"SM 81190",cat:"mica92"},{id:"SM 81191",cat:"mica92"},{id:"SM 81193",cat:"mica92"},{id:"SM 81195",cat:"mica92"},{id:"SM 81406",cat:"mica92"},
  {id:"SM 8405",cat:"mica92"},{id:"SM 8406",cat:"mica92"},{id:"SM 8721",cat:"mica92"},{id:"SM 8915",cat:"mica92"},{id:"SM 8916",cat:"mica92"},{id:"SM 8931",cat:"mica92"},{id:"SM 8932",cat:"mica92"},{id:"SM 8933",cat:"mica92"},
  // ── Liner .72mm ──
  {id:"HG 101",cat:"lin72"},{id:"HG 102",cat:"lin72"},{id:"HG 109",cat:"lin72"},{id:"HG 112",cat:"lin72"},{id:"HG 1151",cat:"lin72"},
  {id:"MF 101",cat:"lin72"},{id:"MF 102",cat:"lin72"},{id:"MF 104",cat:"lin72"},{id:"MF 106",cat:"lin72"},{id:"MF 107",cat:"lin72"},{id:"MF 108",cat:"lin72"},{id:"MF 110",cat:"lin72"},{id:"MF 111",cat:"lin72"},{id:"MF 112",cat:"lin72"},{id:"MF 115",cat:"lin72"},{id:"MF 116",cat:"lin72"},{id:"MF 118",cat:"lin72"},{id:"MF 119",cat:"lin72"},{id:"MF 120",cat:"lin72"},{id:"MF 123",cat:"lin72"},{id:"MF 124",cat:"lin72"},{id:"MF 125",cat:"lin72"},{id:"MF 126",cat:"lin72"},{id:"MF 127",cat:"lin72"},{id:"MF 128",cat:"lin72"},{id:"MF 129",cat:"lin72"},{id:"MF 130",cat:"lin72"},{id:"MF 131",cat:"lin72"},{id:"MF 134",cat:"lin72"},{id:"MF 136",cat:"lin72"},{id:"MF 172",cat:"lin72"},{id:"MF 175",cat:"lin72"},
  {id:"MF F17",cat:"lin72"},{id:"MF F18",cat:"lin72"},{id:"MF F22",cat:"lin72"},{id:"MF F24",cat:"lin72"},{id:"MF F31",cat:"lin72"},{id:"MF F32",cat:"lin72"},{id:"MF F34",cat:"lin72"},{id:"MF F35",cat:"lin72"},{id:"MF F37",cat:"lin72"},{id:"MF F38",cat:"lin72"},{id:"MF F62",cat:"lin72"},{id:"MF F63",cat:"lin72"},{id:"MF F64",cat:"lin72"},{id:"MF F91",cat:"lin72"},
  {id:"SF 102",cat:"lin72"},{id:"SF 106",cat:"lin72"},{id:"SF 125",cat:"lin72"},{id:"SF 129",cat:"lin72"},{id:"SF 130",cat:"lin72"},
  {id:"SF F22",cat:"lin72"},{id:"SF F32",cat:"lin72"},{id:"SF F62",cat:"lin72"},{id:"SF F64",cat:"lin72"},{id:"SF F91",cat:"lin72"},
  // ── Liner .92mm ──
  {id:"MFF 101",cat:"lin92"},{id:"MFF 102",cat:"lin92"},{id:"MFF 103",cat:"lin92"},{id:"MFF 104",cat:"lin92"},{id:"MFF 106",cat:"lin92"},{id:"MFF 107",cat:"lin92"},{id:"MFF 108",cat:"lin92"},{id:"MFF 110",cat:"lin92"},{id:"MFF 111",cat:"lin92"},{id:"MFF 112",cat:"lin92"},{id:"MFF 115",cat:"lin92"},{id:"MFF 1151",cat:"lin92"},{id:"MFF 116",cat:"lin92"},{id:"MFF 118",cat:"lin92"},{id:"MFF 119",cat:"lin92"},{id:"MFF 120",cat:"lin92"},{id:"MFF 123",cat:"lin92"},{id:"MFF 125",cat:"lin92"},{id:"MFF 126",cat:"lin92"},{id:"MFF 128",cat:"lin92"},{id:"MFF 129",cat:"lin92"},{id:"MFF 130",cat:"lin92"},{id:"MFF 131",cat:"lin92"},{id:"MFF 134",cat:"lin92"},{id:"MFF 136",cat:"lin92"},{id:"MFF 172",cat:"lin92"},{id:"MFF 175",cat:"lin92"},
  {id:"MFF F15",cat:"lin92"},{id:"MFF F18",cat:"lin92"},{id:"MFF F22",cat:"lin92"},{id:"MFF F24",cat:"lin92"},{id:"MFF F31",cat:"lin92"},{id:"MFF F32",cat:"lin92"},{id:"MFF F34",cat:"lin92"},{id:"MFF F37",cat:"lin92"},{id:"MFF F62",cat:"lin92"},{id:"MFF F63",cat:"lin92"},{id:"MFF F64",cat:"lin92"},{id:"MFF F71",cat:"lin92"},{id:"MFF F72",cat:"lin92"},{id:"MFF F91",cat:"lin92"},
  {id:"HG 101",cat:"lin92"},{id:"HG 102",cat:"lin92"},{id:"HGG 101",cat:"lin92"},{id:"HGG 1151",cat:"lin92"},
  {id:"IM 501",cat:"lin92"},{id:"SF 1111",cat:"lin92"},
  // ── PVC Liner ──
  {id:"101 PVC",cat:"pvc"},{id:"102 PVC",cat:"pvc"},{id:"PVC IM 102",cat:"pvc"},
  // ── Louvers ──
  {id:"1531",cat:"louver"},{id:"7030",cat:"louver"},
  // ── Acrylic ──
  {id:"MN 2851",cat:"acrylic"},{id:"MN 2852",cat:"acrylic"},{id:"MN 2853",cat:"acrylic"},{id:"MN 2854",cat:"acrylic"},{id:"MN 2857",cat:"acrylic"},{id:"MN 2858",cat:"acrylic"},{id:"MN 2859",cat:"acrylic"},{id:"MN 2860",cat:"acrylic"},{id:"MN 2867",cat:"acrylic"},{id:"MN 2869",cat:"acrylic"},{id:"MN 2951",cat:"acrylic"},{id:"MN 2957",cat:"acrylic"},
  // ── Adhesive ──
  {id:"Kori Bond 1Kg",cat:"adhesive"},{id:"Kori Bond 4.5kg",cat:"adhesive"},{id:"Abro Tape Roll",cat:"adhesive"},{id:"ASA Glu",cat:"adhesive"},{id:"Glu 01 Kg",cat:"adhesive"},
  // ── 1mm Blink/Makers ──
  {id:"FL1 G50",cat:"blink"},{id:"FL1 G55",cat:"blink"},{id:"FL1 G56",cat:"blink"},{id:"FL1 G57",cat:"blink"},{id:"FL1 G58",cat:"blink"},{id:"FL1 G59",cat:"blink"},{id:"FL1 G62",cat:"blink"},{id:"FL1 G65",cat:"blink"},{id:"FL1 G66",cat:"blink"},{id:"FL1 G68",cat:"blink"},
  {id:"G 50",cat:"blink"},{id:"G 51",cat:"blink"},{id:"G 52",cat:"blink"},{id:"G 54",cat:"blink"},{id:"G 55",cat:"blink"},{id:"G 57",cat:"blink"},{id:"G 58",cat:"blink"},{id:"G 59",cat:"blink"},{id:"G 62",cat:"blink"},{id:"G 63",cat:"blink"},{id:"G 64",cat:"blink"},{id:"G 65",cat:"blink"},{id:"G 66",cat:"blink"},{id:"G 67",cat:"blink"},{id:"G 68",cat:"blink"},{id:"G 69",cat:"blink"},{id:"G 70",cat:"blink"},{id:"G 71",cat:"blink"},
  // ── Door Skin ──
  {id:"C 501",cat:"door"},{id:"C 502",cat:"door"},{id:"C 503",cat:"door"},{id:"C 504",cat:"door"},{id:"C 505",cat:"door"},{id:"C 506",cat:"door"},{id:"C 507",cat:"door"},{id:"C 508",cat:"door"},{id:"C 509",cat:"door"},{id:"C 510",cat:"door"},{id:"C 511",cat:"door"},{id:"C 512",cat:"door"},{id:"C 513",cat:"door"},{id:"C 514",cat:"door"},{id:"C 515",cat:"door"},{id:"C 516",cat:"door"},{id:"C 517",cat:"door"},{id:"C 520",cat:"door"},{id:"C 521",cat:"door"},{id:"C 522",cat:"door"},{id:"C 523",cat:"door"},{id:"C 527",cat:"door"},{id:"C 528",cat:"door"},{id:"C 529",cat:"door"},{id:"C 530",cat:"door"},{id:"C 531",cat:"door"},{id:"C 532",cat:"door"},
  {id:"D 201",cat:"door"},{id:"D 202",cat:"door"},{id:"D 203",cat:"door"},{id:"D 204",cat:"door"},{id:"D 205",cat:"door"},{id:"D 206",cat:"door"},{id:"D 208",cat:"door"},{id:"D 210",cat:"door"},{id:"D 211",cat:"door"},{id:"D 212",cat:"door"},{id:"D 213",cat:"door"},{id:"D 214",cat:"door"},{id:"D 215",cat:"door"},{id:"D 216",cat:"door"},{id:"D 217",cat:"door"},{id:"D 218",cat:"door"},{id:"D 219",cat:"door"},{id:"D 220",cat:"door"},{id:"D 221",cat:"door"},{id:"D 222",cat:"door"},{id:"D 223",cat:"door"},{id:"D 224",cat:"door"},
  {id:"E 403",cat:"door"},{id:"E 406",cat:"door"},{id:"E 407",cat:"door"},{id:"E 410",cat:"door"},{id:"E 411",cat:"door"},{id:"E 412",cat:"door"},{id:"E 413",cat:"door"},{id:"E 414",cat:"door"},{id:"E 415",cat:"door"},{id:"E 416",cat:"door"},{id:"E 423",cat:"door"},{id:"E 424",cat:"door"},{id:"E 425",cat:"door"},{id:"E 427",cat:"door"},{id:"E 430",cat:"door"},{id:"E 432",cat:"door"},{id:"E 434",cat:"door"},{id:"E 435",cat:"door"},{id:"E 436",cat:"door"},{id:"E 437",cat:"door"},{id:"E 438",cat:"door"},{id:"E 439",cat:"door"},{id:"E 440",cat:"door"},{id:"E 441",cat:"door"},{id:"E 442",cat:"door"},{id:"E 443",cat:"door"},{id:"E 444",cat:"door"},{id:"E 445",cat:"door"},{id:"E 446",cat:"door"},
  {id:"F 6106",cat:"door"},{id:"F 6108",cat:"door"},{id:"F 6112",cat:"door"},{id:"F 6131",cat:"door"},
  {id:"P 406",cat:"door"},{id:"P 410",cat:"door"},{id:"P 412",cat:"door"},
  {id:"V 251",cat:"door"},{id:"V 252",cat:"door"},{id:"V 253",cat:"door"},{id:"V 254",cat:"door"},{id:"V 255",cat:"door"},{id:"V 256",cat:"door"},{id:"V 257",cat:"door"},{id:"V 258",cat:"door"},{id:"V 259",cat:"door"},{id:"V 260",cat:"door"},{id:"V 261",cat:"door"},{id:"V 262",cat:"door"},{id:"V 264",cat:"door"},{id:"V 265",cat:"door"},{id:"V 266",cat:"door"},{id:"V 267",cat:"door"},{id:"V 268",cat:"door"},{id:"V 269",cat:"door"},{id:"V 270",cat:"door"},{id:"V 271",cat:"door"},
];

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
  if (!found) return found?.rate ?? 1;
  return found.rate ?? 1;
};

// ─── FUZZY SKU MATCHER ────────────────────────────────────────
const normalize = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const similarity = (a, b) => {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  // Levenshtein distance simplified
  let matches = 0;
  const shorter = na.length < nb.length ? na : nb;
  const longer  = na.length < nb.length ? nb : na;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
};
const fuzzyMatchSku = (raw, skuList) => {
  const clean = raw.toUpperCase().trim();
  let best = null, bestScore = 0;
  for (const sku of skuList) {
    const score = similarity(clean, sku.id);
    if (score > bestScore) { bestScore = score; best = sku.id; }
  }
  return bestScore >= 0.7 ? { matched: best, confidence: Math.round(bestScore * 100) } : { matched: raw, confidence: 45 };
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

function OrderCard({order,onOpen,onDelete,dim=false}){
  const {done,total,pct}=progData(order);
  const ready=isReady(order),billed=order.status==="billed";
  const names=order.sections.map(s=>s.name).join(", ");
  const idBg=billed?C.grayBg:ready?C.greenBg:C.amberBg,idC=billed?C.gray:ready?C.green:C.amber,idBd=billed?C.border:ready?C.greenBd:C.amberBd;
  return <div style={{background:C.card,border:`1px solid ${ready&&!billed?C.greenBd:C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10,opacity:dim?0.65:1,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
    <div onClick={()=>onOpen(order.id)} style={{cursor:"pointer"}}>
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
    {onDelete && (
      <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
        <Btn onClick={()=>{if(window.confirm(`Delete order ${order.id}?`))onDelete(order.id);}} color="danger" sx={{padding:"6px 12px",fontSize:11}}>🗑 Delete Order</Btn>
      </div>
    )}
  </div>;
}

// ─── CHOOSE SCREEN (no PIN) ───────────────────────────────────
function ChooseScreen({onStaff,onAdmin}){
  return <div style={{minHeight:620,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32}}>
    <div style={{marginBottom:6}}><span style={{fontFamily:C.mono,fontWeight:700,fontSize:22,color:C.amber,letterSpacing:1}}>ORDER</span><span style={{fontFamily:C.mono,fontWeight:700,fontSize:22,color:C.gray,letterSpacing:1}}>FLOW</span></div>
    <div style={{fontSize:13,color:C.textDim,marginBottom:40}}>Order management · Error prevention</div>
    <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:12}}>
      <button onClick={onStaff} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
        <span style={{fontSize:28,flexShrink:0}}>👷</span>
        <div><div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:2}}>Staff</div><div style={{fontSize:12,color:C.textDim}}>Assemble and fulfil orders</div></div>
      </button>
      <button onClick={onAdmin} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.amberBd}`,background:C.amberBg,cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left"}}>
        <span style={{fontSize:28,flexShrink:0}}>🔐</span>
        <div><div style={{fontWeight:700,fontSize:15,color:C.amber,marginBottom:2}}>Admin</div><div style={{fontSize:12,color:"#92610A"}}>Manage users, orders and SKUs</div></div>
      </button>
    </div>
  </div>;
}

// ─── STAFF SELECT (no PIN) ────────────────────────────────────
function StaffSelect({users,onSelect,onBack}){
  const active=users.filter(u=>u.active);
  return <div style={{minHeight:620,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,position:"relative"}}>
    <button onClick={onBack} style={{position:"absolute",top:16,left:16,background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:20,padding:4}}>←</button>
    <div style={{fontSize:13,fontWeight:600,color:C.textDim,marginBottom:20,letterSpacing:"0.5px"}}>WHO ARE YOU?</div>
    <div style={{width:"100%",maxWidth:320,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {active.map(u=><button key={u.id} onClick={()=>onSelect(u.id)} style={{padding:14,borderRadius:10,cursor:"pointer",background:"#fff",border:`1px solid ${C.borderMd}`,color:C.text,fontWeight:600,fontSize:15,fontFamily:C.sans}}>{u.name}</button>)}
    </div>
  </div>;
}

// ─── STAFF HOME ───────────────────────────────────────────────
function StaffHome({orders,staffName,onNewOrder,onOpenOrder,onSignOut}){
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
          <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{live.length} active · <span style={{color:C.text,fontWeight:600}}>{staffName}</span></div>
        </div>
        <button onClick={onSignOut} style={{background:"#fff",border:`1px solid ${C.borderMd}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:C.sans}}>Sign out</button>
      </div>
      <div style={{display:"flex",gap:4,background:C.bg,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
        <button onClick={()=>setTab("live")} style={tabSt(tab==="live")}>
          Live Orders{live.length>0&&<span style={{background:C.amber,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700,fontFamily:C.mono,marginLeft:4}}>{live.length}</span>}
        </button>
        <button onClick={()=>setTab("history")} style={tabSt(tab==="history")}>History</button>
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"14px 20px 40px"}}>
      {tab==="live"&&<>
        <Btn onClick={onNewOrder} color="amber" sx={{width:"100%",padding:13,borderRadius:10,fontSize:14,marginBottom:20,boxShadow:"0 2px 8px rgba(217,119,6,0.2)"}}>+ New Order</Btn>
        {inProg.length>0&&<><GrpLabel label="In Progress" color={C.amber}/>{inProg.map(o=><OrderCard key={o.id} order={o} onOpen={onOpenOrder}/>)}</>}
        {ready.length>0&&<><GrpLabel label="Ready for Billing" color={C.green}/>{ready.map(o=><OrderCard key={o.id} order={o} onOpen={onOpenOrder}/>)}</>}
        {live.length===0&&<div style={{textAlign:"center",color:C.textFaint,padding:"60px 0",fontSize:13}}>No orders yet today.</div>}
      </>}
      {tab==="history"&&<>
        {dates.length===0&&<div style={{textAlign:"center",color:C.textFaint,padding:"60px 0",fontSize:13}}>No past orders.</div>}
        {dates.map(d=><div key={d} style={{marginBottom:20}}><GrpLabel label={fmtDate(d)} color={C.textDim}/>{grouped[d].map(o=><OrderCard key={o.id} order={o} onOpen={onOpenOrder} dim/>)}</div>)}
      </>}
    </div>
  </div>;
}

// ─── GOOGLE VISION ────────────────────────────────────────────
const VISION_API_KEY="AIzaSyDzWLmWrdFDCQyEEyK85U7asCtv2nScywU";
async function extractOrderFromImage(base64Image,skuList){
  const res=await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requests:[{image:{content:base64Image},features:[{type:"DOCUMENT_TEXT_DETECTION",maxResults:1}]}]})});
  const data=await res.json();
  const rawText=data.responses?.[0]?.fullTextAnnotation?.text||"";
  return parseOrderText(rawText,skuList);
}
function parseOrderText(text,skuList){
  const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
  const stripNoise=line=>line.replace(/^[✓✗✘/\\•*~]+\s*/,"").trim();
  // SKU signal: line ends with "- N" (1-3 digits after a dash).
  // Prefix must have ≥2 chars and not be purely numeric (avoids matching dates).
  const isSkuLike=line=>{
    const l=line.trim();
    if(l.length<4)return false;
    if(!/[-–]\s*\d{1,3}\s*$/.test(l))return false;
    const prefix=l.replace(/\s*[-–]\s*\d{1,3}\s*$/,"").trim();
    return prefix.length>=2&&!/^\d+$/.test(prefix);
  };
  const extractQty=line=>{const m=line.match(/[-–]\s*(\d{1,3})\s*$/);return m?parseInt(m[1]):1;};
  const extractCode=line=>line.replace(/\s*[-–]\s*\d{1,3}\s*$/,"").trim().toUpperCase();
  const isSectionHeader=line=>{
    if(line.length<2||/^\d+$/.test(line))return false;
    if(isSkuLike(line))return false;
    if(/[\u0900-\u097F]/.test(line))return true; // Hindi/Devanagari = customer name
    if(/^[A-Z][A-Z\s.&]{3,}$/i.test(line))return true;
    return false;
  };
  const sections=[];let currentSection=null;const notesRaw=[];
  for(const rawLine of lines){
    const line=stripNoise(rawLine);
    if(!line||line.length<2)continue;
    if(isSkuLike(line)){
      if(!currentSection){currentSection={name:"General",items:[]};sections.push(currentSection);}
      const rawCode=extractCode(line);
      const qty=extractQty(line);
      const {matched,confidence}=skuList.length>0?fuzzyMatchSku(rawCode,skuList):{matched:rawCode.toUpperCase(),confidence:70};
      currentSection.items.push({sku:matched,qty,confidence,skipped:false,confirmed:confidence>=70});
    } else if(isSectionHeader(line)){
      currentSection={name:line,items:[]};sections.push(currentSection);
    } else {
      // Anything else — likely a note, phone number, instruction, date
      // Skip very short fragments and pure numbers
      if(line.length>4&&!/^\d{1,4}$/.test(line))notesRaw.push(line);
    }
  }
  const filtered=sections.filter(s=>s.items.length>0);
  if(filtered.length===0)return{sections:[{name:"Unrecognised",items:[]}],parseError:true};
  return{sections:filtered,notes:notesRaw.join(" · "),parseError:false};
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

// ─── REVIEW ITEM ROW ──────────────────────────────────────────
function ReviewItemRow({item,sIdx,iIdx,onChange,onSkip,skuList=[]}){
  const [editSku,setEditSku]=useState(!item.confirmed);
  const [skuVal,setSkuVal]=useState(item.sku);
  const [editQty,setEditQty]=useState(false);
  const [qtyVal,setQtyVal]=useState(String(item.qty));
  const isLow=!item.confirmed&&item.confidence<70;
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
          <button onClick={()=>{setSkuVal(item.sku);setEditSku(true);}} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:11}}>Edit</button>
        </>}
      </>}
    </div>
    {!item.skipped&&<div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:12,color:C.textDim}}>Qty:</span>
      {editQty?<div style={{display:"flex",gap:6}}>
        <input type="number" value={qtyVal} onChange={e=>setQtyVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveQty()} autoFocus style={{width:60,padding:"4px 8px",borderRadius:7,border:`1px solid ${C.amber}`,fontFamily:C.mono,fontSize:14,color:C.amber,fontWeight:700,background:"#fff",outline:"none",textAlign:"center"}}/>
        <button onClick={saveQty} style={{padding:"4px 10px",borderRadius:7,border:"none",background:C.green,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>✓</button>
        <button onClick={()=>setEditQty(false)} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:13}}>✕</button>
      </div>:<>
        <span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.amber}}>×{item.qty}</span>
        <button onClick={()=>{setQtyVal(String(item.qty));setEditQty(true);}} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",color:C.textDim,cursor:"pointer",fontSize:11}}>Edit Qty</button>
      </>}
      <div style={{flex:1}}/>
      <button onClick={onSkip} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${C.redBd}`,background:C.redBg,color:C.red,cursor:"pointer",fontSize:11}}>Remove</button>
    </div>}
    {isLow&&!item.skipped&&<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.amberBd}`}}>
      <div style={{fontSize:11,color:C.amber,marginBottom:8}}>⚠ AI uncertain — verify SKU and qty, then tap Edit to confirm.</div>
    </div>}
  </div>;
}

// ─── IMAGE CROP ───────────────────────────────────────────────
function CropScreen({imgSrc,onCrop,onRetake}){
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
      <button onClick={onRetake} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:13,fontFamily:"sans-serif"}}>↩ Retake</button>
      <span style={{color:"#D97706",fontWeight:700,fontSize:13,fontFamily:"monospace"}}>CROP ORDER SLIP</span>
      <button onClick={confirmCrop} style={{background:"#D97706",border:"none",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,padding:"6px 14px",borderRadius:8,fontFamily:"sans-serif"}}>Analyse →</button>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{fontSize:12,color:"#aaa",marginBottom:12,textAlign:"center"}}>Drag corners to frame the order slip tightly</div>
      <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h}
        style={{borderRadius:8,touchAction:"none",maxWidth:"100%"}}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}/>
    </div>
  </div>;
}

// ─── SCAN SCREEN ──────────────────────────────────────────────
function ScanScreen({actorName,onBack,onConfirm,skuList,catList}){
  const [stage,setStage]=useState("choose"); // choose|crop|analysing|reviewing|manual
  const [rawImgSrc,setRawImgSrc]=useState(null);
  const [imgSrc,setImgSrc]=useState(null);
  const [imgB64,setImgB64]=useState(null);
  const [ext,setExt]=useState(null);
  const [error,setError]=useState(null);
  // Manual entry state
  const [manualLines,setManualLines]=useState([{cat:"",sku:"",qty:1}]);
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
  const handleCrop=(b64,previewSrc)=>{setImgB64(b64);setImgSrc(previewSrc);analyse(b64);};
  const analyse=async(b64)=>{
    setStage("analysing");setError(null);
    try{
      const result=await extractOrderFromImage(b64,skuList);
      if(result.parseError||result.sections.every(s=>s.items.length===0)){
        setError("Couldn't extract SKUs. Adjust the crop more tightly and try again.");
        setStage("analyseError"); // Don't go back to crop — preserve the crop state
        return;
      }
      setExt(result);setStage("reviewing");
    }catch(err){setError("Failed to read image. Check connection.");setStage("analyseError");}
  };
  const updateItem=(sIdx,iIdx,field,value)=>setExt(prev=>{const n=cl(prev);n.sections[sIdx].items[iIdx][field]=value;return n;});
  if(stage==="crop"&&rawImgSrc)return <CropScreen key="crop" imgSrc={rawImgSrc} onCrop={handleCrop} onRetake={()=>{setRawImgSrc(null);setStage("choose");setError(null);}}/>;
  const skipItem=(sIdx,iIdx)=>updateItem(sIdx,iIdx,"skipped",true);
  const lowConfPending=ext?ext.sections.flatMap(s=>s.items.filter(i=>!i.skipped&&i.confidence<70&&!i.confirmed)):[];
  const canConfirm=lowConfPending.length===0;
  const confirm=()=>{
    const order={id:genId(),date:TODAY,scannedAt:nowTime(),status:"live",notes:ext.notes||"",sections:ext.sections.map(sec=>({name:sec.name,items:sec.items.filter(i=>!i.skipped).map(i=>({id:Date.now()+Math.random(),sku:i.sku,origQty:i.qty,qty:i.qty,status:"pending",note:"",handledBy:null,confidence:i.confidence}))})).filter(s=>s.items.length>0)};
    onConfirm(order);
  };
  const totalItems=ext?ext.sections.reduce((s,sec)=>s+sec.items.filter(i=>!i.skipped).length,0):0;
  return <div style={{minHeight:620,display:"flex",flexDirection:"column",background:C.bg}}>
    <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
    <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,background:"#fff",display:"flex",alignItems:"center",gap:12}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>←</button>
      <span style={{fontFamily:C.mono,fontWeight:700,fontSize:13,color:C.text,letterSpacing:"0.5px"}}>NEW ORDER</span>
      <div style={{flex:1}}/>
      <span style={{fontFamily:C.mono,fontSize:11,color:C.textDim,background:C.grayBg,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px"}}>{actorName}</span>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"20px 20px 40px"}}>
      {stage==="choose"&&<>
        <div style={{fontSize:13,color:C.textDim,textAlign:"center",marginBottom:16}}>How would you like to add the order?</div>
        <button onClick={triggerCamera} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.amberBd}`,background:C.amberBg,cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left",marginBottom:12}}>
          <span style={{fontSize:30,flexShrink:0}}>📷</span>
          <div><div style={{fontWeight:700,fontSize:15,color:C.amber,marginBottom:2}}>Take a Photo</div><div style={{fontSize:12,color:C.textDim}}>Open camera to photograph order slip</div></div>
        </button>
        <button onClick={triggerUpload} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",marginBottom:12}}>
          <span style={{fontSize:30,flexShrink:0}}>🖼️</span>
          <div><div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:2}}>Upload from Gallery</div><div style={{fontSize:12,color:C.textDim}}>Choose an existing photo</div></div>
        </button>
        <button onClick={()=>{setManualLines([{cat:"",sku:"",qty:1}]);setManualSection("");setStage("manual");}} style={{width:"100%",padding:20,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",gap:16,textAlign:"left",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
          <span style={{fontSize:30,flexShrink:0}}>✏️</span>
          <div><div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:2}}>Enter Manually</div><div style={{fontSize:12,color:C.textDim}}>Type SKU codes and quantities directly</div></div>
        </button>
      </>}
      {stage==="manual"&&<>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:5}}>CUSTOMER / SECTION NAME</div>
          <input value={manualSection} onChange={e=>setManualSection(e.target.value)} placeholder="e.g. Mahavir Traders"
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginBottom:10}}>ITEMS</div>
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
            {/* Qty */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12,color:C.textDim,flexShrink:0}}>Qty:</span>
              <button onClick={()=>{const n=[...manualLines];n[idx].qty=Math.max(1,n[idx].qty-1);setManualLines(n);}} style={{width:32,height:32,borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:C.textDim}}>−</button>
              <input type="number" value={line.qty} min={1} onChange={e=>{const n=[...manualLines];n[idx].qty=parseInt(e.target.value)||1;setManualLines(n);}}
                style={{width:60,padding:"4px 0",borderRadius:7,border:`1px solid ${C.amberBd}`,fontFamily:C.mono,fontWeight:700,fontSize:18,textAlign:"center",color:C.amber,background:"#fff",outline:"none"}}/>
              <button onClick={()=>{const n=[...manualLines];n[idx].qty++;setManualLines(n);}} style={{width:32,height:32,borderRadius:6,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:C.textDim}}>+</button>
            </div>
          </div>;
        })}
        <Btn onClick={()=>setManualLines([...manualLines,{cat:"",sku:"",qty:1}])} color="ghost" sx={{width:"100%",padding:10,marginBottom:16}}>+ Add Another SKU</Btn>
        {(()=>{
          const validLines=manualLines.filter(l=>l.sku&&l.sku.trim());
          const canSubmit=validLines.length>0;
          return <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Btn onClick={()=>{
              if(!canSubmit)return;
              const order={id:genId(),date:TODAY,scannedAt:nowTime(),status:"live",notes:"",sections:[{
                name:manualSection.trim()||"Manual Entry",
                items:validLines.map(l=>({id:Date.now()+Math.random(),sku:l.sku.trim().toUpperCase(),origQty:l.qty,qty:l.qty,status:"pending",note:"",handledBy:null,confidence:100,custom:l.custom||false}))
              }]};
              onConfirm(order);
            }} color={canSubmit?"green":"ghost"} sx={{width:"100%",padding:13,fontSize:14,opacity:canSubmit?1:0.5,cursor:canSubmit?"pointer":"not-allowed"}}>
              {canSubmit?`✓ Create Order (${validLines.length} item${validLines.length>1?"s":""})`:"Type at least one SKU"}
            </Btn>
            <Btn onClick={()=>setStage("choose")} color="ghost" sx={{width:"100%",padding:11}}>↩ Back</Btn>
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
          <div style={{fontSize:22,marginBottom:8}}>🔍</div>
          <div style={{fontWeight:700,color:C.amber,fontSize:14,marginBottom:4}}>Reading handwriting…</div>
          <div style={{fontSize:12,color:C.textDim}}>Google Vision is extracting text</div>
        </div>
      </>}
      {stage==="analyseError"&&<>
        {imgSrc&&<img src={imgSrc} alt="slip" style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`,display:"block",marginBottom:12}}/>}
        <div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontWeight:700,color:C.red,fontSize:13,marginBottom:4}}>⚠ Extraction failed</div>
          <div style={{fontSize:12,color:C.red,opacity:0.85}}>{error}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <Btn onClick={()=>{setStage("crop");setError(null);}} color="amber" sx={{width:"100%",padding:12,fontSize:14}}>✂ Adjust Crop & Retry</Btn>
          <Btn onClick={()=>{setRawImgSrc(null);setImgSrc(null);setImgB64(null);setError(null);setStage("choose");}} color="ghost" sx={{width:"100%",padding:11}}>↩ Retake Photo</Btn>
        </div>
      </>}
      {stage==="reviewing"&&ext&&<>
        {imgSrc&&<img src={imgSrc} alt="slip" style={{width:"100%",borderRadius:10,border:`1px solid ${C.border}`,display:"block",maxHeight:160,objectFit:"cover",marginBottom:14}}/>}
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,fontSize:13,color:C.text,fontWeight:600}}>{totalItems} item{totalItems!==1?"s":""} extracted</div>
          {lowConfPending.length>0?<span style={{fontFamily:C.mono,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,background:C.amberBg,color:C.amber,border:`1px solid ${C.amberBd}`}}>{lowConfPending.length} need review</span>:<span style={{fontFamily:C.mono,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,background:C.greenBg,color:C.green,border:`1px solid ${C.greenBd}`}}>All verified ✓</span>}
        </div>
        {ext.notes&&<div style={{background:C.blueBg,border:`1px solid ${C.blueBd}`,borderRadius:10,padding:"10px 14px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.blue,letterSpacing:"0.8px",marginBottom:4}}>NOTES CAPTURED FROM SLIP</div>
          <div style={{fontSize:12,color:C.text}}>{ext.notes}</div>
        </div>}
        {ext.sections.map((sec,sIdx)=><div key={sIdx} style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.8px",color:C.textDim,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><span style={{color:C.amber}}>§</span>{sec.name.toUpperCase()}</div>
          {sec.items.map((item,iIdx)=><ReviewItemRow key={iIdx} item={item} sIdx={sIdx} iIdx={iIdx} onChange={updateItem} onSkip={()=>skipItem(sIdx,iIdx)} skuList={skuList}/>)}
        </div>)}
        {!canConfirm&&<div style={{background:C.amberBg,border:`1px solid ${C.amberBd}`,borderRadius:10,padding:"12px 14px",marginBottom:12,fontSize:12,color:C.amber}}>⚠ Review and edit the {lowConfPending.length} uncertain item{lowConfPending.length>1?"s":""} above before confirming.</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
          <Btn onClick={confirm} color={canConfirm?"green":"ghost"} sx={{width:"100%",padding:13,fontSize:14,opacity:canConfirm?1:0.5,cursor:canConfirm?"pointer":"not-allowed"}}>{canConfirm?"✓ Confirm & Create Order":`Review ${lowConfPending.length} item${lowConfPending.length>1?"s":""} first`}</Btn>
          <Btn onClick={()=>{setStage("choose");setExt(null);setError(null);}} color="ghost" sx={{width:"100%",padding:11}}>↩ Start over</Btn>
        </div>
      </>}
    </div>
  </div>;
}

// ─── ORDER NOTES CALLOUT ──────────────────────────────────────
function OrderNotesCallout({notes,onSave}){
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(notes||"");
  // Sync if notes change externally
  useState(()=>{setVal(notes||"");},[notes]);
  const hasNotes=notes&&notes.trim();
  if(!hasNotes&&!editing)return(
    <button onClick={()=>setEditing(true)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:11,fontFamily:C.sans,marginBottom:12,padding:0}}>
      + Add order notes
    </button>
  );
  return(
    <div style={{background:C.blueBg,border:`1px solid ${C.blueBd}`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:10,fontWeight:700,color:C.blue,letterSpacing:"0.8px"}}>ORDER NOTES</span>
        {!editing&&<button onClick={()=>{setVal(notes||"");setEditing(true);}} style={{background:"none",border:"none",color:C.blue,cursor:"pointer",fontSize:11,fontFamily:C.sans}}>Edit</button>}
      </div>
      {editing?<>
        <textarea value={val} onChange={e=>setVal(e.target.value)} rows={3}
          style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1px solid ${C.blueBd}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box",resize:"vertical"}}/>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <Btn onClick={()=>{onSave(val.trim());setEditing(false);}} color="green" sx={{flex:1,padding:8,fontSize:12}}>Save</Btn>
          <Btn onClick={()=>setEditing(false)} color="ghost" sx={{padding:"8px 12px",fontSize:12}}>Cancel</Btn>
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
          <input
            value={sec.name}
            onChange={e=>updateSecName(sIdx,e.target.value)}
            style={{flex:1,padding:"7px 10px",borderRadius:8,border:`1px solid ${C.amberBd}`,fontFamily:C.sans,fontSize:13,fontWeight:600,color:C.text,background:"#fff",outline:"none"}}
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
              <input type="number" value={item._qtyStr} min={1}
                onChange={e=>updateItemQty(sIdx,iIdx,e.target.value)}
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
function OrderDetail({order,actorName,isAdmin,onBack,onUpdate,onBilled,onReopen,skuList,catList}){
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
      <OrderNotesCallout notes={order.notes} onSave={v=>onUpdate(-1,-1,{_notes:v})}/>
      {/* Pending items by section */}
      {pending.length>0&&<>
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginBottom:10}}>PENDING ({pending.length})</div>
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
                    <Btn onClick={()=>setStatus(sI,iI,"fulfilled")}   color="greenO" sx={{flex:1,padding:"9px 6px",fontSize:12,borderRadius:8}}>✓ Fulfilled</Btn>
                    <Btn onClick={()=>setStatus(sI,iI,"unavailable")} color="redO"   sx={{flex:1,padding:"9px 6px",fontSize:12,borderRadius:8}}>✕ N/A</Btn>
                    <Btn onClick={()=>openOverride(key,item)} color="amberO" sx={{padding:"9px 12px",fontSize:12,borderRadius:8}}>Qty</Btn>
                  </div>}
                </div>
                {isOpen&&<div style={{borderTop:`1px solid ${C.border}`,padding:14,background:C.bg}}>
                  <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:8}}>QUANTITY TO SEND <span style={{color:C.textFaint,fontFamily:C.mono,fontWeight:400}}>(req ×{item.origQty})</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <button onClick={()=>setEditQty(v=>String(Math.max(1,parseInt(v||1)-1)))} style={{width:40,height:40,borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:20,color:C.textDim,fontFamily:C.sans}}>−</button>
                    <input type="number" value={editQty} onChange={e=>setEditQty(e.target.value)} style={{width:76,padding:"8px 0",borderRadius:8,border:`1px solid ${C.amberBd}`,color:C.amber,fontFamily:C.mono,fontWeight:700,fontSize:22,textAlign:"center",background:"#fff",outline:"none"}}/>
                    <button onClick={()=>setEditQty(v=>String(parseInt(v||0)+1))} style={{width:40,height:40,borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:20,color:C.textDim,fontFamily:C.sans}}>+</button>
                    <button onClick={()=>setEditQty(String(item.origQty))} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:C.mono}}>Full ×{item.origQty}</button>
                  </div>
                  {(()=>{const q=parseInt(editQty);if(q>0&&q<item.origQty)return <div style={{fontSize:11,color:C.amber,marginBottom:10}}>Partial — sending {q} of {item.origQty}</div>;if(q>=item.origQty)return <div style={{fontSize:11,color:C.green,marginBottom:10}}>Fulfilled</div>;return <div style={{height:21,marginBottom:10}}/>;})()}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:600,color:C.textDim,marginBottom:5}}>NOTE (optional)</div>
                    <input type="text" value={editNote} onChange={e=>setEditNote(e.target.value)} placeholder="e.g. 3 available, rest tomorrow" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn onClick={()=>saveOverride(sI,iI,item.origQty)} color="amber" sx={{flex:1,padding:10}}>Save</Btn>
                    <Btn onClick={()=>setExpandedKey(null)} color="ghost" sx={{padding:"10px 16px"}}>Cancel</Btn>
                  </div>
                </div>}
              </div>;
            })}
          </div>;
        })}
      </>}

      {pending.length===0&&!isBilled&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:10,padding:16,textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:18,marginBottom:4}}>✓</div>
        <div style={{fontWeight:700,color:C.green,fontSize:14}}>All items handled</div>
        <div style={{fontSize:12,color:C.green,opacity:0.8,marginTop:2}}>Ready to send to billing</div>
      </div>}

      {/* Handled items */}
      {handled.length>0&&<>
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginTop:pending.length?20:4,marginBottom:10}}>HANDLED ({handled.length})</div>
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
      {ready?<Btn onClick={()=>setBillingOpen(true)} color="green" sx={{width:"100%",padding:13,fontSize:14,gap:7,boxShadow:"0 2px 8px rgba(5,150,105,0.2)"}}>📄 Send to Billing</Btn>
        :<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{fontSize:13,color:C.textDim}}>{pending.length} item{pending.length!==1?"s":""} pending</span>
          <Btn onClick={()=>setBillingOpen(true)} color="ghost" sx={{padding:"8px 14px",fontSize:12,gap:5}}>📄 Bill anyway</Btn>
        </div>}
    </div>}
    {isBilled&&onReopen&&<div style={{borderTop:`1px solid ${C.border}`,padding:"12px 20px 16px",background:"#fff"}}>
      <Btn onClick={()=>{if(window.confirm("Move this order back to Live? Billing record will be cleared."))onReopen();}} color="amberO" sx={{width:"100%",padding:11,fontSize:13,gap:6}}>↩ Reopen as Live Order</Btn>
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
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:"6px 12px",marginBottom:4}}>
          {["SKU","Qty","Rate","Amount"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,color:C.textDim}}>{h}</span>)}
        </div>
        {(() => {
          let grandTotal=0;
          const rows=handled.filter(i=>i.status!=="unavailable").map(item=>{
            const rate=getRateForSku(item.sku,skuList)||0;
            const amt=rate*item.qty;grandTotal+=amt;
            return <React.Fragment key={item.id}>
              <div style={{fontFamily:C.mono,fontSize:12,color:C.text,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>{item.sku}{item.qty!==item.origQty&&<span style={{fontSize:10,color:C.textDim}}> (req ×{item.origQty})</span>}</div>
              <div style={{fontFamily:C.mono,fontSize:12,color:C.amber,fontWeight:700,padding:"7px 0",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}>×{item.qty}</div>
              <div style={{fontFamily:C.mono,fontSize:12,color:C.textDim,padding:"7px 0",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}>₹{rate>0?rate:"—"}</div>
              <div style={{fontFamily:C.mono,fontSize:12,color:rate>0?C.text:C.textFaint,fontWeight:rate>0?700:400,padding:"7px 0",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}>{rate>0?`₹${amt.toLocaleString("en-IN")}`:"—"}</div>
            </React.Fragment>;
          });
          return <>{rows}{grandTotal>0&&<div style={{gridColumn:"1/-1",display:"flex",justifyContent:"space-between",padding:"10px 0 4px",borderTop:`2px solid ${C.border}`,marginTop:4}}>
            <span style={{fontFamily:C.mono,fontWeight:700,fontSize:13,color:C.text}}>TOTAL</span>
            <span style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.green}}>₹{grandTotal.toLocaleString("en-IN")}</span>
          </div>}</>;
        })()}

        {handled.filter(i=>i.status==="unavailable").length>0&&<>
          <div style={{fontSize:11,fontWeight:700,color:C.red,letterSpacing:"0.8px",marginTop:16,marginBottom:8}}>NOT AVAILABLE</div>
          {handled.filter(i=>i.status==="unavailable").map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`,opacity:0.5}}>
            <span style={{fontFamily:C.mono,fontSize:13,color:C.text,textDecoration:"line-through"}}>{item.sku}</span>
            <span style={{fontFamily:C.mono,fontSize:13,color:C.red}}>×{item.origQty}</span>
          </div>)}
        </>}

        <div style={{fontSize:11,color:C.textDim,padding:"10px 0 4px"}}>Billed by <strong style={{color:C.text}}>{actorName}</strong> · {nowTime()}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
          <Btn onClick={()=>{setBillingOpen(false);onBilled();}} color="green" sx={{width:"100%",padding:13,fontSize:14}}>✓ Confirm & Push to Billing</Btn>
          <Btn onClick={exportTally} color="ghost" sx={{width:"100%",padding:11,gap:6}}>📊 Export to Tally (CSV)</Btn>
          <Btn onClick={()=>setBillingOpen(false)} color="ghost" sx={{width:"100%",padding:11}}>Back to Order</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

// ─── ADMIN APP ────────────────────────────────────────────────
function AdminApp({orders,users,skuList,catList,onSignOut,onOrderUpdate,onOrderBilled,onOrderReopen,onAddOrder,onUserChange,onDeleteOrder,onSkuChange,skuListEnriched}){
  const [tab,setTab]=useState("orders");
  const [activeOId,setActiveOId]=useState(null);
  const [expandSku,setExpandSku]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [newName,setNewName]=useState("");
  const [scanning,setScanning]=useState(false);
  const [editingUser,setEditingUser]=useState(null); // user object
  const [editUserName,setEditUserName]=useState("");
  const [selectedOrders,setSelectedOrders]=useState(new Set());
  const toggleOrderSelect=id=>setSelectedOrders(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  // SKU tab state
  const [skuPage,setSkuPage]=useState("cats"); // cats | list | modal
  const [activeCat,setActiveCat]=useState(null);
  const [skuSearch,setSkuSearch]=useState("");
  const [activeSku,setActiveSku]=useState(null); // sku object being edited
  const [editSkuId,setEditSkuId]=useState("");
  const [editSkuRate,setEditSkuRate]=useState("");
  const [editSkuCat,setEditSkuCat]=useState("");
  const [showAddSku,setShowAddSku]=useState(false);
  const [newSkuId,setNewSkuId]=useState("");
  const [newSkuCat,setNewSkuCat]=useState("lam8");
  const [newSkuRate,setNewSkuRate]=useState("");

  const activeOrder=orders.find(o=>o.id===activeOId);

  const eSkus=skuListEnriched||skuList;
  if(scanning)return <ScanScreen actorName="Admin" onBack={()=>setScanning(false)} onConfirm={o=>{onAddOrder(o);setActiveOId(o.id);setScanning(false);}} skuList={eSkus} catList={catList}/>;
  if(activeOrder)return <OrderDetail order={activeOrder} actorName="Admin" isAdmin={true} onBack={()=>setActiveOId(null)} onUpdate={(sIdx,iIdx,changes)=>onOrderUpdate(activeOrder.id,sIdx,iIdx,changes)} onBilled={()=>{onOrderBilled(activeOrder.id);setActiveOId(null);}} onReopen={()=>onOrderReopen(activeOrder.id)} skuList={eSkus} catList={catList}/>;

  const tabs=[["orders","📋 Orders"],["users","👥 Users"],["skus","🏷 SKUs"],["analytics","📊 Analytics"]];
  const tabSt=a=>({flex:1,padding:"8px 4px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:C.sans,fontSize:11,fontWeight:a?700:400,background:a?"#fff":"transparent",color:a?C.text:C.textDim,boxShadow:a?"0 1px 3px rgba(0,0,0,0.08)":"none"});
  const today=orders.filter(o=>o.date===TODAY),older=orders.filter(o=>o.date!==TODAY);

  // Analytics
  const unfulfilled=[];orders.forEach(o=>o.sections.forEach(sec=>sec.items.forEach(item=>{if(item.status==="unavailable"||item.status==="partial")unfulfilled.push({sku:item.sku,customer:sec.name,orderId:o.id,date:o.date,type:item.status,reqQty:item.origQty,sentQty:item.qty});})));
  const skuMap={};unfulfilled.forEach(e=>{if(!skuMap[e.sku])skuMap[e.sku]={sku:e.sku,naCount:0,partialCount:0,totalMissed:0,occurrences:[]};if(e.type==="unavailable")skuMap[e.sku].naCount++;else skuMap[e.sku].partialCount++;skuMap[e.sku].totalMissed+=e.reqQty-e.sentQty;skuMap[e.sku].occurrences.push(e);});
  const skus=Object.values(skuMap).sort((a,b)=>(b.naCount+b.partialCount)-(a.naCount+a.partialCount));
  const totalNA=unfulfilled.filter(e=>e.type==="unavailable").length,totalPart=unfulfilled.filter(e=>e.type==="partial").length,totalMiss=unfulfilled.reduce((s,e)=>s+e.reqQty-e.sentQty,0);
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
      {tab==="orders"&&<>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,flex:1}}>
            {[[today.length,"Total",C.text],[today.filter(o=>o.status==="live").length,"Live",C.amber],[today.filter(o=>o.status==="billed").length,"Billed",C.green]].map(([v,l,c])=><div key={l} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontFamily:C.mono,fontWeight:700,fontSize:20,color:c}}>{v}</div>
              <div style={{fontSize:10,color:C.textDim,marginTop:1}}>{l}</div>
            </div>)}
          </div>
          <Btn onClick={()=>setScanning(true)} color="amber" sx={{padding:"10px 14px",fontSize:12,flexShrink:0,whiteSpace:"nowrap"}}>+ New</Btn>
        </div>
        {today.length>0&&<><GrpLabel label="Today" color={C.amber}/>{today.map(o=><OrderCard key={o.id} order={o} onOpen={setActiveOId}/>)}</>}
        {older.length>0&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,marginTop:16}}>
            <GrpLabel label="Earlier" color={C.gray}/>
            <div style={{display:"flex",gap:8}}>
              {selectedOrders.size>0&&<Btn onClick={()=>{
                if(window.confirm(`Delete ${selectedOrders.size} order${selectedOrders.size>1?"s":""}? Cannot be undone.`)){
                  selectedOrders.forEach(id=>onDeleteOrder(id));setSelectedOrders(new Set());
                }
              }} color="danger" sx={{padding:"5px 10px",fontSize:11}}>🗑 Delete {selectedOrders.size}</Btn>}
              <Btn onClick={()=>{
                if(window.confirm(`Delete ALL ${older.length} history orders? Cannot be undone.`)){
                  older.forEach(o=>onDeleteOrder(o.id));setSelectedOrders(new Set());
                }
              }} color="danger" sx={{padding:"5px 10px",fontSize:11}}>🗑 Delete All</Btn>
            </div>
          </div>
          {older.map(o=>{
            const sel=selectedOrders.has(o.id);
            return <div key={o.id} style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <div onClick={()=>toggleOrderSelect(o.id)} style={{marginTop:14,width:20,height:20,borderRadius:4,border:`2px solid ${sel?C.red:C.border}`,background:sel?C.redBg:"#fff",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {sel&&<span style={{fontSize:12,color:C.red,lineHeight:1}}>✓</span>}
              </div>
              <div style={{flex:1}}><OrderCard order={o} onOpen={setActiveOId} onDelete={onDeleteOrder} dim/></div>
            </div>;
          })}
        </>}
      </>}

      {/* ── USERS TAB ── */}
      {tab==="users"&&<>
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

        {/* Edit user modal */}
        {editingUser&&<div onClick={e=>{if(e.target===e.currentTarget)setEditingUser(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <span style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:C.text}}>EDIT STAFF</span>
              <button onClick={()=>setEditingUser(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.textDim,lineHeight:1}}>✕</button>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>NAME</div>
              <input value={editUserName} onChange={e=>setEditUserName(e.target.value)}
                style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>{
                if(!editUserName.trim()){alert("Name cannot be empty.");return;}
                onUserChange("edit",{...editingUser,name:editUserName.trim()});
                setEditingUser(null);
              }} color="green" sx={{flex:1,padding:12,fontSize:14}}>Save</Btn>
              <Btn onClick={()=>{
                if(window.confirm(`Delete ${editingUser.name}? This cannot be undone.`)){
                  onUserChange("delete",editingUser.id);setEditingUser(null);
                }
              }} color="danger" sx={{padding:"12px 14px",fontSize:13}}>Delete</Btn>
            </div>
          </div>
        </div>}
      </>}

      {/* ── SKUS TAB ── */}
      {tab==="skus"&&<>

        {/* ── PAGE: CATEGORY CARDS ── */}
        {skuPage==="cats"&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px"}}>SKU CATEGORIES ({catList.length})</div>
            <Btn onClick={()=>setShowAddSku(!showAddSku)} color="amber" sx={{padding:"6px 12px",fontSize:11}}>+ Add SKU</Btn>
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
              <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>RATE (₹)</div>
              <input type="number" value={newSkuRate} onChange={e=>setNewSkuRate(e.target.value)} placeholder="Enter rate" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:13,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>{
                if(!newSkuId.trim()){alert("Enter a SKU code.");return;}
                const sku={id:newSkuId.trim().toUpperCase(),cat:newSkuCat,rate:newSkuRate?parseInt(newSkuRate):undefined};
                onSkuChange("add",sku);setNewSkuId("");setNewSkuRate("");setShowAddSku(false);
              }} color="green" sx={{flex:1,padding:10}}>Add SKU</Btn>
              <Btn onClick={()=>setShowAddSku(false)} color="ghost" sx={{padding:"10px 14px"}}>Cancel</Btn>
            </div>
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {catList.map(cat=>{
              const count=skuList.filter(s=>s.cat===cat.id).length;
              return <div key={cat.id} onClick={()=>{setActiveCat(cat);setSkuSearch("");setSkuPage("list");}}
                style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.05)",transition:"border-color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.amberBd}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4,lineHeight:1.3}}>{cat.name}</div>
                <div style={{display:"flex",alignItems:"center",marginTop:8}}>
                  <span style={{fontFamily:C.mono,fontSize:11,color:C.textDim}}>{count} SKUs</span>
                </div>
              </div>;
            })}
          </div>
        </>}

        {/* ── PAGE: SKU LIST ── */}
        {skuPage==="list"&&activeCat&&<>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <button onClick={()=>{setSkuPage("cats");setSkuSearch("");}} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:20,padding:0,lineHeight:1}}>←</button>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:C.text}}>{activeCat.name}</div>
              <div style={{fontSize:11,color:C.textDim}}>{skuList.filter(s=>s.cat===activeCat.id).length} SKUs</div>
            </div>
            <span style={{fontFamily:C.mono,fontSize:11,color:C.textDim}}>{skuList.filter(s=>s.cat===activeCat.id).length} SKUs</span>
          </div>
          <input value={skuSearch} onChange={e=>setSkuSearch(e.target.value)} placeholder={`Search in ${activeCat.name}…`} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box",marginBottom:12}}/>
          <div style={{fontSize:11,color:C.textDim,marginBottom:10}}>{filteredSkus.length} SKUs</div>
          {filteredSkus.slice(0,150).map(sku=>{
            const effectiveRate=sku.rate!==undefined?sku.rate:1;
            return <div key={sku.id} onClick={()=>{setActiveSku(sku);setEditSkuId(sku.id);setEditSkuRate(String(sku.rate!==undefined?sku.rate:""));setEditSkuCat(sku.cat);}}
              style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.amberBd}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{flex:1}}>
                <div style={{fontFamily:C.mono,fontWeight:600,fontSize:13,color:C.text}}>{sku.id}</div>
                {sku.name&&<div style={{fontSize:11,color:C.textDim,marginTop:2}}>{sku.name}</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:C.mono,fontWeight:700,fontSize:13,color:sku.rate!==undefined?C.amber:C.textDim}}>₹{effectiveRate?.toLocaleString("en-IN")||"—"}</span>

                <span style={{color:C.textDim,fontSize:14}}>›</span>
              </div>
            </div>;
          })}
          {filteredSkus.length>150&&<div style={{textAlign:"center",color:C.textDim,fontSize:12,padding:"10px 0"}}>Showing 150 of {filteredSkus.length} — type to search</div>}
          {filteredSkus.length===0&&<div style={{textAlign:"center",color:C.textFaint,padding:"40px 0",fontSize:13}}>No SKUs found.</div>}
        </>}

        {/* ── MODAL: EDIT SKU ── */}
        {activeSku&&<div onClick={e=>{if(e.target===e.currentTarget){setActiveSku(null);}}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <span style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:C.text}}>EDIT SKU</span>
              <button onClick={()=>setActiveSku(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.textDim,lineHeight:1}}>✕</button>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>SKU CODE</div>
              <input value={editSkuId} onChange={e=>setEditSkuId(e.target.value)}
                style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>RATE (₹ per sheet)</div>
              <input type="number" value={editSkuRate} onChange={e=>setEditSkuRate(e.target.value)}
                placeholder="Enter rate (₹)"
                style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:14,fontFamily:C.mono,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}/>
              {editSkuRate&&<div style={{fontSize:11,color:C.amber,marginTop:4}}>Custom rate: ₹{parseInt(editSkuRate).toLocaleString("en-IN")} · overrides category default</div>}
              {!editSkuRate&&<div style={{fontSize:11,color:C.textDim,marginTop:4}}>Leave blank to use category default rate</div>}
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600}}>CATEGORY</div>
              <select value={editSkuCat} onChange={e=>setEditSkuCat(e.target.value)}
                style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.borderMd}`,fontSize:13,fontFamily:C.sans,outline:"none",color:C.text,background:"#fff",boxSizing:"border-box"}}>
                {catList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>{
                const updates={...activeSku,id:editSkuId.trim().toUpperCase(),cat:editSkuCat};
                if(editSkuRate)updates.rate=parseInt(editSkuRate);
                else delete updates.rate;
                // delete old if id changed
                if(updates.id!==activeSku.id)onSkuChange("delete",activeSku.id);
                onSkuChange("add",updates);
                setActiveSku(null);
              }} color="green" sx={{flex:1,padding:12,fontSize:14}}>Save Changes</Btn>
              <Btn onClick={()=>{if(window.confirm(`Delete ${activeSku.id}?`)){onSkuChange("delete",activeSku.id);setActiveSku(null);}}} color="danger" sx={{padding:"12px 14px",fontSize:13}}>Delete</Btn>
            </div>
          </div>
        </div>}
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
        <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:"0.8px",marginBottom:8}}>UNFULFILLED ITEMS</div>
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
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    // Orders listener
    const ordersRef=ref(db,"orders");
    const unsubOrders=onValue(ordersRef,snap=>{
      const val=snap.val();
      if(val){setOrders(purgeOldOrders(Object.values(val)));}
      else{SEED_ORDERS.forEach(o=>set(ref(db,`orders/${o.id}`),o));setOrders(purgeOldOrders(SEED_ORDERS));}
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
    // Hourly purge
    const purgeInterval=setInterval(()=>{
      setOrders(prev=>{
        const purged=purgeOldOrders(prev);
        prev.filter(o=>!purged.find(p=>p.id===o.id)).forEach(o=>remove(ref(db,`orders/${o.id}`)));
        return purged;
      });
    },60*60*1000);
    return()=>{unsubOrders();unsubUsers();unsubSkus();unsubCats();clearInterval(purgeInterval);};
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

  if(loading)return <div style={{minHeight:620,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
    <div style={{fontFamily:C.mono,fontWeight:700,fontSize:20,color:C.amber}}>ORDER<span style={{color:C.gray}}>FLOW</span></div>
    <div style={{fontSize:13,color:C.textDim}}>Connecting…</div>
  </div>;

  if(screen==="choose")return <ChooseScreen onStaff={()=>setScreen("staff-select")} onAdmin={()=>setScreen("admin-app")}/>;
  if(screen==="staff-select")return <StaffSelect users={users} onSelect={id=>{setStaffId(id);setScreen("staff-app");}} onBack={()=>setScreen("choose")}/>;
  if(screen==="staff-scan")return <ScanScreen actorName={actorName} onBack={()=>setScreen("staff-app")} onConfirm={o=>{addOrder(o);setActiveOrderId(o.id);setScreen("staff-app");}} skuList={enrichedSkuList} catList={catList}/>;
  if(screen==="staff-app"){
    if(activeOrder)return <OrderDetail order={activeOrder} actorName={actorName} isAdmin={false} onBack={()=>setActiveOrderId(null)} onUpdate={(sIdx,iIdx,changes)=>updateItem(activeOrder.id,sIdx,iIdx,changes)} onBilled={()=>{billOrder(activeOrder.id);setActiveOrderId(null);}} onReopen={()=>reopenOrder(activeOrder.id)} skuList={enrichedSkuList} catList={catList}/>;
    return <StaffHome orders={orders} staffName={actorName} onSignOut={()=>{setStaffId(null);setScreen("choose");}} onNewOrder={()=>setScreen("staff-scan")} onOpenOrder={id=>setActiveOrderId(id)}/>;
  }
  if(screen==="admin-app")return <AdminApp orders={orders} users={users} skuList={skuList} catList={catList} onSignOut={()=>setScreen("choose")} onOrderUpdate={updateItem} onOrderBilled={billOrder} onOrderReopen={reopenOrder} onAddOrder={addOrder} onUserChange={updateUser} onDeleteOrder={deleteOrder} onSkuChange={onSkuChange} skuListEnriched={enrichedSkuList}/>;
  return null;
}
