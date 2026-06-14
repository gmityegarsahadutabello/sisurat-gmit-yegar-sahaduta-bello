// render detail pengajuan berdasarkan tipe; fallback ke dummy data untuk preview
document.addEventListener("DOMContentLoaded", () => {
  const id = new URLSearchParams(window.location.search).get("id") || "1";
  const detailArea = document.getElementById("detail-content");
  const crumbType = document.getElementById("crumb-type");
  const metaStatus = document.getElementById("meta-status");
  const btnTrack = document.getElementById("btn-track");
  const btnDownload = document.getElementById("btn-download");

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function formatDate(d) {
    try {
      const dt = new Date(d);
      return (
        dt.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }) +
        " " +
        dt.toLocaleTimeString("id-ID")
      );
    } catch (e) {
      return d || "-";
    }
  }

  function computeAge(item) {
    // return d.umur if present, otherwise compute from tgl_lahir and reference tanggal (submission)
    if (!item) return null;
    if (item.umur) return item.umur;
    const dobStr =
      item.tgl_lahir ||
      (item.rawForm && item.rawForm.tgl_lahir) ||
      (item.rawForm && item.rawForm.ttl);
    if (!dobStr) return null;
    // try parse different formats: if ttl is a string like 'Place, 01-01-1990' try to extract date
    let dob = new Date(dobStr);
    if (isNaN(dob)) {
      // try to find a date substring (yyyy-mm-dd or dd-mm-yyyy)
      const m = dobStr.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) dob = new Date(m[1]);
      else {
        const m2 = dobStr.match(/(\d{2}[-\/]\d{2}[-\/]\d{4})/);
        if (m2) {
          // convert dd-mm-yyyy to yyyy-mm-dd
          const parts = m2[1].split(/[-\/]/);
          dob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
    }
    if (isNaN(dob)) return null;
    const ref = item.tanggal ? new Date(item.tanggal) : new Date();
    let age = ref.getFullYear() - dob.getFullYear();
    const m = ref.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
    return age;
  }

  // no dummy data — always prefer API, fallback to localStorage (LS)

  async function loadData() {
    try {
      let data = null;
      try {
        data = await API.pengajuan.getById(id);
      } catch (e) {
        console.warn("API getById failed, trying fallback...", e);
        data = null;
      }

      // fallback: load from localStorage (local_pengajuan) - which now proxies to API.getAll()
      if (!data) {
        const local = await LS.find(
          "local_pengajuan",
          (it) => String(it._id || it.id) === String(id),
        );
        if (local) data = local;
        else {
          // no data from API or local storage — show not found message
          detailArea.innerHTML = `<div class="col-12 text-center text-muted">Data pengajuan tidak ditemukan.</div>`;
          return;
        }
      }

      // Flatten form object to top level for rendering (MongoDB stores user input in form)
      if (data.form && typeof data.form === "object") {
        Object.assign(data, data.form);
      }

      console.log(
        "🔍 Loaded pengajuan data for",
        data.type || data.jenis,
        ":",
        {
          has_perihal: !!data.perihal,
          has_untuk: !!data.untuk,
          has_keperluan: !!data.keperluan,
          has_draft_file: !!(data.files && data.files.draft),
          has_draft_url: !!data.draft_file_url,
        },
      );

      // Map user fields to legacy display fields
      if (!data.pemohon_nama && data.user_nama)
        data.pemohon_nama = data.user_nama;
      if (!data.pemohon_nik && data.user_nik) data.pemohon_nik = data.user_nik;
      if (!data.nik && data.user_nik) data.nik = data.user_nik;
      if (!data.pengaju && data.user_nama) data.pengaju = data.user_nama;

      // If fields like saksi1 / saksi2 are JSON strings, parse them to objects
      if (typeof data.saksi1 === "string") {
        try {
          data.saksi1 = JSON.parse(data.saksi1);
        } catch (e) {
          /* ignore */
        }
      }
      if (typeof data.saksi2 === "string") {
        try {
          data.saksi2 = JSON.parse(data.saksi2);
        } catch (e) {
          /* ignore */
        }
      }
      // in some saved objects data for non-saksi forms may be inside rawForm
      if (!data.perihal && data.rawForm && data.rawForm.perihal)
        data.perihal = data.rawForm.perihal;
      if (!data.nama && data.rawForm && data.rawForm.nama)
        data.nama = data.rawForm.nama;

      renderDetail(data);
    } catch (err) {
      detailArea.innerHTML = `<div class="col-12">Gagal memuat data.</div>`;
    }
  }

  function renderField(label, value, icon = "") {
    return `
      <div class="info-row">
        <div class="info-label">
          ${icon ? `<i class="bi bi-${icon}"></i>` : ""}
          ${escapeHtml(label)}
        </div>
        <div class="info-value">${value || "-"}</div>
      </div>
    `;
  }

  function renderAddress(objPrefix, obj) {
    // support new fields: tempat_lahir, tgl_lahir (date)
    const tempat = escapeHtml(obj.tempat_lahir || obj.tempat || "");
    const tgl = obj.tgl_lahir
      ? formatDate(obj.tgl_lahir)
      : obj.ttl
        ? escapeHtml(obj.ttl)
        : "-";
    return `
      ${renderField("Nama Lengkap", escapeHtml(obj.nama), "person-fill")}
      ${renderField("Tempat, Tanggal Lahir", (tempat ? tempat + ", " : "") + (tgl || "-"), "calendar-event")}
      ${renderField("Jenis Kelamin", escapeHtml(obj.jk), "gender-ambiguous")}
      ${renderField("Agama", escapeHtml(obj.agama), "book")}
      ${renderField("Alamat", `${escapeHtml(obj.jalan)} (RT ${escapeHtml(obj.rt)} / RW ${escapeHtml(obj.rw)})`, "geo-alt-fill")}
      ${renderField("Kelurahan", escapeHtml(obj.kelurahan), "pin-map")}
      ${renderField("Kecamatan", escapeHtml(obj.kecamatan), "pin-map")}
      ${renderField("Kota / Kabupaten", escapeHtml(obj.kota), "building")}
    `;
  }

  function renderProgressIndicator(d) {
    const statusLower = String(d.status || "").toLowerCase();
    const timeline = d.timeline || d.history || [];

    // Define workflow steps
    const steps = [
      {
        key: "submitted",
        label: "Pengajuan Dibuat",
        icon: "file-earmark-plus",
        desc: "Surat pengajuan telah dibuat",
      },
      {
        key: "verified",
        label: "Verifikasi Koordinator",
        icon: "person-check",
        desc: "Menunggu verifikasi koordinator rayon",
      },
      {
        key: "processed",
        label: "Proses Tata Usaha",
        icon: "file-earmark-text",
        desc: "Diproses oleh tata usaha gereja",
      },
      {
        key: "reviewed",
        label: "Tinjauan Sekretaris & Pendeta",
        icon: "people",
        desc: "Ditinjau oleh sekretaris dan pendeta",
      },
      {
        key: "completed",
        label: "Selesai",
        icon: "check-circle",
        desc: "Surat selesai dan siap diambil",
      },
    ];

    // Determine current step based on status
    let currentStep = 0;
    let isRejected = false;
    let rejectedAt = -1;

    if (statusLower.includes("ditolak") || statusLower.includes("rejected")) {
      isRejected = true;
      // Determine where it was rejected
      if (
        statusLower.includes("rejected_by_koor") ||
        statusLower === "ditolak"
      ) {
        rejectedAt = 1; // Rejected at koordinator step
        currentStep = 1;
      } else {
        rejectedAt = 1;
        currentStep = 1;
      }
    } else if (
      statusLower === "validated_by_pendeta" ||
      statusLower === "validated" ||
      statusLower === "archived"
    ) {
      currentStep = 5; // All steps completed
    } else if (
      statusLower.includes("disposisi_to_pendeta") ||
      statusLower.includes("reviewed_by_sekretaris")
    ) {
      currentStep = 3;
    } else if (
      statusLower.includes("disposisi_to_sekretaris") ||
      statusLower.includes("file_uploaded")
    ) {
      currentStep = 2;
    } else if (
      statusLower === "diterima" ||
      statusLower === "verified_by_koordinator" ||
      statusLower === "diverifikasi"
    ) {
      currentStep = 1;
    } else {
      currentStep = 0;
    }

    const progressHtml = `
      <div class="progress-indicator">
        <div class="progress-title">
          <i class="bi bi-diagram-3-fill"></i>
          Progress Pengajuan Surat
        </div>
        <div class="progress-steps">
          ${steps
            .map((step, idx) => {
              let stepClass = "pending";
              let stepIconClass = "pending";

              if (isRejected && idx === rejectedAt) {
                stepClass = "rejected";
                stepIconClass = "rejected";
              } else if (idx < currentStep) {
                stepClass = "completed";
                stepIconClass = "completed";
              } else if (idx === currentStep && !isRejected) {
                stepClass = "active";
                stepIconClass = "active";
              }

              let icon = step.icon;
              if (stepIconClass === "completed") icon = "check-circle-fill";
              else if (stepIconClass === "active") icon = "hourglass-split";
              else if (stepIconClass === "rejected") icon = "x-circle-fill";

              // Get timestamp if available from timeline
              let timestamp = "";
              const timelineEntry = timeline.find((t) => {
                const tNote = (t.note || t.action || "").toLowerCase();
                if (idx === 0)
                  return (
                    tNote.includes("dibuat") ||
                    tNote.includes("submitted") ||
                    tNote.includes("pengajuan dibuat")
                  );
                if (idx === 1)
                  return (
                    tNote.includes("koordinator") ||
                    tNote.includes("verified") ||
                    tNote.includes("diterima")
                  );
                if (idx === 2)
                  return (
                    tNote.includes("tata usaha") ||
                    tNote.includes("upload") ||
                    tNote.includes("disposisi")
                  );
                if (idx === 3)
                  return (
                    tNote.includes("sekretaris") ||
                    tNote.includes("pendeta") ||
                    tNote.includes("review")
                  );
                if (idx === 4)
                  return (
                    tNote.includes("validated") ||
                    tNote.includes("selesai") ||
                    tNote.includes("completed")
                  );
                return false;
              });

              if (timelineEntry) {
                const ts =
                  timelineEntry.timestamp ||
                  timelineEntry.at ||
                  timelineEntry.tanggal ||
                  timelineEntry.waktu;
                if (ts) {
                  timestamp = `<div class="step-time"><i class="bi bi-clock"></i> ${formatDate(ts)}</div>`;
                }
              }

              return `
              <div class="progress-step ${stepClass}">
                <div class="step-icon ${stepIconClass}">
                  <i class="bi bi-${icon}"></i>
                </div>
                <div class="step-content">
                  <div class="step-label">${step.label}</div>
                  <div class="step-desc">${step.desc}</div>
                  ${timestamp}
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
        ${
          isRejected
            ? `
          <div class="alert alert-danger mt-3 mb-0" style="border-radius:12px; border-left: 4px solid #dc3545; display: flex; align-items: center; gap: 0.75rem;">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 1.5rem;"></i>
            <div>
              <strong>Pengajuan Ditolak</strong>
              <p class="mb-0 mt-1" style="font-size: 0.9rem;">Silakan periksa alasan penolakan di bagian catatan dan ajukan kembali dengan perbaikan yang diperlukan.</p>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    document.getElementById("progress-section").innerHTML = progressHtml;
  }

  function renderDetail(d) {
    crumbType.textContent = d.jenis || d.type || "Detail";
    document.getElementById("subtitle").textContent =
      `Jenis Surat: ${d.jenis || d.type || "Tidak diketahui"}`;

    // Status badge: Ditolak (red), Selesai (green), Diproses (yellow)
    const statusLower = String(d.status || "").toLowerCase();
    let badgeClass = "badge-status-modern bg-warning text-dark";
    let badgeText = "DIPROSES";
    let badgeIcon = "hourglass-split";

    if (
      statusLower === "ditolak" ||
      statusLower === "rejected" ||
      statusLower === "rejected_by_koor"
    ) {
      badgeClass = "badge-status-modern bg-danger text-white";
      badgeText = "DITOLAK";
      badgeIcon = "x-circle";
    } else if (
      statusLower === "validated_by_pendeta" ||
      statusLower === "validated" ||
      statusLower === "archived"
    ) {
      badgeClass = "badge-status-modern bg-success text-white";
      badgeText = "SELESAI";
      badgeIcon = "check-circle";
    }
    metaStatus.innerHTML = `<div class="${badgeClass}"><i class="bi bi-${badgeIcon}"></i>${badgeText}</div>`;

    // Render progress indicator
    renderProgressIndicator(d);

    // Tampilkan alasan penolakan jika surat ditolak
    if (d.status === "ditolak" || d.status === "rejected_by_koor") {
      const timeline = d.timeline || d.history || [];
      console.log("🔍 Checking rejection reason in timeline:", timeline);

      // Find rejection entry - support multiple formats
      const rejectionEntry = timeline.find((t) => {
        const action = (t.action || "").toLowerCase();
        const note = t.note || t.keterangan || "";
        return (
          action === "ditolak" ||
          action === "rejected_by_koor" ||
          note.includes("Ditolak oleh Koordinator")
        );
      });

      console.log("🔍 Rejection entry found:", rejectionEntry);

      if (rejectionEntry) {
        // Try to get reason from different fields
        let reason = rejectionEntry.note || "";

        // If note is empty, try to extract from keterangan
        if (!reason && rejectionEntry.keterangan) {
          const reasonMatch = rejectionEntry.keterangan.match(
            /Ditolak oleh Koordinator: (.+)/,
          );
          reason = reasonMatch ? reasonMatch[1] : rejectionEntry.keterangan;
        }

        // If still empty, use default message
        if (!reason) {
          reason = "Tidak ada keterangan";
        }

        console.log("🔍 Rejection reason:", reason);

        const alertHtml = `
          <div class="alert alert-danger mb-3 animate-fade-in" role="alert" style="border-left: 4px solid #dc3545; border-radius: 12px;">
            <div class="d-flex align-items-start gap-3">
              <div style="width:48px;height:48px;background:linear-gradient(135deg,#dc3545,#c82333);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="bi bi-x-circle" style="font-size:24px;color:white;"></i>
              </div>
              <div class="flex-fill">
                <h6 class="alert-heading mb-2" style="color:#721c24;font-weight:700;font-size:1.1rem;">Pengajuan Ditolak</h6>
                <div style="background:#fff3cd;border-left:3px solid #ffc107;padding:12px 16px;border-radius:8px;margin-bottom:12px;">
                  <div class="small text-muted mb-1" style="font-weight:600;">Alasan Penolakan:</div>
                  <div style="color:#856404;font-weight:600;font-size:0.95rem;">${escapeHtml(reason)}</div>
                </div>
                <div class="small text-muted d-flex align-items-center gap-2">
                  <i class="bi bi-info-circle"></i>
                  <span>Silakan perbaiki data sesuai catatan di atas dan ajukan kembali pengajuan baru.</span>
                </div>
              </div>
            </div>
          </div>
        `;
        const detailAreaCard = document.getElementById("detail-area");
        if (detailAreaCard) {
          detailAreaCard.insertAdjacentHTML("beforebegin", alertHtml);
        }
      }
    }

    btnTrack.onclick = () => openTrackModal(d._id || d.id);

    // set download link ONLY if validated final (by pendeta) or archived
    const s = String(d.status || "").toLowerCase();
    const isFinished =
      s === "validated_by_pendeta" ||
      s === "validated" ||
      s === "archived" ||
      d.validated === true;

    // Check for file in multiple formats (MongoDB vs old localStorage)
    let fileUrl = null;
    if (d.final_file_data) {
      fileUrl = d.final_file_data; // MongoDB virtual field (base64 data URL)
    } else if (d.final_file) {
      fileUrl = d.final_file; // MongoDB virtual field (could be URL or data)
    } else if (d.files && d.files.final) {
      if (d.files.final.data) {
        fileUrl = d.files.final.data; // Direct access to nested data
      } else if (d.files.final.url) {
        fileUrl = d.files.final.url;
      }
    } else if (d.file_utama) {
      fileUrl = `assets/uploads/${d.file_utama}`; // Legacy format
    } else if (d.file_krs) {
      fileUrl = `assets/uploads/${d.file_krs}`; // Legacy format
    } else if (d.final_file_url) {
      fileUrl = d.final_file_url; // Alternative field
    } else if (d.file_url) {
      fileUrl = d.file_url; // Backend-generated presigned URL
    } else if (d.file_url_final) {
      fileUrl = d.file_url_final; // legacy alternative
    }

    console.log("🔍 Download check:", {
      isFinished,
      hasFile: !!fileUrl,
      status: d.status,
      fileFields: {
        final_file_data: !!d.final_file_data,
        final_file: !!d.final_file,
        files_final: !!(d.files && d.files.final),
        file_utama: !!d.file_utama,
      },
    });

    // Determine current user (jemaat) ownership
    var currentUser = null;
    try {
      currentUser =
        window.LS && window.LS.getCurrentUser
          ? window.LS.getCurrentUser()
          : JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch (e) {
      currentUser = null;
    }
    function isOwner(user, item) {
      if (!user || !item) return false;
      const uid = user.id || user._id || user.nik || user.nik || user.nik;
      return (
        String(uid) === String(item.user_id || item.user_id) ||
        String(uid) === String(item.user_nik || item.pemohon_nik || item.nik)
      );
    }

    var showDownload = false;
    if (isFinished) {
      // If owner (jemaat) viewing a finished pengajuan, allow download even if fileUrl is not present yet
      if (isOwner(currentUser, d)) showDownload = true;
      // also allow staff/other roles if desired by uncommenting next line
      // else if (/* other role checks */) showDownload = true;
    }

    console.debug("pengajuan-detail download check", {
      isFinished,
      fileUrl,
      currentUser: currentUser && (currentUser.id || currentUser.nik),
      showDownload,
    });

    if (showDownload) {
      btnDownload.style.display = "inline-block";
      // Set visual and attributes
      btnDownload.classList.remove("btn-sm");
      btnDownload.classList.add("btn-lg");
      btnDownload.innerHTML = '<i class="bi bi-download"></i> Download Surat';

      // Click handler will request latest presigned URL from backend and open it
      btnDownload.onclick = async function (e) {
        e.preventDefault();
        btnDownload.classList.add("disabled");
        btnDownload.setAttribute("aria-disabled", "true");

        // Yield to browser — let it paint the disabled state before doing anything else
        await new Promise((r) => setTimeout(r, 0));

        try {
          const detail = await API.pengajuan.getById(id);
          const url =
            detail &&
            (detail.file_url ||
              detail.final_file_url ||
              detail.file_url_final ||
              detail.downloadUrl ||
              detail.final_file ||
              detail.final_file_data);

          if (!url) {
            alert(
              "File belum tersedia untuk diunduh. Silakan coba kembali nanti.",
            );
            return;
          }
          window.open(url, "_blank");
        } catch (err) {
          console.error("Download error", err);
          alert("Gagal membuka file. Silakan coba lagi.");
        } finally {
          btnDownload.classList.remove("disabled");
          btnDownload.removeAttribute("aria-disabled");
        }
      };
    } else {
      btnDownload.style.display = "none";
      btnDownload.onclick = null;
    }

    // common meta row
    let html = `
      <div class="card-modern">
        <div class="card-header-modern">
          <h5>
            <div class="icon-wrapper">
              <i class="bi bi-info-circle-fill"></i>
            </div>
            Informasi Umum Pengajuan
          </h5>
        </div>
        <div class="info-section">
          ${renderField("Jenis Surat", escapeHtml(d.jenis || d.type), "file-earmark-text-fill")}
          ${renderField("Pemohon", escapeHtml(d.pemohon_nama || d.user_nama || d.pengaju || "-"), "person-fill")}
          ${renderField("Nomor Induk", escapeHtml(d.pemohon_nik || d.user_nik || d.nik || "-"), "card-text")}
          ${renderField("Tanggal Pengajuan", formatDate(d.tanggal || d.created_at), "calendar-check")}
          ${d.updated_at ? renderField("Terakhir Diupdate", formatDate(d.updated_at), "clock-history") : ""}
        </div>
      </div>
    `;

    // per type detail
    switch ((d.type || d.jenis || "").toLowerCase()) {
      case "saksi-nikah":
      case "saksi-baptis":
        html += `
          <div class="card-modern">
            <div class="card-header-modern">
              <h5>
                <div class="icon-wrapper">
                  <i class="bi bi-person-badge-fill"></i>
                </div>
                Data Saksi 1
              </h5>
            </div>
            <div class="info-section">
              ${renderAddress("s1", d.saksi1 || d.saksi_1 || d.saksi1 || {})}
            </div>
          </div>`;
        if (d.saksi_count === 2 || d.saksi2 || d.saksi_2) {
          html += `
            <div class="card-modern">
              <div class="card-header-modern">
                <h5>
                  <div class="icon-wrapper">
                    <i class="bi bi-person-badge-fill"></i>
                  </div>
                  Data Saksi 2
                </h5>
              </div>
              <div class="info-section">
                ${renderAddress("s2", d.saksi2 || d.saksi_2 || {})}
              </div>
            </div>`;
        }
        break;

      case "rekomendasi":
      case "rekomendasi-menikah":
      case "keterangan":
        html += `
          <div class="card-modern">
            <div class="card-header-modern">
              <h5>
                <div class="icon-wrapper">
                  <i class="bi bi-file-text-fill"></i>
                </div>
                Detail Surat
              </h5>
            </div>
            <div class="info-section">
              ${renderField("Perihal", escapeHtml(d.perihal || "-"), "tag-fill")}
              ${renderField("Nama", escapeHtml(d.nama || d.pemohon_nama || "-"), "person-fill")}
              ${renderField("Tempat, Tanggal Lahir", (d.tempat_lahir ? escapeHtml(d.tempat_lahir) + ", " : "") + (d.tgl_lahir ? formatDate(d.tgl_lahir) : d.ttl ? escapeHtml(d.ttl) : "-"), "calendar-event")}
              ${renderField("Agama", escapeHtml(d.agama || "-"), "book")}
              ${renderField("Umur", escapeHtml(String(d.umur || computeAge(d) || "-")) + " tahun", "hourglass-split")}
            </div>
          </div>
          <div class="card-modern">
            <div class="card-header-modern">
              <h5>
                <div class="icon-wrapper">
                  <i class="bi bi-geo-alt-fill"></i>
                </div>
                Alamat Lengkap
              </h5>
            </div>
            <div class="info-section">
              ${renderField("Alamat", `${escapeHtml(d.jalan || "")} (RT ${escapeHtml(d.rt || "")} / RW ${escapeHtml(d.rw || "")})`, "signpost-fill")}
              ${renderField("Kelurahan", escapeHtml(d.kelurahan || "-"), "pin-map")}
              ${renderField("Kecamatan", escapeHtml(d.kecamatan || "-"), "pin-map")}
              ${renderField("Kota / Kabupaten", escapeHtml(d.kota || "-"), "building")}
            </div>
          </div>
        `;
        break;

      case "rekomendasi-kegiatan":
        html += `
          <div class="card-modern">
            <div class="card-header-modern">
              <h5>
                <div class="icon-wrapper">
                  <i class="bi bi-calendar-event-fill"></i>
                </div>
                Detail Kegiatan
              </h5>
            </div>
            <div class="info-section">
              ${renderField("Perihal", escapeHtml(d.perihal || "-"), "tag-fill")}
              ${renderField("Lokasi kegiatan", escapeHtml(d.lokasi || "-"), "geo-alt-fill")}
              ${renderField("Tanggal mulai", escapeHtml(d.tgl_mulai || "-"), "calendar-check")}
              ${renderField("Tanggal selesai", escapeHtml(d.tgl_selesai || "-"), "calendar-check")}
            </div>
          </div>
          <div class="card-modern">
            <div class="card-header-modern">
              <h5>
                <div class="icon-wrapper">
                  <i class="bi bi-person-vcard-fill"></i>
                </div>
                Data Pemohon
              </h5>
            </div>
            <div class="info-section">
              ${renderField("Nama", escapeHtml(d.nama || "-"), "person-fill")}
              ${renderField("Tempat, Tanggal Lahir", (d.tempat_lahir ? escapeHtml(d.tempat_lahir) + ", " : "") + (d.tgl_lahir ? formatDate(d.tgl_lahir) : d.ttl ? escapeHtml(d.ttl) : "-"), "calendar-event")}
              ${renderField("Agama", escapeHtml(d.agama || "-"), "book")}
              ${renderField("Alamat", `${escapeHtml(d.jalan || "")} (RT ${escapeHtml(d.rt || "")} / RW ${escapeHtml(d.rw || "")})`, "signpost-fill")}
              ${renderField("Umur", escapeHtml(String(d.umur || computeAge(d) || "-")) + " tahun", "hourglass-split")}
            </div>
          </div>
        `;
        break;

      case "lainnya":
      case "surat lainnya":
        console.log("🔍 Rendering surat lainnya, full data:", {
          perihal: d.perihal,
          untuk: d.untuk,
          keperluan: d.keperluan,
          has_files_draft: !!(d.files && d.files.draft),
          draft_file_url: d.draft_file_url,
          has_form: !!d.form,
          form_file_sup1: d.form?.file_sup1,
          form_file_sup1_url: d.form?.file_sup1_url,
          file_sup1_top_level: d.file_sup1,
          file_sup1_url_top_level: d.file_sup1_url,
        });

        html += `
          <div class="card-modern">
            <div class="card-header-modern">
              <h5>
                <div class="icon-wrapper">
                  <i class="bi bi-file-earmark-text-fill"></i>
                </div>
                Detail Surat
              </h5>
            </div>
            <div class="info-section">
              ${renderField("Perihal", escapeHtml(d.perihal || "-"), "tag-fill")}
              ${renderField("Untuk / Kepada", escapeHtml(d.untuk || "-"), "person-lines-fill")}
              ${renderField("Keperluan", escapeHtml(d.keperluan || "-"), "chat-left-text")}
            </div>
          </div>
        `;

        // Check if there are any attachments
        const hasDraftFile =
          d.draft_file_url || (d.files && d.files.draft && d.files.draft.key);

        // Check for supporting files - try both form and top level
        let hasSupFiles = false;
        if (d.form) {
          hasSupFiles = !!(
            (d.form.file_sup1 &&
              (d.form.file_sup1.key || d.form.file_sup1_url)) ||
            (d.form.file_sup2 &&
              (d.form.file_sup2.key || d.form.file_sup2_url)) ||
            (d.form.file_sup3 &&
              (d.form.file_sup3.key || d.form.file_sup3_url)) ||
            (d.form.file_sup4 && (d.form.file_sup4.key || d.form.file_sup4_url))
          );
        }
        // Also check top level (after flatten)
        if (!hasSupFiles) {
          hasSupFiles = !!(
            (d.file_sup1 && (d.file_sup1.key || d.file_sup1_url)) ||
            (d.file_sup2 && (d.file_sup2.key || d.file_sup2_url)) ||
            (d.file_sup3 && (d.file_sup3.key || d.file_sup3_url)) ||
            (d.file_sup4 && (d.file_sup4.key || d.file_sup4_url))
          );
        }

        if (hasDraftFile || hasSupFiles) {
          html += `
            <div class="card-modern">
              <div class="card-header-modern">
                <h5>
                  <div class="icon-wrapper">
                    <i class="bi bi-paperclip"></i>
                  </div>
                  Dokumen Lampiran
                </h5>
              </div>
              <div class="info-section">`;

          // File utama (draft)
          if (hasDraftFile) {
            const draftName = d.files?.draft?.name || "File Utama";
            const draftUrl = d.draft_file_url || "#";
            html += renderField(
              "File utama",
              `<a href="${escapeHtml(draftUrl)}" target="_blank" class="text-primary"><i class="bi bi-file-pdf"></i> ${escapeHtml(draftName)}</a>`,
              "file-pdf",
            );
          }

          // Dokumen pendukung (file_sup1-4)
          if (hasSupFiles) {
            let supHtml = "";
            for (let i = 1; i <= 4; i++) {
              const fileKey = `file_sup${i}`;
              const urlKey = `${fileKey}_url`;

              // Try to get file data and URL from form or top level
              let fileData = d.form?.[fileKey] || d[fileKey];
              let fileUrl = d.form?.[urlKey] || d[urlKey];

              console.log(`🔍 Checking ${fileKey}:`, { fileData, fileUrl });

              if (fileData && (fileData.key || fileUrl)) {
                const fileName = fileData.name || `Dokumen ${i}`;
                const url = fileUrl || "#";
                supHtml += `<div class="mb-2"><a href="${escapeHtml(url)}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-pdf me-1"></i> ${escapeHtml(fileName)}</a></div>`;
              }
            }

            if (supHtml) {
              html += renderField("Dokumen pendukung", supHtml, "files");
            }
          }

          html += `
              </div>
            </div>
          `;
        }
        break;

      default:
        // fallback: show raw JSON but also try to show common fields if available
        html += `
          <div class="card-modern">
            <div class="card-header-modern">
              <h5>
                <div class="icon-wrapper">
                  <i class="bi bi-question-circle-fill"></i>
                </div>
                Detail Surat
              </h5>
            </div>
            <div class="info-section">
              <div class="alert-info-custom">
                <div class="d-flex gap-3 align-items-start">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <div>
                    <strong>Tipe surat tidak dikenali:</strong> ${escapeHtml(d.type || d.jenis)}
                    <div class="small mt-1">Data ditampilkan dalam format mentah.</div>
                  </div>
                </div>
              </div>
            ${d.perihal ? renderField("Perihal", escapeHtml(d.perihal), "tag-fill") : ""}
            ${d.nama ? renderField("Nama", escapeHtml(d.nama), "person-fill") : ""}
            ${d.keperluan ? renderField("Keperluan", escapeHtml(d.keperluan), "chat-left-text") : ""}
            </div>
          </div>
        `;
    }

    // append optional catatan (support older rawForm storage)
    if (d.catatan || (d.rawForm && d.rawForm.catatan)) {
      html += `
        <div class="card-modern">
          <div class="card-header-modern">
            <h5>
              <div class="icon-wrapper">
                <i class="bi bi-chat-left-text-fill"></i>
              </div>
              Catatan Tambahan
            </h5>
          </div>
          <div class="info-section">
            ${renderField("Catatan", escapeHtml(d.catatan || (d.rawForm && d.rawForm.catatan) || "-"), "sticky")}
          </div>
        </div>
      `;
    }

    detailArea.innerHTML = html;
  }

  // Riwayat/keterangan block removed as requested; users can use the Lacak modal for timeline

  // track modal opener (reuse modal in page)
  function openTrackModal(id) {
    const bodyEl = document.getElementById("track-body");
    bodyEl.innerHTML =
      '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2">Memuat riwayat...</span></div>';
    const modal = new bootstrap.Modal(document.getElementById("trackModal"));
    modal.show();
    // load same history
    (async () => {
      try {
        // Read directly from localStorage for realtime tracking
        const allItems = (await LS.loadArray("local_pengajuan")) || [];
        const item = allItems.find((x) => x && String(x.id) === String(id));

        if (!item) {
          bodyEl.innerHTML =
            '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Item tidak ditemukan.</div>';
          return;
        }

        // Get timeline from item (prefer timeline over history)
        const timeline = item.timeline || item.history || [];

        if (!timeline || timeline.length === 0) {
          bodyEl.innerHTML =
            '<div class="text-muted text-center py-4"><i class="bi bi-clock-history" style="font-size:2rem;"></i><p class="mt-2 mb-0">Belum ada riwayat untuk pengajuan ini.</p></div>';
          return;
        }

        // Sort timeline by time (newest first)
        const sorted = timeline.slice().sort((a, b) => {
          const tA = new Date(a.at || a.time || a.tanggal || 0).getTime();
          const tB = new Date(b.at || b.time || b.tanggal || 0).getTime();
          return tB - tA;
        });

        // Action labels mapping
        const actionLabels = {
          proses: "📝 Pengajuan dibuat",
          diterima: "✅ Diverifikasi oleh Koordinator",
          ditolak: "❌ Ditolak oleh Koordinator",
          nomor_assigned: "🔢 Nomor surat diterbitkan",
          file_uploaded: "📎 File surat diunggah",
          disposisi_to_sekretaris: "📤 Diteruskan ke Sekretaris",
          disposisi_to_pendeta: "📤 Diteruskan ke Pendeta",
          disposisi_to_tatausaha: "📥 Dikembalikan ke Tata Usaha",
          validated_by_sekretaris: "✅ Divalidasi oleh Sekretaris",
          validated_by_pendeta: "✅ Divalidasi oleh Pendeta",
          validated: "✅ Surat selesai divalidasi",
          archived: "📦 Surat diarsipkan",
        };

        const roleNames = {
          jemaat: "Jemaat",
          koordinator: "Koordinator Rayon",
          tatausaha: "Tata Usaha",
          sekretaris: "Sekretaris",
          pendeta: "Pendeta",
        };

        const itemsHtml = sorted
          .map((h, idx) => {
            const action = h.action || h.status || "update";
            const label = actionLabels[action] || action;
            const time = formatDate(h.at || h.time || h.tanggal || h.createdAt);
            const by = h.by ? roleNames[h.by.toLowerCase()] || h.by : "";
            const note = h.note || h.keterangan || "";
            const isRejection =
              action === "ditolak" || action === "disposisi_to_tatausaha";

            return `
          <div class="timeline-item mb-3" style="border-left:3px solid ${isRejection ? "#dc3545" : "#0d6efd"};padding-left:16px;position:relative;">
            <div style="position:absolute;left:-8px;top:6px;width:14px;height:14px;border-radius:50%;background:${isRejection ? "#dc3545" : "#0d6efd"};"></div>
            <div class="d-flex justify-content-between align-items-start mb-1">
              <div class="fw-semibold" style="color:${isRejection ? "#dc3545" : "#2d3748"};">${escapeHtml(label)}</div>
              ${by ? `<span class="badge bg-${isRejection ? "danger" : "primary"}" style="font-size:0.7rem;">${escapeHtml(by)}</span>` : ""}
            </div>
            <div class="small text-muted mb-1"><i class="bi bi-clock"></i> ${escapeHtml(time)}</div>
            ${note ? `<div class="small" style="background:${isRejection ? "#fff5f5" : "#f8f9fa"};padding:10px 12px;border-radius:6px;margin-top:8px;"><strong style="color:#666;"><i class="bi bi-chat-left-text"></i> Catatan:</strong><div style="color:#2d3748;margin-top:6px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(note)}</div></div>` : ""}
          </div>
          `;
          })
          .join("");

        bodyEl.innerHTML = `<div class="timeline-container">${itemsHtml}</div>`;
      } catch (e) {
        console.error("Error loading timeline:", e);
        bodyEl.innerHTML =
          '<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>Gagal memuat riwayat. Silakan coba lagi.</div>';
      }
    })();
  }

  loadData();
});

