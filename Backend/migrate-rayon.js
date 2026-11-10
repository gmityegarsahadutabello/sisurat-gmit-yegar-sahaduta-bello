const mongoose = require('mongoose');
const User = require('./models/User');
const Pengajuan = require('./models/Pengajuan');
const { normalizeRayon } = require('./utils/helpers');
require('dotenv').config();

/**
 * Migration Script: Normalisasi nilai rayon
 *
 * Kenapa: nilai rayon sebelumnya bisa berbentuk 'Rayon 1', '1', 'Rayon A',
 * atau mengandung spasi berlebih. Filter rayon memakai perbandingan string
 * yang ketat, jadi format campuran membuat koordinator tidak melihat
 * pengajuan rayon-nya sendiri.
 *
 * Script ini mengubah semua nilai menjadi format kanonik: angka tanpa prefix.
 *
 * Usage:
 *   node migrate-rayon.js --dry-run   # lihat perubahan tanpa menyimpan
 *   node migrate-rayon.js             # jalankan migration
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function migrateCollection({ label, collection }) {
  const docs = await collection.find({ rayon: { $ne: null } }).toArray();
  const changes = docs
    .map((doc) => ({
      id: doc._id,
      from: doc.rayon,
      to: normalizeRayon(doc.rayon),
    }))
    .filter((change) => change.from !== change.to);

  console.log(`\n📄 ${label}: ${changes.length} dokumen perlu diubah`);

  for (const change of changes) {
    console.log(`   ${change.from} → ${change.to}`);
    if (!DRY_RUN) {
      await collection.updateOne(
        { _id: change.id },
        { $set: { rayon: change.to } },
      );
    }
  }

  return changes.length;
}

/**
 * Pengajuan menyimpan rayon dua kali (rayon dan user_rayon) untuk
 * kompatibilitas frontend, jadi keduanya harus ikut dinormalisasi.
 */
async function migratePengajuan() {
  const docs = await Pengajuan.find({}).lean();
  const changes = docs
    .map((doc) => ({
      id: doc._id,
      from: { rayon: doc.rayon, user_rayon: doc.user_rayon },
      to: {
        rayon: normalizeRayon(doc.rayon),
        user_rayon: normalizeRayon(doc.user_rayon),
      },
    }))
    .filter(
      (change) =>
        change.from.rayon !== change.to.rayon ||
        change.from.user_rayon !== change.to.user_rayon,
    );

  console.log(`\n📄 Pengajuan: ${changes.length} dokumen perlu diubah`);

  for (const change of changes) {
    console.log(
      `   rayon ${JSON.stringify(change.from.rayon)} → ${JSON.stringify(change.to.rayon)}, ` +
        `user_rayon ${JSON.stringify(change.from.user_rayon)} → ${JSON.stringify(change.to.user_rayon)}`,
    );
    if (!DRY_RUN) {
      await Pengajuan.updateOne(
        { _id: change.id },
        {
          $set: {
            rayon: change.to.rayon,
            user_rayon: change.to.user_rayon,
          },
        },
      );
    }
  }

  return changes.length;
}

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gmit-yegar');
    console.log('📡 Connected to MongoDB');
    console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN (tidak ada yang disimpan)' : 'LIVE'}`);

    const usersCollection = User.collection;
    let total = 0;

    total += await migrateCollection({ label: 'Users', collection: usersCollection });
    total += await migratePengajuan();

    console.log(
      `\n${DRY_RUN ? '🧪' : '✅'} Selesai. ${total} dokumen ${DRY_RUN ? 'akan diubah' : 'telah diubah'}.`,
    );

    const remaining = await usersCollection.countDocuments({
      rayon: { $regex: /^rayon\s/i },
    });
    console.log(`🔍 Sisa user dengan prefix "Rayon ": ${remaining}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
