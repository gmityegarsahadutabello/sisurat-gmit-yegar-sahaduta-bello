const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('./models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sisurat_gmit_yegar';

async function checkNotifications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all notifications
    const allNotifs = await Notification.find({});
    console.log('📊 Total notifications in database:', allNotifs.length);
    
    if (allNotifs.length > 0) {
      console.log('\n📋 All notifications:');
      allNotifs.forEach((n, idx) => {
        console.log(`\n${idx + 1}. ID: ${n._id}`);
        console.log(`   Title: ${n.title}`);
        console.log(`   to_nik: "${n.to_nik}" (type: ${typeof n.to_nik})`);
        console.log(`   to_role: "${n.to_role}"`);
        console.log(`   user_id: "${n.user_id}"`);
        console.log(`   Date: ${n.tanggal || n.createdAt}`);
      });
    }

    // Try different queries
    console.log('\n\n🔍 Testing different queries for NIK 2306080078:\n');
    
    const query1 = await Notification.find({ to_nik: '2306080078' });
    console.log('1. String query { to_nik: "2306080078" }:', query1.length, 'results');
    
    const query2 = await Notification.find({ to_nik: 2306080078 });
    console.log('2. Number query { to_nik: 2306080078 }:', query2.length, 'results');
    
    const query3 = await Notification.find({ $or: [{ to_nik: '2306080078' }] });
    console.log('3. $or string query:', query3.length, 'results');
    
    const query4 = await Notification.find({ 
      $or: [
        { to_nik: '2306080078' },
        { to_nik: 2306080078 }
      ] 
    });
    console.log('4. $or both types:', query4.length, 'results');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
    process.exit(0);
  }
}

checkNotifications();
