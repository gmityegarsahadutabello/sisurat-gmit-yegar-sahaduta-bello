// LocalStorage schema for GMIT YEGAR Surat System
// Defines canonical models, enums, and keys used across the frontend.

// Storage keys (single source of truth)
export const KEYS = {
  users: 'local_users',
  pengajuan: 'local_pengajuan',
  notifikasi: 'local_notifikasi',
  // arsip: 'local_arsip', // DEPRECATED: Merged into local_pengajuan with status='validated'/'archived'
  sessions: 'local_sessions', // optional mock sessions list
  currentUser: 'currentUser', // sessionStorage also used in parts
};

// Role enum
export const Role = Object.freeze({
  admin: 'admin',
  tatausaha: 'tatausaha',
  sekretaris: 'sekretaris',
  pendeta: 'pendeta',
  koordinator: 'koordinator',
  jemaat: 'jemaat',
});

// Rayon enum (string IDs for simplicity)
export const Rayon = Object.freeze({
  R1: 'rayon-1',
  R2: 'rayon-2',
  R3: 'rayon-3',
});

// Pengajuan types
export const PengajuanType = Object.freeze({
  suratKeterangan: 'surat-keterangan',
  suratPindah: 'surat-pindah',
  suratBaptis: 'surat-baptis',
  suratSidi: 'surat-sidi',
});

// Status lifecycle for pengajuan/surat
// New -> DisposisiTU -> DisposisiSek -> DisposisiPendeta -> Validated -> Arsip or Ditolak
export const Status = Object.freeze({
  baru: 'baru', // created by jemaat
  disposisi_tu: 'disposisi_tu', // TU uploads/creates draft and forwards
  disposisi_sekretaris: 'disposisi_sekretaris', // Sekretaris forwards to Pendeta
  disposisi_pendeta: 'disposisi_pendeta', // Pendeta reviewing/preview
  kembali: 'kembali', // returned by pendeta with note (needs revision)
  ditolak: 'ditolak', // rejected
  validated: 'validated', // approved by pendeta
  arsip: 'arsip', // finalized and moved to archive (TU)
});

// Notification types
export const NotifType = Object.freeze({
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
});

// Base timeline entry
export function TimelineEntry({ at, byRole, byUserId, action, note }) {
  return {
    at: at ?? new Date().toISOString(),
    byRole: byRole ?? null,
    byUserId: byUserId ?? null,
    action: action ?? '', // e.g., 'buat', 'disposisi_tu', 'kembali', 'validate'
    note: note ?? '',
  };
}

// User model
export function User({
  id, // uuid or numeric
  name,
  email,
  password, // hashed in real app; plain here
  role,
  rayon, // required for jemaat/koordinator
  nik, // optional id for jemaat
  createdAt,
}) {
  return {
    id,
    name,
    email,
    password,
    role,
    rayon: rayon ?? null,
    nik: nik ?? null,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

// File attachment metadata (final or draft)
export function FileMeta({
  name,
  size,
  mime,
  dataUrl, // base64/data URL for preview
}) {
  return { name, size: size ?? 0, mime: mime ?? '', dataUrl: dataUrl ?? null };
}

// Pengajuan model (single source of truth)
export function Pengajuan({
  id, // uuid
  user_id, // owner jemaat id
  rayon, // derived from owner
  tipe, // PengajuanType
  status, // Status
  meta, // details per type (structured object)
  createdAt,
  updatedAt,
  final_file, // FileMeta when validated
  draft_file, // FileMeta during TU/SEK/PDT flow
  nomor_surat, // assigned on validated
  timeline, // array of TimelineEntry
}) {
  return {
    id,
    user_id,
    rayon,
    tipe,
    status: status ?? Status.baru,
    meta: meta ?? {},
    createdAt: createdAt ?? new Date().toISOString(),
    updatedAt: updatedAt ?? new Date().toISOString(),
    final_file: final_file ?? null,
    draft_file: draft_file ?? null,
    nomor_surat: nomor_surat ?? null,
    timeline: Array.isArray(timeline) ? timeline : [],
  };
}

// Arsip entry (derived from Pengajuan after validated)
export function ArsipEntry({
  id, // same as pengajuan id or new id
  pengajuan_id,
  nomor_surat,
  tipe,
  owner_user_id,
  rayon,
  final_file, // FileMeta
  archivedAt,
}) {
  return {
    id,
    pengajuan_id,
    nomor_surat,
    tipe,
    owner_user_id,
    rayon,
    final_file,
    archivedAt: archivedAt ?? new Date().toISOString(),
  };
}

// Notification model
export function Notifikasi({ id, user_id, type, title, message, createdAt, read }) {
  return {
    id,
    user_id,
    type: type ?? NotifType.info,
    title: title ?? '',
    message: message ?? '',
    createdAt: createdAt ?? new Date().toISOString(),
    read: !!read,
  };
}

// Status transition rules (guard rails)
export const Transitions = Object.freeze({
  [Status.baru]: [Status.disposisi_tu, Status.ditolak],
  [Status.disposisi_tu]: [Status.disposisi_sekretaris, Status.kembali, Status.ditolak],
  [Status.disposisi_sekretaris]: [Status.disposisi_pendeta, Status.kembali, Status.ditolak],
  [Status.disposisi_pendeta]: [Status.validated, Status.kembali, Status.ditolak],
  [Status.kembali]: [Status.disposisi_tu, Status.disposisi_sekretaris, Status.disposisi_pendeta],
  [Status.validated]: [Status.arsip],
  [Status.ditolak]: [],
  [Status.arsip]: [],
});

// Lightweight validators (shape-only)
export const Validators = {
  user(u) {
    return !!(u && u.id && u.name && u.email && u.role);
  },
  pengajuan(p) {
    return !!(
      p && p.id && p.user_id && p.tipe && p.status &&
      Object.values(PengajuanType).includes(p.tipe) &&
      Object.values(Status).includes(p.status)
    );
  },
  notif(n) {
    return !!(n && n.id && n.user_id && n.type && n.title);
  },
};

// Migration helpers: ensure each pengajuan has user_id, rayon, timeline
export function migratePengajuanList(list, userLookupById) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((p) => {
    const user = userLookupById?.(p.user_id) || null;
    const rayon = p.rayon ?? user?.rayon ?? null;
    const hasTimeline = Array.isArray(p.timeline);
    return {
      ...p,
      rayon,
      timeline: hasTimeline ? p.timeline : [],
      updatedAt: new Date().toISOString(),
    };
  });
}

// Utility: derive ArsipEntry from a validated Pengajuan
export function toArsipEntry(p) {
  if (!p || p.status !== Status.validated || !p.final_file) return null;
  return ArsipEntry({
    id: p.id,
    pengajuan_id: p.id,
    nomor_surat: p.nomor_surat,
    tipe: p.tipe,
    owner_user_id: p.user_id,
    rayon: p.rayon,
    final_file: p.final_file,
    archivedAt: new Date().toISOString(),
  });
}

// Status change with guard and timeline append
export function advanceStatus(p, nextStatus, actor) {
  const allowed = Transitions[p.status] || [];
  if (!allowed.includes(nextStatus)) return { ok: false, error: 'Invalid transition' };
  const newTimeline = [
    ...(Array.isArray(p.timeline) ? p.timeline : []),
    TimelineEntry({ byRole: actor?.role, byUserId: actor?.id, action: nextStatus }),
  ];
  return {
    ok: true,
    value: { ...p, status: nextStatus, timeline: newTimeline, updatedAt: new Date().toISOString() },
  };
}

// Example default factories
export function newPengajuan({ id, owner, tipe, meta }) {
  const p = Pengajuan({
    id,
    user_id: owner.id,
    rayon: owner.rayon ?? null,
    tipe,
    status: Status.baru,
    meta: meta ?? {},
    timeline: [TimelineEntry({ byRole: Role.jemaat, byUserId: owner.id, action: 'buat' })],
  });
  return p;
}

/**
 * Skema konsisten alur: Jemaat → Koordinator → Tata Usaha → Sekretaris → Pendeta
 * Fokus: Pengajuan (submission), User, Notifikasi, Timeline.
 * Dipakai untuk normalisasi data localStorage legacy agar filtrasi & status seragam.
 */

/* ========= ENUMS ========= */
const STATUS = Object.freeze({
  DRAFT: 'draft',
  REJECTED_BY_KOOR: 'rejected_by_koor',
  VERIFIED_BY_KOOR: 'verified_by_koor',
  FILE_UPLOADED: 'file_uploaded',
  TO_SEK: 'disposisi_to_sekretaris',
  RETURNED_BY_SEK: 'returned_by_sekretaris',
  VALIDATED_BY_SEK: 'validated_by_sekretaris',
  TO_PEN: 'disposisi_to_pendeta',
  RETURNED_BY_PEN: 'returned_by_pendeta',
  VALIDATED_BY_PEN: 'validated_by_pendeta',
  VALIDATED: 'validated',
  ARCHIVED: 'archived',
});

const ROLES = Object.freeze({
  JEMAAT: 'jemaat',
  KOORDINATOR: 'koordinator',
  TATAUSAHA: 'tatausaha',
  SEKRETARIS: 'sekretaris',
  PENDETA: 'pendeta',
  ADMIN: 'admin',
});

const STORE = Object.freeze({
  USERS: 'users',
  PENGAJUAN: 'local_pengajuan',
  NOTIF: 'local_notifications',
});

/* ========= HELPERS ========= */
function randomId(prefix = 'id_') {
  try {
    const buf = crypto.getRandomValues(new Uint32Array(2));
    return `${prefix}${Date.now()}_${buf[0].toString(16)}${buf[1].toString(16)}`;
  } catch {
    return `${prefix}${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}

function guessMime(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:([^;]+);/);
  return m ? m[1] : null;
}

function buildFormLegacy(src) {
  const out = {};
  const keys = [
    'nama','jk','agama','jalan','rt','rw','kelurahan','kecamatan','kota',
    'tempat_lahir','tgl_lahir','ttl','tujuan','keperluan',
    's1_nama','s1_jk','s1_ttl','s2_nama','s2_jk','s2_ttl'
  ];
  keys.forEach(k => { if (src && src[k] != null) out[k] = src[k]; });
  return out;
}

function normalizeTimeline(tl, userNama) {
  const arr = Array.isArray(tl) ? tl.slice() : [];
  if (!arr.some(e => (e.action || '').includes('submitted'))) {
    arr.unshift({
      at: new Date().toISOString(),
      by: userNama || 'Jemaat',
      action: 'submitted',
      note: 'Pengajuan dibuat'
    });
  }
  return arr.map(e => ({
    at: e.at || new Date().toISOString(),
    by: e.by || 'system',
    action: String(e.action || '').toLowerCase(),
    note: e.note || ''
  }));
}

/* ========= NORMALIZER ========= */
const LegacyStatusMap = {
  proses: STATUS.DRAFT,
  baru: STATUS.DRAFT,
  ditolak: STATUS.REJECTED_BY_KOOR,
  diterima: STATUS.VERIFIED_BY_KOOR,
  verified_by_koordinator: STATUS.VERIFIED_BY_KOOR,
  disposisi_to_sekretaris: STATUS.TO_SEK,
  disposisi_to_pendeta: STATUS.TO_PEN,
  validated_by_pendeta: STATUS.VALIDATED_BY_PEN,
  validated: STATUS.VALIDATED,
  archived: STATUS.ARCHIVED
};

function normalizeUser(u) {
  const now = new Date().toISOString();
  return {
    id: String(u.id || u.nik || randomId('user_')),
    role: u.role,
    nama: u.nama || u.name || '',
    email: u.email || '',
    nik: u.nik || null,
    rayon: u.rayon || null,
    created_at: u.created_at || now,
    updated_at: now
  };
}

function resolveUserRef(p, users) {
  if (!p) return {};
  return (
    users.find(x => String(x.id) === String(p.user_id)) ||
    users.find(x => x.email && x.email === p.user_email) ||
    users.find(x => x.nik && String(x.nik) === String(p.user_nik || p.pemohon_nik)) ||
    {
      id: p.user_id || p.pemohon_nik || p.nik || '',
      email: p.user_email || p.email || '',
      nik: p.user_nik || p.pemohon_nik || p.nik || '',
      nama: p.user_nama || p.pemohon_nama || p.nama || p.pengaju || '',
      rayon: p.user_rayon || p.rayon || p.pemohon_rayon || ''
    }
  );
}

function normalizePengajuan(p, users) {
  const now = new Date().toISOString();
  const userRef = resolveUserRef(p, users);
  const legacy = String(p.status || '').toLowerCase();
  const status = LegacyStatusMap[legacy] || p.status || STATUS.DRAFT;
  return {
    id: String(p.id || randomId('pengajuan_')),
    type: p.type || p.tipe || 'lainnya',
    status,
    created_at: p.created_at || p.createdAt || p.tanggal || now,
    last_updated: p.last_updated || now,
    user_id: String(userRef.id || ''),
    user_email: userRef.email || '',
    user_nik: String(userRef.nik || ''),
    user_nama: userRef.nama || '',
    user_rayon: userRef.rayon || '',
    form: p.form || buildFormLegacy(p),
    koor_note: p.koor_note || p.rejection_note || null,
    sekretaris_note: p.sekretaris_note || null,
    pendeta_note: p.pendeta_note || null,
    timeline: normalizeTimeline(p.timeline || p.history || [], userRef.nama),
    nomor_surat: p.nomor_surat || p.nomor || null,
    validated_at: p.validated_at || null,
    final_file: p.final_file || p.final_file_data || null,
    final_file_name: p.final_file_name || p.file_name || null,
    final_file_type: p.final_file_type || guessMime(p.final_file || p.final_file_data) || null,
    final_file_size: p.final_file_size || null,
    draft_text: p.draft_text || p.draft_surat || null
  };
}

function normalizeNotif(n) {
  const now = new Date().toISOString();
  return {
    id: String(n.id || randomId('notif_')),
    type: n.type,
    user_id: String(n.user_id || ''),
    pengajuan_id: String(n.pengajuan_id || n.ref_id || ''),
    judul: n.judul || '',
    pesan: n.pesan || '',
    tanggal: n.tanggal || now,
    read: !!n.read,
    url: n.url || ''
  };
}

/* ========= FACTORY ========= */
function createPengajuan({ type, user }) {
  const now = new Date().toISOString();
  return {
    id: randomId('pengajuan_'),
    type,
    status: STATUS.DRAFT,
    created_at: now,
    last_updated: now,
    user_id: user.id,
    user_email: user.email,
    user_nik: user.nik || '',
    user_nama: user.nama,
    user_rayon: user.rayon || '',
    form: {},
    timeline: [{
      at: now,
      by: user.nama,
      action: 'submitted',
      note: 'Pengajuan dibuat'
    }]
  };
}

function createNotifSuratMasuk(p) {
  return {
    id: randomId('notif_'),
    type: 'surat_masuk',
    user_id: p.user_id,
    pengajuan_id: p.id,
    judul: 'Surat Masuk',
    pesan: `Surat untuk pengajuan ${p.type} telah tersedia.`,
    tanggal: new Date().toISOString(),
    read: false,
    url: `pengajuan-detail.html?id=${p.id}`
  };
}

/* ========= VALIDATOR ========= */
function validatePengajuan(p) {
  const errors = [];
  if (!p.id) errors.push('id missing');
  if (!p.user_id) errors.push('user_id missing');
  if (!p.type) errors.push('type missing');
  if (!Object.values(STATUS).includes(p.status)) errors.push('invalid status');
  return errors;
}

/* ========= STORE FACADE ========= */
const Store = {
  load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  },
  save(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  },
  loadUsers() { return this.load(STORE.USERS); },
  saveUsers(list) { this.save(STORE.USERS, list); },
  loadPengajuan() { return this.load(STORE.PENGAJUAN); },
  savePengajuan(list) { this.save(STORE.PENGAJUAN, list); },
  loadNotif() { return this.load(STORE.NOTIF); },
  saveNotif(list) { this.save(STORE.NOTIF, list); },
};

/* ========= MIGRASI ========= */
function migrateAll() {
  const rawUsers = Store.loadUsers();
  const users = rawUsers.map(normalizeUser);
  Store.saveUsers(users);

  const rawPengajuan = Store.loadPengajuan();
  const pengajuan = rawPengajuan.map(p => normalizePengajuan(p, users));
  Store.savePengajuan(pengajuan);

  const rawNotif = Store.loadNotif();
  const notif = rawNotif.map(normalizeNotif);
  Store.saveNotif(notif);

  return {
    users: users.length,
    pengajuan: pengajuan.length,
    notif: notif.length
  };
}

/* ========= EXPORT (browser global) ========= */
window.SuratSchema = {
  STATUS,
  ROLES,
  STORE,
  normalizeUser,
  normalizePengajuan,
  normalizeNotif,
  createPengajuan,
  createNotifSuratMasuk,
  validatePengajuan,
  migrateAll,
  Store
};