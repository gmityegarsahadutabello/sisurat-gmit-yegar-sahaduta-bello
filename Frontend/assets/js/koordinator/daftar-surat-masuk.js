/*
  Koordinator - Daftar Surat Masuk (belum diverifikasi)
  - Baca dari API.pengajuan.getAll()
  - Filter berdasarkan rayon dari sessionStorage('rayon')
  - Tampilkan detail rapi dua kolom (label : value)
  - Modal konfirmasi modern untuk Verifikasi & Tolak
*/
(function () {
  // helpers
  function $(sel) {
    return document.querySelector(sel);
  }
  function escapeHtml(s) {
    return String(s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  }
  function fmtDateTime(ts) {
    try {
      const d = new Date(ts);
      if (isNaN(d)) return "-";
      return (
        d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }) +
        " " +
        d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );
    } catch (e) {
      return ts || "-";
    }
  }

  // DOM refs
  const tbody = document.getElementById("pengajuan-tbody");
  const startEl = document.getElementById("filter-start");
  const endEl = document.getElementById("filter-end");
  const applyBtn = document.getElementById("filter-apply");
  const resetBtn = document.getElementById("filter-reset");

  const dialog = document.getElementById("detail-modal");
  const detailBody = document.getElementById("detail-body");
  const detailJudul = document.getElementById("detail-judul");
  // header action buttons removed from markup; use footer buttons created inside detailBody instead
  const btnCloseBottom = document.getElementById("detail-close-bottom");

  const confirmVerifyModal = document.getElementById("confirm-verify-modal");
  const confirmVerifyMsg = document.getElementById("confirm-verify-msg");
  const confirmVerifyYes = document.getElementById("confirm-verify-yes");
  const confirmVerifyCancel = document.getElementById("confirm-verify-cancel");
  const confirmVerifySpinner = document.getElementById(
    "confirm-verify-spinner",
  );
  const confirmVerifyLabel = document.getElementById("confirm-verify-label");

  const confirmRejectModal = document.getElementById("confirm-reject-modal");
  const rejectReasonEl = document.getElementById("reject-reason");
  const confirmRejectYes = document.getElementById("confirm-reject-yes");
  const confirmRejectCancel = document.getElementById("confirm-reject-cancel");
  const confirmRejectSpinner = document.getElementById(
    "confirm-reject-spinner",
  );
  const confirmRejectLabel = document.getElementById("confirm-reject-label");

  let currentItem = null;
  let pendingActionId = null;

  function getRayon() {
    return (
      sessionStorage.getItem("rayon") ||
      (() => {
        try {
          const u = JSON.parse(localStorage.getItem("currentUser") || "null");
          console.log("getRayon: ", u.rayon);
          return u && u.rayon ? u.rayon : null;
        } catch (e) {
          return null;
        }
      })()
    );
  }

  function renderField(label, value) {
    return `<div class="detail-row"><div class="label">${escapeHtml(label)}</div><div class="value">${value === undefined || value === null ? "-" : value}</div></div>`;
  }

  function computeAge(dobStr, refDate) {
    if (!dobStr) return null;
    let dob = new Date(dobStr);
    if (isNaN(dob)) {
      // try parse legacy ttl format "Place, DD-MM-YYYY"
      const parts = String(dobStr).split(",");
      if (parts.length >= 2) {
        const datePart = parts[1].trim();
        const [d, m, y] = datePart.split("-");
        if (d && m && y) dob = new Date(`${y}-${m}-${d}`);
      }
    }
    if (isNaN(dob)) return null;
    const ref = refDate ? new Date(refDate) : new Date();
    let age = ref.getFullYear() - dob.getFullYear();
    const monthDiff = ref.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate()))
      age--;
    return age;
  }

  function renderAddress(obj) {
    if (!obj || Object.keys(obj).length === 0)
      return renderField("Alamat", "-");
    return [
      renderField(
        "Nama lengkap",
        escapeHtml(obj.nama || obj.nama_lengkap || obj.namaPemohon || "-"),
      ),
      renderField(
        "Tempat, Tgl Lahir",
        escapeHtml(obj.ttl || obj.ttl_raw || obj.tempat_tgl_lahir || "-"),
      ),
      renderField("Jenis Kelamin", escapeHtml(obj.jk || "-")),
      renderField("Agama", escapeHtml(obj.agama || "-")),
      renderField(
        "Alamat",
        `${escapeHtml(obj.jalan || "")} (RT ${escapeHtml(obj.rt || "")} / RW ${escapeHtml(obj.rw || "")})`,
      ),
      renderField("Kelurahan", escapeHtml(obj.kelurahan || "-")),
      renderField("Kecamatan", escapeHtml(obj.kecamatan || "-")),
      renderField("Kota / Kab.", escapeHtml(obj.kota || obj.kabupaten || "-")),
    ].join("");
  }

  async function loadAndRender() {
    let all = [];
    try {
      all = await API.pengajuan.getAll();
      console.log("pengajuan", all);
    } catch (e) {
      console.error("Failed to load pengajuan", e);
      all = [];
    }

    const rayon = getRayon().split(" ")[1]; // koor rayon

    // time range filter
    const start = startEl?.value ? new Date(startEl.value + "T00:00:00") : null;
    const end = endEl?.value ? new Date(endEl.value + "T23:59:59.999") : null;

    const list = all.filter((p) => {
      // rayon constraint

      console.log("Rayon koor:", rayon);
      console.log("Rayon pengajuan: ", p.rayon);
      if (
        rayon && //koor rayon
        p.rayon && //pengjuan rayon
        String(p.rayon) !== String(rayon) // not pengajuan for rayon
      ) {
        console.log("fail on 1");
        return false;
      }
      const s = (p.status || "").toLowerCase();
      // only show items that are submitted/proses and NOT yet verified by koordinator
      // exclude items that have been verified (diterima/diverifikasi/ditolak)
      // exclude items that have been dispositioned to other roles
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
      if (excludedStatuses.includes(s)) {
        console.log("Fail 2");
        return false;
      }
      // Also exclude if verified_by_koordinator flag is set
      if (p.verified_by_koordinator === true) {
        console.log("Fail 3");
        return false;
      }

      if ((start || end) && (p.created_at || p.createdAt)) {
        const d = new Date(p.created_at || p.createdAt);
        if (start && d < start) {
          console.log("Fail 4");
          return false;
        }
        if (end && d > end) {
          console.log("Fail 5");
          return false;
        }
      }
      return true;
    });

    renderTable(list);
  }

  function renderTable(list) {
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="no-data">Tidak ada data.</td></tr>`;
      return;
    }
    list.forEach((it, idx) => {
      // Flatten form data if exists
      const flatItem =
        it.form && typeof it.form === "object" ? { ...it, ...it.form } : it;

      const jenis = escapeHtml(
        flatItem.jenis || flatItem.type || flatItem.tipe || "-",
      );
      const perihal = escapeHtml(
        flatItem.perihal || flatItem.ringkasan || flatItem.keterangan || "-",
      );
      const tanggal = fmtDateTime(
        flatItem.created_at ||
          flatItem.createdAt ||
          flatItem.tanggal ||
          flatItem.date ||
          "-",
      );
      const statusLabel = (flatItem.status || "proses").toLowerCase();
      const statusHtml =
        statusLabel === "proses"
          ? '<span class="badge-status-proses">Diproses</span>'
          : statusLabel === "ditolak"
            ? '<span class="badge-status-ditolak">Ditolak</span>'
            : '<span class="badge-status-diterima">Diverifikasi</span>';
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="No">${idx + 1}</td>
        <td data-label="Jenis Surat">${jenis}</td>
        <td data-label="Perihal / Pengirim"><div class="fw-semibold">${perihal}</div><div class="muted small">${escapeHtml(flatItem.user_nama || flatItem.pemohon_nama || flatItem.nama || flatItem.pemohon || "")} · ${escapeHtml(flatItem.user_nik || flatItem.nik || flatItem.pemohon_nik || "")}</div></td>
        <td data-label="Tanggal">${tanggal}</td>
        <td data-label="Status">${statusHtml}</td>
        <td class="table-actions" data-label="Aksi">
          <button class="btn btn-outline" data-id="${escapeHtml(it.id || it._id || "")}" data-action="periksa">Periksa</button>
          <button class="btn btn-primary" data-id="${escapeHtml(it.id || it._id || "")}" data-action="verifikasi">Verifikasi</button>
          <button class="btn btn-ghost" data-id="${escapeHtml(it.id || it._id || "")}" data-action="tolak">Tolak</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // open detail modal
  async function openDetail(id) {
    let item = null;
    try {
      item = await API.pengajuan.getById(id);
    } catch (e) {
      showInlineMessage("Data tidak ditemukan", "error");
      return;
    }

    if (!item) {
      showInlineMessage("Data tidak ditemukan", "error");
      return;
    }

    // Flatten form data into top level (same fix as Jemaat detail page)
    if (item.form && typeof item.form === "object") {
      Object.assign(item, item.form);
    }

    currentItem = item;
    detailJudul.textContent = item.jenis || item.type || "Detail Pengajuan";

    // build card-based detail view
    let html = `<div class="detail-grid">`;

    // compute age from submission date and birth date
    const dobStr = item.tgl_lahir || item.ttl;
    const refDate =
      item.created_at || item.createdAt || item.tanggal || new Date();
    const computedAge = computeAge(dobStr, refDate);

    // Status badge
    const statusClass =
      item.status === "pending"
        ? "status-pending"
        : item.status === "diterima" || item.status === "approved"
          ? "status-approved"
          : item.status === "verified"
            ? "status-verified"
            : "status-pending";

    // Card 1: Informasi Akun Pemohon
    html += `<div class="detail-card">`;
    html += `<div class="detail-section"><i class="bi bi-person-circle"></i> Informasi Pemohon</div>`;
    html += renderField(
      "Nama Lengkap",
      escapeHtml(item.user_nama || item.pemohon_nama || item.nama || "-"),
    );
    html += renderField(
      "NIK",
      escapeHtml(item.user_nik || item.pemohon_nik || item.nik || "-"),
    );
    html += renderField(
      "Email",
      escapeHtml(item.user_email || item.email || item.pemohon_email || "-"),
    );
    html += renderField(
      "Rayon",
      escapeHtml(item.rayon || item.user_rayon || getRayon() || "-"),
    );
    html += renderField(
      "Tanggal Pengajuan",
      escapeHtml(
        fmtDateTime(
          item.created_at || item.createdAt || item.tanggal || item.date,
        ),
      ),
    );
    html += renderField(
      "Status",
      `<span class="detail-badge ${statusClass}">${escapeHtml(item.status || "-")}</span>`,
    );
    html += `</div>`;

    // Card 2: Detail Surat
    html += `<div class="detail-card">`;
    html += `<div class="detail-section"><i class="bi bi-file-earmark-text"></i> Detail Surat</div>`;
    html += renderField(
      "Jenis Surat",
      escapeHtml(item.jenis || item.type || item.tipe || "-"),
    );
    html += renderField(
      "Perihal / Ringkasan",
      escapeHtml(item.perihal || item.ringkasan || item.keterangan || "-"),
    );
    html += `</div>`;

    // type-specific
    const t = (item.type || item.jenis || "").toLowerCase();
    if (t.includes("saksi")) {
      // Card 3: Data Saksi 1
      html += `<div class="detail-card">`;
      html += `<div class="detail-section"><i class="bi bi-person-check"></i> Data Saksi 1</div>`;

      const s1 = item.saksi1 || item.saksi_1 || {};
      html += renderField(
        "Nama",
        `<strong>${escapeHtml(s1.nama || "-")}</strong>`,
      );

      const s1TempatLahir = escapeHtml(s1.tempat_lahir || "-");
      // Keep full date format YYYY-MM-DD
      const s1TglLahir = s1.tgl_lahir || (s1.ttl ? escapeHtml(s1.ttl) : "-");
      html += renderField(
        "Tempat, Tgl Lahir",
        `${s1TempatLahir}, ${s1TglLahir}`,
      );

      const s1Age = computeAge(s1.tgl_lahir || s1.ttl, refDate);
      html += renderField("Umur", s1Age !== null ? `${s1Age} tahun` : "-");
      html += renderField("Jenis Kelamin", escapeHtml(s1.jk || "-"));
      html += renderField("Agama", escapeHtml(s1.agama || "-"));

      const s1AlamatParts = [];
      if (s1.jalan) s1AlamatParts.push(escapeHtml(s1.jalan));
      if (s1.rt || s1.rw)
        s1AlamatParts.push(
          `RT ${escapeHtml(s1.rt || "-")}/RW ${escapeHtml(s1.rw || "-")}`,
        );
      if (s1.kelurahan) s1AlamatParts.push(`Kel. ${escapeHtml(s1.kelurahan)}`);
      if (s1.kecamatan) s1AlamatParts.push(`Kec. ${escapeHtml(s1.kecamatan)}`);
      if (s1.kota) s1AlamatParts.push(escapeHtml(s1.kota));
      const s1Alamat =
        s1AlamatParts.length > 0 ? s1AlamatParts.join(", ") : "-";
      html += renderField("Alamat Lengkap", s1Alamat);
      html += `</div>`; // end card

      // Saksi 2 if exists
      if (item.saksi_count === 2 || item.saksi2 || item.saksi_2) {
        html += `<div class="detail-card">`;
        html += `<div class="detail-section"><i class="bi bi-person-check"></i> Data Saksi 2</div>`;
        const s2 = item.saksi2 || item.saksi_2 || {};
        html += renderField(
          "Nama",
          `<strong>${escapeHtml(s2.nama || "-")}</strong>`,
        );

        const s2TempatLahir = escapeHtml(s2.tempat_lahir || "-");
        // Keep full date format YYYY-MM-DD
        const s2TglLahir = s2.tgl_lahir || (s2.ttl ? escapeHtml(s2.ttl) : "-");
        html += renderField(
          "Tempat, Tgl Lahir",
          `${s2TempatLahir}, ${s2TglLahir}`,
        );

        const s2Age = computeAge(s2.tgl_lahir || s2.ttl, refDate);
        html += renderField("Umur", s2Age !== null ? `${s2Age} tahun` : "-");
        html += renderField("Jenis Kelamin", escapeHtml(s2.jk || "-"));
        html += renderField("Agama", escapeHtml(s2.agama || "-"));

        const s2AlamatParts = [];
        if (s2.jalan) s2AlamatParts.push(escapeHtml(s2.jalan));
        if (s2.rt || s2.rw)
          s2AlamatParts.push(
            `RT ${escapeHtml(s2.rt || "-")}/RW ${escapeHtml(s2.rw || "-")}`,
          );
        if (s2.kelurahan)
          s2AlamatParts.push(`Kel. ${escapeHtml(s2.kelurahan)}`);
        if (s2.kecamatan)
          s2AlamatParts.push(`Kec. ${escapeHtml(s2.kecamatan)}`);
        if (s2.kota) s2AlamatParts.push(escapeHtml(s2.kota));
        const s2Alamat =
          s2AlamatParts.length > 0 ? s2AlamatParts.join(", ") : "-";
        html += renderField("Alamat Lengkap", s2Alamat);
        html += `</div>`; // end card
      }
    } else if (
      t === "rekomendasi" ||
      t === "keterangan" ||
      t === "rekomendasi-menikah" ||
      t === "rekomendasi-kegiatan"
    ) {
      // Card 3: Data Terkait Surat
      html += `<div class="detail-card">`;
      html += `<div class="detail-section"><i class="bi bi-person-lines-fill"></i> Data Terkait Surat</div>`;

      // Data already flattened from item.form to item level
      html += renderField(
        "Nama",
        escapeHtml(item.nama || item.pemohon_nama || "-"),
      );

      // Format tanggal lahir dengan tahun (YYYY-MM-DD)
      const rkTempatLahir = escapeHtml(item.tempat_lahir || "-");
      const rkTglLahir = item.tgl_lahir || item.ttl || "-";
      html += renderField(
        "Tempat, Tgl Lahir",
        `${rkTempatLahir}, ${rkTglLahir}`,
      );

      const rkAge = computeAge(item.tgl_lahir || item.ttl, refDate);
      html += renderField(
        "Umur",
        rkAge !== null ? `${rkAge} tahun` : item.umur || "-",
      );
      html += renderField(
        "Jenis Kelamin",
        escapeHtml(item.jk || item.jenis_kelamin || "-"),
      );
      html += renderField("Agama", escapeHtml(item.agama || "-"));

      // Address from flattened data
      const rkAlamatParts = [];
      const rkJalan = item.jalan;
      const rkRt = item.rt;
      const rkRw = item.rw;
      const rkKelurahan = item.kelurahan;
      const rkKecamatan = item.kecamatan;
      const rkKota = item.kota;

      if (rkJalan) rkAlamatParts.push(escapeHtml(rkJalan));
      if (rkRt || rkRw)
        rkAlamatParts.push(
          `RT ${escapeHtml(rkRt || "-")}/RW ${escapeHtml(rkRw || "-")}`,
        );
      if (rkKelurahan) rkAlamatParts.push(`Kel. ${escapeHtml(rkKelurahan)}`);
      if (rkKecamatan) rkAlamatParts.push(`Kec. ${escapeHtml(rkKecamatan)}`);
      if (rkKota) rkAlamatParts.push(escapeHtml(rkKota));
      const rkAlamat =
        rkAlamatParts.length > 0 ? rkAlamatParts.join(", ") : "-";
      html += renderField("Alamat Lengkap", rkAlamat);

      if (t === "rekomendasi-kegiatan") {
        html += renderField("Lokasi Kegiatan", escapeHtml(item.lokasi || "-"));
        html += renderField("Tanggal Mulai", escapeHtml(item.tgl_mulai || "-"));
        html += renderField(
          "Tanggal Selesai",
          escapeHtml(item.tgl_selesai || "-"),
        );
      }
      html += `</div>`; // end card
    } else {
      // Generic card for other types
      html += `<div class="detail-card">`;
      html += `<div class="detail-section"><i class="bi bi-info-circle"></i> Informasi Tambahan</div>`;
      html += renderField(
        "Keperluan / Untuk",
        escapeHtml(item.untuk || item.keperluan || "-"),
      );
      html += `</div>`; // end card
    }

    // Card: Lampiran & Dokumen
    // Collect all files: draft file + supporting docs (file_sup1-4)
    const files = [];

    // Add draft file (file_utama)
    if (item.draft_file_url && item.files?.draft) {
      files.push({
        name: item.files.draft.name || "File Utama",
        url: item.draft_file_url,
      });
    } else if (item.files?.draft?.key) {
      files.push({
        name: item.files.draft.name || "File Utama",
        url: "#",
      });
    }

    // Add supporting docs (file_sup1-4) for surat lainnya
    if (item.form) {
      for (let i = 1; i <= 4; i++) {
        const fileKey = `file_sup${i}`;
        const fileData = item.form[fileKey];
        const fileUrl = item.form[`${fileKey}_url`];

        if (fileData && fileData.key && fileUrl) {
          files.push({
            name: fileData.name || `Dokumen ${i}`,
            url: fileUrl,
          });
        }
      }
    }

    // Legacy support
    if (item.file_utama)
      files.push({
        name: item.file_utama_name || item.file_utama,
        url: item.file_utama,
      });
    if (item.lampiran && Array.isArray(item.lampiran)) {
      item.lampiran.forEach((f) => files.push(f));
    }

    html += `<div class="detail-card">`;
    html += `<div class="detail-section"><i class="bi bi-paperclip"></i> Lampiran & Dokumen</div>`;
    html += `<div class="detail-row"><div class="label">File Lampiran</div><div class="value">`;

    // Cek apakah tipe surat adalah 'surat lainnya' (hanya tipe ini yang memiliki lampiran)
    const tipeSurat = (item.tipe || item.jenis || "").toLowerCase();
    const isSuratLainnya =
      tipeSurat.includes("lainnya") || tipeSurat.includes("lain");

    if (!isSuratLainnya) {
      // Jika bukan 'surat lainnya', tampilkan '-'
      html += `-`;
    } else if (files && files.length) {
      html += files
        .map((f) => {
          const url =
            typeof f === "string"
              ? f
              : f.url || f.path || f.link || f.data || "#";
          const name =
            typeof f === "string"
              ? f.split("/").pop()
              : f.name || f.filename || "Lampiran";
          return `<div style="margin-bottom: 8px;"><i class="bi bi-file-pdf text-danger"></i> <a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="text-decoration: none;">${escapeHtml(name)}</a></div>`;
        })
        .join("");
    } else {
      html += `<span class="text-muted">Tidak ada lampiran</span>`;
    }
    html += `</div></div>`; // end value and row

    // Catatan
    html += renderField(
      "Catatan",
      escapeHtml(item.catatan || item.note || item.keterangan || "-"),
    );
    html += `</div>`; // end card

    // Card: Riwayat / Timeline
    const history = item.timeline || item.history || [];
    html += `<div class="detail-card">`;
    html += `<div class="detail-section"><i class="bi bi-clock-history"></i> Riwayat Proses</div>`;
    html += `<div class="detail-row"><div class="label">Timeline</div><div class="value">`;
    if (history && history.length) {
      html += history
        .map(
          (h) => `
        <div style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-left: 3px solid #667eea; border-radius: 4px;">
          <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 4px;">
            <i class="bi bi-calendar-event"></i> ${escapeHtml(fmtDateTime(h.at || h.tanggal || h.waktu || ""))}
          </div>
          <div>${escapeHtml(h.note || h.keterangan || h.status || "")}</div>
        </div>
      `,
        )
        .join("");
    } else {
      html += `<div class="text-muted small"><i class="bi bi-info-circle"></i> Belum ada riwayat proses</div>`;
    }
    html += `</div></div>`; // end value, row
    html += `</div>`; // end card

    html += `</div>`; // end grid
    detailBody.innerHTML = html;

    // show modal
    try {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else alert(detailBody.textContent || JSON.stringify(item));
    } catch (e) {
      alert("Tidak dapat membuka modal detail");
    }
  }

  // changeStatus with rayon enforcement; note optional for reject
  async function changeStatus(id, newStatus, note) {
    const myRayon = getRayon();

    try {
      // Update via API
      await API.pengajuan.updateStatus(id, {
        status: newStatus,
        by: "Koordinator",
        note: note,
        to_role: newStatus === "diterima" ? "tatausaha" : null,
      });

      // Jika ditolak, buat notifikasi untuk jemaat
      if (newStatus === "ditolak") {
        // Fetch item to get user_id if needed, but API might handle it if we pass user_id
        // For now, assume backend handles notification creation if we pass to_role or similar
        // But let's be safe and create one explicitly if we have the item
        if (currentItem && currentItem.user_id) {
          await API.notifications.create({
            to_role: "jemaat",
            user_id: currentItem.user_id,
            type: "surat_ditolak",
            title: "Pengajuan Ditolak",
            message: `Mohon maaf, pengajuan Anda ditolak. ${note ? "Alasan: " + note : ""}`,
            related_id: id,
          });
        }
      }

      showInlineMessage(`Status diperbarui: ${newStatus}`, "success");
      loadAndRender();
    } catch (e) {
      console.error(e);
      showInlineMessage("Gagal memperbarui status", "error");
    }
  }

  // inline toast
  function showInlineMessage(text, type = "info") {
    const el = document.createElement("div");
    el.className = `toast-message toast-${type}`;
    el.style.cssText =
      "position:fixed;right:18px;bottom:18px;padding:10px 14px;border-radius:8px;background:#222;color:#fff;z-index:1200;opacity:1;transition:opacity .35s";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => (el.style.opacity = "0"), 2000);
    setTimeout(() => el.remove(), 2400);
  }

  // event delegation for table actions (periksa/verifikasi/tolak)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (action === "periksa") {
      await openDetail(id);
      return;
    }

    if (action === "verifikasi") {
      pendingActionId = id;
      let it = null;
      try {
        it = await API.pengajuan.getById(id);
      } catch (e) {}

      // Use new ConfirmModal
      ConfirmModal.show({
        type: "success",
        icon: "bi-check-circle-fill",
        title: "Verifikasi Pengajuan Surat",
        message: `Verifikasi pengajuan surat untuk dilanjutkan ke <strong>Tata Usaha</strong>?`,
        detail: {
          "Jenis Surat": it?.jenis || it?.type || "-",
          "Nama Pemohon": it?.user_nama || it?.pemohon_nama || "-",
          Email: it?.user_email || it?.email || "-",
          "Tanggal Pengajuan":
            fmtDateTime(it?.created_at || it?.createdAt) || "-",
        },
        confirmText: "Ya, Verifikasi",
        cancelText: "Batal",
        onConfirm: () => {
          changeStatus(id, "diterima");
        },
      });
      return;
    }

    if (action === "tolak") {
      pendingActionId = id;
      let it = null;
      try {
        it = await API.pengajuan.getById(id);
      } catch (e) {}
      currentItem = it; // save for notification

      // Use new ConfirmModal with input
      ConfirmModal.show({
        type: "danger",
        icon: "bi-x-circle-fill",
        title: "Tolak Pengajuan Surat",
        message: `Tolak pengajuan surat dari <strong>${escapeHtml(it?.user_nama || it?.pemohon_nama || "-")}</strong>?`,
        detail: {
          "Jenis Surat": it?.jenis || it?.type || "-",
          Email: it?.user_email || it?.email || "-",
          "Tanggal Pengajuan":
            fmtDateTime(it?.created_at || it?.createdAt) || "-",
        },
        showInput: true,
        inputLabel: "Alasan Penolakan (Wajib Diisi)",
        inputRequired: true,
        inputMinLength: 10,
        showWarning: true,
        warningText:
          "Pemohon akan menerima notifikasi penolakan beserta alasan yang Anda tuliskan.",
        confirmText: "Ya, Tolak Pengajuan",
        cancelText: "Batal",
        onConfirm: (note) => {
          changeStatus(id, "ditolak", note);
        },
      });
      return;
    }
  });

  // modal confirm handlers
  confirmVerifyCancel?.addEventListener("click", () => {
    try {
      confirmVerifyModal.close();
    } catch (e) {}
    pendingActionId = null;
  });
  confirmVerifyYes?.addEventListener("click", async () => {
    if (!pendingActionId) return;
    confirmVerifySpinner &&
      (confirmVerifySpinner.style.display = "inline-block");
    confirmVerifyLabel && (confirmVerifyLabel.style.opacity = "0.6");
    confirmVerifyYes.setAttribute("disabled", "disabled");
    try {
      await Promise.resolve(changeStatus(pendingActionId, "diterima"));
    } finally {
      confirmVerifySpinner && (confirmVerifySpinner.style.display = "none");
      confirmVerifyLabel && (confirmVerifyLabel.style.opacity = "1");
      confirmVerifyYes.removeAttribute("disabled");
      pendingActionId = null;
      try {
        confirmVerifyModal.close();
      } catch (e) {}
      try {
        dialog.close();
      } catch (e) {}
    }
  });

  confirmRejectCancel?.addEventListener("click", () => {
    try {
      confirmRejectModal.close();
    } catch (e) {}
    pendingActionId = null;
  });
  confirmRejectYes?.addEventListener("click", async () => {
    const note = (rejectReasonEl.value || "").trim();
    if (!note) {
      rejectReasonEl.focus();
      rejectReasonEl.style.boxShadow = "0 0 0 3px rgba(220,53,69,0.12)";
      setTimeout(() => (rejectReasonEl.style.boxShadow = ""), 1200);
      return;
    }
    if (!pendingActionId) return;
    confirmRejectSpinner &&
      (confirmRejectSpinner.style.display = "inline-block");
    confirmRejectLabel && (confirmRejectLabel.style.opacity = "0.6");
    confirmRejectYes.setAttribute("disabled", "disabled");
    try {
      await Promise.resolve(changeStatus(pendingActionId, "ditolak", note));
    } finally {
      confirmRejectSpinner && (confirmRejectSpinner.style.display = "none");
      confirmRejectLabel && (confirmRejectLabel.style.opacity = "1");
      confirmRejectYes.removeAttribute("disabled");
      pendingActionId = null;
      try {
        confirmRejectModal.close();
      } catch (e) {}
      try {
        dialog.close();
      } catch (e) {}
    }
  });

  // initial load
  loadAndRender();
})();
