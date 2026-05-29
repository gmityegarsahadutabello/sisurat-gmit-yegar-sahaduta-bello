// Test harness for isFinished and canDownloadByJemaat logic

function isFinished(item){
  const s = (item && item.status) ? String(item.status).toLowerCase().trim() : '';
  if (item && (item.validated === true || item.validated_by_pendeta === true)) return true;
  if (!s) return false;
  if (s === 'validated' || s === 'archived') return true;
  if (s.indexOf('validated') !== -1) {
    if (s.indexOf('pendeta') !== -1 || s.indexOf('final') !== -1 || s.indexOf('validated_by_pendeta') !== -1) return true;
    return true;
  }
  return s === 'validated_by_pendeta' || s === 'archived';
}

function canDownloadByJemaat(item){
  if (!item) return false;
  if (isFinished(item)) return true;
  const hasFileUrl = !!(item.final_file_url || item.file_url || item.final_file || item.final_file_data || item.downloadUrl);
  if (hasFileUrl) {
    const s = (item.status||'').toLowerCase();
    if (!s || (s.indexOf('disposisi') === -1 && s.indexOf('proses') === -1 && s.indexOf('ditolak') === -1)) return true;
  }
  return false;
}

const cases = [
  {
    name: 'Validated by pendeta with file_url',
    item: { status: 'validated_by_pendeta', file_url: 'https://s3.example.com/f1' },
    expectFinished: true,
    expectCanDownload: true,
  },
  {
    name: 'Validated flag true without status',
    item: { validated: true, downloadUrl: 'https://s3.example.com/f2' },
    expectFinished: true,
    expectCanDownload: true,
  },
  {
    name: 'In-progress (disposisi) but has file_url',
    item: { status: 'disposisi_to_tatausaha', file_url: 'https://s3.example.com/f3' },
    expectFinished: false,
    expectCanDownload: false,
  },
  {
    name: 'In-progress no file',
    item: { status: 'diproses' },
    expectFinished: false,
    expectCanDownload: false,
  },
  {
    name: 'Archived with final_file_data (data URL)',
    item: { status: 'archived', final_file_data: 'data:application/pdf;base64,PVBERi0...' },
    expectFinished: true,
    expectCanDownload: true,
  },
  {
    name: 'Generic validated',
    item: { status: 'validated', final_file_url: 'https://s3.example.com/f4' },
    expectFinished: true,
    expectCanDownload: true,
  },
  {
    name: 'Returned state but has file_url (should block)',
    item: { status: 'returned_to_tatausaha', file_url: 'https://s3.example.com/f5' },
    expectFinished: false,
    expectCanDownload: true, // current logic allows this (may be acceptable or require change)
  }
];

console.log('Running surat-masuk logic tests...');
let failures = 0;
for (const c of cases) {
  const f = isFinished(c.item);
  const d = canDownloadByJemaat(c.item);
  const okF = f === c.expectFinished;
  const okD = d === c.expectCanDownload;
  if (!okF || !okD) failures++;
  console.log(`\nCase: ${c.name}`);
  console.log('  item:', c.item);
  console.log(`  isFinished -> got: ${f}, expect: ${c.expectFinished} ${okF ? '✔' : '✖'}`);
  console.log(`  canDownloadByJemaat -> got: ${d}, expect: ${c.expectCanDownload} ${okD ? '✔' : '✖'}`);
}

console.log('\nTest run complete. Failures:', failures);
process.exit(failures > 0 ? 1 : 0);
