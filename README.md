# 📧 GMIT YEGAR - Sistem Informasi Surat

Sistem manajemen surat gereja berbasis web dengan MongoDB backend.

## 🚀 Quick Start

### Opsi 1: Automated Setup (Recommended)

```powershell
# Run setup script
.\setup.ps1
```

Script akan otomatis:
- ✅ Check MongoDB installation
- ✅ Start MongoDB service
- ✅ Install dependencies
- ✅ Create .env file
- ✅ Seed sample data
- ✅ Start servers

### Opsi 2: Manual Setup

```powershell
# 1. Start MongoDB
net start MongoDB

# 2. Install Backend Dependencies
cd Backend
npm install

# 3. Seed Database
node seeder.js -i

# 4. Start Backend Server
node server.js

# 5. Start Frontend Server (new terminal)
cd Frontend
npx http-server -p 8080 -c-1

# 6. Open Browser
# http://localhost:8080
```

## 📋 Test Accounts

```
ADMIN:       admin@gmityegar.com / admin123
TATAUSAHA:   tu@gmityegar.com / tu123456
SEKRETARIS:  sekretaris@gmityegar.com / sekretaris123
PENDETA:     pendeta@gmityegar.com / pendeta123
KOORDINATOR: koor.a@gmityegar.com / koor123
JEMAAT:      jemaat.a@gmityegar.com / jemaat123
```

## 🏗️ Tech Stack

**Backend:**
- Node.js + Express 5.2.1
- MongoDB + Mongoose 9.0.0
- bcryptjs 3.0.3 (password hashing)
- CORS enabled

**Frontend:**
- Vanilla JavaScript
- Bootstrap 5.3.0
- Fetch API for HTTP requests

## 📁 Project Structure

```
GMIT YEGAR/
├── Backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/           # Business logic
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API routes
│   ├── utils/
│   │   └── helpers.js         # Utility functions
│   ├── .env                   # Environment variables
│   ├── server.js              # Express server
│   └── seeder.js              # Database seeder
├── Frontend/
│   ├── assets/
│   │   ├── js/
│   │   │   ├── api.js         # API client
│   │   │   └── ...            # Role-specific JS
│   │   ├── css/               # Stylesheets
│   │   └── components/        # Reusable components
│   ├── pages/                 # Role-based pages
│   └── index.html             # Login page
├── setup.ps1                  # Automated setup script
├── MONGODB_COMPLETE_GUIDE.md  # Complete documentation
└── README.md                  # This file
```

## 🔌 API Endpoints

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Pengajuan (Submissions)
- `POST /api/pengajuan` - Create submission
- `GET /api/pengajuan` - Get all (with filters)
- `GET /api/pengajuan/:id` - Get by ID
- `PUT /api/pengajuan/:id` - Update submission
- `PUT /api/pengajuan/:id/status` - Update status
- `DELETE /api/pengajuan/:id` - Delete submission

### Notifications
- `GET /api/notifications` - Get notifications (with filters)
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

## 🔄 Workflow

```
Jemaat (Submit)
    ↓
Koordinator (Verify/Reject)
    ↓
Tata Usaha (Upload File, Create Letter)
    ↓
Sekretaris (Review, Validate/Return)
    ↓
Pendeta (Final Validation/Return)
    ↓
Arsip (Archive)
```

## 📊 Database Schema

### Users Collection
```javascript
{
  nik: String (unique, indexed),
  name: String,
  email: String (unique, indexed),
  password: String (hashed),
  role: Enum (admin, tatausaha, sekretaris, pendeta, koordinator, jemaat),
  rayon: String (indexed)
}
```

### Pengajuans Collection
```javascript
{
  user_id, user_nik, user_nama, user_email, user_rayon,
  rayon: String (indexed),
  type: String (baptis, nikah, sidi, etc.),
  status: String (27 values, indexed),
  form: Object (dynamic based on type),
  final_file: String (base64),
  nomor_surat: String,
  timeline: Array (audit trail)
}
```

### Notifications Collection
```javascript
{
  user_id: String,
  to_role: String,
  type: String,
  title: String,
  message: String,
  is_read: Boolean,
  related_id: ObjectId
}
```

## 🛠️ Development

### Seed Fresh Data
```powershell
cd Backend
node seeder.js -i
```

### Delete All Data
```powershell
cd Backend
node seeder.js -d
```

### MongoDB Commands
```javascript
// Connect
mongosh

use gmit_yegar_db

// View data
db.users.find().pretty()
db.pengajuans.find().pretty()
db.notifications.find().pretty()

// Count documents
db.users.countDocuments()
db.pengajuans.countDocuments()
```

### Backend Development
```powershell
cd Backend

# Start with auto-reload (install nodemon first)
npm install -g nodemon
nodemon server.js
```

## 🐛 Troubleshooting

### MongoDB Connection Failed
```powershell
# Check service
net start MongoDB

# Or start manually
mongod --dbpath "C:\data\db"
```

### CORS Error
Pastikan backend running di port 5000 dan CORS middleware aktif.

### Login Gagal
1. Pastikan database sudah di-seed: `node seeder.js -i`
2. Check email/password dari daftar akun testing
3. Check backend logs

### Data Tidak Muncul
1. Check backend running: `curl http://localhost:5000/`
2. Check browser console untuk error
3. Check Network tab di DevTools

## 📚 Documentation

Lihat **MONGODB_COMPLETE_GUIDE.md** untuk:
- Setup lengkap
- Struktur database detail
- API documentation
- Query examples
- Best practices
- Production deployment guide

## 🔐 Security Features

- ✅ Password hashing dengan bcrypt
- ✅ Input validation & sanitization
- ✅ MongoDB injection prevention
- ✅ Field-level access control
- ✅ Role-based authorization

## 🎯 Features

- ✅ Multi-role authentication (6 roles)
- ✅ Dynamic letter form based on type
- ✅ File upload (base64)
- ✅ Real-time notifications
- ✅ Timeline/audit trail
- ✅ Status workflow (27 states)
- ✅ Letter numbering system
- ✅ Role-based filtering
- ✅ Search & filter

## 📞 Support

Untuk bantuan lebih lanjut:
1. Check MONGODB_COMPLETE_GUIDE.md
2. Check server logs
3. Check browser console
4. Re-seed database

## 📄 License

Internal use - GMIT Yegar Sahaduta Bello

---

**✅ System menggunakan 100% MongoDB - No localStorage!**
