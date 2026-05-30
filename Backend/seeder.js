/**
 * Database Seeder
 * Seeds initial data for development and testing
 * Usage: node seeder.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Pengajuan = require("./models/Pengajuan");
const Notification = require("./models/Notification");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// Sample users
const users = [
  {
    nik: "1234567890123456",
    name: "Administrator",
    email: "admin@gmityegar.com",
    password: "admin123",
    role: "admin",
    rayon: null,
  },
  {
    nik: "1234567890123457",
    name: "Staff Tata Usaha",
    email: "tu@gmityegar.com",
    password: "tu123456",
    role: "tatausaha",
    rayon: null,
  },
  {
    nik: "1234567890123458",
    name: "Sekretaris GMIT",
    email: "sekretaris@gmityegar.com",
    password: "sekretaris123",
    role: "sekretaris",
    rayon: null,
  },
  {
    nik: "1234567890123459",
    name: "Pendeta GMIT",
    email: "pendeta@gmityegar.com",
    password: "pendeta123",
    role: "pendeta",
    rayon: null,
  },
  {
    nik: "1234567890123460",
    name: "Koordinator Rayon A",
    email: "koor.a@gmityegar.com",
    password: "koor123",
    role: "koordinator",
    rayon: "Rayon A",
  },
  {
    nik: "1234567890123461",
    name: "Koordinator Rayon B",
    email: "koor.b@gmityegar.com",
    password: "koor123",
    role: "koordinator",
    rayon: "Rayon B",
  },
  {
    nik: "1234567890123462",
    name: "Jemaat Test A",
    email: "jemaat.a@gmityegar.com",
    password: "jemaat123",
    role: "jemaat",
    rayon: "Rayon A",
  },
  {
    nik: "1234567890123463",
    name: "Jemaat Test B",
    email: "jemaat.b@gmityegar.com",
    password: "jemaat123",
    role: "jemaat",
    rayon: "Rayon B",
  },
];

// Import data
const importData = async () => {
  try {
    console.log("🔄 Clearing existing data...");
    await User.deleteMany();
    await Pengajuan.deleteMany();
    await Notification.deleteMany();

    console.log("📥 Importing users...");
    const usersWithHashedPasswords = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: user.password?.startsWith("$2")
          ? user.password
          : await bcrypt.hash(user.password, 10),
      })),
    );
    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`✅ ${createdUsers.length} users imported`);

    // Create sample pengajuan
    const jemaatA = createdUsers.find(
      (u) => u.email === "jemaat.a@gmityegar.com",
    );
    const jemaatB = createdUsers.find(
      (u) => u.email === "jemaat.b@gmityegar.com",
    );

    const samplePengajuan = [
      {
        user_id: jemaatA._id.toString(),
        user_nik: jemaatA.nik,
        user_nama: jemaatA.name,
        user_email: jemaatA.email,
        user_rayon: jemaatA.rayon,
        rayon: jemaatA.rayon,
        type: "baptis",
        tipe: "baptis",
        status: "proses",
        form: {
          nama_anak: "Maria Agustina",
          tanggal_lahir: "2024-01-15",
          tempat_lahir: "Kupang",
          nama_ayah: "Yohanes Boli",
          nama_ibu: "Sara Boli",
        },
        timeline: [
          {
            at: new Date(),
            by: jemaatA.name,
            action: "submitted",
            note: "Pengajuan dibuat",
          },
        ],
      },
      {
        user_id: jemaatB._id.toString(),
        user_nik: jemaatB.nik,
        user_nama: jemaatB.name,
        user_email: jemaatB.email,
        user_rayon: jemaatB.rayon,
        rayon: jemaatB.rayon,
        type: "nikah",
        tipe: "nikah",
        status: "diterima",
        form: {
          nama_pria: "David Kabes",
          nama_wanita: "Ruth Nope",
          tanggal_nikah: "2024-12-25",
          tempat_nikah: "GMIT Yegar",
        },
        timeline: [
          {
            at: new Date(Date.now() - 86400000),
            by: jemaatB.name,
            action: "submitted",
            note: "Pengajuan dibuat",
          },
          {
            at: new Date(),
            by: "Koordinator Rayon B",
            action: "diterima",
            note: "Diverifikasi oleh koordinator",
          },
        ],
      },
    ];

    console.log("📥 Importing sample pengajuan...");
    const createdPengajuan = await Pengajuan.insertMany(samplePengajuan);
    console.log(`✅ ${createdPengajuan.length} pengajuan imported`);

    // Create sample notifications
    const sampleNotifications = [
      {
        user_id: jemaatA._id.toString(),
        to_role: null,
        to_nik: jemaatA.nik,
        type: "surat_dibuat",
        title: "Pengajuan Berhasil Dibuat",
        judul: "Pengajuan Berhasil Dibuat",
        message:
          "Pengajuan surat baptis Anda telah berhasil dibuat dan menunggu verifikasi koordinator.",
        pesan:
          "Pengajuan surat baptis Anda telah berhasil dibuat dan menunggu verifikasi koordinator.",
        related_id: createdPengajuan[0]._id,
        is_read: false,
      },
      {
        user_id: null,
        to_role: "koordinator",
        to_nik: null,
        type: "surat_masuk",
        title: "Pengajuan Baru",
        judul: "Pengajuan Baru",
        message:
          "Ada pengajuan surat baru dari Rayon A yang perlu diverifikasi.",
        pesan: "Ada pengajuan surat baru dari Rayon A yang perlu diverifikasi.",
        related_id: createdPengajuan[0]._id,
        is_read: false,
      },
    ];

    console.log("📥 Importing sample notifications...");
    const createdNotifications =
      await Notification.insertMany(sampleNotifications);
    console.log(`✅ ${createdNotifications.length} notifications imported`);

    console.log("\n✅ Data import complete!");
    console.log("\n📋 Test Accounts:");
    console.log("==========================================");
    users.forEach((u) => {
      console.log(`${u.role.toUpperCase()}: ${u.email} / ${u.password}`);
    });
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error importing data:", error);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    console.log("🗑️  Deleting all data...");
    await User.deleteMany();
    await Pengajuan.deleteMany();
    await Notification.deleteMany();
    console.log("✅ All data deleted!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting data:", error);
    process.exit(1);
  }
};

// Parse command line arguments
if (process.argv[2] === "-d" || process.argv[2] === "--delete") {
  deleteData();
} else if (process.argv[2] === "-i" || process.argv[2] === "--import") {
  importData();
} else {
  console.log("Usage:");
  console.log("  node seeder.js -i     # Import sample data");
  console.log("  node seeder.js -d     # Delete all data");
  process.exit(0);
}
