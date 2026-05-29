# 🔄 WORKFLOW DIAGRAM - GMIT YEGAR SISTEM SURAT

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  HTML Pages  │  │  JavaScript  │  │  API Client  │          │
│  │  (Frontend)  │──│   (Logic)    │──│  (api.js)    │          │
│  └──────────────┘  └──────────────┘  └──────┬───────┘          │
└────────────────────────────────────────────┼────────────────────┘
                                              │ HTTP Requests
                                              │ (JSON)
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER (Node.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Routes     │─▶│ Controllers  │─▶│    Models    │          │
│  │ (API Endpoints)  │ (Business     │  │  (Mongoose)  │          │
│  └──────────────┘  └──────────────┘  └──────┬───────┘          │
│                                              │                   │
│  ┌──────────────────────────────────────────▼─────────────────┐ │
│  │                  Helpers & Utilities                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────┼────────────────────┘
                                              │ Mongoose Queries
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB DATABASE                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    users     │  │  pengajuans  │  │ notifications│          │
│  │  Collection  │  │  Collection  │  │  Collection  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌─────────┐                                            ┌─────────┐
│  User   │                                            │ MongoDB │
└────┬────┘                                            └────┬────┘
     │                                                      │
     │  1. Enter Email & Password                          │
     ├──────────────────▶ POST /api/users/login            │
     │                                                      │
     │                   2. Find user by email/NIK         │
     │                   ────────────────────────────────▶  │
     │                                                      │
     │                   3. Return user (with password)    │
     │                   ◀────────────────────────────────  │
     │                                                      │
     │                   4. Compare password (bcrypt)      │
     │                   ─────────────────────────┐        │
     │                                             │        │
     │                   5. Match? Yes             │        │
     │                   ◀────────────────────────┘        │
     │                                                      │
     │  6. Return user data (no password)                  │
     │  ◀─────────────────────────────────────             │
     │                                                      │
     │  7. Store in localStorage (session)                 │
     │  ─────────────────┐                                 │
     │                   │                                 │
     │  8. Redirect to   │                                 │
     │     Dashboard     │                                 │
     │  ◀────────────────┘                                 │
     │                                                      │
```

---

## 📝 Pengajuan Surat Flow

### Complete Workflow (All Roles)

```
┌──────────┐
│  JEMAAT  │  Step 1: Create Submission
└────┬─────┘
     │
     │  1. Fill form (baptis, nikah, sidi, etc.)
     │  2. Submit via API.pengajuan.create()
     │  3. Status: "baru"
     │  4. Notification → Koordinator
     ▼
┌────────────────┐
│  KOORDINATOR   │  Step 2: Verification
└───────┬────────┘
        │
        │  Option A: APPROVE                  Option B: REJECT
        │  ─────────────────────────         ────────────────────
        │  • Update status:                   • Update status:
        │    "verified_by_koordinator"         "rejected_by_koor"
        │  • Notification → TU                • Notification → Jemaat
        │  • Add timeline entry               • Add rejection note
        │                                     • END (Jemaat revise)
        ▼
┌──────────────┐
│ TATA USAHA   │  Step 3: Process & Upload Letter
└──────┬───────┘
       │
       │  1. View verified submission
       │  2. Create/Edit draft surat
       │  3. Upload final file (PDF/JPG)
       │  4. Update status: "file_uploaded"
       │  5. Disposisi to Sekretaris
       │  6. Status: "disposisi_to_sekretaris"
       │  7. Notification → Sekretaris
       ▼
┌──────────────┐
│  SEKRETARIS  │  Step 4: Review & Validate
└──────┬───────┘
       │
       │  Option A: VALIDATE              Option B: RETURN
       │  ────────────────────           ──────────────────
       │  • Update status:                • Update status:
       │    "validated_by_sekretaris"      "returned_by_sekretaris"
       │  • Disposisi to Pendeta          • Notification → TU
       │  • Status:                       • Add return note
       │    "disposisi_to_pendeta"        • TU fix & re-submit
       │  • Notification → Pendeta
       │
       ▼
┌──────────────┐
│   PENDETA    │  Step 5: Final Validation
└──────┬───────┘
       │
       │  Option A: VALIDATE              Option B: RETURN
       │  ────────────────────           ──────────────────
       │  • Update status:                • Update status:
       │    "validated_by_pendeta"         "returned_by_pendeta"
       │  • Generate nomor surat          • Notification → TU/Sek
       │  • Status: "validated"           • Add return note
       │  • Notification → TU             • TU/Sek fix & re-submit
       │
       ▼
┌──────────────┐
│ TATA USAHA   │  Step 6: Archive
└──────┬───────┘
       │
       │  1. View validated submission
       │  2. Archive letter
       │  3. Update status: "archived"
       │  4. Notification → Jemaat (Done!)
       │  5. Letter ready for pickup
       │
       ▼
     ┌───┐
     │END│
     └───┘
```

---

## 📊 Data Flow Diagram

### Creating Pengajuan

```
Frontend                 Backend                 Database
   │                        │                        │
   │  1. Form Submit        │                        │
   ├───────────────────────▶│                        │
   │                        │                        │
   │                        │  2. Validate Data      │
   │                        ├─────────┐              │
   │                        │         │              │
   │                        │◀────────┘              │
   │                        │                        │
   │                        │  3. Create Pengajuan   │
   │                        ├───────────────────────▶│
   │                        │                        │
   │                        │  4. Save + Timeline    │
   │                        │                    ┌───┤
   │                        │                    │   │
   │                        │                    └──▶│
   │                        │                        │
   │                        │  5. Create Notification│
   │                        ├───────────────────────▶│
   │                        │                        │
   │                        │  6. Return Created Doc │
   │                        │◀───────────────────────┤
   │                        │                        │
   │  7. Return to Frontend │                        │
   │◀───────────────────────┤                        │
   │                        │                        │
   │  8. Show Success       │                        │
   │  9. Redirect           │                        │
   │                        │                        │
```

---

## 🔄 Status Transitions

```
┌──────┐
│ baru │  (Initial submission)
└──┬───┘
   │
   ├─────────────────────────────────────┐
   │                                     │
   ▼                                     ▼
┌──────────────────────┐    ┌──────────────────────┐
│verified_by_koordinator│    │rejected_by_koor      │
│(Approved by Koor)    │    │(Rejected - END)      │
└──────────┬───────────┘    └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│file_uploaded         │  (TU uploaded file)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│disposisi_to_sekretaris│ (Forwarded to Sekretaris)
└──────────┬───────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
┌──────────────────────┐    ┌──────────────────────┐
│validated_by_sekretaris│    │returned_by_sekretaris│
│(Approved by Sek)     │    │(Needs revision)      │
└──────────┬───────────┘    └──────────┬───────────┘
           │                           │
           │                           └──────────┐
           ▼                                      │
┌──────────────────────┐                         │
│disposisi_to_pendeta  │ (Forwarded to Pendeta) │
└──────────┬───────────┘                         │
           │                                     │
           ├─────────────────────────────────────┼───┐
           │                                     │   │
           ▼                                     ▼   │
┌──────────────────────┐    ┌──────────────────────┐│
│validated_by_pendeta  │    │returned_by_pendeta   ││
│(Approved by Pendeta) │    │(Needs revision)      ││
└──────────┬───────────┘    └──────────┬───────────┘│
           │                           │             │
           │                           └─────────────┘
           ▼                                     │
┌──────────────────────┐                        │
│validated             │  (Final validation)    │
└──────────┬───────────┘                        │
           │                                     │
           ▼                                     │
┌──────────────────────┐                        │
│archived              │  (Completed - END)     │
└──────────────────────┘                        │
                                                 │
           ┌─────────────────────────────────────┘
           │
           ▼
    (Back to TU/Sek for revision)
```

---

## 🔔 Notification Flow

```
Trigger Event              Notification Created           Target User
─────────────              ────────────────────           ───────────

Jemaat Submit          ──▶  type: "surat_masuk"       ──▶  Koordinator
                             title: "Pengajuan Baru"        (to_role)

Koor Approve          ──▶  type: "surat_diterima"    ──▶  Tata Usaha
                             title: "Surat Diverifikasi"    (to_role)

Koor Reject           ──▶  type: "surat_ditolak"     ──▶  Jemaat
                             title: "Surat Ditolak"         (to_nik)

TU Upload File        ──▶  type: "surat_disposisi"   ──▶  Sekretaris
                             title: "Disposisi Surat"       (to_role)

Sek Validate          ──▶  type: "surat_disposisi"   ──▶  Pendeta
                             title: "Disposisi Surat"       (to_role)

Sek Return            ──▶  type: "surat_returned"    ──▶  Tata Usaha
                             title: "Surat Dikembalikan"    (to_role)

Pendeta Validate      ──▶  type: "surat_validated"   ──▶  Tata Usaha
                             title: "Surat Divalidasi"      (to_role)

Pendeta Return        ──▶  type: "surat_returned"    ──▶  Tata Usaha
                             title: "Surat Dikembalikan"    (to_role)

TU Archive            ──▶  type: "surat_archived"    ──▶  Jemaat
                             title: "Surat Selesai"         (to_nik)
```

---

## 🗂️ Database Collections Relationship

```
┌──────────────────┐
│      users       │
│                  │
│  • _id (PK)     │◀─────────────────┐
│  • nik          │                  │
│  • name         │                  │ Referenced by
│  • email        │                  │ (user field)
│  • role         │                  │
│  • rayon        │                  │
└──────────────────┘                  │
         │                            │
         │ Denormalized in            │
         │ pengajuans                 │
         │ (user_id, user_nik,        │
         │  user_nama, etc.)          │
         ▼                            │
┌──────────────────┐                  │
│   pengajuans     │                  │
│                  │                  │
│  • _id (PK)     │──────────────────┤
│  • user_id      │                  │
│  • user_nik     │                  │ Referenced by
│  • user_nama    │                  │ (related_id)
│  • rayon        │                  │
│  • type         │                  │
│  • status       │                  │
│  • form         │                  │
│  • timeline[]   │                  │
└──────────────────┘                  │
         │                            │
         │ Referenced in              │
         │ notifications              │
         │ (related_id)               │
         ▼                            │
┌──────────────────┐                  │
│  notifications   │                  │
│                  │                  │
│  • _id (PK)     │                  │
│  • user_id      │──────────────────┘
│  • to_role      │
│  • to_nik       │
│  • type         │
│  • title        │
│  • message      │
│  • related_id   │──────────────────▶ references pengajuans._id
│  • is_read      │
└──────────────────┘
```

---

## 🎯 API Request/Response Flow

### Example: Creating Pengajuan

**Request:**
```http
POST /api/pengajuan HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "user_id": "507f1f77bcf86cd799439011",
  "user_nik": "1234567890123456",
  "user_nama": "Jemaat Test",
  "user_email": "jemaat@example.com",
  "user_rayon": "Rayon A",
  "rayon": "Rayon A",
  "type": "baptis",
  "form": {
    "nama_anak": "Maria",
    "tanggal_lahir": "2024-01-15"
  }
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "_id": "507f191e810c19729de860ea",
  "id": "507f191e810c19729de860ea",
  "user_id": "507f1f77bcf86cd799439011",
  "user_nik": "1234567890123456",
  "user_nama": "Jemaat Test",
  "rayon": "Rayon A",
  "type": "baptis",
  "status": "baru",
  "form": {
    "nama_anak": "Maria",
    "tanggal_lahir": "2024-01-15"
  },
  "timeline": [
    {
      "at": "2024-12-03T10:30:00.000Z",
      "by": "Jemaat Test",
      "action": "submitted",
      "note": "Pengajuan dibuat"
    }
  ],
  "created_at": "2024-12-03T10:30:00.000Z",
  "last_updated": "2024-12-03T10:30:00.000Z"
}
```

---

## 🔐 Role-Based Access Control

```
Role           | Can View              | Can Edit              | Can Delete
─────────────────────────────────────────────────────────────────────────
Admin          | All pengajuan         | All users             | All data
Tatausaha      | All pengajuan         | All pengajuan         | -
Sekretaris     | Disposisi to them     | Status (validate/return) | -
Pendeta        | Disposisi to them     | Status (validate/return) | -
Koordinator    | Own rayon only        | Status (verify/reject) | -
Jemaat         | Own submissions       | Own draft             | Own draft
```

---

**Diagram ini menunjukkan alur lengkap sistem dari arsitektur sampai detail workflow.**

Gunakan sebagai referensi untuk memahami bagaimana semua komponen bekerja bersama! 🚀
