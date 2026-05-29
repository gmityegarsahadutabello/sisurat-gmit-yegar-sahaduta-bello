/**
 * Test Script: Create sample notification for Jemaat
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('./models/Notification');
const Pengajuan = require('./models/Pengajuan');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sisurat_gmit_yegar';

async function createTestNotification() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a sample pengajuan for jemaat with NIK 2306080078
    const pengajuan = await Pengajuan.findOne({ user_nik: '2306080078' });
    
    if (!pengajuan) {
      console.log('❌ No pengajuan found for NIK 2306080078');
      console.log('Creating test notification without pengajuan reference...');
      
      // Create notification without pengajuan
      const notif = await Notification.create({
        to_nik: '2306080078',
        user_id: '2306080078',
        to_role: 'jemaat',
        type: 'info',
        title: 'Test Notifikasi',
        judul: 'Test Notifikasi',
        message: 'Ini adalah notifikasi test untuk memastikan sistem berfungsi.',
        pesan: 'Ini adalah notifikasi test untuk memastikan sistem berfungsi.',
        url: 'dashboard.html'
      });
      
      console.log('✅ Test notification created:', notif);
    } else {
      console.log('✅ Found pengajuan:', pengajuan._id);
      console.log('   Type:', pengajuan.type);
      console.log('   Status:', pengajuan.status);
      
      // Create notification for this jemaat
      const notif = await Notification.create({
        to_nik: pengajuan.user_nik,
        user_id: pengajuan.user_id,
        to_role: 'jemaat',
        type: 'surat_masuk',
        title: 'Update Status Surat',
        judul: 'Update Status Surat',
        message: `Surat ${pengajuan.type} Anda sedang dalam proses. Status: ${pengajuan.status}`,
        pesan: `Surat ${pengajuan.type} Anda sedang dalam proses. Status: ${pengajuan.status}`,
        related_id: pengajuan._id,
        url: `pengajuan-detail.html?id=${pengajuan._id}`
      });
      
      console.log('✅ Notification created:', notif);
    }
    
    // List all notifications for this jemaat
    const allNotifs = await Notification.find({ to_nik: '2306080078' }).sort({ tanggal: -1 });
    console.log('\n📧 Total notifications for NIK 2306080078:', allNotifs.length);
    allNotifs.forEach((n, idx) => {
      console.log(`   ${idx + 1}. ${n.title} - ${n.message}`);
      console.log(`      Date: ${n.tanggal || n.createdAt}`);
      console.log(`      Read: ${n.is_read || n.read || false}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  }
}

createTestNotification();
