// Test API endpoint untuk sekretaris
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoint: GET /api/pengajuan?role=sekretaris&status=disposisi_to_sekretaris');
    
    const response = await fetch('http://localhost:5000/api/pengajuan?role=sekretaris&status=disposisi_to_sekretaris');
    
    console.log('Status:', response.status, response.statusText);
    
    const data = await response.json();
    
    console.log('\n📊 Results:');
    console.log('  Count:', Array.isArray(data) ? data.length : 'Not an array');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('\n✅ Data found! First item:');
      const item = data[0];
      console.log('  ID:', item._id || item.id);
      console.log('  Status:', item.status);
      console.log('  User:', item.user_nama);
      console.log('  Type:', item.type || item.tipe);
      console.log('  Has final_file_data:', !!item.final_file_data);
      console.log('  Has files.final:', !!(item.files && item.files.final));
      
      // Check what frontend would see
      console.log('\n🔍 Frontend compatibility check:');
      console.log('  item.id exists:', !!item.id);
      console.log('  item._id exists:', !!item._id);
      console.log('  item.final_file_data length:', (item.final_file_data || '').length);
      console.log('  item.files?.final?.data length:', (item.files?.final?.data || '').length);
    } else {
      console.log('\n❌ No data returned!');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
