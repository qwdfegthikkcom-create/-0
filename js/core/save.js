/* =========================================================
   الحفظ والتحميل
   - IndexedDB أولاً، ثم localStorage إذا لم يتوفر
   - 3 خانات حفظ + بيانات وصفية لكل خانة
   - الحفظ مضغوط: اللاعبون صفوف أرقام + gzip (CompressionStream) إن توفّر
   - رقم إصدار + ترحيل للإصدارات القديمة
   - تصدير/استيراد كملف JSON
   ========================================================= */
(function (G) {
  'use strict';
  const FC = G.FC = G.FC || {};

  const APP = 'masirat-najm';
  const VERSION = 5;
  const DB_NAME = 'masirat-najm';
  const STORE = 'kv';
  const LS_PREFIX = 'mn_';

  // ================= التحويل إلى صيغة مضغوطة والعكس =================

  // تحويل الحالة إلى كائن مضغوط قابل للحفظ
  function serialize(state) {
    const out = { v: VERSION, app: APP };
    for (const k in state) {
      if (k[0] === '_' || k === 'players' || k === 'v' || k === 'app') continue;
      out[k] = state[k];
    }
    const F = FC.Player.AI_FIELDS;
    const rows = [];
    for (const id in state.players) {
      const p = state.players[id];
      const row = new Array(F.length);
      for (let i = 0; i < F.length; i++) {
        const v = p[F[i]];
        row[i] = typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v;
      }
      rows.push(row);
    }
    out.players = { f: F, r: rows };
    if (state._rng) out.rngState = state._rng.s;
    return out;
  }

  // إعادة بناء الحالة من الكائن المضغوط
  function deserialize(obj) {
    obj = migrate(obj);
    const st = {};
    for (const k in obj) if (k !== 'players') st[k] = obj[k];
    st.players = {};
    const F = obj.players.f;
    const rows = obj.players.r;
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      const p = {};
      for (let i = 0; i < F.length; i++) p[F[i]] = r[i];
      st.players[p.id] = p;
    }
    FC.Player.fillDefaults && FC.Player.fillDefaults(st);
    return st;
  }

  // ترحيل الإصدارات القديمة خطوة بخطوة إلى الإصدار الحالي
  const MIGRATIONS = {
    // الإصدار 2 (المرحلة 2): الإصابات والإيقافات والجاهزية وأسباب ثقة المدرب
    1: (o) => {
      const u = o.user;
      if (u) {
        u.sharp = u.sharp != null ? u.sharp : 70;
        u.inj = null;
        u.ban = 0;
        u.reinj = 0;
        u.trustLog = [];
        u.captain = false;
        u.injHist = [];
        u.joinSeason = o.startSeason;
        if (u.season) u.season.ycCount = u.season.yc || 0;
      }
      o.v = 2;
      return o;
    },
    // الإصدار 3 (المرحلة 3): العقد والمال والوكيل والعروض (العقد يُنشأ تلقائياً عند التحميل)
    2: (o) => {
      o.offers = o.offers || [];
      o.tlog = o.tlog || [];
      o.v = 3;
      return o;
    },
    // الإصدار 4 (المرحلة 4): الكؤوس والبطولات القارية والمنتخبات (تُنشأ عند التحميل في fillDefaults)
    3: (o) => {
      o.v = 4;
      return o;
    },
    // الإصدار 5 (المرحلة 5): الشهرة والأخبار و«نبض» والرعاة ونمط الحياة والغريم (تُنشأ عند التحميل)
    4: (o) => {
      o.v = 5;
      return o;
    },
  };
  function migrate(obj) {
    if (!obj || obj.app !== APP) throw new Error('ملف الحفظ غير صالح');
    let guard = 0;
    while (obj.v < VERSION && guard++ < 50) {
      const m = MIGRATIONS[obj.v];
      if (!m) throw new Error('لا يوجد ترحيل من الإصدار ' + obj.v);
      obj = m(obj);
    }
    if (obj.v > VERSION) throw new Error('ملف الحفظ من إصدار أحدث من اللعبة');
    return obj;
  }

  // ================= الضغط =================
  const canZip = typeof G.CompressionStream !== 'undefined' && typeof G.Blob !== 'undefined' && typeof G.Response !== 'undefined';

  async function gzip(str) {
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function gunzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  }
  function toB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return G.btoa(s);
  }
  function fromB64(b64) {
    const s = G.atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  // ================= طبقة التخزين =================
  let dbPromise = null;
  let backend = null; // 'idb' | 'ls' | 'mem'
  const mem = {};

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        if (!G.indexedDB) return reject(new Error('no idb'));
        const req = G.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('blocked'));
      } catch (e) {
        reject(e);
      }
    });
    return dbPromise;
  }

  function lsOK() {
    try {
      const k = LS_PREFIX + 't';
      G.localStorage.setItem(k, '1');
      G.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  // تحديد طريقة التخزين المتاحة مرة واحدة
  async function pickBackend() {
    if (backend) return backend;
    try {
      await openDB();
      backend = 'idb';
    } catch (e) {
      backend = G.localStorage && lsOK() ? 'ls' : 'mem';
    }
    return backend;
  }

  function idbReq(mode, fn) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(req && req.result);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        })
    );
  }

  async function kvSet(key, val) {
    const b = await pickBackend();
    if (b === 'idb') return idbReq('readwrite', (s) => s.put(val, key));
    if (b === 'ls') {
      let str;
      if (val && val.bytes) str = 'Z:' + toB64(val.bytes);
      else str = 'J:' + JSON.stringify(val);
      G.localStorage.setItem(LS_PREFIX + key, str);
      return;
    }
    mem[key] = val;
  }
  async function kvGet(key) {
    const b = await pickBackend();
    if (b === 'idb') return idbReq('readonly', (s) => s.get(key));
    if (b === 'ls') {
      const str = G.localStorage.getItem(LS_PREFIX + key);
      if (str == null) return undefined;
      if (str.slice(0, 2) === 'Z:') return { bytes: fromB64(str.slice(2)) };
      return JSON.parse(str.slice(2));
    }
    return mem[key];
  }
  async function kvDel(key) {
    const b = await pickBackend();
    if (b === 'idb') return idbReq('readwrite', (s) => s.delete(key));
    if (b === 'ls') return G.localStorage.removeItem(LS_PREFIX + key);
    delete mem[key];
  }

  // ================= الواجهة العامة =================
  FC.Save = {
    VERSION,
    SLOTS: 3,
    serialize,
    deserialize,
    migrate,

    backend: () => backend,

    // بيانات وصفية مختصرة لعرضها في شاشة التحميل
    metaOf(state) {
      const u = state.user;
      const club = state.clubs[u.club];
      return {
        name: FC.Player.fullName(u),
        club: club ? club.name : '',
        team: u.team,
        pos: u.pos,
        ovr: Math.floor(FC.Player.ovr(u)),
        age: u.age,
        season: state.season,
        week: state.week,
        savedAt: Date.now(),
        v: VERSION,
      };
    },

    // حفظ الحالة في خانة
    async save(slot, state) {
      const json = JSON.stringify(serialize(state));
      let rec;
      if (canZip) {
        try {
          rec = { bytes: await gzip(json) };
        } catch (e) {
          rec = { json };
        }
      } else rec = { json };
      await kvSet('slot' + slot, rec);
      await kvSet('meta' + slot, this.metaOf(state));
      try {
        G.localStorage && G.localStorage.setItem(LS_PREFIX + 'last', String(slot));
      } catch (e) {
        /* تجاهل */
      }
      return { size: rec.bytes ? rec.bytes.length : json.length };
    },

    // تحميل الحالة من خانة
    async load(slot) {
      const rec = await kvGet('slot' + slot);
      if (!rec) return null;
      const json = rec.bytes ? await gunzip(rec.bytes) : rec.json;
      return deserialize(JSON.parse(json));
    },

    // قائمة الخانات مع بياناتها الوصفية
    async list() {
      const out = [];
      for (let i = 1; i <= this.SLOTS; i++) out.push({ slot: i, meta: (await kvGet('meta' + i)) || null });
      return out;
    },

    // حذف خانة
    async remove(slot) {
      await kvDel('slot' + slot);
      await kvDel('meta' + slot);
    },

    // آخر خانة استُخدمت (للمتابعة السريعة)
    lastSlot() {
      try {
        return parseInt(G.localStorage.getItem(LS_PREFIX + 'last'), 10) || null;
      } catch (e) {
        return null;
      }
    },

    // نص JSON للتصدير
    exportText(state) {
      return JSON.stringify(serialize(state));
    },

    // قراءة نص JSON مستورد → حالة
    importText(text) {
      return deserialize(JSON.parse(text));
    },

    // إعدادات عامة (خارج خانات الحفظ)
    loadSettings() {
      const def = FC.util.clone(FC.BAL.ui.defaultSettings);
      try {
        const s = JSON.parse(G.localStorage.getItem(LS_PREFIX + 'settings') || '{}');
        // ترقية الإعدادات القديمة: المباراة الكاملة هي الوضع الجديد الافتراضي
        if (s.matchMode && !s.v) {
          s.matchMode = 'full';
          s.v = 2;
        }
        return Object.assign(def, s);
      } catch (e) {
        return def;
      }
    },
    saveSettings(s) {
      try {
        G.localStorage.setItem(LS_PREFIX + 'settings', JSON.stringify(s));
      } catch (e) {
        /* تجاهل */
      }
    },
  };
})(globalThis);
