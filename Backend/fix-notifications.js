/**
 * Fix existing notifications - set to_nik for jemaat notifications
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('./models/Notification');
const Pengajuan = require('./models/Pengajuan');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sisurat_gmit_yegar';

async function fixNotifications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all notifications
    const allNotifs = await Notification.find({});
    console.log('📊 Total notifications:', allNotifs.length);

    let fixed = 0;
    let created = 0;

    // Fix existing notifications that have related_id but no to_nik
    for (const notif of allNotifs) {
      if (!notif.to_nik && notif.related_id) {
        // Get pengajuan to find user_nik
        const pengajuan = await Pengajuan.findById(notif.related_id);
        if (pengajuan && pengajuan.user_nik) {
          notif.to_nik = pengajuan.user_nik;
          notif.user_id = pengajuan.user_id || pengajuan.user_nik;
          notif.to_role = 'jemaat';
          await notif.save();
          console.log(`✅ Fixed notification: ${notif.title} -> NIK: ${notif.to_nik}`);
          fixed++;
        }
      }
    }

    // Create test notifications for jemaat with NIK 2306080078
    const testNotif = await Notification.create({
      to_nik: '2306080078',
      user_id: '2306080078',
      to_role: 'jemaat',
      type: 'info',
      title: 'Notifikasi Test',
      judul: 'Notifikasi Test',
      message: 'Ini adalah notifikasi test untuk memastikan sistem berfungsi dengan baik.',
      pesan: 'Ini adalah notifikasi test untuk memastikan sistem berfungsi dengan baik.',
      url: 'dashboard.html'
    });
    console.log('✅ Created test notification:', testNotif.title);
    created++;

    // Verify
    const jemaatNotifs = await Notification.find({ to_nik: '2306080078' });
    console.log(`\n📧 Total notifications for NIK 2306080078: ${jemaatNotifs.length}`);
    jemaatNotifs.forEach((n, idx) => {
      console.log(`   ${idx + 1}. ${n.title} - ${n.message}`);
    });

    console.log(`\n✅ Fixed: ${fixed} notifications`);
    console.log(`✅ Created: ${created} notifications`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
    process.exit(0);
  }
}

fixNotifications();
