// Admin - Accounts Management (CRUD)
(function () {
  const qs = (id) => document.getElementById(id);
  let currentEditId = null;
  let deleteTargetId = null;
  let resetTargetId = null;
  let accountModal, deleteModal, resetPasswordModal, resetResultModal;

  // Modal loading state
  let modalsLoaded = {
    accountForm: false,
    delete: false,
    reset: false,
    resetResult: false,
  };

  // Load modal HTML dynamically
  async function loadModal(modalType) {
    if (modalsLoaded[modalType]) return; // Already loaded

    const modalFiles = {
      accountForm: "../../assets/components/account-form-modal.html",
      delete: "../../assets/components/account-delete-modal.html",
      reset: "../../assets/components/account-reset-modal.html",
      resetResult: "../../assets/components/account-reset-result-modal.html",
    };

    try {
      console.log(`📥 Loading ${modalType} modal...`);
      const response = await fetch(modalFiles[modalType]);
      if (!response.ok) throw new Error(`Failed to load ${modalType} modal`);

      const html = await response.text();

      // Insert modal directly into body (not modal-container) for proper z-index
      document.body.insertAdjacentHTML("beforeend", html);
      console.log(`✅ ${modalType} modal loaded and inserted to body`);

      modalsLoaded[modalType] = true;

      // Initialize Bootstrap modal after loading
      initializeModalInstances();

      // Re-attach event listeners for newly loaded modals
      attachModalEventListeners();
    } catch (e) {
      console.error(`❌ Error loading ${modalType} modal:`, e);
      alert(`Gagal memuat modal ${modalType}. Silakan refresh halaman.`);
    }
  }

  // Initialize Bootstrap modal instances
  function initializeModalInstances() {
    const accountModalEl = document.getElementById("accountModal");
    const deleteModalEl = document.getElementById("deleteModal");
    const resetPasswordModalEl = document.getElementById("resetPasswordModal");
    const resetResultModalEl = document.getElementById("resetResultModal");

    // Modal options for proper popup behavior
    const modalOptions = {
      backdrop: "static",
      keyboard: false,
      focus: true,
    };

    if (accountModalEl && !accountModal) {
      accountModal = new bootstrap.Modal(accountModalEl, modalOptions);
      console.log("✅ Account modal instance created");
    }
    if (deleteModalEl && !deleteModal) {
      deleteModal = new bootstrap.Modal(deleteModalEl, modalOptions);
      console.log("✅ Delete modal instance created");
    }
    if (resetPasswordModalEl && !resetPasswordModal) {
      resetPasswordModal = new bootstrap.Modal(
        resetPasswordModalEl,
        modalOptions,
      );
      console.log("✅ Reset password modal instance created");
    }
    if (resetResultModalEl && !resetResultModal) {
      resetResultModal = new bootstrap.Modal(resetResultModalEl, modalOptions);
      console.log("✅ Reset result modal instance created");
    }
  }

  // Attach event listeners to modal elements
  function attachModalEventListeners() {
    // Account form modal listeners
    if (modalsLoaded.accountForm) {
      const roleSelect = qs("account-role");
      if (roleSelect && !roleSelect.dataset.listenerAttached) {
        roleSelect.addEventListener("change", (e) => {
          const role = e.target.value;
          const rayonFields = document.getElementById("koordinator-fields");

          if (rayonFields) {
            rayonFields.style.display =
              role === "koordinator" || role === "jemaat" ? "block" : "none";
            if (role !== "koordinator" && role !== "jemaat") {
              const rayonSelect = qs("account-rayon");
              if (rayonSelect) rayonSelect.value = "";
            }
          }
        });
        roleSelect.dataset.listenerAttached = "true";
      }

      // Add form input animations and validation
      const formInputs = document.querySelectorAll(
        "#accountModal .form-control-modern, #accountModal .form-select",
      );
      formInputs.forEach((input) => {
        if (!input.dataset.animationAttached) {
          // Add focus animation
          input.addEventListener("focus", (e) => {
            const formSection = e.target.closest(".form-section");
            if (formSection) {
              formSection.style.borderLeftColor = "#667eea";
              formSection.style.borderLeftWidth = "5px";
            }
          });

          input.addEventListener("blur", (e) => {
            const formSection = e.target.closest(".form-section");
            if (formSection) {
              formSection.style.borderLeftWidth = "4px";
            }
          });

          // Real-time validation for email
          if (input.id === "account-email") {
            input.addEventListener("input", (e) => {
              const email = e.target.value;
              const emailRegex = /^[a-z0-9](\.?[a-z0-9]){5,}@gmail\.com$/i;

              if (email && !emailRegex.test(email)) {
                input.classList.add("is-invalid");
                input.classList.remove("is-valid");
              } else if (email) {
                input.classList.remove("is-invalid");
                input.classList.add("is-valid");
              } else {
                input.classList.remove("is-invalid", "is-valid");
              }
            });
          }

          // Real-time validation for NIK (16 digits)
          if (input.id === "account-nik") {
            input.addEventListener("input", (e) => {
              const nik = e.target.value;
              const nikRegex = /^\d{16}$/;

              if (nik && !nikRegex.test(nik)) {
                input.classList.add("is-invalid");
                input.classList.remove("is-valid");
              } else if (nik) {
                input.classList.remove("is-invalid");
                input.classList.add("is-valid");
              } else {
                input.classList.remove("is-invalid", "is-valid");
              }
            });
          }

          input.dataset.animationAttached = "true";
        }
      });

      // Password toggle
      const toggleBtn = qs("toggle-account-password");
      if (toggleBtn && !toggleBtn.dataset.listenerAttached) {
        toggleBtn.addEventListener("click", (e) => {
          const passwordInput = qs("account-password");
          const toggleIcon = e.currentTarget.querySelector("i");

          if (passwordInput.type === "password") {
            passwordInput.type = "text";
            toggleIcon.classList.remove("bi-eye");
            toggleIcon.classList.add("bi-eye-slash");
          } else {
            passwordInput.type = "password";
            toggleIcon.classList.remove("bi-eye-slash");
            toggleIcon.classList.add("bi-eye");
          }
        });
        toggleBtn.dataset.listenerAttached = "true";
      }

      // Save button
      const saveBtn = qs("btn-save");
      if (saveBtn && !saveBtn.dataset.listenerAttached) {
        saveBtn.addEventListener("click", saveAccount);
        saveBtn.dataset.listenerAttached = "true";
      }

      // Form submit
      const accountForm = qs("account-form");
      if (accountForm && !accountForm.dataset.listenerAttached) {
        accountForm.addEventListener("submit", (e) => {
          e.preventDefault();
          saveAccount();
        });
        accountForm.dataset.listenerAttached = "true";
      }

      // Reset modal state when closed
      const accountModalEl = document.getElementById("accountModal");
      if (accountModalEl && !accountModalEl.dataset.listenerAttached) {
        accountModalEl.addEventListener("hidden.bs.modal", () => {
          const roleSelect = qs("account-role");
          if (roleSelect) roleSelect.disabled = false;

          const rayonFields = document.getElementById("koordinator-fields");
          if (rayonFields) rayonFields.style.display = "none";

          // Re-enable email and password fields
          const emailField = qs("account-email");
          if (emailField) {
            emailField.readOnly = false;
            emailField.style.backgroundColor = "";
            emailField.title = "";
          }

          const passwordField = qs("account-password");
          if (passwordField) {
            passwordField.disabled = false;
            passwordField.style.backgroundColor = "";
            passwordField.placeholder = "Password";
            passwordField.title = "";
          }

          const toggleBtn = qs("toggle-account-password");
          if (toggleBtn) {
            toggleBtn.disabled = false;
            toggleBtn.style.backgroundColor = "";
          }

          // Remove info message
          const infoMsg = document.querySelector(".jemaat-edit-info");
          if (infoMsg) infoMsg.remove();
        });
        accountModalEl.dataset.listenerAttached = "true";
      }
    }

    // Delete modal listeners
    if (modalsLoaded.delete) {
      const deleteBtn = qs("btn-delete-confirm");
      if (deleteBtn && !deleteBtn.dataset.listenerAttached) {
        deleteBtn.addEventListener("click", deleteAccount);
        deleteBtn.dataset.listenerAttached = "true";
      }
    }

    // Reset password modal listeners
    if (modalsLoaded.reset) {
      const resetBtn = qs("btn-reset-confirm");
      if (resetBtn && !resetBtn.dataset.listenerAttached) {
        resetBtn.addEventListener("click", confirmResetPassword);
        resetBtn.dataset.listenerAttached = "true";
      }
    }

    // Reset result modal listeners
    if (modalsLoaded.resetResult) {
      const copyBtn = qs("btn-copy-password");
      if (copyBtn && !copyBtn.dataset.listenerAttached) {
        copyBtn.addEventListener("click", copyPassword);
        copyBtn.dataset.listenerAttached = "true";
      }
    }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function loadUsers() {
    try {
      console.log("📡 Fetching users from API...");
      console.log("API object:", API);
      console.log("API.users:", API?.users);
      console.log("API.users.getAll:", API?.users?.getAll);

      if (!API || !API.users || !API.users.getAll) {
        throw new Error(
          "API not properly loaded! Check if api.js is loaded before accounts.js",
        );
      }

      const users = await API.users.getAll();
      console.log("✅ Users loaded:", users ? users.length : 0, "users");
      if (users && users.length > 0) {
        console.log("Sample user:", users[0]);
      }
      return users || [];
    } catch (e) {
      console.error("❌ Failed to load users:", e);
      console.error("Error stack:", e.stack);
      alert("Gagal memuat data akun. Error: " + e.message);
      return [];
    }
  }

  async function saveUser(user) {
    try {
      if (user._id || user.id) {
        // Update existing user
        return await API.users.update(user._id || user.id, user);
      } else {
        // Create new user (though admin shouldn't create jemaat)
        return await API.users.register(user);
      }
    } catch (e) {
      console.error("Failed to save user:", e);
      throw e;
    }
  }

  async function deleteUserById(id) {
    try {
      return await API.users.delete(id);
    } catch (e) {
      console.error("Failed to delete user:", e);
      throw e;
    }
  }

  function getRoleBadge(role) {
    const badges = {
      jemaat: '<span class="badge bg-primary">Jemaat</span>',
      koordinator: '<span class="badge bg-info text-dark">Koordinator</span>',
      tatausaha: '<span class="badge bg-warning text-dark">Tata Usaha</span>',
      sekretaris: '<span class="badge bg-secondary">Sekretaris</span>',
      pendeta: '<span class="badge bg-success">Pendeta</span>',
      admin: '<span class="badge bg-danger">Administrator</span>',
    };
    return badges[role] || '<span class="badge bg-secondary">-</span>';
  }

  function generateId() {
    return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  function renderTable(users) {
    console.log("🎨 Rendering table with", users ? users.length : 0, "users");
    console.log("Users data:", users);

    const tbody = qs("accounts-tbody");
    console.log("Table body element:", tbody);

    if (!tbody) {
      console.error("❌ Table body element not found! ID: accounts-tbody");
      alert("ERROR: Table body not found! Please refresh the page.");
      return;
    }

    console.log("✅ Table body found, clearing existing content...");

    // Update statistics
    updateStatistics(users);

    tbody.innerHTML = "";
    console.log("Table cleared, rows to render:", users ? users.length : 0);

    if (!users || users.length === 0) {
      console.log("⚠️ No users to display");
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center py-5"><div class="text-muted"><i class="bi bi-inbox" style="font-size: 3rem;"></i><p class="mt-3 mb-0 fw-semibold">Tidak ada akun ditemukan</p></div></td></tr>';
      return;
    }

    console.log("🔄 Creating table rows...");
    users.forEach((user, idx) => {
      const tr = document.createElement("tr");
      const createdAt =
        user.createdAt || user.created_at
          ? new Date(user.createdAt || user.created_at).toLocaleDateString(
              "id-ID",
              { day: "numeric", month: "short", year: "numeric" },
            )
          : "-";
      const nama = user.nama || user.name || "-";
      const email = user.email || "-";
      const nik = user.nik || "-";
      const role = user.role || "unknown";
      const userId = user._id || user.id;
      const isPasswordSementara = user.is_password_sementara || false;

      // Status badge
      const statusBadge = isPasswordSementara
        ? '<span class="status-badge status-temp-password"><i class="bi bi-exclamation-triangle-fill"></i>Password Sementara</span>'
        : '<span class="status-badge status-active"><i class="bi bi-check-circle-fill"></i>Aktif</span>';

      // Show reset button only for jemaat
      const resetBtn =
        role === "jemaat"
          ? `<button class="btn-action btn-outline-warning btn-reset" data-id="${escapeHtml(userId)}" data-name="${escapeHtml(nama)}" data-email="${escapeHtml(email)}" data-nik="${escapeHtml(nik)}" data-role="${escapeHtml(role)}" title="Reset Password">
             <i class="bi bi-key-fill"></i><span class="d-md-none ms-2">Reset</span>
           </button>`
          : "";

      tr.innerHTML = `
        <td data-label="No" class="fw-bold text-muted">${idx + 1}</td>
        <td data-label="Pengguna">
          <div class="user-info-name">${escapeHtml(nama)}</div>
          <div class="user-info-email">${escapeHtml(email)}</div>
          <div class="user-info-nik">NIK: ${escapeHtml(nik)}</div>
        </td>
        <td data-label="Role">${getRoleBadge(role)}</td>
        <td data-label="Status">${statusBadge}</td>
        <td data-label="Terdaftar" class="text-muted fw-semibold">${createdAt}</td>
        <td data-label="Aksi" class="text-center">
          <button class="btn-action btn-outline-warning btn-edit" data-id="${escapeHtml(userId)}" title="Edit Akun">
            <i class="bi bi-pencil-fill"></i><span class="d-md-none ms-2">Edit</span>
          </button>
          ${resetBtn}
          <button class="btn-action btn-outline-danger btn-delete" data-id="${escapeHtml(userId)}" title="Hapus Akun">
            <i class="bi bi-trash-fill"></i><span class="d-md-none ms-2">Hapus</span>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    console.log("✅ All", users.length, "rows appended to table");
    console.log("Table HTML length:", tbody.innerHTML.length);

    // Wire buttons
    tbody.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openEditModal(id);
      });
    });

    tbody.querySelectorAll(".btn-reset").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        const email = btn.getAttribute("data-email");
        const nik = btn.getAttribute("data-nik");
        const role = btn.getAttribute("data-role");
        openResetPasswordModal(id, name, email, nik, role);
      });
    });

    tbody.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openDeleteModal(id);
      });
    });
  }

  function updateStatistics(users) {
    const total = users.length;
    const koordinator = users.filter((u) => u.role === "koordinator").length;
    const tatausaha = users.filter((u) => u.role === "tatausaha").length;
    const sekretaris = users.filter((u) => u.role === "sekretaris").length;
    const pendeta = users.filter((u) => u.role === "pendeta").length;

    animateCount(qs("total-accounts"), total);
    animateCount(qs("total-koordinator"), koordinator);
    animateCount(qs("total-tatausaha"), tatausaha);
    animateCount(qs("total-sekretaris"), sekretaris);
    animateCount(qs("total-pendeta"), pendeta);
  }

  function animateCount(el, target) {
    if (!el) return;
    let current = 0;
    const increment = Math.ceil(target / 20);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current;
    }, 30);
  }

  async function applyFilters() {
    console.log("🔍 Applying filters...");
    const users = await loadUsers();
    console.log("📊 Loaded users for filtering:", users);
    const search = (qs("search")?.value || "").toLowerCase();
    const role = qs("filter-role")?.value || "";
    const sort = qs("filter-sort")?.value || "newest";

    let filtered = users;

    if (search) {
      filtered = filtered.filter((u) => {
        const str = JSON.stringify(u).toLowerCase();
        return str.includes(search);
      });
    }

    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }

    // Apply sorting
    switch (sort) {
      case "oldest":
        filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateA - dateB;
        });
        break;
      case "name-asc":
        filtered.sort((a, b) => {
          const nameA = (a.nama || a.name || "").toLowerCase();
          const nameB = (b.nama || b.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case "name-desc":
        filtered.sort((a, b) => {
          const nameA = (a.nama || a.name || "").toLowerCase();
          const nameB = (b.nama || b.name || "").toLowerCase();
          return nameB.localeCompare(nameA);
        });
        break;
      case "newest":
      default:
        filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateB - dateA;
        });
        break;
    }

    console.log("✅ Filtered users:", filtered.length);
    renderTable(filtered);
  }

  async function openAddModal() {
    // Load modal if not already loaded
    await loadModal("accountForm");

    currentEditId = null;
    const modalTitle = qs("accountModalLabel");
    if (modalTitle)
      modalTitle.innerHTML =
        '<i class="bi bi-plus-circle me-2"></i>Tambah Akun Baru';

    qs("account-name").value = "";
    qs("account-email").value = "";
    qs("account-nik").value = "";
    qs("account-password").value = "";
    qs("account-role").value = "";
    qs("account-rayon").value = "";
    qs("account-password").required = true;
    qs("account-nik").required = true;

    // Hide rayon fields initially
    const rayonFields = document.getElementById("koordinator-fields");
    if (rayonFields) rayonFields.style.display = "none";

    if (accountModal) accountModal.show();
  }

  async function openEditModal(id) {
    // Load modal if not already loaded
    await loadModal("accountForm");

    const users = await loadUsers();
    const user = users.find((u) => (u._id || u.id) === id);
    if (!user) {
      alert("Akun tidak ditemukan");
      return;
    }

    currentEditId = user._id || user.id;
    const modalTitle = qs("accountModalLabel");
    if (modalTitle)
      modalTitle.innerHTML =
        '<i class="bi bi-pencil-square me-2"></i>Edit Akun';

    const nameField = qs("account-name");
    const emailField = qs("account-email");
    const nikField = qs("account-nik");
    const passwordField = qs("account-password");
    const roleField = qs("account-role");
    const rayonField = qs("account-rayon");

    if (nameField) nameField.value = user.nama || user.name || "";
    if (emailField) emailField.value = user.email || "";
    if (nikField) nikField.value = user.nik || "";
    if (passwordField) {
      passwordField.value = "";
      passwordField.required = false;
    }
    if (roleField) roleField.value = user.role || "";
    if (rayonField) rayonField.value = user.rayon || "";

    // Show/hide rayon fields based on role
    const rayonFields = document.getElementById("koordinator-fields");
    if (rayonFields) {
      rayonFields.style.display =
        user.role === "koordinator" || user.role === "jemaat"
          ? "block"
          : "none";
    }

    // If editing Jemaat account - restrict editing
    if (user.role === "jemaat") {
      // Disable role selection
      const roleSelect = qs("account-role");
      if (roleSelect) {
        roleSelect.disabled = true;
      }

      // Make NIK readonly
      const nikEl = qs("account-nik");
      if (nikEl) {
        nikEl.readOnly = true;
        nikEl.title = "NIK tidak dapat diubah untuk akun Jemaat";
      }

      // Make email readonly for Jemaat
      if (emailField) {
        emailField.readOnly = true;
        emailField.style.backgroundColor = "#f8f9fa";
        emailField.title = "Email tidak dapat diubah untuk akun Jemaat";
      }

      // Disable password field for Jemaat
      if (passwordField) {
        passwordField.disabled = true;
        passwordField.style.backgroundColor = "#f8f9fa";
        passwordField.placeholder = "Password tidak dapat diubah oleh Admin";
        passwordField.title =
          "Password tidak dapat diubah oleh Admin untuk akun Jemaat";
      }

      // Disable password toggle button
      const toggleBtn = qs("toggle-account-password");
      if (toggleBtn) {
        toggleBtn.disabled = true;
        toggleBtn.style.backgroundColor = "#f8f9fa";
      }

      // Add info message
      const passwordSection = passwordField?.closest(".form-section");
      if (
        passwordSection &&
        !passwordSection.querySelector(".jemaat-edit-info")
      ) {
        const infoDiv = document.createElement("div");
        infoDiv.className = "alert alert-info mt-2 jemaat-edit-info";
        infoDiv.innerHTML =
          '<i class="bi bi-info-circle-fill me-2"></i><small><strong>Info:</strong> Untuk akun Jemaat, Admin hanya dapat mengubah <strong>Rayon</strong>. Email dan Password tidak dapat diubah.</small>';
        passwordSection.appendChild(infoDiv);
      }
    } else {
      // Enable all fields for non-Jemaat accounts
      const roleSelect = qs("account-role");
      if (roleSelect) {
        roleSelect.disabled = false;
      }

      const nikEl = qs("account-nik");
      if (nikEl) {
        nikEl.readOnly = false;
        nikEl.title = "";
      }

      if (emailField) {
        emailField.readOnly = false;
        emailField.style.backgroundColor = "";
        emailField.title = "";
      }

      if (passwordField) {
        passwordField.disabled = false;
        passwordField.style.backgroundColor = "";
        passwordField.placeholder =
          "Kosongkan jika tidak ingin mengubah password";
        passwordField.title = "";
      }

      const toggleBtn = qs("toggle-account-password");
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.style.backgroundColor = "";
      }

      // Remove info message if exists
      const infoMsg = document.querySelector(".jemaat-edit-info");
      if (infoMsg) infoMsg.remove();
    }

    if (accountModal) accountModal.show();
  }

  async function openDeleteModal(id) {
    // Load modal if not already loaded
    await loadModal("delete");

    const users = await loadUsers();
    const user = users.find((u) => (u._id || u.id) === id);
    if (!user) {
      alert("Akun tidak ditemukan");
      return;
    }

    deleteTargetId = user._id || user.id;

    // Populate user info in modal
    qs("delete-user-name").textContent = user.name || user.nama || "-";
    qs("delete-user-email").textContent = user.email || "-";
    qs("delete-user-nik").textContent = user.nik || "-";
    qs("delete-user-role-badge").innerHTML = getRoleBadge(
      user.role || "jemaat",
    );

    if (deleteModal) deleteModal.show();
  }

  async function deleteAccount() {
    if (!deleteTargetId) return;

    console.log("Calling async delete account");
    const users = await loadUsers();
    const userToDelete = users.find((u) => (u._id || u.id) === deleteTargetId);

    if (!userToDelete) {
      alert("Akun tidak ditemukan");
      return;
    }

    try {
      await deleteUserById(deleteTargetId);

      // Also delete related submissions if jemaat
      if (userToDelete.role === "jemaat") {
        try {
          const allPengajuan = await API.pengajuan.getAll();
          const toDelete = allPengajuan.filter(
            (p) =>
              p.user_id === deleteTargetId ||
              p.user_id === userToDelete.nik ||
              (p._id || p.id) === deleteTargetId,
          );
          for (const pengajuan of toDelete) {
            await API.pengajuan.delete(pengajuan._id || pengajuan.id);
          }
        } catch (e) {
          console.error("Error deleting related submissions:", e);
        }
      }

      // Close modal and refresh
      if (deleteModal) deleteModal.hide();
      await applyFilters();
      alert(
        `Akun ${userToDelete.nama || userToDelete.name || userToDelete.email} berhasil dihapus`,
      );
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Gagal menghapus akun: " + (e.message || "Unknown error"));
    }

    deleteTargetId = null;
  }

  function showToast(type, message) {
    const toast = document.createElement("div");
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    toast.style.cssText =
      "z-index:9999;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);";
    toast.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-${type === "success" ? "check-circle-fill" : "exclamation-triangle-fill"}"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity 0.3s ease";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async function saveAccount() {
    const nameField = qs("account-name");
    const emailField = qs("account-email");
    const nikField = qs("account-nik");
    const passwordField = qs("account-password");
    const roleField = qs("account-role");
    const rayonField = qs("account-rayon");

    if (!nameField || !emailField || !nikField || !roleField) {
      alert("Form tidak lengkap. Silakan refresh halaman.");
      return;
    }

    const nama = nameField.value.trim();
    const email = emailField.value.trim();
    const nik = nikField.value.trim();
    const password = passwordField ? passwordField.value : "";
    const role = roleField.value;
    const rayon = rayonField ? rayonField.value : "";

    if (!nama || !email || !role || !nik) {
      alert("Nama, Email, NIK, dan Role wajib diisi");
      return;
    }

    // Validate rayon for koordinator and jemaat
    if ((role === "koordinator" || role === "jemaat") && !rayon) {
      alert(
        "Rayon wajib diisi untuk " +
          (role === "koordinator" ? "Koordinator" : "Jemaat"),
      );
      return;
    }

    if (!currentEditId && !password) {
      alert("Password wajib diisi untuk akun baru");
      return;
    }

    try {
      if (currentEditId) {
        // Update existing
        const users = await loadUsers();
        const user = users.find((u) => (u._id || u.id) === currentEditId);
        if (user) {
          const updates = {
            nama: nama,
            name: nama,
          };

          // Prevent changing role from/to Jemaat
          if (user.role === "jemaat" && role !== "jemaat") {
            alert("Role akun Jemaat tidak dapat diubah ke role lain.");
            return;
          }
          if (user.role !== "jemaat" && role === "jemaat") {
            alert("Role akun tidak dapat diubah menjadi Jemaat.");
            return;
          }

          // For Jemaat accounts - only allow rayon update
          if (user.role === "jemaat") {
            console.log("🔒 Editing Jemaat account - only updating rayon");
            updates.rayon = rayon;
            // Do NOT update email and password for Jemaat
          } else {
            // For non-Jemaat accounts - allow full update
            updates.email = email;
            updates.role = role;

            // Update rayon for koordinator
            if (role === "koordinator") {
              updates.rayon = rayon;
            } else {
              updates.rayon = null;
            }

            // Update password if provided
            if (password) {
              updates.password = password;
            }
          }

          await API.users.update(currentEditId, updates);
        }
      } else {
        // Create new
        const newUser = {
          nama: nama,
          name: nama,
          email: email,
          password: password,
          role: role,
          nik: nik,
        };

        // Add rayon for koordinator and jemaat
        if (role === "koordinator" || role === "jemaat") {
          newUser.rayon = rayon;
        }

        await API.users.register(newUser);
      }

      // Re-enable role select before closing modal
      const roleSelect = qs("account-role");
      if (roleSelect) roleSelect.disabled = false;

      if (accountModal) accountModal.hide();
      await applyFilters();
      alert(
        currentEditId
          ? "Akun berhasil diperbarui"
          : "Akun berhasil ditambahkan",
      );
    } catch (e) {
      console.error("Save failed:", e);
      alert("Gagal menyimpan akun: " + (e.message || "Unknown error"));
    }
  }

  // function deleteAccount() {
  //   if (!deleteTargetId) return;
  //
  //   console.log("calling non async delete account");
  //   const users = loadUsers();
  //   console.log("Users", users);
  //   const filtered = users.filter((u) => u.id !== deleteTargetId);
  //   saveUsers(filtered);
  //
  //   deleteModal.hide();
  //   applyFilters();
  //   alert("Akun berhasil dihapus");
  //   deleteTargetId = null;
  // }

  async function openResetPasswordModal(id, name, email, nik, role) {
    // Load reset modal if not already loaded
    await loadModal("reset");

    resetTargetId = id;
    qs("reset-user-name").textContent = name || "-";
    qs("reset-user-email").textContent = email || "-";
    qs("reset-user-nik").textContent = nik || "-";
    qs("reset-user-role-badge").innerHTML = getRoleBadge(role || "jemaat");
    qs("reset-reason").value = "";

    if (resetPasswordModal) resetPasswordModal.show();
  }

  async function confirmResetPassword() {
    if (!resetTargetId) return;

    const reasonEl = qs("reset-reason");
    const reason = reasonEl?.value?.trim() || "";

    // Validate required reason (backend enforces this)
    if (!reason) {
      if (reasonEl) {
        reasonEl.classList.add("is-invalid");
        reasonEl.focus();
      }
      alert("Alasan reset wajib diisi.");
      return;
    }

    try {
      // Prefer LS.getCurrentUser, then fallback to localStorage 'currentUser' or 'user'
      const lsUser =
        window.LS && typeof window.LS.getCurrentUser === "function"
          ? window.LS.getCurrentUser()
          : null;
      const storedCurrent = !lsUser
        ? JSON.parse(localStorage.getItem("currentUser") || "null")
        : null;
      const storedLegacy =
        !lsUser && !storedCurrent
          ? JSON.parse(localStorage.getItem("user") || "null")
          : null;
      const currentUser = lsUser || storedCurrent || storedLegacy || {};

      const adminId =
        currentUser._id || currentUser.id || currentUser.user_id || null;
      const adminName =
        currentUser.name || currentUser.nama || currentUser.email || "Admin";

      if (!adminId) {
        alert("Session admin tidak ditemukan. Silakan login ulang.");
        return;
      }

      const data = await window.API.request(
        `/users/${resetTargetId}/reset-password`,
        "POST",
        {
          admin_id: adminId,
          admin_name: adminName,
          reason: reason,
        },
      );

      console.log("✅ Password reset berhasil:", data);

      // Hide reset modal
      if (resetPasswordModal) resetPasswordModal.hide();

      // Load and show result modal with temporary password
      await loadModal("resetResult");

      qs("reset-result-user").textContent = data.user_name || "";
      qs("temp-password").textContent = data.password_sementara || "";

      if (resetResultModal) resetResultModal.show();

      // Refresh table
      applyFilters();
    } catch (error) {
      console.error("❌ Error reset password:", error);
      alert(`Gagal reset password: ${error.message}`);
    } finally {
      resetTargetId = null;
    }
  }

  function copyPassword() {
    const passwordText = qs("temp-password")?.textContent;
    if (!passwordText) return;

    navigator.clipboard
      .writeText(passwordText)
      .then(() => {
        const btn = qs("btn-copy-password");
        const originalHtml = btn.innerHTML;
        const originalClasses = btn.className;

        btn.innerHTML = '<i class="bi bi-check-lg"></i> Tersalin!';
        btn.className = "btn btn-success btn-copy-modern";
        btn.disabled = true;

        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.className = originalClasses;
          btn.disabled = false;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Gagal menyalin password. Silakan salin manual.");
      });
  }

  document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Page loaded - Initializing accounts management...");
    console.log("📊 Bootstrap available:", typeof bootstrap !== "undefined");
    console.log("📊 API available:", typeof API !== "undefined");

    // Initial render
    applyFilters();

    // If URL contains ?edit=<id>, open edit modal for that id
    (function checkOpenFromQuery() {
      try {
        const params = new URLSearchParams(window.location.search || "");
        const eid = params.get("edit");
        if (eid) {
          const id = decodeURIComponent(eid);
          setTimeout(() => {
            openEditModal(id);
          }, 60);
        }
      } catch (e) {
        // ignore
      }
    })();

    // Wire main page buttons (not modal buttons - those are attached when modals load)
    const btnAdd = qs("btn-add");
    const searchInput = qs("search");
    const filterRole = qs("filter-role");
    const filterSort = qs("filter-sort");
    const btnRefresh = qs("btn-refresh");

    console.log("🔘 Button elements found:", {
      btnAdd: !!btnAdd,
      searchInput: !!searchInput,
      filterRole: !!filterRole,
      filterSort: !!filterSort,
      btnRefresh: !!btnRefresh,
    });

    if (btnAdd) btnAdd.addEventListener("click", openAddModal);
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (filterRole) filterRole.addEventListener("change", applyFilters);
    if (filterSort) filterSort.addEventListener("change", applyFilters);
    if (btnRefresh) btnRefresh.addEventListener("click", applyFilters);
  });
})();
