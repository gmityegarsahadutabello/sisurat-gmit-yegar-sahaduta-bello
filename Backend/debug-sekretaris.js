// Debug script to check pengajuan data for sekretaris
require('dotenv').config();
const mongoose = require('mongoose');
const Pengajuan = require('./models/Pengajuan');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get ALL pengajuan
    const all = await Pengajuan.find({}).sort({ created_at: -1 });
    console.log('\n📊 Total pengajuan in database:', all.length);
    
    // Filter by status
    const disposedToSek = all.filter(p => p.status === 'disposisi_to_sekretaris');
    console.log('\n🔍 Pengajuan with status "disposisi_to_sekretaris":', disposedToSek.length);
    
    if (disposedToSek.length > 0) {
      console.log('\n📋 Details of disposed-to-sekretaris items:');
      disposedToSek.forEach((p, idx) => {
        console.log(`\n--- Item ${idx + 1} ---`);
        console.log('  ID:', p._id);
        console.log('  Status:', p.status);
        console.log('  User:', p.user_nama);
        console.log('  Type:', p.type || p.tipe);
        console.log('  Created:', p.created_at);
        console.log('  Nomor:', p.nomor || p.nomor_surat || '-');
        
        // Check file fields in detail
        console.log('\n  File fields:');
        console.log('    final_file_data:', !!p.final_file_data, `(${(p.final_file_data || '').length} chars)`);
        console.log('    final_file:', !!p.final_file, `(${(p.final_file || '').length} chars)`);
        console.log('    final_file_url:', !!p.final_file_url);
        console.log('    files.final exists:', !!(p.files && p.files.final));
        
        if (p.files && p.files.final) {
          console.log('    files.final.data:', !!p.files.final.data, `(${(p.files.final.data || '').length} chars)`);
          console.log('    files.final.name:', p.files.final.name || '-');
          console.log('    files.final.url:', p.files.final.url || '-');
          console.log('    files.final.mime:', p.files.final.mime || '-');
          console.log('    files.final.size:', p.files.final.size || 0);
        }
        
        // Check if would pass frontend filter
        const hasFile = !!(
          p.final_file_data ||
          p.final_file ||
          (p.files && p.files.final && (p.files.final.data || p.files.final.name || p.files.final.url)) ||
          p.final_file_url
        );
        
        console.log('\n  ✅ Would appear in sekretaris list:', hasFile ? 'YES' : 'NO (missing file)');
        
        // Show timeline
        if (p.timeline && p.timeline.length > 0) {
          console.log('\n  Timeline (last 3):');
          p.timeline.slice(-3).forEach(t => {
            console.log(`    - ${t.action} by ${t.by} at ${t.at}`);
            if (t.note) console.log(`      Note: ${t.note}`);
          });
        }
      });
    } else {
      console.log('\n⚠️  No items with status "disposisi_to_sekretaris" found!');
      
      // Check other statuses
      console.log('\n📊 Status breakdown:');
      const statusCounts = {};
      all.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
      Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
    // Check what backend query would return for role=sekretaris
    console.log('\n\n🔍 Testing backend query for role=sekretaris...');
    const backendQuery = {
      status: { $in: ['disposisi_to_sekretaris', 'disposisi_to_pendeta', 'returned_by_sekretaris', 'validated_by_sekretaris'] }
    };
    const backendResult = await Pengajuan.find(backendQuery).sort({ created_at: -1 });
    console.log('Backend would return:', backendResult.length, 'items');
    
    if (backendResult.length > 0) {
      console.log('\nStatuses returned:');
      const backendStatuses = {};
      backendResult.forEach(p => {
        backendStatuses[p.status] = (backendStatuses[p.status] || 0) + 1;
      });
      Object.entries(backendStatuses).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debug();
