const mongoose = require('mongoose');
const Pengajuan = require('./models/Pengajuan');

mongoose.connect('mongodb://127.0.0.1:27017/si_surat_gmit_yegar');

async function checkJemaatSurat() {
  try {
    console.log('🔍 Checking surat with status validated_by_pendeta...\n');
    
    // Find all surat that have been validated by pendeta
    const validatedSurat = await Pengajuan.find({
      status: 'validated_by_pendeta'
    });
    
    console.log('✅ Found', validatedSurat.length, 'surat with status validated_by_pendeta\n');
    
    if (validatedSurat.length > 0) {
      validatedSurat.forEach((surat, idx) => {
        console.log(`\n📄 Surat #${idx + 1}:`);
        console.log('   ID:', surat._id.toString());
        console.log('   Type:', surat.type || surat.tipe);
        console.log('   Status:', surat.status);
        console.log('   User ID:', surat.user_id);
        console.log('   User NIK:', surat.user_nik);
        console.log('   User Nama:', surat.user_nama);
        console.log('   Rayon:', surat.rayon);
        console.log('   Created:', surat.created_at);
        console.log('   Has final file data:', !!(surat.files && surat.files.final && surat.files.final.data));
        console.log('   Has final file url:', !!(surat.files && surat.files.final && surat.files.final.url));
        console.log('   Timeline entries:', surat.timeline ? surat.timeline.length : 0);
        
        if (surat.timeline && surat.timeline.length > 0) {
          const lastEntry = surat.timeline[surat.timeline.length - 1];
          console.log('   Last timeline action:', lastEntry.action);
          console.log('   Last timeline by:', lastEntry.by);
          console.log('   Last timeline note:', lastEntry.note);
        }
        
        // Transform to check what frontend will receive
        const transformed = surat.toObject();
        transformed.id = transformed._id.toString();
        console.log('\n   🔄 Frontend will receive:');
        console.log('      id:', transformed.id);
        console.log('      status:', transformed.status);
        console.log('      final_file exists:', !!transformed.final_file);
        console.log('      final_file_data exists:', !!transformed.final_file_data);
        console.log('      user_id:', transformed.user_id);
      });
      
      console.log('\n\n🧪 Testing API query filter...');
      const sampleUserId = validatedSurat[0].user_id || validatedSurat[0].user_nik;
      console.log('Sample user_id:', sampleUserId);
      
      const userSurat = await Pengajuan.find({
        $or: [
          { user_id: sampleUserId },
          { user_nik: sampleUserId },
          { nik: sampleUserId },
          { pemohon_nik: sampleUserId }
        ]
      });
      
      console.log('\n✅ User has', userSurat.length, 'total surat');
      console.log('Status breakdown:');
      const statusCount = {};
      userSurat.forEach(s => {
        statusCount[s.status] = (statusCount[s.status] || 0) + 1;
      });
      Object.keys(statusCount).forEach(status => {
        console.log(`   ${status}: ${statusCount[status]}`);
      });
    } else {
      console.log('⚠️  No surat found with status validated_by_pendeta');
      console.log('\nLet me check all statuses in database...');
      
      const allSurat = await Pengajuan.find({}).limit(10);
      console.log('\nTotal surat in DB:', await Pengajuan.countDocuments());
      console.log('\nSample statuses:');
      allSurat.forEach((s, idx) => {
        console.log(`   ${idx + 1}. Status: ${s.status}, Type: ${s.type}, User: ${s.user_nama}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  }
}

checkJemaatSurat();
