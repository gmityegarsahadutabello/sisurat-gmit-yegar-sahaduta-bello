const mongoose = require('mongoose');
const User = require('./models/User');
const Pengajuan = require('./models/Pengajuan');
const Notification = require('./models/Notification');
require('dotenv').config();

/**
 * Migration Script: localStorage → MongoDB
 * 
 * Usage:
 * 1. Export data dari localStorage (lihat MIGRATION_TO_MONGODB.md)
 * 2. Simpan file JSON sebagai 'localstorage-backup.json' di folder Backend
 * 3. Jalankan: node migrate-localstorage.js
 */

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gmit_yegar_db');
    console.log('📡 Connected to MongoDB\n');

    // Load data dari file JSON
    let data;
    try {
      data = require('./localstorage-backup.json');
    } catch (err) {
      console.error('❌ File localstorage-backup.json tidak ditemukan!');
      console.log('💡 Cara export data dari localStorage:');
      console.log('   1. Buka browser console di halaman frontend');
      console.log('   2. Jalankan script export yang ada di MIGRATION_TO_MONGODB.md');
      console.log('   3. Simpan file JSON di folder Backend/');
      process.exit(1);
    }

    // Statistics
    let stats = {
      users: { created: 0, skipped: 0, errors: 0 },
      pengajuan: { created: 0, skipped: 0, errors: 0 },
      notifications: { created: 0, skipped: 0, errors: 0 }
    };

    // ===== MIGRATE USERS =====
    console.log('👤 Migrating Users...');
    console.log('─'.repeat(50));
    
    const users = data.users || [];
    for (const u of users) {
      try {
        // Check if user exists
        const exists = await User.findOne({ 
          $or: [{ email: u.email }, { nik: u.nik }] 
        });
        
        if (exists) {
          console.log(`  ⏭️  Skipped (exists): ${u.email || u.nik}`);
          stats.users.skipped++;
          continue;
        }

        // Create user
        await User.create({
          nik: u.nik,
          name: u.nama || u.name,
          email: u.email,
          password: u.password || 'changeme123', // Default password if missing
          role: u.role || 'jemaat',
          rayon: u.rayon,
          address: u.address
        });

        console.log(`  ✅ Created: ${u.email} (${u.role})`);
        stats.users.created++;

      } catch (err) {
        console.error(`  ❌ Error: ${u.email}:`, err.message);
        stats.users.errors++;
      }
    }

    // ===== MIGRATE PENGAJUAN =====
    console.log('\n📄 Migrating Pengajuan...');
    console.log('─'.repeat(50));

    const pengajuanList = data.pengajuan || [];
    for (const p of pengajuanList) {
      try {
        // Check if pengajuan exists (by user_id and creation date)
        const createdDate = p.created_at || p.createdAt || new Date();
        const exists = await Pengajuan.findOne({ 
          user_id: p.user_id,
          created_at: createdDate
        });

        if (exists) {
          console.log(`  ⏭️  Skipped: ${p.user_nama || p.user_id} - ${p.type || p.tipe}`);
          stats.pengajuan.skipped++;
          continue;
        }

        // Create pengajuan
        const newPengajuan = await Pengajuan.create({
          user_id: p.user_id || p.id,
          user_nik: p.user_nik || p.pemohon_nik || '',
          user_nama: p.user_nama || p.pemohon_nama || 'Unknown',
          user_email: p.user_email || p.email || '',
          user_rayon: p.user_rayon || p.rayon || '',
          rayon: p.rayon || p.user_rayon || '',
          type: p.type || p.tipe || 'lainnya',
          tipe: p.tipe || p.type || 'lainnya',
          status: p.status || 'baru',
          form: p.form || p.formData || {},
          meta: p.meta || {},
          timeline: p.timeline || p.history || [],
          draft_file: p.draft_file,
          draft_text: p.draft_text || p.draft_surat,
          final_file: p.final_file || p.final_file_data,
          final_file_name: p.final_file_name || p.file_name,
          final_file_type: p.final_file_type,
          final_file_size: p.final_file_size,
          nomor_surat: p.nomor_surat || p.nomor,
          koor_note: p.koor_note || p.rejection_note,
          sekretaris_note: p.sekretaris_note,
          pendeta_note: p.pendeta_note,
          catatan: p.catatan,
          validated_at: p.validated_at,
          archived_at: p.archived_at,
          created_at: createdDate,
          last_updated: p.last_updated || p.updatedAt || new Date()
        });

        console.log(`  ✅ Created: ${p.user_nama} - ${p.type || p.tipe} (${p.status})`);
        stats.pengajuan.created++;

      } catch (err) {
        console.error(`  ❌ Error for ${p.user_id}:`, err.message);
        stats.pengajuan.errors++;
      }
    }

    // ===== MIGRATE NOTIFICATIONS =====
    console.log('\n🔔 Migrating Notifications...');
    console.log('─'.repeat(50));

    const notifications = data.notifications || [];
    for (const n of notifications) {
      try {
        // Check if notification exists
        const tanggal = n.tanggal || n.createdAt || new Date();
        const exists = await Notification.findOne({
          user_id: n.user_id,
          tanggal: tanggal,
          title: n.title || n.judul
        });

        if (exists) {
          console.log(`  ⏭️  Skipped: ${n.title || n.judul}`);
          stats.notifications.skipped++;
          continue;
        }

        // Create notification
        await Notification.create({
          user_id: n.user_id,
          to_role: n.to_role,
          to_nik: n.to_nik,
          type: n.type || 'info',
          title: n.title || n.judul || '',
          judul: n.judul || n.title || '',
          message: n.message || n.pesan || '',
          pesan: n.pesan || n.message || '',
          pengajuan_id: n.pengajuan_id || n.ref_id,
          is_read: n.is_read || n.read || false,
          read: n.read || n.is_read || false,
          url: n.url || '',
          tanggal: tanggal
        });

        console.log(`  ✅ Created: ${n.title || n.judul}`);
        stats.notifications.created++;

      } catch (err) {
        console.error(`  ❌ Error:`, err.message);
        stats.notifications.errors++;
      }
    }

    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`\n👤 Users:`);
    console.log(`   ✅ Created:  ${stats.users.created}`);
    console.log(`   ⏭️  Skipped:  ${stats.users.skipped}`);
    console.log(`   ❌ Errors:   ${stats.users.errors}`);
    
    console.log(`\n📄 Pengajuan:`);
    console.log(`   ✅ Created:  ${stats.pengajuan.created}`);
    console.log(`   ⏭️  Skipped:  ${stats.pengajuan.skipped}`);
    console.log(`   ❌ Errors:   ${stats.pengajuan.errors}`);
    
    console.log(`\n🔔 Notifications:`);
    console.log(`   ✅ Created:  ${stats.notifications.created}`);
    console.log(`   ⏭️  Skipped:  ${stats.notifications.skipped}`);
    console.log(`   ❌ Errors:   ${stats.notifications.errors}`);

    console.log('\n✅ Migration completed successfully!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrate();
