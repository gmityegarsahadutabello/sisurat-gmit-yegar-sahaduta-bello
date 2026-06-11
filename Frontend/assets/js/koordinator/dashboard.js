// Dashboard Koordinator Logic
(function () {
  // Main Function to Load and Render Data
  async function loadDashboardData() {
    // 1. Get Current User & Rayon
    let currentUser = {};
    try {
      currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch (e) {
      currentUser = {};
    }

    const rayon = currentUser.rayon || sessionStorage.getItem("rayon");
    console.log("rayon: ", rayon);

    // Update Welcome Message
    const elName = document.getElementById("welcome-name");
    const elRole = document.getElementById("welcome-role");
    if (elName) elName.textContent = currentUser.nama || "Koordinator";
    if (elRole)
      elRole.textContent = rayon ? `Koordinator ${rayon}` : "Koordinator Rayon";

    // 2. Get All Submissions
    let allSubmissions = [];
    try {
      allSubmissions = await API.pengajuan.getAll();
    } catch (e) {
      allSubmissions = [];
    }

    // 3. Get Users for Rayon Resolution (if submission lacks rayon)
    let users = [];
    try {
      users = await API.users.getAll();
    } catch (e) {
      users = [];
    }

    // 4. Filter by Rayon
    const targetRayon = rayon ? String(rayon).toLowerCase() : null;

    const filteredSubmissions = targetRayon
      ? allSubmissions.filter((item) => {
          // Check direct rayon property
          const itemRayon = String(
            item.rayon || item.user_rayon || "",
          ).toLowerCase();
          if (
            itemRayon &&
            (itemRayon === targetRayon ||
              itemRayon.includes(targetRayon) ||
              targetRayon.includes(itemRayon))
          ) {
            return true;
          }

          // Resolve via user list if rayon missing on item
          const applicant = users.find(
            (u) =>
              (u.nik &&
                item.user_nik &&
                String(u.nik) === String(item.user_nik)) ||
              (u.email && u.email === item.user_email) ||
              (u.id && item.user_id && String(u.id) === String(item.user_id)),
          );

          if (applicant && applicant.rayon) {
            const userRayon = String(applicant.rayon).toLowerCase();
            return (
              userRayon === targetRayon ||
              userRayon.includes(targetRayon) ||
              targetRayon.includes(userRayon)
            );
          }

          return false;
        })
      : allSubmissions;

    // 5. Calculate Stats
    // Surat Masuk = Belum diverifikasi (sama seperti filter di daftar-surat-masuk.js)
    // Surat Divalidasi = Sudah diverifikasi oleh koordinator
    let suratMasukCount = 0;
    let suratDivalidasiCount = 0;

    // Status yang dikecualikan dari surat masuk (sudah diproses/diverifikasi)
    const excludedStatuses = [
      "diterima",
      "diverifikasi",
      "terverifikasi",
      "ditolak",
      "disposisi_to_sekretaris",
      "disposisi_to_pendeta",
      "disposisi_to_tatausaha",
      "verified_by_koordinator",
      "surat_dibuat",
      "validated_by_pendeta",
      "validated",
      "archived",
    ];

    filteredSubmissions.forEach((item) => {
      const s = String(item.status || "").toLowerCase();

      // Surat Masuk: status TIDAK termasuk dalam excludedStatuses DAN verified_by_koordinator BUKAN true
      const isMasuk =
        !excludedStatuses.includes(s) && item.verified_by_koordinator !== true;

      if (isMasuk) {
        suratMasukCount++;
      } else {
        // Surat Divalidasi: sudah diverifikasi oleh koordinator
        // EXCLUDE surat yang ditolak (sesuai dengan daftar-diverifikasi.js line 45-47)
        if (s === "ditolak" || s === "rejected" || s === "rejected_by_koor") {
          return; // Skip - rejected letters are not counted as verified
        }

        // Double check: hanya hitung jika verified_by_rayon cocok dengan rayon koordinator ini
        const itemVerifiedRayon = String(item.verified_by_rayon || "");
        if (
          !itemVerifiedRayon ||
          !targetRayon ||
          itemVerifiedRayon === targetRayon
        ) {
          suratDivalidasiCount++;
        }
      }
    });

    // Render Stats
    const elUnverified = document.getElementById("total-unverified");
    const elVerified = document.getElementById("total-verified");
    if (elUnverified) elUnverified.textContent = suratMasukCount;
    if (elVerified) elVerified.textContent = suratDivalidasiCount;

    // Note: recent activity UI removed — dashboard now focuses only on stats and links to lists
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();

    // Listen for storage changes to update in real-time
    window.addEventListener("storage", (e) => {
      if (e.key === "local_pengajuan" || e.key === "currentUser") {
        loadDashboardData();
      }
    });
  });
})();
