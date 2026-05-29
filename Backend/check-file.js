require('dotenv').config();
const mongoose = require('mongoose');
const Pengajuan = require('./models/Pengajuan');

async function checkFiles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const docs = await Pengajuan.find({ status: 'disposisi_to_sekretaris' });
    console.log(`\n📊 Found ${docs.length} surat with status disposisi_to_sekretaris\n`);
    
    docs.forEach((doc, idx) => {
      const d = doc.toObject();
      console.log(`--- Surat ${idx + 1} (ID: ${d._id}) ---`);
      console.log('Status:', d.status);
      console.log('Jenis:', d.type || d.jenis);
      console.log('Nama:', d.user_nama || d.nama);
      console.log('\nFile Check:');
      console.log('  - final_file_data:', !!d.final_file_data);
      console.log('  - final_file:', !!d.final_file);
      console.log('  - files.final.data:', !!(d.files && d.files.final && d.files.final.data));
      console.log('  - final_file_url:', !!d.final_file_url);
      
      if (d.files) {
        console.log('\nFiles structure:', JSON.stringify(d.files, null, 2));
      }
      
      const hasFile = !!(
        d.final_file_data || 
        d.final_file || 
        (d.files && d.files.final && d.files.final.data) ||
        d.final_file_url
      );
      
      console.log('\n❓ Will appear in sekretaris list?', hasFile ? '✅ YES' : '❌ NO (missing file)');
      console.log('---\n');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFiles();
