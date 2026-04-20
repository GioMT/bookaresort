/* ============================================================
   admin.js — Admin panel logic
   Avellano's Beach Hut Cottage
   ============================================================ */

// ── STAFF ROLE TRACKING ──────────────────────────────────────────────────────
let _currentStaffRole = 'staff'; // default to lowest privilege
let _currentStaffName = 'Unknown Staff';
let _currentStaffEmail = '';
let _seData = {}; // Global CMS content storage

async function initStaffRole() {
  try {
    const { data: { session } } = await window.supa.auth.getSession();
    if (session) {
      const { data: profile } = await window.supa
        .from('staff_profiles')
        .select('first_name, last_name, role')
        .eq('id', session.user.id)
        .single();
      if (profile) {
        _currentStaffRole = profile.role || 'staff';
        _currentStaffName = `${profile.first_name} ${profile.last_name}`;
      }
      _currentStaffEmail = session.user.email;
    }
  } catch (e) { console.error('Failed to load staff role:', e); }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtD(d) {
  if (!(d instanceof Date)) return d;
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function parseD(s) { if (!s) return null; const [y, m, dy] = s.split('-').map(Number); return new Date(y, m - 1, dy); }
function fmtMoney(n) { return '₱' + (+n || 0).toLocaleString(); }
function fmt(s) { if (!s) return '—'; const d = parseD(s); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : s; }

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg, type = '', dur = 3000) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => { el.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, dur);
}

// ── MOBILE SIDEBAR ────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('mainSidebar');
  const ov = document.getElementById('sidebarOverlay');
  const btn = document.getElementById('hamburgerBtn');
  const open = sb.classList.toggle('open');
  ov.classList.toggle('open', open);
  btn.textContent = open ? '✕' : '☰';
}
function closeSidebar() {
  document.getElementById('mainSidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.getElementById('hamburgerBtn').textContent = '☰';
}

// ── NAV ───────────────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: 'Revenue Dashboard', bookings: 'Booking History',
  calendar: 'Availability Calendar', rooms: 'Manage Rooms',
  repairs: 'Repair Costs', guests: 'Flagged Guests', export: 'Export Data',
  feed: 'Photo Feed', staff: 'Staff Accounts', logs: 'System Logs',
  chat: 'Customer Service', directory: 'Case Directory',
  siteeditor: 'Site Editor', business: 'Business Information',
};

async function navTo(page) {
  if (page === 'staff') {
    if (_currentStaffRole !== 'master') {
      toast("Only Master Admin can access Staff Accounts.", "error");
      return;
    }
    document.getElementById('staffAuthPass').value = '';
    openModal('staffAuthModal');
    setTimeout(() => document.getElementById('staffAuthPass').focus(), 300);
    return; // Don't navigate yet, wait for auth
  }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || page;

  if (page === 'dashboard') renderDashboard();
  if (page === 'bookings') renderBookings();
  if (page === 'rooms') renderRoomCards();
  if (page === 'feed') renderAdminFeed();
  if (page === 'repairs') renderRepairs();
  if (page === 'guests') renderFlaggedTable();
  if (page === 'calendar') renderAdminCal();
  if (page === 'logs') renderLogsTab();
  if (page === 'chat') initSupport();
  if (page === 'directory') renderDirectory();
  if (page === 'staff') renderStaffList();
  if (page === 'siteeditor') renderSiteEditor();
  if (page === 'business') renderBusinessInfo();

  if (window.innerWidth <= 900) closeSidebar();
}

// ── INITIALIZE CMS DATA ──
async function initCMSData() {
  try {
    const items = await ABHC_DB.getSiteContent();
    items.forEach(i => { _seData[i.key] = i.value; });
  } catch (e) { console.error("Failed to load CMS data:", e); }
}
initCMSData();

window.authenticateStaffTab = async function () {
  const p = document.getElementById('staffAuthPass').value;
  if (!p) return;
  const btn = document.querySelector('#staffAuthModal .btn-primary');
  btn.disabled = true; btn.textContent = 'Verifying...';

  try {
    const { error } = await window.supa.auth.signInWithPassword({ email: _currentStaffEmail, password: p });
    if (error) throw error;

    closeModal('staffAuthModal');

    // Now perform the actual navigation
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="staff"]`).classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-staff').classList.add('active');
    document.getElementById('topbarTitle').textContent = PAGE_TITLES['staff'];
    renderStaffList();
    if (window.innerWidth <= 900) closeSidebar();
  } catch (e) {
    toast("Authentication failed: " + e.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = 'Verify & Access';
  }
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── BUSINESS INFO ─────────────────────────────────────────────────────────────
async function renderBusinessInfo() {
  const contentArray = await ABHC_DB.getSiteContent();
  const content = {};
  if (Array.isArray(contentArray)) {
    contentArray.forEach(i => content[i.key] = i.value);
  }
  const v = (key, def = '') => content[key] !== undefined ? content[key] : def;

  const bName = v('business_name', "Beach Name");
  const bTag = v('business_tag', "----");
  // Sync admin browser tab title with the current business name
  document.title = bName + ' \u2013 Admin Panel';
  const bLoc = v('business_location', "Province, Philippines");
  const bEmail = v('business_email', "sample@email.com");
  const bPhone = v('business_phone', "+63 912 345 6789");
  const bCoords = v('business_coords', '');
  const bGmapsUrl = v('business_gmaps_url', '');

  const html = `
    <div class="card" style="margin-bottom:2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--sand-mid); padding-bottom:1rem;">
        <h2 style="font-size:1.2rem; font-weight:600; margin:0;">Business Profile</h2>
        <div id="bizActions">
          <button class="btn btn-ghost btn-sm" onclick="toggleBizEdit(true)">✏️ Edit</button>
        </div>
      </div>
      <div id="bizDisplay" style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
        <div class="form-group"><label>Business Name</label><div style="font-weight:500; padding-top:0.5rem;">${bName}</div></div>
        <div class="form-group"><label>Employee ID Tag (4 Letters)</label><div style="font-weight:500; padding-top:0.5rem;">${bTag}</div></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Business Location</label><div style="font-weight:500; padding-top:0.5rem;">${bLoc}</div></div>
        <div class="form-group"><label>Email Address</label><div style="font-weight:500; padding-top:0.5rem;">${bEmail}</div></div>
        <div class="form-group"><label>Mobile Phone</label><div style="font-weight:500; padding-top:0.5rem;">${bPhone}</div></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Google Maps Coordinates</label><div style="font-weight:500; padding-top:0.5rem;">${bCoords || '<span style="color:var(--text-muted); font-style:italic;">Not set</span>'}</div></div>
        <div class="form-group"><label>Google Maps Review Link</label><div style="font-weight:500; padding-top:0.5rem; color:var(--aqua); text-decoration:underline; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; max-width: 240px;" title="${bGmapsUrl}">${bGmapsUrl || '<span style="color:var(--text-muted); font-style:italic;">Not set</span>'}</div></div>
      </div>
      <div id="bizEdit" style="display:none; grid-template-columns:1fr 1fr; gap:1.5rem;">
        <div class="form-group"><label>Business Name</label><input type="text" id="biz_name" value="${bName}"></div>
        <div class="form-group"><label>Employee ID Tag (4 Letters)</label><input type="text" id="biz_tag" maxlength="4" style="text-transform:uppercase;" value="${bTag}"></div>
        <div class="form-group" style="grid-column: 1 / -1; position:relative;">
          <label>Business Location</label>
          <input type="text" id="biz_loc" value="${bLoc}" autocomplete="off" oninput="fetchLocationSuggestions(this.value)" placeholder="Start typing a city or address...">
          <div id="locSuggestions" style="position:absolute; top:100%; left:0; width:100%; background:white; border:1px solid var(--sand-mid); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:100; max-height:200px; overflow-y:auto; display:none;"></div>
        </div>
        <div class="form-group"><label>Email Address</label><input type="email" id="biz_email" value="${bEmail}"></div>
        <div class="form-group"><label>Mobile Phone</label><input type="text" id="biz_phone" value="${bPhone}"></div>
        <div class="form-group" style="grid-column:1/-1;">
          <label>GMaps Coordinates <span style="font-weight:400; color:var(--text-muted); font-style:italic;">(Lat, Lng — e.g. 15.1234, 119.5678)</span></label>
          <input type="text" id="biz_coords" value="${bCoords}" placeholder="e.g. 15.1234, 119.5678">
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label>Google Maps Review Link <span style="font-weight:400; color:var(--text-muted); font-style:italic;">(Used for syncing real guest reviews)</span></label>
          <input type="text" id="biz_gmaps_url" value="${bGmapsUrl}" placeholder="https://www.google.com/maps/place/...">
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--sand-mid); padding-bottom:1rem;">
        <div>
          <h2 style="font-size:1.2rem; font-weight:600; margin:0; margin-bottom:0.3rem;">Knowledge Base & Documents</h2>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Upload policies, menus, and FAQs. The AI Chatbot will use these to answer guest inquiries.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('docUploadInput').click()">+ Upload Document</button>
        <input type="file" id="docUploadInput" style="display:none" onchange="handleDocUpload(event)" accept=".pdf,.doc,.docx,.txt">
      </div>
      <div id="bizDocsGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:1rem;">
        <!-- Docs will load here -->
      </div>
    </div>
  `;
  document.getElementById('page-business').innerHTML = html;
  renderBizDocs();
}

window.toggleBizEdit = function (editing) {
  if (editing) {
    document.getElementById('bizDisplay').style.display = 'none';
    document.getElementById('bizEdit').style.display = 'grid';
    document.getElementById('bizActions').innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="toggleBizEdit(false)">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="saveBizInfo()">💾 Save Changes</button>
    `;
  } else {
    renderBusinessInfo();
  }
};

let locTimeout;
window.fetchLocationSuggestions = function (query) {
  const sug = document.getElementById('locSuggestions');
  if (!query || query.length < 3) {
    sug.style.display = 'none';
    return;
  }
  clearTimeout(locTimeout);
  locTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`);
      const data = await res.json();
      if (!data || data.length === 0) {
        sug.innerHTML = '<div style="padding:0.8rem; color:var(--text-muted); font-size:0.85rem;">No results found</div>';
        sug.style.display = 'block';
        return;
      }
      sug.innerHTML = data.map(item => `
        <div style="padding:0.8rem; border-bottom:1px solid var(--sand); cursor:pointer; font-size:0.85rem; transition:background 0.2s;" 
             onmouseover="this.style.background='var(--sand-light)'" 
             onmouseout="this.style.background='transparent'"
             onclick="document.getElementById('biz_loc').value = '${item.display_name.replace(/'/g, "\\'")}'; document.getElementById('locSuggestions').style.display='none';">
          ${item.display_name}
        </div>
      `).join('');
      sug.style.display = 'block';
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  }, 400);
};

document.addEventListener('click', (e) => {
  const sug = document.getElementById('locSuggestions');
  if (sug && e.target.id !== 'biz_loc') {
    sug.style.display = 'none';
  }
});

window.saveBizInfo = async function () {
  const btn = document.querySelector('#bizActions .btn-primary');
  btn.disabled = true; btn.textContent = 'Saving...';

  const coordsEl = document.getElementById('biz_coords');
  const updates = {
    business_name: document.getElementById('biz_name').value,
    business_tag: document.getElementById('biz_tag').value.toUpperCase(),
    business_location: document.getElementById('biz_loc').value,
    business_email: document.getElementById('biz_email').value,
    business_phone: document.getElementById('biz_phone').value,
    business_coords: coordsEl ? coordsEl.value.trim() : '',
    business_gmaps_url: document.getElementById('biz_gmaps_url') ? document.getElementById('biz_gmaps_url').value.trim() : '',
  };

  if (updates.business_name) {
    updates.nav_brand = updates.business_name;
    updates.footer_copy = '© ' + new Date().getFullYear() + ' ' + updates.business_name + ' · All rights reserved.';

    const words = updates.business_name.split(' ');
    if (words.length > 1) {
      const first = words.shift();
      updates.hero_title = `${first}<br><em>${words.join(' ')}</em>`;
      updates.footer_brand = `${first} <span>${words.join(' ')}</span>`;
    } else {
      updates.hero_title = updates.business_name;
      updates.footer_brand = updates.business_name;
    }
  }
  if (updates.business_location) {
    updates.hero_temp_loc = updates.business_location.split(',')[0];
    updates.contact_location = updates.business_location;
    updates.hero_badge = '✦ BEACHFRONT PARADISE · ' + updates.business_location.toUpperCase() + ' ✦';
  }
  if (updates.business_email) updates.contact_email = updates.business_email;
  if (updates.business_phone) updates.contact_phone = updates.business_phone;
  if (updates.business_coords) {
    const parts = updates.business_coords.split(',').map(s => s.trim());
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      updates.contact_map_url = `https://www.google.com/maps?q=${parts[0]},${parts[1]}`;
    }
  }

  try {
    const items = Object.entries(updates).map(([k, v]) => ({
      key: k,
      value: v,
      section: 'business',
      label: k
    }));
    await ABHC_DB.saveSiteContent(items);
    toast('Business profile updated securely.', 'success');
    // Update the admin browser tab title immediately
    if (updates.business_name) {
      document.title = updates.business_name + ' \u2013 Admin Panel';
      const words = updates.business_name.split(' ');
      const logoEl = document.getElementById('sidebarLogoMain');
      if (logoEl) {
        if (words.length > 1) {
          const first = words.shift();
          logoEl.innerHTML = `${first} <span>${words.join(' ')}</span>`;
        } else {
          logoEl.innerHTML = updates.business_name;
        }
      }
    }
    renderBusinessInfo();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    btn.disabled = false; btn.textContent = '💾 Save Changes';
  }
};

window.renderBizDocs = async function () {
  const grid = document.getElementById('bizDocsGrid');
  grid.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem;">Loading documents...</div>';
  try {
    const { data: docs, error } = await supabase.from('business_docs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!docs || docs.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; background:var(--sand); border-radius:12px; color:var(--text-muted);">No documents uploaded yet.<br><br>Click "+ Upload Document" to add your first file.</div>';
      return;
    }
    grid.innerHTML = docs.map(d => `
      <div style="border:1px solid var(--sand-mid); border-radius:12px; padding:1rem; display:flex; flex-direction:column; background:white;">
        <div style="font-size:2rem; margin-bottom:0.5rem; text-align:center;">📄</div>
        <div style="font-weight:600; font-size:0.85rem; margin-bottom:0.3rem; word-break:break-all;">${d.filename}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem;">${d.size_kb} KB • ${new Date(d.created_at).toLocaleDateString()}</div>
        <div style="margin-top:auto; display:flex; gap:0.5rem;">
          <a href="${d.file_url}" target="_blank" class="btn btn-ghost btn-xs" style="flex:1; justify-content:center; display:flex; align-items:center;">View</a>
          <button class="btn btn-ghost btn-xs" style="color:var(--sunset); flex:1;" onclick="deleteBizDoc('${d.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div style="color:var(--sunset);">Error loading docs: ${err.message}</div>`;
  }
};

window.handleDocUpload = async function (e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = ''; // reset

  toast('Uploading document...', 'info');
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}_${safeName}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage.from('business_docs').upload(filename, file);
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from('business_docs').getPublicUrl(filename);

    const { error: dbErr } = await supabase.from('business_docs').insert([{
      filename: file.name,
      file_url: urlData.publicUrl,
      size_kb: Math.round(file.size / 1024),
      uploaded_by: window._currentStaffName || 'Admin'
    }]);
    if (dbErr) throw dbErr;

    toast('Document uploaded successfully!', 'success');
    renderBizDocs();
  } catch (err) {
    toast('Upload failed: ' + err.message, 'error');
  }
};

window.deleteBizDoc = async function (id) {
  if (!confirm('Are you sure you want to delete this document?')) return;
  try {
    await supabase.from('business_docs').delete().eq('id', id);
    toast('Document deleted.', 'success');
    renderBizDocs();
  } catch (err) {
    toast('Delete failed: ' + err.message, 'error');
  }
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function renderDashboard() {
  const [bookings, repairs, flaggedGuests] = await Promise.all([
    ABHC_DB.getBookings(),
    ABHC_DB.getRepairs(),
    ABHC_DB.getFlaggedGuests(),
  ]);

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const totalRev = confirmed.reduce((s, b) => s + (b.total || 0), 0);
  const totalRepairs = repairs.reduce((s, r) => s + (+r.amount || 0), 0);
  const netRev = totalRev - totalRepairs;

  const active = confirmed.filter(b => {
    const ci = parseD(b.check_in || b.checkIn), co = parseD(b.check_out || b.checkOut);
    return ci && co && ci <= today && co > today;
  }).length;
  const upcoming = confirmed.filter(b => {
    const ci = parseD(b.check_in || b.checkIn);
    return ci && ci > today;
  }).length;

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card" style="--accent:var(--aqua);">
      <span class="stat-icon">💰</span><div class="stat-label">Total Revenue</div>
      <div class="stat-value">${fmtMoney(totalRev)}</div><div class="stat-delta">All confirmed bookings</div>
    </div>
    <div class="stat-card" style="--accent:var(--success);">
      <span class="stat-icon">📈</span><div class="stat-label">Net Revenue</div>
      <div class="stat-value">${fmtMoney(netRev)}</div><div class="stat-delta">After repair deductions</div>
    </div>
    <div class="stat-card" style="--accent:var(--warning);">
      <span class="stat-icon">🔧</span><div class="stat-label">Repair Costs</div>
      <div class="stat-value">${fmtMoney(totalRepairs)}</div><div class="stat-delta neg">Deducted from revenue</div>
    </div>
    <div class="stat-card" style="--accent:#3B82F6;">
      <span class="stat-icon">🏠</span><div class="stat-label">Currently Occupied</div>
      <div class="stat-value">${active}</div><div class="stat-delta">${upcoming} upcoming</div>
    </div>
    <div class="stat-card" style="--accent:var(--sunset);">
      <span class="stat-icon">📋</span><div class="stat-label">Total Bookings</div>
      <div class="stat-value">${confirmed.length}</div><div class="stat-delta">All time confirmed</div>
    </div>
    <div class="stat-card" style="--accent:var(--danger);">
      <span class="stat-icon">🚩</span><div class="stat-label">Flagged Guests</div>
      <div class="stat-value">${flaggedGuests.length}</div><div class="stat-delta neg">In registry</div>
    </div>`;

  // Bar chart — last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ label: d.toLocaleString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() });
  }
  const maxRev = Math.max(...months.map(m =>
    confirmed.filter(b => { const ci = parseD(b.check_in || b.checkIn); return ci && ci.getFullYear() === m.year && ci.getMonth() === m.month; })
      .reduce((s, b) => s + (b.total || 0), 0)
  ), 1);
  document.getElementById('revenueChart').innerHTML = months.map(m => {
    const rev = confirmed.filter(b => { const ci = parseD(b.check_in || b.checkIn); return ci && ci.getFullYear() === m.year && ci.getMonth() === m.month; })
      .reduce((s, b) => s + (b.total || 0), 0);
    const pct = Math.round(rev / maxRev * 100);
    return `<div class="bar-group">
      <div class="bar-val">₱${rev > 999 ? (rev / 1000).toFixed(0) + 'k' : rev}</div>
      <div class="bar-fill" style="height:${pct}%;background:linear-gradient(180deg,var(--aqua-dark),var(--aqua-deep));"></div>
      <div class="bar-label">${m.label}</div>
    </div>`;
  }).join('');

  // Donut chart by room
  const rooms = await ABHC_DB.getRooms();
  const colors = ['#4EC6C0', '#FF7043', '#F59E0B', '#10B981', '#3B82F6'];
  const roomCounts = rooms.map(r => ({
    name: r.name,
    count: confirmed.filter(b => (b.room_id || b.roomId) === r.id).length,
  }));
  const totalBk = roomCounts.reduce((s, r) => s + r.count, 0) || 1;
  let offset = 0;
  const arcs = roomCounts.map((r, i) => {
    const pct = r.count / totalBk;
    const a = pct * 2 * Math.PI;
    const x1 = 50 + 45 * Math.cos(offset); const y1 = 50 + 45 * Math.sin(offset);
    offset += a;
    const x2 = 50 + 45 * Math.cos(offset); const y2 = 50 + 45 * Math.sin(offset);
    const large = pct > 0.5 ? 1 : 0;
    return `<path d="M50,50 L${x1},${y1} A45,45 0 ${large},1 ${x2},${y2} Z" fill="${colors[i % colors.length]}"/>`;
  }).join('');
  document.getElementById('donutWrap').innerHTML = `
    <svg class="donut-svg" viewBox="0 0 100 100" width="130" height="130">
      <circle cx="50" cy="50" r="45" fill="#f0f4f4"/>
      ${arcs}
      <circle cx="50" cy="50" r="30" fill="white"/>
      <text x="50" y="47" text-anchor="middle" font-size="7" fill="#3D5A58">${totalBk}</text>
      <text x="50" y="55" text-anchor="middle" font-size="5" fill="#7A9A98">bookings</text>
    </svg>
    <div class="donut-legend">
      ${roomCounts.map((r, i) => `<div class="donut-item"><div class="donut-dot" style="background:${colors[i % colors.length]};"></div><span>${r.name.split(' ').slice(0, 2).join(' ')}</span><span style="margin-left:auto;font-weight:500;">${r.count}</span></div>`).join('')}
    </div>`;

  // Revenue breakdown
  const taxTotal = confirmed.reduce((s, b) => s + (b.tax || 0), 0);
  const subTotal = confirmed.reduce((s, b) => s + (b.subtotal || 0), 0);
  document.getElementById('revBreakdown').innerHTML = `
    <div class="rev-line"><span>Gross Subtotal (pre-tax)</span><span>${fmtMoney(subTotal)}</span></div>
    <div class="rev-line"><span>Tax Collected (12%)</span><span class="rev-pos">${fmtMoney(taxTotal)}</span></div>
    <div class="rev-line"><span>Total Revenue</span><span>${fmtMoney(totalRev)}</span></div>
    <div class="rev-line"><span>Repair / Maintenance Costs</span><span class="rev-neg">− ${fmtMoney(totalRepairs)}</span></div>
    <div class="rev-line"><span>Net Revenue</span><span class="${netRev >= 0 ? 'rev-pos' : 'rev-neg'}">${fmtMoney(netRev)}</span></div>`;
}

// ── BOOKINGS TABLE ────────────────────────────────────────────────────────────
let bookingPage = 1;
const BPP = 10;

async function autoExpirePendingBookings() {
  const bk = await ABHC_DB.getBookings();
  const now = Date.now();
  let expiredCount = 0;
  for (let b of bk) {
    if (b.status === 'pending') {
      // Expire if today is the check in date (we'll give them until noon on check-in day)
      const ciDate = new Date(b.check_in || b.checkIn).setHours(12, 0, 0, 0);
      if (now > ciDate) {
        await ABHC_DB.updateBooking(b.id, { status: 'cancelled' });
        expiredCount++;
      }
    }
  }
  return expiredCount > 0;
}

async function renderBookings() {
  const rf = document.getElementById('roomFilter');
  if (rf.options.length <= 1) {
    const rooms = await ABHC_DB.getRooms();
    rooms.forEach(r => {
      const o = document.createElement('option');
      o.value = r.id; o.textContent = r.name; rf.appendChild(o);
    });
  }

  if (await autoExpirePendingBookings()) {
    toast('Expired pending bookings were automatically cancelled.', 'info');
  }
  renderBookingsTable();
}

async function renderBookingsTable() {
  const q = (document.getElementById('bookingSearch').value || '').toLowerCase();
  const sf = document.getElementById('statusFilter').value;
  const rf = document.getElementById('roomFilter').value;
  const fo = document.getElementById('flaggedOnly').checked;
  let bk = await ABHC_DB.getBookings();

  if (q) bk = bk.filter(b => (b.ref || '').toLowerCase().includes(q) || (b.guest_name || b.guestName || '').toLowerCase().includes(q) || (b.guest_email || b.guestEmail || '').toLowerCase().includes(q) || (b.room_name || b.roomName || '').toLowerCase().includes(q));
  if (sf) bk = bk.filter(b => b.status === sf);
  if (rf) bk = bk.filter(b => (b.room_id || b.roomId) === rf);
  if (fo) bk = bk.filter(b => b.flagged);
  bk.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

  const total = bk.length;
  const pages = Math.ceil(total / BPP) || 1;
  bookingPage = Math.min(bookingPage, pages);
  const slice = bk.slice((bookingPage - 1) * BPP, bookingPage * BPP);

  document.getElementById('bookingsTbody').innerHTML = slice.map(b => {
    const name = b.guest_name || b.guestName || '—';
    const email = b.guest_email || b.guestEmail || '';
    const room = b.room_name || b.roomName || b.room_id || b.roomId || '—';
    const ci = b.check_in || b.checkIn;
    const co = b.check_out || b.checkOut;
    const rc = b.repair_cost || b.repairCost || 0;
    return `<tr class="${b.flagged ? 'flagged-row' : ''}">
      <td><span style="font-family:monospace;font-size:0.78rem;color:var(--aqua-deep);">${b.ref || '—'}</span></td>
      <td>
        <div style="font-weight:500;">${name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${email}</div>
        ${b.flagged ? '<span class="badge badge-flagged">🚩 Flagged</span>' : ''}
      </td>
      <td>${room}</td>
      <td>${fmt(ci)}</td><td>${fmt(co)}</td>
      <td style="text-align:center;">${b.stay_type === '12hr' || b.stayType === '12hr' ? '🌙 12hr' : (b.nights || 0) + ' day' + (b.nights > 1 ? 's' : '')}</td>
      <td><strong>${fmtMoney(b.total)}</strong>${rc ? `<div style="font-size:0.72rem;color:var(--danger);">Repair: ${fmtMoney(rc)}</div>` : ''}</td>
      
      <td>
        <span class="badge badge-${b.status || 'confirmed'}">${(b.status || 'confirmed').charAt(0).toUpperCase() + (b.status || 'confirmed').slice(1)}</span>
        ${b.created_by_staff
        ? `<div style="font-size:0.7rem;color:var(--sunset);margin-top:0.3rem;font-weight:500;">👤 ${b.created_by_staff}</div>`
        : `<div style="font-size:0.7rem;color:var(--aqua-deep);margin-top:0.3rem;font-weight:500;">🌐 Online</div>`}
      </td>

      <td style="max-width:160px;"><div style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.notes || '—'}</div></td>
      <td>
        <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-xs"   onclick="viewBooking('${b.id}')">👁</button>
          <button class="btn btn-primary btn-xs" onclick="editBooking('${b.id}')">✏️</button>
          <button class="btn btn-${b.flagged ? 'ghost' : 'danger'} btn-xs" onclick="toggleFlag('${b.id}')">${b.flagged ? '🏳' : '🚩'}</button>
          ${_currentStaffRole === 'master' ? `<button class="btn btn-danger btn-xs" onclick="deleteBooking('${b.id}')">🗑</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:2rem;">No bookings found.</td></tr>';

  // Pagination
  const pag = document.getElementById('bookingsPag');
  pag.innerHTML = '';
  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === bookingPage ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => { bookingPage = i; renderBookingsTable(); };
    pag.appendChild(btn);
  }
  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${total} booking${total !== 1 ? 's' : ''}`;
  pag.appendChild(info);
}

async function viewBooking(id) {
  const bk = await ABHC_DB.getBookings();
  const b = bk.find(b => b.id === id);
  if (!b) return;
  const name = b.guest_name || b.guestName;
  const email = b.guest_email || b.guestEmail || '—';
  const phone = b.guest_phone || b.guestPhone || '—';
  const room = b.room_name || b.roomName;
  const ci = b.check_in || b.checkIn;
  const co = b.check_out || b.checkOut;
  const rc = b.repair_cost || b.repairCost || 0;
  const req = b.special_req || b.specialReq || '';
  const unitMatch = req.match(/\[Preferred Unit:\s*(.*?)\]/);
  const preferredUnit = unitMatch ? unitMatch[1] : '';
  const cleanReq = req.replace(/\[Preferred Unit:\s*.*?\](\s*-\s*)?/, '').trim();

  // Generate Internal Notes Timeline (Locked to Manila Time)
  const notes = b.internal_notes || [];
  const notesHtml = notes.map(n => {
    const d = new Date(n.date);
    const dateStr = d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });

    return `
    <div style="background:var(--bg); border:1px solid var(--sand-mid); border-radius:8px; padding:0.8rem; margin-bottom:0.5rem;">
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem;">
        <span style="font-weight:600; color:var(--text-main);">👤 ${n.staff}</span>
        <span>${dateStr} at ${timeStr}</span>
      </div>
      <div style="font-size:0.85rem;">${n.text}</div>
    </div>
  `}).join('');

  document.getElementById('bookingDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-bottom:1rem;">
      <div><div class="stat-label" style="font-size:0.72rem;">Reference</div><div style="font-family:monospace;font-size:1rem;color:var(--aqua-deep);font-weight:600;">${b.ref}</div></div>
      <div><div class="stat-label" style="font-size:0.72rem;">Status</div><span class="badge badge-${b.status}">${b.status}</span>${b.flagged ? '&nbsp;<span class="badge badge-flagged">🚩 Flagged</span>' : ''}</div>
    </div>
    <div style="background:var(--sand);border-radius:12px;padding:1rem;margin-bottom:1rem;">
      <div class="rev-line"><span style="color:var(--text-muted);">Guest</span><span><strong>${name}</strong></span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Booked By</span><span style="color:var(--sunset);font-weight:500;">${b.created_by_staff ? `👤 ${b.created_by_staff} (Staff)` : '🌐 Guest (Online)'}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Email</span><span>${email}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Phone</span><span>${phone}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Room</span><span>${room}</span></div>
      ${preferredUnit ? `<div class="rev-line"><span style="color:var(--text-muted);">Unit</span><span style="font-weight:600;color:var(--aqua-deep);">${preferredUnit}</span></div>` : ''}
      <div class="rev-line"><span style="color:var(--text-muted);">Check-in</span><span>${fmt(ci)}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Check-out</span><span>${fmt(co)}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Nights</span><span>${b.nights}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Subtotal</span><span>${fmtMoney(b.subtotal)}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Tax (12%)</span><span>${fmtMoney(b.tax)}</span></div>
      ${rc ? `<div class="rev-line"><span style="color:var(--danger);">Repair Cost</span><span class="rev-neg">− ${fmtMoney(rc)}</span></div>` : ''}
      <div class="rev-line"><span><strong>Total</strong></span><span style="color:var(--aqua-deep);font-weight:600;">${fmtMoney(b.total)}</span></div>
    </div>
    ${cleanReq ? `<div style="margin-bottom:0.8rem;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Special Requests</div><div style="font-size:0.85rem;">${cleanReq}</div></div>` : ''}
    ${b.notes ? `<div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Admin Notes</div><div style="font-size:0.85rem;background:var(--aqua-light);padding:0.8rem;border-radius:8px;">${b.notes}</div></div>` : ''}
    
    <div style="margin-top: 2rem; border-top: 1px solid var(--sand-mid); padding-top: 1.5rem;">
      <h4 style="font-size: 1rem; margin-bottom: 1rem;">Internal Staff Notes</h4>
      
      <div style="max-height: 200px; overflow-y: auto; margin-bottom: 1rem; padding-right: 0.5rem;">
        ${notesHtml || '<div style="font-size:0.85rem; color:var(--text-muted); font-style:italic;">No internal notes for this booking yet.</div>'}
      </div>
      
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        <textarea id="newNote_${b.id}" rows="2" placeholder="Add a new internal note (e.g. 'Guest paid 50% downpayment')" style="padding:0.6rem; border-radius:8px; border:1px solid var(--sand-mid); font-family:inherit; font-size:0.85rem; resize:vertical;"></textarea>
        <button class="btn btn-primary btn-sm" id="btnNote_${b.id}" style="align-self:flex-end;" onclick="submitInternalNote('${b.id}')">+ Save Note</button>
      </div>
    </div>
  `;
  document.getElementById('editFromDetailBtn').onclick = () => { closeModal('bookingDetailModal'); editBooking(id); };
  openModal('bookingDetailModal');
}

async function deleteBooking(id) {
  if (_currentStaffRole !== 'master') {
    toast('Access Denied: Only the Master Admin can delete booking records.', 'error');
    return;
  }

  // Fetch the booking details for the log
  const bk = await ABHC_DB.getBookings();
  const b = bk.find(x => x.id === id);
  const bRef = b ? (b.ref || id) : id;

  // Show the auth modal for deletion
  showAuthModal({
    title: 'Permanently Delete Record',
    desc: `You are about to permanently delete booking <strong>${bRef}</strong>. This action cannot be undone.`,
    action: 'delete',
    bookingId: id,
    bookingRef: bRef,
  });
}

async function toggleFlag(id) {
  const bk = await ABHC_DB.getBookings();
  const b = bk.find(b => b.id === id);
  if (!b) return;
  const newFlagged = !b.flagged;
  await ABHC_DB.updateBooking(id, { flagged: newFlagged });
  toast(newFlagged ? 'Booking flagged 🚩' : 'Flag removed.', newFlagged ? 'warning' : 'success');
  await logSystemAction(`${newFlagged ? 'flagged' : 'removed the flag from'} guest booking Ref: ${b.ref}`);
  renderBookingsTable();
}

// ── BOOKING MODAL ─────────────────────────────────────────────────────────────
let _currentStayType = '12hr';
let _allRooms = []; // Global cache so the dropdown can read room data easily

function setStayType(type) {
  _currentStayType = type;
  document.getElementById('stayBtn12').classList.toggle('active', type === '12hr');
  document.getElementById('stayBtn24').classList.toggle('active', type === '24hr');
  document.getElementById('stayFields12').style.display = type === '12hr' ? '' : 'none';
  document.getElementById('stayFields24').style.display = type === '24hr' ? '' : 'none';
  calcBTotal();
}

async function populateRoomSelect(selected) {
  _allRooms = await ABHC_DB.getRooms();
  document.getElementById('bRoom').innerHTML = _allRooms.filter(r => r.active)
    .map(r => `<option value="${r.id}" data-p12="${r.price12h}" data-p24="${r.price24h}" ${r.id === selected ? 'selected' : ''}>${r.name} — ₱${r.price12h}/12h | ₱${r.price24h}/24h</option>`).join('');

  // Inject the Unit/Quantity container if it doesn't exist
  if (!document.getElementById('bUnitContainer')) {
    const container = document.createElement('div');
    container.id = 'bUnitContainer';
    container.style.marginTop = '1rem';
    document.getElementById('bRoom').parentNode.appendChild(container);
  }
  renderUnitDropdown();
}

// Ensure the dropdown updates when the room changes
document.getElementById('bRoom').addEventListener('change', () => {
  renderUnitDropdown();
  calcBTotal();
});

// Dynamically generate the Unit ID and Quantity picker
async function renderUnitDropdown() {
  const rid = document.getElementById('bRoom').value;
  const room = _allRooms.find(r => r.id === rid);
  const container = document.getElementById('bUnitContainer');

  if (room) {
    let availableUnits = room.unitIds ? [...room.unitIds] : [];

    // Determine the currently selected dates
    let checkIn, checkOut;
    if (_currentStayType === '12hr') {
      checkIn = document.getElementById('bCheckIn12').value;
      checkOut = checkIn;
    } else {
      checkIn = document.getElementById('bCheckIn24').value;
      checkOut = document.getElementById('bCheckOut24').value;
    }

    // Filter booked units if dates are valid
    if (checkIn && checkOut && availableUnits.length > 0) {
      const ciDate = new Date(checkIn).setHours(0, 0, 0, 0);
      let coDate = new Date(checkOut).setHours(0, 0, 0, 0);
      if (ciDate === coDate) coDate += 86400000; // Force 1 day delta for 12hr overlaps

      const allBookings = await ABHC_DB.getBookings();
      const editId = document.getElementById('editBookingId').value;

      const overlappingBookings = allBookings.filter(b => {
        if (b.status === 'cancelled' || (b.roomId || b.room_id) !== room.id) return false;
        if (editId && b.id === editId) return false; // Ignore itself when editing

        const bCi = new Date(b.checkIn || b.check_in).setHours(0, 0, 0, 0);
        const bCo = new Date(b.checkOut || b.check_out).setHours(0, 0, 0, 0);
        if (_currentStayType === '12hr') {
          return (ciDate >= bCi && ciDate <= bCo);
        }
        return (ciDate < bCo && coDate > bCi);
      });

      // Calculate max overlapping quantity manually
      let maxOverlapQty = 0;
      let d = new Date(ciDate);
      const endD = new Date(coDate);
      while (d < endD) {
        let qtyOnDay = 0;
        overlappingBookings.forEach(b => {
          const bCi = new Date(b.checkIn || b.check_in).setHours(0, 0, 0, 0);
          const bCo = new Date(b.checkOut || b.check_out).setHours(0, 0, 0, 0);
          if (d.getTime() >= bCi && d.getTime() < bCo) {
            qtyOnDay += (b.roomQuantity || b.room_quantity || 1);
          }
        });
        if (qtyOnDay > maxOverlapQty) maxOverlapQty = qtyOnDay;
        d.setDate(d.getDate() + 1);
      }

      const trueAvail = Math.max(0, (room.quantity || 1) - maxOverlapQty);

      overlappingBookings.forEach(b => {
        const reqStr = b.specialReq || b.special_req || '';
        const match = reqStr.match(/\[Preferred Unit:\s*(.*?)\]/);
        if (match) {
          const u = match[1];
          availableUnits = availableUnits.filter(availUnit => availUnit !== u);
        }
      });

      // Trim generic unassigned bookings so the dropdown options equal actual physical availability
      if (availableUnits.length > trueAvail) {
        availableUnits = availableUnits.slice(0, trueAvail);
      }
    }

    let unitHtml = '';
    if (availableUnits.length > 0) {
      const options = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
      unitHtml = `
        <div style="flex:1;">
          <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.04em;font-weight:500;">Unit Preference (Optional)</label>
          <select id="bUnit" style="width:100%;padding:0.65rem 0.9rem;border:1.5px solid var(--sand-mid);border-radius:8px;outline:none;font-family:var(--font-sans);">
            <option value="">Any available</option>
            ${options}
          </select>
        </div>
      `;
    }

    const maxQty = room.quantity || 1;
    const qtyHtml = `
      <div style="flex:0 0 100px;">
        <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.04em;font-weight:500;">Quantity</label>
        <input type="number" id="bQty" value="1" min="1" max="${maxQty}" onchange="calcBTotal()" style="width:100%;padding:0.65rem 0.9rem;border:1.5px solid var(--sand-mid);border-radius:8px;outline:none;font-family:var(--font-sans);">
      </div>
    `;

    container.innerHTML = `<div style="display:flex; gap:1rem; align-items:flex-end;">${unitHtml}${qtyHtml}</div>`;
    container.style.display = 'block';
  } else {
    container.innerHTML = '';
    container.style.display = 'none';
  }
}

async function openBookingModal() {
  document.getElementById('bookingModalTitle').textContent = 'New Booking';
  document.getElementById('editBookingId').value = '';
  ['bFname', 'bLname', 'bEmail', 'bPhone', 'bReq', 'bNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('bCheckIn12').value = '';
  document.getElementById('bCheckInTime').value = '14:00';
  document.getElementById('bCheckIn24').value = '';
  document.getElementById('bCheckOut24').value = '';
  document.getElementById('bStatus').disabled = false;
  document.getElementById('bStatus').value = 'confirmed';
  document.getElementById('cancelBookingBtn').style.display = 'none';
  document.getElementById('bTotalPreview').innerHTML = '';
  setStayType('12hr');
  await populateRoomSelect('');
  openModal('bookingModal');
}
document.querySelector('[onclick="openModal(\'bookingModal\')"]').onclick = () => openBookingModal();

function calcBTotal() {
  const rid = document.getElementById('bRoom').value;
  if (!rid) { document.getElementById('bTotalPreview').innerHTML = ''; return; }

  const opt = document.getElementById('bRoom').selectedOptions[0];
  if (!opt) return;

  const pricePer12 = parseInt(opt.dataset.p12) || 0;
  const pricePer24 = parseInt(opt.dataset.p24) || 0;

  // Fetch the active quantity input
  const qtyInput = document.getElementById('bQty');
  const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

  let durationLabel = '', totalBase = 0, rateLabel = '';

  if (_currentStayType === '12hr') {
    const ci = document.getElementById('bCheckIn12').value;
    if (!ci) { document.getElementById('bTotalPreview').innerHTML = ''; return; }
    durationLabel = '12-Hour Stay';
    rateLabel = `${fmtMoney(pricePer12)} / 12h`;
    totalBase = pricePer12 * qty;
  } else {
    const ci = document.getElementById('bCheckIn24').value;
    const co = document.getElementById('bCheckOut24').value;
    if (!ci || !co) { document.getElementById('bTotalPreview').innerHTML = ''; return; }

    const d1 = new Date(ci);
    const d2 = new Date(co);
    let days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (days < 1) days = 1;

    durationLabel = `${days} Day${days > 1 ? 's' : ''}`;
    rateLabel = `${fmtMoney(pricePer24)} / 24h`;
    totalBase = (pricePer24 * days) * qty;
  }

  const tax = Math.round(totalBase - totalBase / 1.12);
  const total = totalBase;

  document.getElementById('bTotalPreview').innerHTML = `
    <div class="rev-line"><span>Stay Type</span><span>${_currentStayType === '12hr' ? '🌙 12-Hour' : '☀️ 24-Hour'}</span></div>
    <div class="rev-line"><span>Quantity</span><span>${qty}x Rooms</span></div>
    <div class="rev-line"><span>Duration</span><span>${durationLabel}</span></div>
    <div class="rev-line"><span>Room Rate</span><span>${rateLabel}</span></div>
    <div class="rev-line"><span>VAT (12% Included)</span><span>${fmtMoney(tax)}</span></div>
    <div class="rev-line"><span><strong>Total (Tax Inclusive)</strong></span><span style="color:var(--aqua-deep);"><strong>${fmtMoney(total)}</strong></span></div>`;
}

async function saveBooking() {
  const fn = document.getElementById('bFname').value.trim();
  const ln = document.getElementById('bLname').value.trim();
  const em = document.getElementById('bEmail').value.trim();
  const ph = document.getElementById('bPhone').value.trim();
  const rid = document.getElementById('bRoom').value;
  const status = document.getElementById('bStatus').value;
  const editId = document.getElementById('editBookingId').value;
  const stayType = _currentStayType;
  if (!fn || !ln || !em || !rid) { toast('Please fill all required fields.', 'error'); return; }

  // Extract Unit Preference & Quantity
  const unitDropdown = document.getElementById('bUnit');
  const preferredUnit = unitDropdown ? unitDropdown.value : '';
  let finalReq = document.getElementById('bReq').value.trim();
  if (preferredUnit) {
    finalReq = finalReq ? `[Preferred Unit: ${preferredUnit}] - ${finalReq}` : `[Preferred Unit: ${preferredUnit}]`;
  }

  const qtyInput = document.getElementById('bQty');
  const roomQuantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

  const room = _allRooms.find(r => r.id === rid);
  let checkIn, checkOut, nights, subtotal, checkInTime = '14:00';

  if (stayType === '12hr') {
    checkIn = document.getElementById('bCheckIn12').value;
    checkInTime = document.getElementById('bCheckInTime').value || '14:00';
    if (!checkIn) { toast('Please select a check-in date.', 'error'); return; }
    checkOut = checkIn;
    nights = 0.5;
    subtotal = room.price12h * roomQuantity;
  } else {
    checkIn = document.getElementById('bCheckIn24').value;
    checkOut = document.getElementById('bCheckOut24').value;
    if (!checkIn || !checkOut) { toast('Please select check-in and check-out dates.', 'error'); return; }

    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    let days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (days < 1) { toast('Check-out date must be after check-in date.', 'error'); return; }

    nights = days;
    subtotal = room.price24h * days * roomQuantity;
  }

  const tax = Math.round(subtotal - subtotal / 1.12), total = subtotal;
  let staffStamp = null;

  if (!editId) {
    const { data: { session } } = await window.supa.auth.getSession();
    if (session) {
      const { data: profile } = await window.supa.from('staff_profiles').select('first_name, last_name').eq('id', session.user.id).single();
      if (profile) staffStamp = `${profile.first_name} ${profile.last_name}`;
    }
  }

  const payload = {
    guestFname: fn, guestLname: ln, guestName: fn + ' ' + ln,
    guestEmail: em, guestPhone: ph, roomId: rid, roomName: room.name,
    roomQuantity: roomQuantity, // Attach the quantity!
    checkIn, checkOut, checkInTime, nights, stayType,
    subtotal, tax, total, specialReq: finalReq, // Special request holds the unit ID!
    notes: document.getElementById('bNotes').value.trim(),
    status, createdByStaff: staffStamp
  };

  try {
    if (editId) {
      await ABHC_DB.updateBooking(editId, payload);
      toast('Booking updated! ✅', 'success');
      await logSystemAction(`updated booking details for ${fn} ${ln} (Status: ${status.toUpperCase()})`);
    } else {
      const newRef = 'ABHC-' + Date.now().toString(36).toUpperCase().slice(-6);
      await ABHC_DB.addBooking({
        ...payload,
        ref: newRef,
        repairCost: 0, flagged: false, createdAt: new Date().toISOString(),
      });
      toast('Booking created! ✅', 'success');
      await logSystemAction(`manually created a new booking for ${fn} ${ln} (Ref: ${newRef})`);
    }
    closeModal('bookingModal');
    renderBookingsTable();
    renderDashboard();

    // ── AUTOMATIC EMAIL CONFIRMATION (Simulated) ──
    if (payload.status === 'confirmed') {
      const emailHtml = generateConfirmationEmail({ ...payload, ref: editId ? (b.ref || editId) : 'NEW-BOOKING' });
      console.log("Confirmation Email Generated:", emailHtml);
      toast('Confirmation email prepared and "sent" to guest. ✅', 'info');
    }

  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

function generateConfirmationEmail(b) {
  const bizName = _seData['business_name'] || "the Resort";
  const mapsLink = _seData['business_gmaps_url'] || "#";
  const rules = _seData['house_rules'] || "Please follow all resort guidelines for a safe stay.";
  const roomName = b.roomName || "Your Room";
  const guestName = b.guestName || "Valued Guest";
  const ciStr = fmt(b.checkIn);
  const coStr = fmt(b.checkOut);
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: #0D6E6A; color: white; padding: 2.5rem 2rem; text-align: center;">
        <h1 style="margin: 0; font-size: 1.8rem; letter-spacing: 1px;">Stay Confirmed!</h1>
        <p style="margin: 0.6rem 0 0; opacity: 0.85; font-size: 1.1rem;">We're getting everything ready for you at ${bizName}.</p>
      </div>
      <div style="padding: 2.5rem; color: #334155; line-height: 1.7;">
        <p style="font-size: 1.1rem;">Warm greetings, <strong>${guestName}</strong>!</p>
        <p>Your booking for <strong>${roomName}</strong> is officially confirmed. We are thrilled to have you as our guest.</p>
        
        <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 10px; margin: 2rem 0; border: 1px solid #E2E8F0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; border-bottom: 1px solid #EDF2F7; padding-bottom: 0.6rem;">
            <span style="color: #64748B;">Reference No.</span> <strong style="color: #0D6E6A;">${b.ref}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; border-bottom: 1px solid #EDF2F7; padding-bottom: 0.6rem;">
            <span style="color: #64748B;">Check-In</span> <strong>${ciStr}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B;">Check-Out</span> <strong>${coStr}</strong>
          </div>
        </div>

        <h3 style="color: #0D6E6A; margin-top: 2rem; display: flex; align-items: center; gap: 0.5rem;">🏠 Guest House Rules</h3>
        <div style="background: #FFF8F5; padding: 1.5rem; border-radius: 10px; border-left: 5px solid #FF7043; font-size: 0.95rem; color: #4A5568;">
          <div style="white-space: pre-wrap;">${rules}</div>
        </div>

        <div style="text-align: center; margin: 3rem 0;">
          <a href="${mapsLink}" style="background: #FF7043; color: white; padding: 1.2rem 2.5rem; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 1rem; display: inline-block; box-shadow: 0 4px 15px rgba(255,112,67,0.3);">📍 Navigate to Resort</a>
        </div>
        
        <div style="text-align: center; padding-top: 1rem; border-top: 1px solid #E2E8F0;">
          <p style="font-size: 0.9rem; color: #64748B;">Need help with your trip?</p>
          <a href="${window.location.origin}" style="color: #0D6E6A; font-weight: 600; text-decoration: none; border-bottom: 2px solid #0D6E6A; padding-bottom: 2px;">Chat with our Concierge</a>
        </div>
      </div>
      <div style="background: #F1F5F9; padding: 1.5rem; text-align: center; font-size: 0.75rem; color: #94A3B8;">
        Sent with ☀️ from ${bizName}
      </div>
    </div>
  `;
}

async function editBooking(id) {
  const bk = await ABHC_DB.getBookings();
  const b = bk.find(b => b.id === id);
  if (!b) return;
  document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
  document.getElementById('editBookingId').value = id;
  document.getElementById('bFname').value = b.guest_fname || b.guestFname || '';
  document.getElementById('bLname').value = b.guest_lname || b.guestLname || '';
  document.getElementById('bEmail').value = b.guest_email || b.guestEmail || '';
  document.getElementById('bPhone').value = b.guest_phone || b.guestPhone || '';

  const bStatus = document.getElementById('bStatus');
  const cancelBtn = document.getElementById('cancelBookingBtn');

  if (b.status === 'cancelled') {
    cancelBtn.style.display = 'none';
    if (![...bStatus.options].some(o => o.value === 'cancelled')) {
      bStatus.add(new Option('Cancelled', 'cancelled'));
    }
    bStatus.value = 'cancelled';
    bStatus.disabled = true;
  } else {
    for (let i = bStatus.options.length - 1; i >= 0; i--) {
      if (bStatus.options[i].value === 'cancelled') bStatus.remove(i);
    }
    bStatus.value = b.status || 'confirmed';

    // Confirmed bookings lock the status dropdown — use Cancel button instead
    bStatus.disabled = (b.status === 'confirmed');

    // Role-based cancellation rules
    const ciDate = new Date(b.check_in || b.checkIn).getTime();
    const hoursUntilCheckin = ciDate - Date.now();

    if (_currentStaffRole === 'master') {
      // Master Admin: can cancel anything EXCEPT confirmed bookings on or past check-in date
      if (b.status === 'confirmed' && hoursUntilCheckin <= 0) {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.disabled = true;
        cancelBtn.title = 'This confirmed booking is already on or past its check-in date and cannot be cancelled.';
        cancelBtn.style.opacity = '0.5';
        cancelBtn.style.cursor = 'not-allowed';
      } else {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.disabled = false;
        cancelBtn.title = '';
        cancelBtn.style.opacity = '1';
        cancelBtn.style.cursor = 'pointer';
      }
    } else {
      // Normal Staff: can only cancel pending bookings before check-in date
      if (b.status === 'pending' && hoursUntilCheckin > 0) {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.disabled = false;
        cancelBtn.title = '';
        cancelBtn.style.opacity = '1';
        cancelBtn.style.cursor = 'pointer';
      } else {
        cancelBtn.style.display = 'none'; // Hide entirely for staff when not allowed
      }
    }
  }

  document.getElementById('bNotes').value = b.notes || '';

  const stayType = b.stay_type || b.stayType || '24hr';
  setStayType(stayType);
  if (stayType === '12hr') {
    document.getElementById('bCheckIn12').value = b.check_in || b.checkIn || '';
    document.getElementById('bCheckInTime').value = b.check_in_time || b.checkInTime || '14:00';
  } else {
    document.getElementById('bCheckIn24').value = b.check_in || b.checkIn || '';
    document.getElementById('bCheckOut24').value = b.check_out || b.checkOut || '';
  }

  // Wait for dropdown to be built so we can populate the unit
  await populateRoomSelect(b.room_id || b.roomId);

  // Extract the preferred unit from the special request if it exists
  const reqText = b.special_req || b.specialReq || '';
  const match = reqText.match(/\[Preferred Unit:\s*(.*?)\]/);
  if (match) {
    const unit = match[1];
    const unitDropdown = document.getElementById('bUnit');
    if (unitDropdown) unitDropdown.value = unit;
    // Strip it out of the visible textbox so they don't duplicate it
    document.getElementById('bReq').value = reqText.replace(/\[Preferred Unit:\s*.*?\](?: -\s*)?/, '').trim();
  } else {
    document.getElementById('bReq').value = reqText;
  }

  // Extract Quantity
  const qtyInput = document.getElementById('bQty');
  if (qtyInput) qtyInput.value = b.room_quantity || 1;

  // Lock unit dropdown based on status and check-in deadline
  const unitDropdownEl = document.getElementById('bUnit');
  if (unitDropdownEl) {
    const ciNoon = new Date(b.check_in || b.checkIn);
    ciNoon.setHours(12, 0, 0, 0);
    const isPastNoon = Date.now() >= ciNoon.getTime();

    if ((b.status === 'confirmed' || b.status === 'pending') && !isPastNoon) {
      // Confirmed or pending and before noon cutoff — editable
      unitDropdownEl.disabled = false;
      unitDropdownEl.title = '';
      unitDropdownEl.style.opacity = '1';
    } else {
      // Locked: past noon (expired/locked) or cancelled
      unitDropdownEl.disabled = true;
      unitDropdownEl.style.opacity = '0.6';
      if (b.status === 'cancelled') {
        unitDropdownEl.title = 'This booking has been cancelled.';
      } else if (b.status === 'pending') {
        unitDropdownEl.title = 'This pending booking has expired.';
      } else {
        unitDropdownEl.title = 'Unit cannot be changed past 12:00 noon on the check-in date.';
      }
    }
  }

  calcBTotal();
  openModal('bookingModal');
}

async function doCancelBooking() {
  const editId = document.getElementById('editBookingId').value;
  if (!editId) return;

  // Fetch booking to display in auth modal
  const bk = await ABHC_DB.getBookings();
  const b = bk.find(x => x.id === editId);
  if (!b) return;
  const bRef = b.ref || editId;

  closeModal('bookingModal');
  showAuthModal({
    title: 'Cancel Booking',
    desc: `You are about to cancel booking <strong>${bRef}</strong> (${b.guest_name || b.guestName}).`,
    action: 'cancel',
    bookingId: editId,
    bookingRef: bRef,
  });
}

// ── AUTH MODAL CONTROLLER ─────────────────────────────────────────────────────
let _authModalExtra = {}; // store extra data passed between showAuthModal and executeAuthAction

function showAuthModal({ title, desc, action, bookingId, bookingRef, extra }) {
  document.getElementById('cancelAuthTitle').textContent = title;
  document.getElementById('cancelAuthDesc').innerHTML = desc;
  document.getElementById('cancelAuthPassword').value = '';
  _authModalExtra = extra || {};

  const isBookingAction = (action === 'cancel' || action === 'delete');
  const needsReason = (action !== 'toggleRoom');

  // Toggle the correct reason input
  document.getElementById('cancelReasonDropdownGroup').style.display = isBookingAction ? 'block' : 'none';
  document.getElementById('cancelReasonFreeTextGroup').style.display = (!isBookingAction && needsReason) ? 'block' : 'none';

  // Reset values
  document.getElementById('cancelReasonSelect').value = 'Guest requested cancellation';
  document.getElementById('cancelReasonText').value = '';
  document.getElementById('cancelReasonText').style.display = 'none';
  document.getElementById('cancelReasonFreeText').value = '';

  const submitBtn = document.getElementById('cancelAuthSubmitBtn');
  const labels = {
    delete: '🗑 Permanently Delete',
    deleteRoom: '🗑 Permanently Delete',
    cancel: '⚠️ Cancel Booking',
    toggleRoom: '✅ Confirm',
  };
  submitBtn.textContent = labels[action] || 'Confirm';

  // Clone to remove old event listeners
  const newBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newBtn, submitBtn);

  newBtn.addEventListener('click', () => executeAuthAction(action, bookingId, bookingRef));
  openModal('cancelAuthModal');
}

async function executeAuthAction(action, bookingId, bookingRef) {
  const password = document.getElementById('cancelAuthPassword').value;
  if (!password) { toast('Password is required.', 'error'); return; }

  let reason = '';
  if (action === 'cancel' || action === 'delete') {
    const reasonSelect = document.getElementById('cancelReasonSelect').value;
    const reasonCustom = document.getElementById('cancelReasonText').value.trim();
    reason = reasonSelect === 'Other' ? (reasonCustom || 'No reason provided') : reasonSelect;
  } else if (action === 'deleteRoom') {
    reason = document.getElementById('cancelReasonFreeText').value.trim() || 'No reason provided';
  }

  const btn = document.getElementById('cancelAuthSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Verifying...';

  try {
    // Authenticate with Supabase using current user's email + the entered password
    const { error: authErr } = await window.supa.auth.signInWithPassword({
      email: _currentStaffEmail,
      password: password,
    });
    if (authErr) throw new Error('Invalid password. Authentication failed.');

    if (action === 'delete') {
      await ABHC_DB.deleteBooking(bookingId);
      toast('Booking permanently deleted.', 'success');
      await logSystemAction(`permanently deleted booking ${bookingRef} — Reason: ${reason}`);
    } else if (action === 'deleteRoom') {
      await ABHC_DB.deleteRoom(bookingId);
      toast('Room permanently deleted.', 'success');
      await logSystemAction(`permanently deleted room/cottage "${bookingRef}" — Reason: ${reason}`);
    } else if (action === 'toggleRoom') {
      const newActive = _authModalExtra.newActive;
      await ABHC_DB.updateRoom(bookingId, { active: newActive });
      const word = newActive ? 'activated' : 'deactivated';
      toast(`Room ${word}.`, 'success');
      await logSystemAction(`${word} the room/cottage: ${bookingRef}`);
    } else {
      await ABHC_DB.cancelBooking(bookingId);
      toast('Booking cancelled.', 'success');
      await logSystemAction(`cancelled booking ${bookingRef} — Reason: ${reason}`);
    }

    closeModal('cancelAuthModal');
    if (action === 'deleteRoom' || action === 'toggleRoom') {
      renderRoomCards();
    } else {
      renderBookingsTable();
    }
    renderDashboard();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    const labels = { delete: '🗑 Permanently Delete', deleteRoom: '🗑 Permanently Delete', cancel: '⚠️ Cancel Booking', toggleRoom: '✅ Confirm' };
    btn.textContent = labels[action] || 'Confirm';
  }
}

// ── ROOMS ADMIN ───────────────────────────────────────────────────────────────
async function renderRoomCards() {
  const rooms = await ABHC_DB.getRooms();
  document.getElementById('roomsGrid').innerHTML = rooms.map(r => `
    <div class="card" style="transition:all 0.3s;">
      <div style="border-radius:10px;overflow:hidden;margin-bottom:1rem;height:200px;background:var(--sand-mid);">
        ${r.img
      ? `<img src="${r.img}" alt="${r.name}" style="width:100%;height:100%;object-fit:cover;display:block;">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.8rem;">No photo</div>`}
      </div>
      <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1rem;">
        <div>
          <div style="font-weight:600;font-size:0.95rem;">${r.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${r.cap}</div>
        </div>
        <span class="badge ${r.active ? 'badge-confirmed' : 'badge-cancelled'}" style="margin-left:auto;">${r.active ? 'Active' : 'Inactive'}</span>
      </div>
      <div class="rev-line"><span style="color:var(--text-muted);">Rates</span><span style="color:var(--aqua-deep);font-weight:600;">12h: ${fmtMoney(r.price12h)} | 24h: ${fmtMoney(r.price24h)}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Badge</span><span>${r.badge || '—'}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin:0.6rem 0;">
        ${(r.amenities || []).map(a => `<span style="background:var(--aqua-light);color:var(--aqua-deep);font-size:0.68rem;padding:0.15rem 0.5rem;border-radius:50px;">${a}</span>`).join('')}
      </div>

      <div style="margin-bottom: 0.8rem;">
        <span class="badge" style="background:#E5E7EB;color:#374151;">Total Inventory: ${r.quantity || 1}</span>
        ${r.unitIds && r.unitIds.length > 0 ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.3rem;"><strong>Units:</strong> ${r.unitIds.join(', ')}</div>` : ''}
      </div>
        
      <div style="display:flex;gap:0.5rem;margin-top:0.8rem;">
        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="editRoom('${r.id}')">✏️ Edit</button>
        ${_currentStaffRole === 'master' ? `<button class="btn btn-ghost btn-sm" onclick="toggleRoomActive('${r.id}')">${r.active ? 'Deactivate' : 'Activate'}</button>` : ''}
        ${!r.active && _currentStaffRole === 'master' ? `<button class="btn btn-danger btn-sm" onclick="deleteRoom('${r.id}')">🗑</button>` : ''}
      </div>
    </div>`).join('');
}

function handleImgUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const url = e.target.result;
    document.getElementById('rImgUrl').value = url;
    const preview = document.getElementById('imgPreview');
    preview.src = url;
    preview.style.display = 'block';
    document.getElementById('imgUploadPlaceholder').style.display = 'none';
    document.getElementById('imgUploadArea').classList.add('has-image');
    document.getElementById('clearImgBtn').style.display = '';
  };
  reader.readAsDataURL(file);
}

function clearRoomImage() {
  document.getElementById('rImgUrl').value = '';
  document.getElementById('rImgFile').value = '';
  const preview = document.getElementById('imgPreview');
  preview.src = ''; preview.style.display = 'none';
  document.getElementById('imgUploadPlaceholder').style.display = '';
  document.getElementById('imgUploadArea').classList.remove('has-image');
  document.getElementById('clearImgBtn').style.display = 'none';
}

function _setRoomImagePreview(url) {
  if (url) {
    document.getElementById('rImgUrl').value = url;
    const preview = document.getElementById('imgPreview');
    preview.src = url; preview.style.display = 'block';
    document.getElementById('imgUploadPlaceholder').style.display = 'none';
    document.getElementById('imgUploadArea').classList.add('has-image');
    document.getElementById('clearImgBtn').style.display = '';
  } else {
    clearRoomImage();
  }
}

function openRoomModal() {
  document.getElementById('roomModalTitle').textContent = 'Add Room';
  document.getElementById('editRoomId').value = '';
  ['rName', 'rId', 'rPrice12h', 'rPrice24h', 'rUnitIds', 'rCap', 'rBadge', 'rAmenities'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('rActive').checked = true;
  clearRoomImage();
  openModal('roomModal');
}

async function editRoom(id) {
  const rooms = await ABHC_DB.getRooms();
  const r = rooms.find(r => r.id === id);
  if (!r) return;
  document.getElementById('roomModalTitle').textContent = 'Edit Room';
  document.getElementById('editRoomId').value = id;
  document.getElementById('rName').value = r.name;
  document.getElementById('rId').value = r.id;
  document.getElementById('rPrice12h').value = r.price12h || 0;
  document.getElementById('rPrice24h').value = r.price24h || 0;
  document.getElementById('rCap').value = r.cap;
  document.getElementById('rUnitIds').value = (r.unitIds || []).join(', ');
  document.getElementById('rBadge').value = r.badge || '';
  document.getElementById('rAmenities').value = (r.amenities || []).join(', ');
  document.getElementById('rActive').checked = !!r.active;
  _setRoomImagePreview(r.img || '');
  openModal('roomModal');
}

async function saveRoom() {
  const editId = document.getElementById('editRoomId').value;
  const isEdit = !!editId;
  const name = document.getElementById('rName').value.trim();
  const idVal = document.getElementById('rId').value.trim().toLowerCase().replace(/\s+/g, '-');
  const price12h = +document.getElementById('rPrice12h').value || 0;
  const price24h = +document.getElementById('rPrice24h').value || 0;
  const cap = document.getElementById('rCap').value.trim();
  const badge = document.getElementById('rBadge').value.trim();
  const imgUrl = document.getElementById('rImgUrl').value;
  const amenities = document.getElementById('rAmenities').value.split(',').map(a => a.trim()).filter(Boolean);
  const active = document.getElementById('rActive').checked;
  const unitString = document.getElementById('rUnitIds').value;
  const unitIdsArray = unitString.split(',').map(s => s.trim()).filter(s => s !== '');

  if (!name || (!isEdit && !idVal)) { alert('Please provide a Room Name and ID.'); return; }

  const payload = {
    id: isEdit ? editId : idVal, name: name, price12h: price12h, price24h: price24h,
    cap: cap, unitIds: unitIdsArray, badge: badge, img: imgUrl, amenities: amenities, active: active
  };

  try {
    if (isEdit) {
      await ABHC_DB.updateRoom(editId, payload);
    } else {
      await ABHC_DB.saveRoom(payload);
    }
    closeModal('roomModal');
    renderRoomCards();
    await logSystemAction(`${isEdit ? 'updated details for' : 'created a new room named'} ${name}`);
  } catch (err) { alert('Error saving room: ' + err.message); }
}

async function toggleRoomActive(id) {
  if (_currentStaffRole !== 'master') {
    toast('Access Denied: Only the Master Admin can activate/deactivate rooms.', 'error');
    return;
  }

  const rooms = await ABHC_DB.getRooms();
  const r = rooms.find(x => x.id === id);
  if (!r) return;

  const newState = !r.active;
  const actionWord = newState ? 'Activate' : 'Deactivate';

  showAuthModal({
    title: `${actionWord} Room`,
    desc: `You are about to ${actionWord.toLowerCase()} <strong>${r.name}</strong>.`,
    action: 'toggleRoom',
    bookingId: id,
    bookingRef: r.name,
    extra: { newActive: newState },
  });
}

async function deleteRoom(id) {
  if (_currentStaffRole !== 'master') {
    toast('Access Denied: Only the Master Admin can delete rooms.', 'error');
    return;
  }

  const rooms = await ABHC_DB.getRooms();
  const r = rooms.find(x => x.id === id);
  if (!r) return;

  if (r.active) {
    toast('You must deactivate this room before it can be permanently deleted.', 'error');
    return;
  }

  showAuthModal({
    title: 'Permanently Delete Room',
    desc: `You are about to permanently delete <strong>${r.name}</strong>. Existing bookings linked to this room will not be affected, but the room will no longer appear anywhere.`,
    action: 'deleteRoom',
    bookingId: id,
    bookingRef: r.name,
  });
}

// ── REPAIRS ───────────────────────────────────────────────────────────────────
async function renderRepairs() {
  const repairs = await ABHC_DB.getRepairs();
  const total = repairs.reduce((s, r) => s + (+r.amount || 0), 0);
  document.getElementById('totalRepairBadge').textContent = fmtMoney(total);
  document.getElementById('repairsTbody').innerHTML = repairs
    .sort((a, b) => b.date > a.date ? 1 : -1)
    .map(r => `<tr>
      <td>${fmt(r.date)}</td>
      <td><span style="font-family:monospace;font-size:0.78rem;">${r.ref || '—'}</span></td>
      <td>${r.category || '—'}</td>
      <td>${r.description}</td>
      <td style="color:var(--danger);font-weight:500;">${fmtMoney(r.amount)}</td>
      <td><button class="btn btn-danger btn-xs" onclick="deleteRepair('${r.id}')">🗑</button></td>
    </tr>`).join('')
    || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No repair costs logged.</td></tr>';
  if (!document.getElementById('repairDate').value)
    document.getElementById('repairDate').value = fmtD(new Date());
}

async function addRepair() {
  const ref = document.getElementById('repairRef').value.trim();
  const desc = document.getElementById('repairDesc').value.trim();
  const amt = +document.getElementById('repairAmt').value;
  const date = document.getElementById('repairDate').value;
  let cat = document.getElementById('repairCat').value;
  if (cat === 'Other') cat = document.getElementById('repairOtherText').value.trim() || 'Other';
  if (!desc || !amt || !date) { toast('Description, amount and date are required.', 'error'); return; }
  try {
    await ABHC_DB.addRepair({ ref, description: desc, amount: amt, date, category: cat });
    toast('Repair cost logged! 🔧', 'success');
    ['repairRef', 'repairDesc', 'repairAmt'].forEach(id => document.getElementById(id).value = '');
    renderRepairs();
    renderDashboard();
    await logSystemAction(`logged a new repair cost of ₱${amt.toLocaleString()} for: ${desc}`);
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

async function deleteRepair(id) {
  if (!confirm('Remove this repair entry?')) return;
  await ABHC_DB.deleteRepair(id);
  toast('Repair cost removed.', 'success');
  await logSystemAction(`removed a repair cost entry from the ledger`);
  renderRepairs();
  renderDashboard();
}

// ── FLAGGED GUESTS ────────────────────────────────────────────────────────────
async function renderFlaggedTable() {
  const q = (document.getElementById('flagSearch').value || '').toLowerCase();
  let flags = await ABHC_DB.getFlaggedGuests();
  if (q) flags = flags.filter(f => (f.name || '').toLowerCase().includes(q) || (f.email || '').toLowerCase().includes(q) || (f.reason || '').toLowerCase().includes(q));
  document.getElementById('flagCountBadge').textContent = flags.length;
  const sevMap = { low: '⚠️ Low', medium: '🟠 Medium', high: '🔴 High' };
  document.getElementById('flagsTbody').innerHTML = flags.map(f => `
    <tr>
      <td><strong>${f.name || '—'}</strong></td>
      <td>${f.email || '—'}</td>
      <td>${sevMap[f.severity] || f.severity || '—'}</td>
      <td style="max-width:200px;font-size:0.82rem;">${f.reason || '—'}</td>
      <td>${fmt(f.flagged_at || f.flaggedAt)}</td>
      <td><button class="btn btn-danger btn-xs" onclick="removeFlaggedGuest('${f.id}')">Remove</button></td>
    </tr>`).join('')
    || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No flagged guests.</td></tr>';
}

async function addFlaggedGuest() {
  const name = document.getElementById('flagName').value.trim();
  const email = document.getElementById('flagEmail').value.trim();
  const reason = document.getElementById('flagReason').value.trim();
  const severity = document.getElementById('flagSeverity').value;
  if (!name && !email) { toast('Name or email required.', 'error'); return; }
  if (!reason) { toast('Please describe the incident.', 'error'); return; }
  try {
    await ABHC_DB.addFlaggedGuest({ name, email, reason, severity, flaggedAt: fmtD(new Date()) });
    toast('Guest flagged! 🚩', 'warning');
    ['flagName', 'flagEmail', 'flagReason'].forEach(id => document.getElementById(id).value = '');
    renderFlaggedTable();
    await logSystemAction(`added ${name || email} to the Flagged Guest Registry (${severity} severity)`);
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

async function removeFlaggedGuest(id) {
  if (!confirm('Remove this flag? This cannot be undone.')) return;
  await ABHC_DB.removeFlaggedGuest(id);
  toast('Flag removed.', 'success');
  await logSystemAction(`removed a guest from the Flagged Registry`);
  renderFlaggedTable();
}

// ── AVAILABILITY CALENDAR ─────────────────────────────────────────────────────
async function renderAdminCal() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [rooms, bookings] = await Promise.all([ABHC_DB.getRooms(), ABHC_DB.getBookings()]);
  const active = rooms.filter(r => r.active);
  const months = [];
  for (let m = 0; m < 3; m++) months.push(new Date(today.getFullYear(), today.getMonth() + m, 1));

  // Build booked map (Now tracks exactly HOW MANY units are booked)
  const bookedMap = {};
  bookings.forEach(b => {
    if (b.status === 'cancelled') return;
    const rid = b.room_id || b.roomId;
    const qty = b.room_quantity || 1; // Capture the quantity
    let d = new Date(b.check_in || b.checkIn);
    const co = new Date(b.check_out || b.checkOut);
    while (d < co) {
      const k = fmtD(d);
      if (!bookedMap[k]) bookedMap[k] = {};
      if (!bookedMap[k][rid]) bookedMap[k][rid] = 0;
      bookedMap[k][rid] += qty; // Add up the total units used
      d.setDate(d.getDate() + 1);
    }
  });

  let html = '';
  months.forEach(base => {
    const yr = base.getFullYear(), mo = base.getMonth();
    const mName = base.toLocaleString('en-PH', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' });
    const firstDay = new Date(yr, mo, 1).getDay();
    const daysInMo = new Date(yr, mo + 1, 0).getDate();
    const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    html += `<div style="margin-bottom:2.5rem;"><h3 style="font-family:var(--font-serif);font-size:1.3rem;margin-bottom:1rem;">${mName}</h3>`;
    html += `<div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:10px; border:1px solid var(--sand-mid); padding:10px; border-radius:12px; background:#fff;">`;

    DOW.forEach(d => {
      html += `<div style="text-align:center; font-size:0.75rem; font-weight:700; color:var(--text-muted); padding-bottom:10px; border-bottom:1px solid var(--sand-mid);">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) html += `<div style="min-height:60px;"></div>`;

    for (let d = 1; d <= daysInMo; d++) {
      const date = new Date(yr, mo, d);
      const ds = fmtD(date);
      const isPast = date < today;
      const isToday = ds === fmtD(today);

      html += `
        <div onclick="openDayAvailabilityModal('${ds}')" style="min-height:80px; display:flex; flex-direction:column; gap:4px; border-radius:8px; padding:4px; cursor:pointer; transition:background 0.2s; ${isToday ? 'background:var(--aqua-light); outline:1px solid var(--aqua);' : ''}" onmouseover="if(!${isToday}) this.style.background='var(--sand-light)'" onmouseout="if(!${isToday}) this.style.background='transparent'">
          <div style="text-align:center; font-size:0.8rem; font-weight:600; ${isPast ? 'color:#ccc;' : 'color:var(--text-dark);'}">${d}</div>
          <div style="display:flex; flex-direction:column; gap:2px;">
            ${active.map(r => {
        const bookedCount = (bookedMap[ds] && bookedMap[ds][r.id]) || 0;
        const totalUnits = r.quantity || 1;
        const pct = Math.min(100, Math.round((bookedCount / totalUnits) * 100));

        let bgStyle = '';
        if (isPast) {
          bgStyle = 'background:#f1f5f5;';
        } else if (bookedCount === 0) {
          bgStyle = 'background:#e0f2f1;';
        } else if (bookedCount >= totalUnits) {
          bgStyle = 'background:var(--sunset);'; // Fully booked
        } else {
          // Partially booked (Progress Bar effect!)
          bgStyle = `background:linear-gradient(90deg, var(--sunset) ${pct}%, #e0f2f1 ${pct}%); border: 1px solid rgba(255,112,67,0.2);`;
        }

        return `<div title="${r.name} - ${bookedCount}/${totalUnits} Booked" style="height:6px; width:100%; border-radius:2px; ${bgStyle}" data-room="${r.id}"></div>`;
      }).join('')}
          </div>
        </div>`;
    }

    html += `</div>`;

    // Updated Legend
    html += `
      <div style="display:flex; gap:1.5rem; margin-top:0.8rem; font-size:0.75rem; color:var(--text-muted); padding-left:5px; flex-wrap:wrap;">
        <span style="display:flex; align-items:center; gap:0.4rem;"><span style="width:12px; height:6px; background:#e0f2f1; border-radius:2px;"></span>Available</span>
        <span style="display:flex; align-items:center; gap:0.4rem;"><span style="width:12px; height:6px; background:linear-gradient(90deg, var(--sunset) 50%, #e0f2f1 50%); border-radius:2px; border:1px solid rgba(255,112,67,0.2);"></span>Partially Booked</span>
        <span style="display:flex; align-items:center; gap:0.4rem;"><span style="width:12px; height:6px; background:var(--sunset); border-radius:2px;"></span>Fully Booked</span>
        <span style="display:flex; align-items:center; gap:0.4rem; margin-left:auto;">Hover over bars to see X/Y Capacity</span>
      </div>
    </div>`;
  });

  document.getElementById('adminCalWrap').innerHTML = html;
}

window.openDayAvailabilityModal = async function(ds) {
  const date = parseD(ds);
  const dateStr = date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
  document.getElementById('dayAvailTitle').textContent = `Availability for ${dateStr}`;
  const content = document.getElementById('dayAvailContent');
  content.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted);">Calculating availability...</div>';
  openModal('dayAvailabilityModal');

  try {
    const [rooms, bookings] = await Promise.all([ABHC_DB.getRooms(), ABHC_DB.getBookings()]);
    const activeRooms = rooms.filter(r => r.active);
    const dayBookings = bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      const ci = new Date(b.check_in || b.checkIn).setHours(0, 0, 0, 0);
      const co = new Date(b.check_out || b.checkOut).setHours(0, 0, 0, 0);
      const target = date.getTime();
      return target >= ci && target < co;
    });

    let html = '';
    activeRooms.forEach(room => {
      const roomBookings = dayBookings.filter(b => (b.room_id || b.roomId) === room.id);
      const bookedQty = roomBookings.reduce((sum, b) => sum + (b.room_quantity || 1), 0);
      const totalQty = room.quantity || 1;
      const availableQty = Math.max(0, totalQty - bookedQty);
      
      // Determine which units are taken
      let takenUnits = [];
      roomBookings.forEach(b => {
        const req = b.special_req || b.specialReq || '';
        const match = req.match(/\[Preferred Unit:\s*(.*?)\]/);
        if (match) takenUnits.push(match[1]);
      });
      
      const allUnits = room.unitIds || [];
      const availUnits = allUnits.filter(u => !takenUnits.includes(u)).slice(0, availableQty);

      html += `
        <div class="card" style="margin-bottom:1rem; border-left:4px solid ${availableQty > 0 ? 'var(--success)' : 'var(--danger)'};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.8rem;">
            <div>
              <h4 style="margin:0; font-size:1.05rem;">${room.name}</h4>
              <div style="font-size:0.8rem; color:var(--text-muted);">${room.cap}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:700; font-size:1.1rem; color:${availableQty > 0 ? 'var(--success)' : 'var(--danger)'};">${availableQty} / ${totalQty} Available</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${bookedQty} Unit${bookedQty !== 1 ? 's' : ''} Occupied</div>
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div>
              <div style="font-size:0.75rem; font-weight:600; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.4rem;">Occupied Units / Guests</div>
              ${roomBookings.length > 0 ? roomBookings.map(b => {
                const req = b.special_req || b.specialReq || '';
                const match = req.match(/\[Preferred Unit:\s*(.*?)\]/);
                const unit = match ? `<span style="background:var(--sand-mid); padding:2px 6px; border-radius:4px; margin-right:4px; font-family:monospace;">${match[1]}</span>` : '';
                return `<div style="font-size:0.85rem; margin-bottom:0.3rem;">${unit}${b.guest_name || b.guestName} <span style="font-size:0.75rem; color:var(--text-muted);">(${b.ref})</span></div>`;
              }).join('') : '<div style="font-size:0.82rem; color:var(--text-muted); font-style:italic;">No units occupied</div>'}
            </div>
            <div>
              <div style="font-size:0.75rem; font-weight:600; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.4rem;">Available Units</div>
              <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                ${availUnits.length > 0 ? availUnits.map(u => `<span style="background:var(--aqua-light); color:var(--aqua-deep); font-size:0.8rem; padding:0.2rem 0.6rem; border-radius:4px; font-family:monospace; font-weight:600;">${u}</span>`).join('') : (availableQty > 0 ? '<span style="font-size:0.82rem; color:var(--text-muted);">Any available unit</span>' : '<span style="font-size:0.82rem; color:var(--danger); font-weight:500;">SOLD OUT</span>')}
              </div>
            </div>
          </div>
        </div>
      `;
    });
    content.innerHTML = html || '<div style="padding:2rem; text-align:center; color:var(--text-muted);">No active rooms found.</div>';
  } catch (err) {
    content.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--sunset);">Error loading availability: ${err.message}</div>`;
  }
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────────
async function exportCSV(type) {
  const today = new Date();
  let rows = [], filename = '';
  const range = document.getElementById('exportDateRange')?.value;
  const estatus = document.getElementById('exportStatus')?.value;

  if (type === 'bookings') {
    let bk = await ABHC_DB.getBookings();
    if (estatus) bk = bk.filter(b => b.status === estatus);
    if (range && range !== 'all') {
      bk = bk.filter(b => {
        const d = parseD(b.check_in || b.checkIn); if (!d) return false;
        if (range === 'month') return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        if (range === 'quarter') { const q = Math.floor(today.getMonth() / 3); return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === today.getFullYear(); }
        if (range === 'year') return d.getFullYear() === today.getFullYear();
        return true;
      });
    }
    rows = [['Reference', 'Guest Name', 'Email', 'Phone', 'Room', 'Check-In', 'Check-Out', 'Nights', 'Subtotal', 'Tax', 'Repair Cost', 'Total', 'Status', 'Flagged', 'Special Requests', 'Admin Notes', 'Created At']];
    bk.forEach(b => rows.push([b.ref, b.guest_name || b.guestName, b.guest_email || b.guestEmail, b.guest_phone || b.guestPhone, b.room_name || b.roomName, b.check_in || b.checkIn, b.check_out || b.checkOut, b.nights, b.subtotal, b.tax, b.repair_cost || b.repairCost || 0, b.total, b.status, b.flagged ? 'YES' : 'NO', b.special_req || b.specialReq || '', b.notes || '', b.created_at || b.createdAt || '']));
    filename = 'avellanos_bookings_' + fmtD(new Date());
  } else if (type === 'revenue') {
    const bk = (await ABHC_DB.getBookings()).filter(b => b.status !== 'cancelled');
    const repairs = await ABHC_DB.getRepairs();
    rows = [['Month', 'Gross Revenue', 'Tax Collected', 'Repair Costs', 'Net Revenue', '# Bookings']];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mn = bk.filter(b => { const ci = parseD(b.check_in || b.checkIn); return ci && ci.getFullYear() === d.getFullYear() && ci.getMonth() === d.getMonth(); });
      const rep = repairs.filter(r => { const rd = parseD(r.date); return rd && rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth(); });
      const gross = mn.reduce((s, b) => s + (b.total || 0), 0);
      const tax = mn.reduce((s, b) => s + (b.tax || 0), 0);
      const rc = rep.reduce((s, r) => s + (+r.amount || 0), 0);
      rows.push([d.toLocaleString('en-US', { month: 'long', year: 'numeric' }), gross, tax, rc, gross - rc, mn.length]);
    }
    filename = 'avellanos_revenue_' + fmtD(new Date());
  } else if (type === 'repairs') {
    rows = [['Date', 'Reference', 'Category', 'Description', 'Amount', 'Created At']];
    (await ABHC_DB.getRepairs()).forEach(r => rows.push([r.date, r.ref || '', r.category, r.description, r.amount, r.created_at || r.createdAt || '']));
    filename = 'avellanos_repairs_' + fmtD(new Date());
  } else if (type === 'flags') {
    rows = [['Name', 'Email', 'Severity', 'Reason', 'Flagged Date']];
    (await ABHC_DB.getFlaggedGuests()).forEach(f => rows.push([f.name, f.email, f.severity, f.reason, f.flagged_at || f.flaggedAt || '']));
    filename = 'avellanos_flagged_guests_' + fmtD(new Date());
  }

  const csv = rows.map(r => r.map(c => '"' + (String(c || '').replace(/"/g, '""')) + '"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename + '.csv';
  a.click();
  toast('Exported: ' + filename + '.csv', 'success');
  await logSystemAction(`exported ${type} data to a CSV file`);
}

// ── ADMIN PHOTO FEED ──────────────────────────────────────────────────────────
async function renderAdminFeed() {
  const container = document.getElementById('adminFeedGrid');
  container.innerHTML = '<p>Loading...</p>';
  try {
    const res = await fetch('/api/guest-feed');
    const posts = await res.json();

    container.innerHTML = posts.map(p => `
      <div style="background:var(--sand);border-radius:12px;overflow:hidden;border:1px solid var(--sand-mid);">
        <img src="${p.image_url}" style="width:100%;height:180px;object-fit:cover;display:block;">
        <div style="padding:1rem;">
          
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <div>
              <div style="font-weight:600;font-size:0.9rem;">${p.guest_name}</div>
              ${p.guest_ref ? `<div style="font-size:0.75rem; color:var(--aqua-deep); font-family:monospace;">Ref: ${p.guest_ref}</div>` : ''}
            </div>
            <span class="badge ${p.status === 'approved' ? 'badge-confirmed' : p.status === 'rejected' ? 'badge-cancelled' : 'badge-pending'}">${p.status.toUpperCase()}</span>
          </div>
          
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;height:40px;overflow:hidden;">"${p.caption}"</p>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-success btn-sm" style="flex:1;" onclick="updatePostStatus('${p.id}', 'approved')" ${p.status === 'approved' ? 'disabled' : ''}>✓ Approve</button>
            <button class="btn btn-danger btn-sm" style="flex:1;" onclick="updatePostStatus('${p.id}', 'rejected')" ${p.status === 'rejected' ? 'disabled' : ''}>✕ Reject</button>
          </div>
        </div>
      </div>
    `).join('') || '<p>No posts yet.</p>';
  } catch (e) { container.innerHTML = `<p style="color:red;">Error loading feed: ${e.message}</p>`; }
}

async function updatePostStatus(id, status) {
  try {
    await fetch('/api/guest-feed', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    toast(`Post ${status}!`, status === 'approved' ? 'success' : 'error');
    await logSystemAction(`${status === 'approved' ? 'approved' : 'rejected'} a guest memory photo for the public feed`);
    renderAdminFeed();
  } catch (e) { alert("Error: " + e.message); }
}

// ── STAFF ACCOUNTS ──────────────────────────────────────────────────────────
async function createEmployee() {
  const fName = document.getElementById('empFName').value.trim();
  const lName = document.getElementById('empLName').value.trim();
  const phone = document.getElementById('empPhone').value.trim();
  const email = document.getElementById('empEmail').value.trim();
  const pass = document.getElementById('empPass').value;
  const btn = document.getElementById('btnCreateEmp');
  const msg = document.getElementById('empMsg');

  if (!fName || !lName || !email || pass.length < 6) {
    msg.textContent = "Please fill out all required fields (Password min 6 chars).";
    msg.style.color = "var(--danger)"; return;
  }
  btn.textContent = "Verifying & Creating..."; btn.disabled = true; msg.textContent = "";

  try {
    const { data: { session } } = await window.supa.auth.getSession();
    if (!session) throw new Error("You must be logged in.");

    const res = await fetch('/api/add-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ firstName: fName, lastName: lName, phone: phone, email: email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    msg.textContent = "✅ Employee account successfully created!"; msg.style.color = "green";
    await logSystemAction(`created a new staff login credential for: ${email}`);
    ['empFName', 'empLName', 'empPhone', 'empEmail', 'empPass'].forEach(id => document.getElementById(id).value = '');
  } catch (e) {
    msg.textContent = "❌ " + e.message; msg.style.color = "var(--danger)";
  } finally { btn.textContent = "+ Create Account"; btn.disabled = false; }
}

// ── INTERNAL NOTES ──────────────────────────────────────────────────────────
async function submitInternalNote(bookingId) {
  const textInput = document.getElementById(`newNote_${bookingId}`);
  const text = textInput.value.trim();
  const btn = document.getElementById(`btnNote_${bookingId}`);

  if (!text) return;

  btn.textContent = "Saving...";
  btn.disabled = true;

  try {
    const { data: { session } } = await window.supa.auth.getSession();
    let staffName = "Unknown Staff";

    if (session) {
      const { data: profile } = await window.supa.from('staff_profiles').select('first_name, last_name').eq('id', session.user.id).single();
      if (profile) staffName = `${profile.first_name} ${profile.last_name}`;
    }

    const { data: booking, error: fetchErr } = await window.supa.from('bookings').select('internal_notes, ref').eq('id', bookingId).single();
    if (fetchErr) throw fetchErr;

    const currentNotes = booking.internal_notes || [];

    const newNote = {
      date: new Date().toISOString(),
      staff: staffName,
      text: text
    };

    const updatedNotes = [...currentNotes, newNote];
    const { error: updateErr } = await window.supa.from('bookings').update({ internal_notes: updatedNotes }).eq('id', bookingId);
    if (updateErr) throw updateErr;

    await logSystemAction(`added an internal note to Ref: ${booking.ref}`);
    window.location.reload();

  } catch (e) {
    alert("Error adding note: " + e.message);
    btn.textContent = "+ Save Note";
    btn.disabled = false;
  }
}

// ── SYSTEM LOGS & UNIVERSAL LOGGER ──────────────────────────────────────────
async function logSystemAction(actionMessage) {
  try {
    const { data: { session } } = await window.supa.auth.getSession();
    if (!session) return;

    const { data: profile } = await window.supa.from('staff_profiles').select('first_name, last_name').eq('id', session.user.id).single();
    const actorName = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Staff';

    await window.supa.from('system_logs').insert([{
      source: 'Internal',
      actor: actorName,
      message: actionMessage
    }]);
  } catch (e) {
    console.error("Silent Log Error:", e.message);
  }
}

async function renderLogsTab() {
  const container = document.getElementById('logsTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted);">Loading system logs...</td></tr>';

  try {
    const { data: logs, error } = await window.supa.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;

    container.innerHTML = logs.map(log => {
      const d = new Date(log.created_at);
      const dateStr = d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });

      const badgeClass = log.source === 'Online' ? 'badge-confirmed' : 'badge-pending';

      return `
        <tr>
          <td style="white-space:nowrap; color:var(--text-muted); font-size:0.8rem;">
            <div>${dateStr}</div>
            <div style="font-weight:600;">${timeStr}</div>
          </td>
          <td><span class="badge ${badgeClass}">${log.source}</span></td>
          <td style="font-size:0.85rem; line-height:1.4;">
            <strong style="color:var(--text-main);">${log.actor}</strong> ${log.message}
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--text-muted);">No system logs recorded yet.</td></tr>';
  } catch (e) {
    container.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:2rem; color:red;">Error loading logs: ${e.message}</td></tr>`;
  }
}

// ── CUSTOMER SERVICE MODULE ───────────────────────────────────────────────────
let currentAdminCase = null;
let adminProfile = null;
let adminRealtimeChannel = null;
let allStaffList = [];

async function initSupport() {
  const { data: { session } } = await window.supa.auth.getSession();
  if (session) {
    const { data: p } = await window.supa.from('staff_profiles').select('*').eq('id', session.user.id).single();
    if (p) adminProfile = `${p.first_name} ${p.last_name}`;
  }

  // Fetch all staff for the ownership transfer dropdown
  const { data: profiles } = await window.supa.from('staff_profiles').select('first_name, last_name');
  if (profiles) allStaffList = profiles.map(p => `${p.first_name} ${p.last_name}`);

  await refreshSupportUI();

  window.caseFollowupTimeouts = window.caseFollowupTimeouts || {};

  // --- NOTIFICATION SOUND ---
  let audioCtx = null;
  let lastSoundTime = 0;
  function playNotificationSound() {
    const now = Date.now();
    if (now - lastSoundTime < 1000) return; // Prevent double ding when case and message arrive simultaneously
    lastSoundTime = now;

    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) { console.error("Audio API not supported or blocked", e); }
  }

  if (!adminRealtimeChannel) {
    adminRealtimeChannel = window.supa.channel('admin-support-tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_cases' }, (payload) => {
        refreshSupportUI();
        if (payload.eventType === 'INSERT') playNotificationSound();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, payload => {
        refreshSupportUI();

        // Zero-Cost Automated Follow-Up Logic
        const m = payload.new;
        if (m && m.case_id) {
          if (m.sender_type === 'guest') {
            // Guest replied! Cancel the follow-up and play sound.
            if (window.caseFollowupTimeouts[m.case_id]) {
              clearTimeout(window.caseFollowupTimeouts[m.case_id]);
              delete window.caseFollowupTimeouts[m.case_id];
            }
            playNotificationSound();
          } else if (m.sender_type === 'staff') {
            // Staff replied! Start or Reset the 5-minute countdown clock.
            if (window.caseFollowupTimeouts[m.case_id]) clearTimeout(window.caseFollowupTimeouts[m.case_id]);
            window.caseFollowupTimeouts[m.case_id] = setTimeout(async () => {
              // Verify case is still active before sending
              const dbCases = await ABHC_DB.getSupportCases();
              const checkCase = dbCases.find(c => c.case_id === m.case_id);
              if (checkCase && checkCase.status === 'active') {
                await ABHC_DB.sendSupportMessage({
                  case_id: m.case_id,
                  sender_type: 'bot',
                  sender_name: "Avellano's Support",
                  message: "I just wanted to check if we are still connected?"
                });
              }
            }, 180000); // 3 minutes
          } else if (m.sender_type === 'bot') {
            // Bot sent a message, clear timeout to be safe
            if (window.caseFollowupTimeouts[m.case_id]) {
              clearTimeout(window.caseFollowupTimeouts[m.case_id]);
              delete window.caseFollowupTimeouts[m.case_id];
            }
          }
        }
      }).subscribe();
  }

  // Polling fallback to guarantee delivery if realtime publication is disabled
  if (!window.adminSupportPoll) {
    window.adminSupportPoll = setInterval(() => {
      refreshSupportUI();
    }, 3000);
  }

}

async function refreshSupportUI() {
  if (document.getElementById('page-chat').classList.contains('active')) {
    const cases = await ABHC_DB.getSupportCases();
    const pending = cases.filter(c => c.status === 'pending');
    const active = cases.filter(c => c.status === 'active' && c.owner === adminProfile);

    const renderQ = (arr) => arr.map(c => `
      <div class="queue-item ${currentAdminCase?.case_id === c.case_id ? 'active' : ''}" onclick="loadAdminCase('${c.case_id}')">
        <div class="queue-item-id">${c.case_id}</div>
        <div class="queue-item-name">${c.guest_name}</div>
      </div>`).join('') || '<div style="font-size:0.8rem;color:#ccc;">Empty</div>';

    document.getElementById('queuePending').innerHTML = renderQ(pending);
    document.getElementById('queueActive').innerHTML = renderQ(active);

    if (currentAdminCase) {
      currentAdminCase = cases.find(c => c.case_id === currentAdminCase.case_id) || currentAdminCase;
      loadAdminCase(currentAdminCase.case_id, false); // refresh details silently
    }
  }
}

async function renderDirectory() {
  const cases = await ABHC_DB.getSupportCases();
  const dForm = (d) => d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  document.getElementById('directoryTbody').innerHTML = cases.map(c => `
    <tr>
      <td style="font-family:monospace;">${c.case_id}</td>
      <td><strong>${c.guest_name}</strong></td>
      <td><span class="badge ${c.status === 'active' ? 'badge-confirmed' : (c.status === 'pending' ? 'badge-pending' : 'badge-cancelled')}">${c.status.toUpperCase()}</span></td>
      <td>${c.owner || '—'}</td>
      <td>${dForm(c.created_at)}</td>
      <td><button class="btn btn-ghost btn-xs" onclick="navTo('chat'); loadAdminCase('${c.case_id}');">View</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No cases found.</td></tr>';
}

async function loadAdminCase(id, switchTab = true) {
  let draftMsg = '', draftNote = '';
  if (!switchTab) {
    const ci = document.getElementById('adminChatInput');
    if (ci) draftMsg = ci.value;
    const ni = document.getElementById('csNewNote');
    if (ni) draftNote = ni.value;
  }

  let oldStatus = currentAdminCase ? currentAdminCase.status : '';
  let oldOwner = currentAdminCase ? currentAdminCase.owner : '';
  
  const cases = await ABHC_DB.getSupportCases();
  currentAdminCase = cases.find(c => c.case_id === id);
  if (!currentAdminCase) return;

  let caseChanged = (oldStatus !== currentAdminCase.status) || (oldOwner !== currentAdminCase.owner);
  let shouldRenderLayout = switchTab || caseChanged;

  document.getElementById('workspaceEmpty').style.display = 'none';
  const wc = document.getElementById('workspaceContent');
  wc.style.display = 'flex';

  if (switchTab) {
    wc.classList.remove('case-animate');
    void wc.offsetWidth;
    wc.classList.add('case-animate');
  }

  const dForm = (d) => d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const staffOptions = allStaffList.map(s => `<option value="${s}">`).join('');

  if (shouldRenderLayout) {
    // 1. FORMATTED CASE INFO TAB
    document.getElementById('csTab-info').innerHTML = `
      <div style="margin-bottom:1.5rem; background:var(--bg); padding:1.2rem; border-radius:12px; border:1px solid var(--sand-mid);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--sand-mid); padding-bottom:0.8rem;">
          <span style="color:var(--text-muted); font-size:0.85rem; font-weight:600;">Case Owner</span>
          <div id="ownerDisplay" style="font-weight:600; color:var(--aqua-deep); cursor:pointer; text-decoration:underline;" onclick="document.getElementById('ownerEdit').style.display='flex'; this.style.display='none';">
            ${currentAdminCase.owner || 'Unassigned (Click to assign)'}
          </div>
          <div id="ownerEdit" style="display:none; gap:0.5rem; align-items:center;">
            <input type="text" id="newOwnerInput" list="staffList" class="chat-input" style="padding:0.4rem; font-size:0.8rem; width:160px;" value="${currentAdminCase.owner || ''}" placeholder="Type staff name...">
            <datalist id="staffList">${staffOptions}</datalist>
            <button class="btn btn-primary btn-xs" onclick="saveCaseOwner()">Save</button>
            <button class="btn btn-ghost btn-xs" onclick="document.getElementById('ownerDisplay').style.display='block'; document.getElementById('ownerEdit').style.display='none';">Cancel</button>
          </div>
        </div>
        <div class="rev-line"><span>Case ID:</span><span style="font-family:monospace; font-weight:600;">${currentAdminCase.case_id}</span></div>
        <div class="rev-line"><span>Name:</span><span style="font-weight:500;">${currentAdminCase.guest_name}</span></div>
        <div class="rev-line"><span>Email:</span><span>${currentAdminCase.guest_email}</span></div>
        <div class="rev-line"><span>Phone:</span><span>${currentAdminCase.guest_phone || 'None'}</span></div>
        <div class="rev-line"><span>Ref No:</span><span>${currentAdminCase.ref_no || 'None'}</span></div>
        <div class="rev-line" style="border:none; margin-top:0.5rem; flex-direction:column; gap:0.4rem;">
          <span>Concern:</span>
          <span style="font-weight:500; background:white; padding:0.8rem; border-radius:8px; border:1px solid var(--sand-mid);">${currentAdminCase.concern}</span>
        </div>
      </div>
      <div style="background:var(--bg); padding:1.2rem; border-radius:12px; border:1px solid var(--sand-mid);">
        <div class="rev-line"><span>Case Status:</span><span class="badge ${currentAdminCase.status === 'active' || currentAdminCase.status === 'pending' ? 'badge-pending' : 'badge-confirmed'}">${currentAdminCase.status.toUpperCase()}</span></div>
        <div class="rev-line"><span>Case Creation Date:</span><span>${dForm(currentAdminCase.created_at)}</span></div>
        <div class="rev-line"><span>Case Closing Date:</span><span>${dForm(currentAdminCase.closed_at)}</span></div>
      </div>
    `;

    // 2. INTERNAL NOTES TAB
    const notes = currentAdminCase.internal_notes || [];
    document.getElementById('csTab-notes').innerHTML = `
      <div style="max-height: 200px; overflow-y: auto; margin-bottom: 1rem;">
        ${notes.map(n => `<div style="background:var(--bg);padding:0.6rem;border-radius:8px;margin-bottom:0.5rem;font-size:0.8rem;"><strong>${n.staff}</strong>: ${n.text}</div>`).join('')}
      </div>
      <textarea id="csNewNote" class="chat-input" rows="2" placeholder="Add note..."></textarea>
      <button class="btn btn-primary btn-sm" style="margin-top:0.5rem;" onclick="addCsNote()">Save Note</button>
    `;
  }

  // 3. MESSAGES & ACTIVITY LOGS
  const msgs = await ABHC_DB.getSupportMessages(currentAdminCase.case_id);

  // Populate Activity Logs Tab
  const logs = msgs.filter(m => m.sender_type === 'system');
  document.getElementById('csTab-logs').innerHTML = logs.map(l => `
    <div style="font-size:0.8rem; border-bottom:1px solid var(--sand-mid); padding:0.6rem 0;">
      <span style="color:var(--text-muted); margin-right:0.8rem; font-family:monospace;">${dForm(l.created_at)}</span>
      <span style="font-weight:500;">${l.message}</span>
    </div>
  `).join('') || '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:2rem;">No activity logs found.</div>';

  // Populate Chat Body
  const chatBody = document.getElementById('adminChatBody');
  const isAtBottom = switchTab || (chatBody.scrollHeight - chatBody.scrollTop <= chatBody.clientHeight + 15);

  const chatMsgs = msgs.filter(m => m.sender_type !== 'system');

  if (switchTab) {
    chatBody.innerHTML = chatMsgs.map(m => {
      const timeStr = new Date(m.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
      const isGuest = m.sender_type === 'guest';
      return `
        <div class="chat-msg ${isGuest ? 'msg-bot' : 'msg-guest'}">
          ${!isGuest ? `<div style="font-size:0.65rem;opacity:0.7;margin-bottom:0.2rem;">${m.sender_name}</div>` : ''}
          ${m.message}
          <div style="font-size:0.6rem; opacity:0.6; text-align:right; margin-top:4px;">${timeStr}</div>
        </div>
      `;
    }).join('');
  } else {
    // Silent refresh: Only append new messages to prevent flickering
    const currentCount = chatBody.children.length;
    if (chatMsgs.length > currentCount) {
      const newMsgs = chatMsgs.slice(currentCount);
      newMsgs.forEach(m => {
        const timeStr = new Date(m.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
        const isGuest = m.sender_type === 'guest';
        const div = document.createElement('div');
        div.className = `chat-msg ${isGuest ? 'msg-bot' : 'msg-guest'}`;
        div.innerHTML = `
          ${!isGuest ? `<div style="font-size:0.65rem;opacity:0.7;margin-bottom:0.2rem;">${m.sender_name}</div>` : ''}
          ${m.message}
          <div style="font-size:0.6rem; opacity:0.6; text-align:right; margin-top:4px;">${timeStr}</div>
        `;
        chatBody.appendChild(div);
      });
      // Play sound if there are new messages and it's not the user sending them
      if (newMsgs.some(m => m.sender_type === 'guest')) {
        playNotificationSound();
      }
    }
  }

  if (isAtBottom) chatBody.scrollTop = chatBody.scrollHeight;

  if (shouldRenderLayout) {
    // 4. ACTION BUTTONS
    const inputArea = document.getElementById('adminInputArea');
    if (currentAdminCase.status === 'pending' || (currentAdminCase.status === 'active' && currentAdminCase.owner !== adminProfile)) {
      inputArea.innerHTML = `<button class="btn btn-sunset" style="width:100%;" onclick="claimCase()">Claim Case & Reply</button>`;
    } else if (['closed', 'resolved', 'abandoned'].includes(currentAdminCase.status)) {
      inputArea.innerHTML = `<div style="text-align:center;width:100%;color:var(--text-muted);font-size:0.85rem;">This case is marked as ${currentAdminCase.status.toUpperCase()}.</div>`;
    } else {
      inputArea.innerHTML = `
        <input type="text" id="adminChatInput" autocomplete="off" class="chat-input" placeholder="Type reply..." onkeypress="if(event.key==='Enter') sendAdminMsg()">
        <button class="btn btn-primary" onclick="sendAdminMsg()">Send</button>
        <div style="display:flex; gap:0.5rem; margin-left:0.5rem; border-left:1px solid var(--sand-mid); padding-left:0.5rem;">
          <button class="btn btn-success" onclick="updateCaseStatus('resolved')" title="Mark Resolved">✅ Resolved</button>
          <button class="btn btn-sunset" onclick="updateCaseStatus('abandoned')" title="Mark Abandoned">⚠️ Abandoned</button>
        </div>
      `;
    }

    // Restore the user's typed drafts if this layout re-render was triggered during a silent refresh
    if (!switchTab) {
      const ci = document.getElementById('adminChatInput');
      if (ci && draftMsg) ci.value = draftMsg;
      const ni = document.getElementById('csNewNote');
      if (ni && draftNote) ni.value = draftNote;
    }
  }
}

function switchCsTab(tab) {
  document.querySelectorAll('.cs-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.cs-pane').forEach(p => p.style.display = 'none');
  event.target.classList.add('active');
  document.getElementById('csTab-' + tab).style.display = tab === 'chat' ? 'flex' : 'block';
}

async function claimCase() {
  try {
    await ABHC_DB.updateSupportCase(currentAdminCase.case_id, { status: 'active', owner: adminProfile });
    await ABHC_DB.sendSupportMessage({ case_id: currentAdminCase.case_id, sender_type: 'system', sender_name: 'System', message: `${adminProfile} joined the chat.` });
    await logSystemAction(`claimed support case ${currentAdminCase.case_id}`);
    await refreshSupportUI();
  } catch (err) { toast('Error claiming case: ' + err.message, 'error'); }
}

async function saveCaseOwner() {
  const newOwner = document.getElementById('newOwnerInput').value.trim();
  if (!newOwner) return;
  try {
    await ABHC_DB.updateSupportCase(currentAdminCase.case_id, { owner: newOwner });
    await ABHC_DB.sendSupportMessage({ case_id: currentAdminCase.case_id, sender_type: 'system', sender_name: 'System', message: `Case ownership transferred to ${newOwner}.` });
    await logSystemAction(`transferred case ${currentAdminCase.case_id} to ${newOwner}`);
    await refreshSupportUI();
  } catch (err) { toast('Error saving owner: ' + err.message, 'error'); }
}

async function updateCaseStatus(action) {
  try {
    const finalStatus = (action === 'resolved' || action === 'abandoned') ? 'closed' : action;
    await ABHC_DB.updateSupportCase(currentAdminCase.case_id, { status: finalStatus, closed_at: new Date().toISOString() });
    const actionText = action === 'resolved' ? 'RESOLVED' : (action === 'abandoned' ? 'ABANDONED' : action.toUpperCase());
    await ABHC_DB.sendSupportMessage({ case_id: currentAdminCase.case_id, sender_type: 'system', sender_name: 'System', message: `Case marked as ${actionText} by ${adminProfile}.` });
    await logSystemAction(`marked support case ${currentAdminCase.case_id} as ${actionText}`);
    await refreshSupportUI();
  } catch (err) { toast('Error updating status: ' + err.message, 'error'); }
}

async function sendAdminMsg() {
  const input = document.getElementById('adminChatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  // Fire and forget (Realtime listener will auto-refresh UI)
  ABHC_DB.sendSupportMessage({ case_id: currentAdminCase.case_id, sender_type: 'staff', sender_name: adminProfile, message: text });
}

async function addCsNote() {
  const text = document.getElementById('csNewNote').value.trim();
  if (!text) return;
  const newNotes = [...(currentAdminCase.internal_notes || []), { staff: adminProfile, text, date: new Date().toISOString() }];
  await ABHC_DB.updateSupportCase(currentAdminCase.case_id, { internal_notes: newNotes });
  loadAdminCase(currentAdminCase.case_id, false);
}

// ── SITE EDITOR (Visual WYSIWYG) ──────────────────────────────────────────────
_seData = {}; // Site Editor content cache reset

// ── CUSTOM CONFIRM MODAL ───────────────────────────────────────────────────
function showConfirmModal(title, message, icon = '⚠️') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const iconEl = document.getElementById('confirmIcon');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    if (!modal || !titleEl || !msgEl || !iconEl || !okBtn || !cancelBtn) {
      // Fallback if modal elements missing
      resolve(confirm(message));
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    iconEl.textContent = icon;

    modal.classList.add('open');

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      modal.classList.remove('open');
      okBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

function seE(key, tag = 'span') {
  // Returns an inline-editable element with the current CMS value or HTML default
  const val = _seData[key] || '';
  return `<${tag} class="se-editable" contenteditable="true" data-se-key="${key}"${val ? '' : ' data-se-empty="1"'}>${val}</${tag}>`;
}

const SITE_EDITOR_SCHEMA = [
  {
    section: 'hero', label: 'Hero Section', fields: [
      { key: 'hero_badge', label: 'Badge Text', type: 'text', placeholder: '✦ Beachfront Paradise · Philippines ✦' },
      { key: 'hero_title', label: 'Main Title (HTML)', type: 'text', placeholder: "Avellano's<br><em>Beach Hut</em> Cottage" },
      { key: 'hero_subtitle', label: 'Subtitle', type: 'textarea', placeholder: 'Where the ocean meets endless sunsets...' },
    ]
  },
  {
    section: 'perks', label: 'Perks Bar (5 Items)', fields: [
      { key: 'perk_1_icon', label: 'Perk 1 Icon', type: 'icon' }, { key: 'perk_1_title', label: 'Perk 1 Title', type: 'text' }, { key: 'perk_1_desc', label: 'Perk 1 Description', type: 'text' },
      { key: 'perk_2_icon', label: 'Perk 2 Icon', type: 'icon' }, { key: 'perk_2_title', label: 'Perk 2 Title', type: 'text' }, { key: 'perk_2_desc', label: 'Perk 2 Description', type: 'text' },
      { key: 'perk_3_icon', label: 'Perk 3 Icon', type: 'icon' }, { key: 'perk_3_title', label: 'Perk 3 Title', type: 'text' }, { key: 'perk_3_desc', label: 'Perk 3 Description', type: 'text' },
      { key: 'perk_4_icon', label: 'Perk 4 Icon', type: 'icon' }, { key: 'perk_4_title', label: 'Perk 4 Title', type: 'text' }, { key: 'perk_4_desc', label: 'Perk 4 Description', type: 'text' },
      { key: 'perk_5_icon', label: 'Perk 5 Icon', type: 'icon' }, { key: 'perk_5_title', label: 'Perk 5 Title', type: 'text' }, { key: 'perk_5_desc', label: 'Perk 5 Description', type: 'text' },
    ]
  },
  {
    section: 'booking', label: 'Booking Section', fields: [
      { key: 'booking_label', label: 'Section Label', type: 'text' },
      { key: 'booking_title', label: 'Section Title (HTML)', type: 'text' },
      { key: 'booking_subtitle', label: 'Subtitle', type: 'textarea' },
    ]
  },
  {
    section: 'rooms', label: 'Rooms Section', fields: [
      { key: 'rooms_label', label: 'Section Label', type: 'text' },
      { key: 'rooms_title', label: 'Section Title (HTML)', type: 'text' },
      { key: 'rooms_subtitle', label: 'Subtitle', type: 'textarea' },
    ]
  },
  {
    section: 'activities', label: 'Activities Section', fields: [
      { key: 'activities_label', label: 'Section Label', type: 'text' },
      { key: 'activities_title', label: 'Section Title (HTML)', type: 'text' },
      { key: 'activities_subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'act_1_icon', label: 'Activity 1 Icon', type: 'icon' }, { key: 'act_1_name', label: 'Activity 1 Name', type: 'text' }, { key: 'act_1_desc', label: 'Activity 1 Desc', type: 'text' },
      { key: 'act_2_icon', label: 'Activity 2 Icon', type: 'icon' }, { key: 'act_2_name', label: 'Activity 2 Name', type: 'text' }, { key: 'act_2_desc', label: 'Activity 2 Desc', type: 'text' },
      { key: 'act_3_icon', label: 'Activity 3 Icon', type: 'icon' }, { key: 'act_3_name', label: 'Activity 3 Name', type: 'text' }, { key: 'act_3_desc', label: 'Activity 3 Desc', type: 'text' },
      { key: 'act_4_icon', label: 'Activity 4 Icon', type: 'icon' }, { key: 'act_4_name', label: 'Activity 4 Name', type: 'text' }, { key: 'act_4_desc', label: 'Activity 4 Desc', type: 'text' },
      { key: 'act_5_icon', label: 'Activity 5 Icon', type: 'icon' }, { key: 'act_5_name', label: 'Activity 5 Name', type: 'text' }, { key: 'act_5_desc', label: 'Activity 5 Desc', type: 'text' },
      { key: 'act_6_icon', label: 'Activity 6 Icon', type: 'icon' }, { key: 'act_6_name', label: 'Activity 6 Name', type: 'text' }, { key: 'act_6_desc', label: 'Activity 6 Desc', type: 'text' },
      { key: 'act_7_icon', label: 'Activity 7 Icon', type: 'icon' }, { key: 'act_7_name', label: 'Activity 7 Name', type: 'text' }, { key: 'act_7_desc', label: 'Activity 7 Desc', type: 'text' },
      { key: 'act_8_icon', label: 'Activity 8 Icon', type: 'icon' }, { key: 'act_8_name', label: 'Activity 8 Name', type: 'text' }, { key: 'act_8_desc', label: 'Activity 8 Desc', type: 'text' },
    ]
  },
  {
    section: 'dining', label: 'Dining Section', fields: [
      { key: 'dining_label', label: 'Section Label', type: 'text' },
      { key: 'dining_title', label: 'Section Title (HTML)', type: 'text' },
      { key: 'dining_subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'dining_1_name', label: 'Restaurant 1 Name', type: 'text' }, { key: 'dining_1_type', label: 'Restaurant 1 Type', type: 'text' },
      { key: 'dining_1_desc', label: 'Restaurant 1 Description', type: 'textarea' }, { key: 'dining_1_hours', label: 'Restaurant 1 Hours', type: 'text' },
      { key: 'dining_2_name', label: 'Restaurant 2 Name', type: 'text' }, { key: 'dining_2_type', label: 'Restaurant 2 Type', type: 'text' },
      { key: 'dining_2_desc', label: 'Restaurant 2 Description', type: 'textarea' }, { key: 'dining_2_hours', label: 'Restaurant 2 Hours', type: 'text' },
    ]
  },
  {
    section: 'contact', label: 'Contact Information', fields: [
      { key: 'contact_phone', label: 'Phone Number', type: 'text' },
      { key: 'contact_email', label: 'Email Address', type: 'text' },
      { key: 'contact_location', label: 'Location', type: 'text' },
      { key: 'contact_hours', label: 'Front Desk Hours', type: 'text' },
    ]
  },
  {
    section: 'branding', label: 'Branding & Footer', fields: [
      { key: 'nav_brand', label: 'Navigation Brand Name (HTML)', type: 'text' },
      { key: 'footer_brand', label: 'Footer Brand Name (HTML)', type: 'text' },
      { key: 'footer_copy', label: 'Footer Copyright Text', type: 'text' },
    ]
  },
];

async function renderSiteEditor() {
  if (_currentStaffRole !== 'master') {
    document.getElementById('siteEditorContainer').innerHTML =
      '<div class="card" style="text-align:center;padding:3rem;color:var(--text-muted);">🔒 Only the Master Admin can access the Site Editor.</div>';
    document.getElementById('siteEditorSaveBtn').style.display = 'none';
    return;
  }
  document.getElementById('siteEditorSaveBtn').style.display = 'inline-flex';

  // Fetch existing CMS values
  _seData = {};
  try {
    const items = await ABHC_DB.getSiteContent();
    items.forEach(i => { _seData[i.key] = i.value; });
  } catch (e) { /* first load — no data yet */ }

  // Fallback helper: use CMS value or the hardcoded default
  const v = (key, fallback) => _seData[key] || fallback;

  // Set the current theme on the admin document so the preview looks right
  if (_seData['site_theme']) {
    document.documentElement.setAttribute('data-theme', _seData['site_theme']);
  }

  // Build visual preview HTML
  const container = document.getElementById('siteEditorContainer');
  container.innerHTML = `

  <!-- ── THEME SELECTOR ── -->
  <div class="card" style="margin-bottom:1rem;">
    <div class="card-title">🎨 Theme &amp; Typography Settings</div>
    <div class="form-group" style="margin-bottom:0; max-width:400px;">
      <label>Select a Visual Theme</label>
      <select class="se-theme-select" data-se-key="site_theme" onchange="document.documentElement.setAttribute('data-theme', this.value); if(window.refreshThemeAnimations) refreshThemeAnimations();">
        <option value="ocean_sunset" ${v('site_theme', '') === 'ocean_sunset' ? 'selected' : ''}>🌊 Ocean Sunset (Default - Aqua & Orange)</option>
        <option value="boho_minimalist" ${v('site_theme', '') === 'boho_minimalist' ? 'selected' : ''}>🌿 Boho Minimalist (Earthy - Dusty Sage & Terracotta)</option>
        <option value="royal_gold" ${v('site_theme', '') === 'royal_gold' ? 'selected' : ''}>✨ Royal Gold (Luxury - Onyx & Shimmering Gold)</option>
        <option value="glass_ocean" ${v('site_theme', '') === 'glass_ocean' ? 'selected' : ''}>🧊 Glass Ocean (Fresh - Translucent Blues & Purple)</option>
        <option value="mediterranean_azure" ${v('site_theme', '') === 'mediterranean_azure' ? 'selected' : ''}>🧿 Mediterranean Azure (Crisp - White & Deep Blue)</option>
        <option value="tropical_canopy" ${v('site_theme', '') === 'tropical_canopy' ? 'selected' : ''}>🌴 Tropical Canopy (Lush - Jungle Green & Mango)</option>
        <option value="desert_oasis" ${v('site_theme', '') === 'desert_oasis' ? 'selected' : ''}>🌵 Desert Oasis (Warm - Cactus Green & Blush)</option>
        <option value="coastal_pearl" ${v('site_theme', '') === 'coastal_pearl' ? 'selected' : ''}>🦪 Coastal Pearl (Elegant - Nautical Navy & Seafoam)</option>
        <option value="volcanic_ash" ${v('site_theme', '') === 'volcanic_ash' ? 'selected' : ''}>🌋 Volcanic Ash (Dramatic - Slate & Crimson)</option>
        <option value="coral_flamingo" ${v('site_theme', '') === 'coral_flamingo' ? 'selected' : ''}>🦩 Coral Flamingo (Vibrant - Mint & Pastel Pink)</option>
      </select>
    </div>
  </div>

  <!-- ── ADVANCED FEATURES & RULES ── -->
  <div class="card" style="margin-bottom:1rem;">
    <div class="card-title">⚙️ Advanced Features & Rules</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:2rem;">
      <div>
        <label style="display:block; margin-bottom:0.5rem; font-weight:600;">Hero Features</label>
        <div style="display:flex; gap:1.5rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" onchange="_seData['weather_enabled'] = this.checked ? 'true' : 'false'" ${_seData['weather_enabled'] !== 'false' ? 'checked' : ''}> Live Weather
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" onchange="_seData['tide_enabled'] = this.checked ? 'true' : 'false'" ${_seData['tide_enabled'] === 'true' ? 'checked' : ''}> High Tide Info
          </label>
        </div>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">These will appear in the Hero section based on your resort's coordinates.</p>
      </div>
      <div>
        <label style="display:block; margin-bottom:0.5rem; font-weight:600;">House Rules (Auto-sync to KB)</label>
        <textarea class="se-editable" data-se-key="house_rules" oninput="_seData['house_rules'] = this.value" placeholder="Enter resort policies..." style="width:100%; height:100px; padding:0.8rem; border-radius:8px; border:1.5px solid var(--sand-mid); font-family:var(--font-sans); font-size:0.85rem;">${_seData['house_rules'] || ''}</textarea>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">Rules entered here are automatically sent in confirmation emails and updated in the Knowledge Base.</p>
      </div>
    </div>
  </div>

  <!-- ── HERO SECTION ── -->
  <div class="se-section">
    <div class="se-section-label">Hero Section</div>
    <div class="hero" style="position:relative; min-height:340px; border-radius:16px; overflow:hidden;">
      <div class="hero-bg"><div class="aurora"></div></div>
      <div class="hero-content" style="position:relative; z-index:2; padding:3rem 2rem;">
        <span class="hero-badge se-editable" contenteditable="true" data-se-key="hero_badge">${v('hero_badge', '✦ Beachfront Paradise · Philippines ✦')}</span>
        <h1 class="se-editable" contenteditable="true" data-se-key="hero_title" style="font-size:2.2rem;">${v('hero_title', "Avellano's<br><em>Beach Hut</em> Cottage")}</h1>
        <p class="hero-sub se-editable" contenteditable="true" data-se-key="hero_subtitle">${v('hero_subtitle', 'Where the ocean meets endless sunsets. A private beachfront retreat crafted for those who seek stillness, warmth, and the rhythm of the tides.')}</p>
      </div>
    </div>
  </div>

  <!-- ── PERKS ── -->
  <div class="se-section">
    <div class="se-section-label">Perks Bar Management</div>
    <div class="perks-bar" style="border-radius:16px; overflow:hidden; padding:2rem 1rem;">
      <div id="sePerksEditorGrid" class="perks-grid">
        <!-- Rendered via JS loop -->
      </div>
      <div style="text-align:center; margin-top:1.5rem;">
        <button class="btn btn-primary btn-sm" onclick="addPerkItem()">➕ Add Another Perk</button>
      </div>
    </div>
  </div>

  <!-- ── BOOKING HEADER ── -->
  <div class="se-section">
    <div class="se-section-label">Booking Section Header</div>
    <div style="text-align:center; padding:2rem; background:var(--sand); border-radius:16px;">
      <span class="section-label se-editable" contenteditable="true" data-se-key="booking_label">${v('booking_label', 'Live Availability Calendar')}</span>
      <h2 class="section-title se-editable" contenteditable="true" data-se-key="booking_title">${v('booking_title', 'Check <em>Availability</em> &amp; Book')}</h2>
      <p class="section-sub se-editable" contenteditable="true" data-se-key="booking_subtitle" style="margin:0 auto;text-align:center;">${v('booking_subtitle', 'Click two dates on the calendar. Striped days are already booked. Room availability is checked per your dates in real time.')}</p>
    </div>
  </div>

  <!-- ── ROOMS HEADER ── -->
  <div class="se-section">
    <div class="se-section-label">Rooms Section Header</div>
    <div style="text-align:center; padding:2rem; background:var(--bg); border-radius:16px; border:1px solid var(--sand-mid);">
      <span class="section-label se-editable" contenteditable="true" data-se-key="rooms_label">${v('rooms_label', 'Accommodation')}</span>
      <h2 class="section-title se-editable" contenteditable="true" data-se-key="rooms_title">${v('rooms_title', 'Your Home by the <em>Ocean</em>')}</h2>
      <p class="section-sub se-editable" contenteditable="true" data-se-key="rooms_subtitle" style="margin:0 auto;text-align:center;">${v('rooms_subtitle', 'Each space dissolves the boundary between indoors and the sea.')}</p>
    </div>
  </div>

  <!-- ── ACTIVITIES ── -->
  <div class="se-section">
    <div class="se-section-label">Activities Section & Management</div>
    <div class="activities-section" style="border-radius:16px; overflow:hidden; padding:2.5rem 1.5rem;">
      <div style="text-align:center; margin-bottom:1.5rem;">
        <span class="section-label se-editable" contenteditable="true" data-se-key="activities_label">${v('activities_label', 'Things To Do')}</span>
        <h2 class="section-title se-editable" contenteditable="true" data-se-key="activities_title" style="color:white;">${v('activities_title', 'Adventures for <em style=\"color:var(--aqua-light);\">Every Soul</em>')}</h2>
        <p class="section-sub se-editable" contenteditable="true" data-se-key="activities_subtitle" style="margin:0 auto;text-align:center;color:rgba(255,255,255,0.75);">${v('activities_subtitle', 'From thrilling water sports to serene sunset yoga.')}</p>
      </div>
      
      <div id="seActivitiesEditorGrid" class="activities-grid">
        <!-- Rendered via JS loop -->
      </div>

      <div style="text-align:center; margin-top:2rem;">
        <button class="btn btn-sunset" onclick="addActivityItem()">➕ Add Another Activity</button>
      </div>
    </div>
  </div>

  <!-- ── DINING ── -->
  <div class="se-section">
    <div class="se-section-label">Dining Section & Management</div>
    <div class="dining-section" style="border-radius:16px; overflow:hidden; padding:2.5rem 1.5rem;">
      <div style="text-align:center; margin-bottom:1.5rem;">
        <span class="section-label se-editable" contenteditable="true" data-se-key="dining_label">${v('dining_label', 'Food &amp; Drinks')}</span>
        <h2 class="section-title se-editable" contenteditable="true" data-se-key="dining_title">${v('dining_title', 'Flavors of the <em>Sea</em>')}</h2>
        <p class="section-sub se-editable" contenteditable="true" data-se-key="dining_subtitle" style="margin:0 auto;text-align:center;">${v('dining_subtitle', 'Fresh catch, local spices, ocean breezes.')}</p>
      </div>
      
      <div id="seDiningEditorGrid" class="dining-grid">
        <!-- Rendered via JS loop -->
      </div>

      <div style="text-align:center; margin-top:2rem;">
        <button class="btn btn-primary" onclick="addDiningItem()">➕ Add Another Dining Venue</button>
      </div>
    </div>
  </div>

  <!-- ── CONTACT ── -->
  <div class="se-section">
    <div class="se-section-label">Contact Information & Management</div>
    <div class="contact-section" style="border-radius:16px; overflow:hidden; padding:2.5rem 1.5rem;">
      <div style="text-align:center; margin-bottom:1.5rem;">
        <span class="section-label">Get In Touch</span>
        <h2 class="section-title" style="color:white;">We're Here to <em style="color:var(--sunset-light);">Help</em></h2>
      </div>
      
      <div id="seContactEditorGrid" class="contact-grid">
        <!-- Rendered via JS loop -->
      </div>

      <div style="text-align:center; margin-top:2rem;">
        <button class="btn btn-primary" onclick="addContactItem()" style="background:white; color:var(--aqua-deep);">➕ Add Contact Method / Social Media</button>
      </div>
    </div>
  </div>

  <!-- ── REVIEWS ── -->
  <div class="se-section">
    <div class="se-section-label">Guest Reviews Management</div>
    <div class="reviews-section" style="border-radius:16px; overflow:hidden; padding:2.5rem 1.5rem; background:white;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <div>
           <span class="section-label se-editable" contenteditable="true" data-se-key="reviews_label">${v('reviews_label', 'Guest Stories')}</span>
           <h2 class="section-title se-editable" contenteditable="true" data-se-key="reviews_title">${v('reviews_title', 'Words from Our <em>Travelers</em>')}</h2>
        </div>
        <button class="btn btn-primary btn-sm" onclick="syncGoogleReviews()" id="btnSyncReviews">🔄 Sync from Google</button>
      </div>
      
      <div id="seReviewsEditorGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1.5rem;">
        <!-- Rendered via JS loop -->
      </div>

      <div style="text-align:center; margin-top:2rem;">
        <button class="btn btn-ghost btn-sm" onclick="addReviewItem()">➕ Add Review Manually</button>
      </div>
    </div>
  </div>

  <!-- ── ADVANCED SETTINGS ── -->
  <div class="se-section">
    <div class="se-section-label">Advanced Features & Rules</div>
    <div class="card" style="margin-bottom:1rem; background:var(--sand-light);">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem; margin-bottom:1.5rem;">
        <div>
          <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.5rem;">Live Weather Display</div>
          <label class="switch-wrap" style="display:flex; align-items:center; gap:0.6rem; font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" data-se-key="weather_enabled" ${v('weather_enabled', 'true') === 'true' ? 'checked' : ''} onchange="this.value = this.checked ? 'true' : 'false'; _seData['weather_enabled'] = this.value;" style="width:20px; height:20px;">
            Show current weather in Hero section
          </label>
        </div>
        <div>
          <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.5rem;">Tide Information (Optional)</div>
          <label class="switch-wrap" style="display:flex; align-items:center; gap:0.6rem; font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" data-se-key="tide_enabled" ${v('tide_enabled', 'false') === 'true' ? 'checked' : ''} onchange="this.value = this.checked ? 'true' : 'false'; _seData['tide_enabled'] = this.value;" style="width:20px; height:20px;">
            Show high tide info (Beach Resorts only)
          </label>
        </div>
      </div>
      <div class="form-group">
        <label>Guest House Rules (Editable)</label>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">These rules appear in booking confirmations and are saved to your Knowledge Base.</p>
        <textarea class="se-editable-box" data-se-key="house_rules" style="width:100%; min-height:150px; padding:1rem; border:1px solid var(--sand-mid); border-radius:10px; font-family:var(--font-sans); font-size:0.85rem; background:white; line-height:1.5;" oninput="_seData['house_rules'] = this.value">${v('house_rules', '1. Check-in: 2:00 PM | Check-out: 12:00 PM\n2. Quiet hours after 10:00 PM\n3. No smoking inside the cottages\n4. Please keep the beach clean')}</textarea>
      </div>
    </div>
  </div>

  <!-- ── BRANDING / FOOTER ── -->
  <div class="se-section">
    <div class="se-section-label">Branding &amp; Footer</div>
    <div class="footer-preview" style="background: linear-gradient(135deg, var(--aqua-deep), var(--aqua-dark)); border-radius:16px; padding:2rem; text-align:center; color:white;">
      <div class="footer-logo se-editable" contenteditable="true" data-se-key="nav_brand" style="font-size:1.3rem; margin-bottom:0.8rem; color:white;">${v('nav_brand', "Avellano's <span>Beach Hut</span>")}</div>
      <p class="footer-copy se-editable" contenteditable="true" data-se-key="footer_copy" style="opacity:0.7;">${v('footer_copy', '© 2025 Avellano\'s Beach Hut Cottage · All rights reserved · Designed with ☀️ for beach lovers.')}</p>
    </div>
  </div>
  `;
  // Build dining grid editor
  renderDiningEditor();

  // Build activities grid editor
  renderActivitiesEditor();

  // Build perks grid editor
  renderPerksEditor();

  // Build contact grid editor
  renderContactEditor();

  // Build reviews grid editor
  renderReviewsEditor();

  // Inject theme animations into the newly rendered preview sections
  if (window.refreshThemeAnimations) setTimeout(refreshThemeAnimations, 100);
}

// ── CONTACT EDITOR HELPERS ──────────────────────────────────────────────────
let _contactList = [];
function renderContactEditor() {
  const grid = document.getElementById('seContactEditorGrid');
  if (!grid) return;

  if (_contactList.length === 0) {
    try {
      const saved = _seData['contact_list'];
      _contactList = typeof saved === 'string' ? JSON.parse(saved) : (saved || [
        { icon: '📞', label: 'Phone', value: '+63 912 345 6789', link: 'tel:+639123456789' },
        { icon: '📧', label: 'Email', value: 'hello@avellanos.ph', link: 'mailto:hello@avellanos.ph' },
        { icon: '📍', label: 'Location', value: "Avellano's Cove, Philippines", link: 'https://maps.google.com' },
        { icon: '⏰', label: 'Front Desk', value: '24 / 7', link: '' }
      ]);
    } catch (e) { _contactList = []; }
  }

  grid.innerHTML = _contactList.map((c, idx) => {
    const icon = getAutoIcon(c.label, c.link, c.icon);
    return `
      <div class="contact-item" style="position:relative; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.1); padding:1rem; border-radius:12px;">
        <button class="btn btn-danger btn-xs" style="position:absolute; top:0.5rem; right:0.5rem; z-index:10; border-radius:50%; width:24px; height:24px; padding:0; display:flex; align-items:center; justify-content:center; line-height:1;" onclick="removeContactItem(${idx})">×</button>
        <div id="seContactIcon_${idx}" class="se-editable-box" style="font-size:1.5rem; margin-bottom:0.3rem; color:white; border:none; outline:none; text-align:center; pointer-events:none; display:flex; align-items:center; justify-content:center;">${icon}</div>
        <div class="se-editable-box" contenteditable="true" oninput="_contactList[${idx}].label = this.innerText; updateContactIconPreview(${idx});" placeholder="Label" style="font-size:0.75rem; text-transform:uppercase; color:rgba(255,255,255,0.6); font-weight:600; text-align:center; border:none;">${c.label || ''}</div>
        <div class="se-editable-box" contenteditable="true" oninput="_contactList[${idx}].value = this.innerText" placeholder="Display Value" style="font-size:0.9rem; color:white; font-weight:500; text-align:center; border:none;">${c.value || ''}</div>
        <div class="se-editable-box" contenteditable="true" oninput="_contactList[${idx}].link = this.innerText; updateContactIconPreview(${idx});" placeholder="Link / URL (Optional)" style="font-size:0.65rem; color:rgba(255,255,255,0.5); text-align:center; border:none; margin-top:0.3rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:0.5rem;">${c.link || ''}</div>
      </div>
    `;
  }).join('');
}

function updateContactIconPreview(idx) {
  const iconEl = document.getElementById(`seContactIcon_${idx}`);
  if (iconEl) {
    const item = _contactList[idx];
    iconEl.innerHTML = getAutoIcon(item.label, item.link, item.icon);
  }
}

function getAutoIcon(label = '', link = '', fallback = '📞') {
  const l = ((label || '') + (link || '')).toLowerCase().replace(/\s+/g, '');

  const svgStyle = 'width: 32px; height: 32px;';
  if (l.includes('facebook')) return `<svg style="${svgStyle}" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
  if (l.includes('instagram')) return `<svg style="${svgStyle}" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M7 2C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2H7ZM12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7ZM12 9C13.6569 9 15 10.3431 15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9ZM17.25 5.75C17.25 6.24706 16.8471 6.65 16.35 6.65C15.8529 6.65 15.45 6.24706 15.45 5.75C15.45 5.25294 15.8529 4.85 16.35 4.85C16.8471 4.85 17.25 5.25294 17.25 5.75Z" clip-rule="evenodd"/></svg>`;
  if (l.includes('whatsapp')) return `<svg style="${svgStyle}" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

  if (l.includes('viber')) return '🟣';
  if (l.includes('tiktok')) return '🎵';
  if (l.includes('youtube')) return '📺';
  if (l.includes('twitter') || l.includes(' x ')) return '🐦';
  if (l.includes('phone') || l.includes('tel:')) return '📞';
  if (l.includes('email') || l.includes('mailto:')) return '📧';
  if (l.includes('location') || l.includes('maps')) return '📍';
  if (l.includes('clock') || l.includes('hours')) return '⏰';
  return fallback;
}

function addContactItem() {
  _contactList.push({ icon: '📱', label: 'Social', value: '@yourusername', link: 'https://' });
  renderContactEditor();
}

function removeContactItem(idx) {
  showConfirmModal(
    "Remove Contact Method?",
    `Are you sure you want to remove "${_contactList[idx].label || 'this item'}"? This will be reflected on the guest page after saving.`,
    "📱"
  ).then(confirmed => {
    if (confirmed) {
      _contactList.splice(idx, 1);
      renderContactEditor();
    }
  });
}

// ── PERKS EDITOR HELPERS ───────────────────────────────────────────────────
let _perksList = [];
function renderPerksEditor() {
  const grid = document.getElementById('sePerksEditorGrid');
  if (!grid) return;

  if (_perksList.length === 0) {
    try {
      const saved = _seData['perks_list'];
      _perksList = typeof saved === 'string' ? JSON.parse(saved) : (saved || [
        { icon: '💰', title: 'Best Rate Guarantee', desc: 'Book direct, pay less than any OTA' },
        { icon: '🎁', title: 'Free Welcome Package', desc: 'Fruits & local wine on arrival' },
        { icon: '🏊', title: 'Early Check-In', desc: 'Complimentary when available' },
        { icon: '🔄', title: 'Free Cancellation', desc: 'Up to 48 hours before arrival' },
        { icon: '🛎', title: 'Priority Service', desc: 'Dedicated concierge attention' }
      ]);
    } catch (e) { _perksList = []; }
  }

  grid.innerHTML = _perksList.map((p, idx) => `
    <div class="perk-item" style="position:relative; background:white; border:1px solid var(--sand-mid);">
      <button class="btn btn-danger btn-xs" style="position:absolute; top:-10px; right:-10px; z-index:10; border-radius:50%; width:20px; height:20px; padding:0; display:flex; align-items:center; justify-content:center; line-height:1;" onclick="removePerkItem(${idx})">×</button>
      <div class="se-editable-box" contenteditable="true" oninput="_perksList[${idx}].icon = this.innerText" style="font-size:1.2rem; text-align:center; border:none; outline:none; margin:0;">${p.icon || '✦'}</div>
      <div class="se-editable-box" contenteditable="true" oninput="_perksList[${idx}].title = this.innerText" placeholder="Perk Title" style="font-weight:600; font-size:0.85rem; text-align:center; border:none; margin:0; padding:2px;">${p.title || ''}</div>
      <div class="se-editable-box" contenteditable="true" oninput="_perksList[${idx}].desc = this.innerText" placeholder="Perk Description" style="font-size:0.75rem; color:var(--text-muted); text-align:center; border:none; margin:0; padding:2px; min-height:30px;">${p.desc || ''}</div>
    </div>
  `).join('');
}

function addPerkItem() {
  _perksList.push({ icon: '✦', title: 'New Perk', desc: 'Describe the benefit here...' });
  renderPerksEditor();
}

function removePerkItem(idx) {
  showConfirmModal(
    "Remove Perk?",
    `Are you sure you want to remove "${_perksList[idx].title || 'this perk'}"? This will be reflected on the guest page after saving.`,
    "🎁"
  ).then(confirmed => {
    if (confirmed) {
      _perksList.splice(idx, 1);
      renderPerksEditor();
    }
  });
}

// ── ACTIVITIES EDITOR HELPERS ──────────────────────────────────────────────
let _activitiesList = [];
function renderActivitiesEditor() {
  const grid = document.getElementById('seActivitiesEditorGrid');
  if (!grid) return;

  if (_activitiesList.length === 0) {
    try {
      const saved = _seData['activities_list'];
      _activitiesList = typeof saved === 'string' ? JSON.parse(saved) : (saved || [
        { icon: '🤿', name: 'Scuba Diving', desc: 'Explore vibrant coral reefs...' },
        { icon: '🏄', name: 'Surfing', desc: 'Lessons and board rentals...' },
        { icon: '🚣', name: 'Island Hopping', desc: 'Guided tours to hidden coves...' },
        { icon: '🧘', name: 'Sunrise Yoga', desc: 'Daily beach sessions at dawn...' }
      ]);
    } catch (e) { _activitiesList = []; }
  }

  grid.innerHTML = _activitiesList.map((a, idx) => `
    <div class="activity-card" style="position:relative; background:rgba(255,255,255,0.05);">
      <button class="btn btn-danger btn-xs" style="position:absolute; top:0.5rem; right:0.5rem; z-index:10; border-radius:50%; width:24px; height:24px; padding:0; display:flex; align-items:center; justify-content:center; line-height:1;" onclick="removeActivityItem(${idx})">×</button>
      <div class="se-editable-box" contenteditable="true" oninput="_activitiesList[${idx}].icon = this.innerText" style="font-size:1.5rem; margin-bottom:0.5rem; text-align:center; border:none; outline:none; cursor:default;">${a.icon || '✨'}</div>
      <div class="se-editable-box" contenteditable="true" oninput="_activitiesList[${idx}].name = this.innerText" placeholder="Activity Name" style="font-weight:600; text-align:center; border:none; color:white;">${a.name || ''}</div>
      <div class="se-editable-box" contenteditable="true" oninput="_activitiesList[${idx}].desc = this.innerText" placeholder="Description" style="font-size:0.8rem; color:rgba(255,255,255,0.7); text-align:center; border:none; min-height:40px;">${a.desc || ''}</div>
    </div>
  `).join('');
}

function addActivityItem() {
  _activitiesList.push({ icon: '✨', name: 'New Activity', desc: 'Describe this activity...' });
  renderActivitiesEditor();
}

function removeActivityItem(idx) {
  showConfirmModal(
    "Remove Activity?",
    `Are you sure you want to remove "${_activitiesList[idx].name || 'this activity'}"? This will be reflected on the guest page after saving.`,
    "🌋"
  ).then(confirmed => {
    if (confirmed) {
      _activitiesList.splice(idx, 1);
      renderActivitiesEditor();
    }
  });
}

// ── DINING EDITOR HELPERS ──────────────────────────────────────────────────
let _diningList = [];
function renderDiningEditor() {
  const grid = document.getElementById('seDiningEditorGrid');
  if (!grid) return;

  if (_diningList.length === 0) {
    try {
      const saved = _seData['dining_list'];
      _diningList = typeof saved === 'string' ? JSON.parse(saved) : (saved || [
        { name: 'Kainan sa Dagat', type: 'Beachfront Restaurant', desc: 'Fresh seafood grilled to order...', hours: 'Open: 7:00 AM – 10:00 PM', image: '' },
        { name: 'Halo-Halo Sunset Bar', type: 'Beachside Bar & Grill', desc: 'Handcrafted cocktails...', hours: 'Open: 11:00 AM – Midnight', image: '' }
      ]);
    } catch (e) { _diningList = []; }
  }

  grid.innerHTML = _diningList.map((d, idx) => `
    <div class="dining-card" style="position:relative;">
      <button class="btn btn-danger btn-xs" style="position:absolute; top:0.5rem; right:0.5rem; z-index:10; border-radius:50%; width:24px; height:24px; padding:0;" onclick="removeDiningItem(${idx})">×</button>
      <div class="dining-img" style="background-image: url('${d.image || ''}'); background-size: cover; background-position: center; cursor: pointer;" onclick="document.getElementById('seDiningImg_${idx}').click()">
        ${!d.image ? '<span class="dining-emoji">📸 Tap to Upload</span>' : ''}
        <input type="file" id="seDiningImg_${idx}" style="display:none;" accept="image/*" onchange="handleDiningImageUpload(this, ${idx})">
      </div>
      <div class="dining-body" style="padding:1rem;">
        <div class="se-editable-box" contenteditable="true" oninput="_diningList[${idx}].name = this.innerText" placeholder="Name">${d.name || ''}</div>
        <div class="se-editable-box" contenteditable="true" oninput="_diningList[${idx}].type = this.innerText" placeholder="Type" style="color:var(--sunset); font-weight:600; font-size:0.75rem; text-transform:uppercase;">${d.type || ''}</div>
        <div class="se-editable-box" contenteditable="true" oninput="_diningList[${idx}].desc = this.innerText" placeholder="Description" style="font-size:0.85rem; color:var(--text-muted); min-height:60px;">${d.desc || ''}</div>
        <div class="se-editable-box" contenteditable="true" oninput="_diningList[${idx}].hours = this.innerText" placeholder="Hours" style="font-size:0.75rem; color:var(--text-muted);">${d.hours || ''}</div>
      </div>
    </div>
  `).join('');
}

function addDiningItem() {
  _diningList.push({ name: 'New Venue', type: 'Restaurant', desc: 'Describe your food and vibe here...', hours: 'Open: 8:00 AM – 10:00 PM', image: '' });
  renderDiningEditor();
}

function removeDiningItem(idx) {
  showConfirmModal(
    "Remove Dining Venue?",
    `Are you sure you want to remove "${_diningList[idx].name || 'this venue'}"? This will be reflected on the guest page after saving.`,
    "🍽️"
  ).then(confirmed => {
    if (confirmed) {
      _diningList.splice(idx, 1);
      renderDiningEditor();
    }
  });
}

function handleDiningImageUpload(input, idx) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _diningList[idx].image = e.target.result;
    renderDiningEditor();
  };
  reader.readAsDataURL(file);
}

// ── REVIEWS EDITOR HELPERS ────────────────────────────────────────────────
let _reviewsList = [];
function renderReviewsEditor() {
  const grid = document.getElementById('seReviewsEditorGrid');
  if (!grid) return;

  if (_reviewsList.length === 0) {
    try {
      const saved = _seData['reviews_list'];
      _reviewsList = typeof saved === 'string' ? JSON.parse(saved) : (saved || [
        { stars: 5, text: 'Absolute magic. Woke up to ocean sounds every morning — felt like a dream we never wanted to leave.', guest: 'Maria S. · Manila' },
        { stars: 5, text: 'The staff remembered my coffee order on day two. That kind of warmth is rare anywhere in the world.', guest: 'James T. · Singapore' },
        { stars: 5, text: 'Our anniversary here was the most romantic trip we\'ve ever taken. The sunset villa is breathtaking.', guest: 'Ana & Carlo M. · Cebu' }
      ]);
    } catch (e) { _reviewsList = []; }
  }

  grid.innerHTML = _reviewsList.map((r, idx) => `
    <div class="review-card" style="position:relative; background:#f8fafc; border:1px solid #e2e8f0; padding:1.5rem; border-radius:12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <button class="btn btn-danger btn-xs" style="position:absolute; top:0.5rem; right:0.5rem; z-index:10; border-radius:50%; width:22px; height:22px; padding:0; display:flex; align-items:center; justify-content:center; line-height:1;" onclick="removeReviewItem(${idx})">×</button>
      <div class="se-editable-box" contenteditable="true" oninput="_reviewsList[${idx}].stars = Math.min(5, Math.max(1, parseInt(this.innerText.length) || 5))" style="color:#F59E0B; font-size:1.2rem; margin-bottom:0.5rem; border:none; outline:none; letter-spacing:2px;">${'★'.repeat(r.stars)}</div>
      <div class="se-editable-box" contenteditable="true" oninput="_reviewsList[${idx}].text = this.innerText" style="font-size:0.9rem; font-style:italic; line-height:1.5; margin-bottom:1rem; min-height:60px; color:var(--text-deep); border:none; outline:none;">${r.text || ''}</div>
      <div class="se-editable-box" contenteditable="true" oninput="_reviewsList[${idx}].guest = this.innerText" style="font-size:0.8rem; font-weight:600; color:var(--text-muted); border:none; outline:none;">${r.guest || ''}</div>
    </div>
  `).join('');
}

function addReviewItem() {
  _reviewsList.push({ stars: 5, text: 'Enter review text here...', guest: 'Guest Name' });
  renderReviewsEditor();
}

function removeReviewItem(idx) {
  showConfirmModal(
    "Remove Review?",
    "Are you sure you want to remove this guest review?",
    "💬"
  ).then(confirmed => {
    if (confirmed) {
      _reviewsList.splice(idx, 1);
      renderReviewsEditor();
    }
  });
}

async function syncGoogleReviews() {
  const btn = document.getElementById('btnSyncReviews');
  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '⏳ Syncing...';

  try {
    // 1. Get the URL from the business data
    let gmapsUrl = null;
    let businessName = "the business";
    try {
      const items = await ABHC_DB.getSiteContent();
      const urlObj = items.find(i => i.key === 'business_gmaps_url');
      const nameObj = items.find(i => i.key === 'business_name');
      if (urlObj && urlObj.value) gmapsUrl = urlObj.value;
      if (nameObj && nameObj.value) businessName = nameObj.value;
    } catch (e) { }

    if (!gmapsUrl) {
      toast('Please set a Google Maps Link in Business Information first.', 'warning');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      return;
    }

    // Note: Special case hardcoded data has been removed to rely on live scraping or the sample fallback below.

    // 2. Real Extraction Logic (General Case)
    let decCid = null;

    // Try extraction from hex pattern (0x...:0x...)
    const hexMatch = gmapsUrl.match(/0x[a-f0-9]+:(0x[a-f0-9]+)/i);
    if (hexMatch) {
      try {
        decCid = BigInt(hexMatch[1]).toString();
      } catch (e) { console.error("BigInt conversion failed", e); }
    }

    // Try extraction from query param (?cid=...)
    if (!decCid) {
      try {
        const urlObj = new URL(gmapsUrl);
        decCid = urlObj.searchParams.get('cid');
      } catch (e) { }
    }

    if (!decCid) {
      throw new Error('Could not find a valid Google Place ID (CID) in the link. Please use a full Google Maps share link.');
    }

    // Fetch using listentities endpoint (common Google Maps review fetcher)
    // Multi-proxy & Multi-endpoint Strategy
    const endpoints = [
      `https://www.google.com/maps/preview/review/listentitiesreviews?authuser=0&hl=en&gl=ph&pb=!1m2!1y${decCid}!2y${decCid}!2m1!2i10!3e1!4m5!1b1!2b1!3b1!5b1!7b1`,
      `https://www.google.com/maps/rpc/listreviews?authuser=0&hl=en&gl=ph&pb=!1m1!1s0x0:0x${BigInt(decCid).toString(16)}!2m1!2i10!3e1!4m5!1b1!2b1!3b1!5b1!7b1`
    ];

    const proxies = [
      url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&_=${Date.now()}`,
      url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      url => `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    let success = false;
    let contents = null;

    for (const endpoint of endpoints) {
      if (success) break;
      for (const proxyFn of proxies) {
        try {
          const proxyUrl = proxyFn(endpoint);
          console.log(`Trying proxy/endpoint combo...`);
          const response = await fetch(proxyUrl);
          if (!response.ok) continue;

          let text = await response.text();

          // Handle allorigins wrapping
          if (text.trim().startsWith('{')) {
            try {
              const json = JSON.parse(text);
              if (json.contents) text = json.contents;
            } catch (e) { }
          }

          if (text.includes('<!DOCTYPE') || text.trim().startsWith('<')) {
            console.warn("Proxy returned HTML, skipping...");
            continue;
          }

          if (text.trim().startsWith(")]}'") || text.trim().startsWith('[')) {
            contents = text;
            success = true;
            break;
          }
        } catch (e) {
          console.warn("Combo failed:", e);
        }
      }
    }

    if (!success || !contents) {
      console.log("API endpoints blocked. Attempting HTML page scraping...");
      try {
        // Try to fetch the main Google Maps page directly via proxy
        const htmlProxyUrl = proxies[2](gmapsUrl); // Use corsproxy.io for HTML as it's often cleaner
        const htmlResponse = await fetch(htmlProxyUrl);
        if (htmlResponse.ok) {
          let htmlText = await htmlResponse.text();

          // Pattern: Find high-quality reviews in the APP_INITIALIZATION_STATE
          // We look for the "en" language marker followed by the review text
          const scraped = [];
          const textRegex = /\[\["en"\],\[\["([^"\\n]{50,})"/g; // Look for long texts (>50 chars)
          let m;
          while ((m = textRegex.exec(htmlText)) !== null && scraped.length < 10) {
            const text = m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
            if (!scraped.some(r => r.text === text)) {
              // For HTML scraping, we default to 5 stars as these are usually the featured top reviews
              scraped.push({ guest: "Google Reviewer", stars: 5, text });
            }
          }

          // Fallback regex if the first one misses
          if (scraped.length === 0) {
            const regex2 = /\[null,null,([45])\],null,"([^"\\n]{50,})"/g;
            while ((m = regex2.exec(htmlText)) !== null && scraped.length < 10) {
              const text = m[2].replace(/\\n/g, ' ').replace(/\\"/g, '"');
              scraped.push({ guest: "Google Reviewer", stars: parseInt(m[1]), text });
            }
          }

          if (scraped.length > 0) {
            _reviewsList = scraped.slice(0, 5); // Take top 5
            renderReviewsEditor();
            toast(`Successfully synced ${scraped.length} real reviews from the Maps page! ✅`, 'success');
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            return;
          }
        }
      } catch (htmlErr) {
        console.warn("HTML Scraper also failed:", htmlErr);
      }

      // FINAL ATTEMPT: Realistic Fake Fallback (User requested)
      console.warn("All scraping methods failed. Using realistic sample data as final fallback.");
      _reviewsList = [
        { guest: "Happy Guest", stars: 5, text: "The stay was absolutely wonderful! The staff were very attentive and the facilities were top-notch. Highly recommend for a relaxing getaway." },
        { guest: "Family Traveler", stars: 4, text: "Great experience for the kids. The pool area is clean and safe. We will definitely be coming back next season!" },
        { guest: "Recent Visitor", stars: 5, text: "Exceeded all expectations. The rooms were spacious and the view from the balcony was breathtaking. 10/10!" },
        { guest: "Nature Lover", stars: 4, text: "Beautiful grounds and very peaceful atmosphere. Perfect place to disconnect and recharge. Very friendly service." },
        { guest: "Summer Vacationer", stars: 5, text: "The best resort in the area! Every detail was taken care of, from check-in to check-out. Can't wait to visit again." }
      ];
      renderReviewsEditor();
      toast(`Google sync unavailable. Realistic sample reviews loaded instead.`, 'info');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      return;
    }

    // Google returns WIZ blobs with )]}' prefix
    if (contents.trim().startsWith(")]}'")) {
      contents = contents.trim().substring(4);
    }
    if (contents.trim().startsWith('<')) {
      throw new Error('Google returned an error page instead of review data. This usually means the proxy IP is temporarily blocked. Please try again in 1-2 minutes.');
    }

    const data = JSON.parse(contents);

    // Structure: data[2] is an array of reviews
    if (data && data[2] && Array.isArray(data[2])) {
      const newList = data[2].map(r => {
        if (!r[0]) return null;
        return {
          guest: r[0][1] || "Google User",
          stars: r[0][2] || 5,
          text: r[0][3] || ""
        };
      }).filter(r => r && r.stars >= 4 && r.text.length > 10).slice(0, 5);

      if (newList.length > 0) {
        _reviewsList = newList;
        renderReviewsEditor();
        toast(`Synced ${newList.length} authentic 4-5 star reviews! ✅`, 'success');
      } else {
        throw new Error('No qualifying 4-5 star reviews found.');
      }
    } else {
      throw new Error('Failed to parse reviews from Google.');
    }

  } catch (e) {
    console.error('Sync Error:', e);
    toast(e.message || 'Failed to sync. Ensure the link is a valid Google Maps location.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function saveSiteEditorContent() {
  if (_currentStaffRole !== 'master') {
    toast('Access Denied: Only Master Admin can edit site content.', 'error');
    return;
  }

  const editables = document.querySelectorAll('.se-editable[data-se-key]');
  const items = [];
  const sectionMap = {
    hero_: 'hero', perk_: 'perks', booking_: 'booking', rooms_: 'rooms',
    act_: 'activities', activities_: 'activities', dining_: 'dining',
    contact_: 'contact', nav_: 'branding', footer_: 'branding',
  };

  editables.forEach(el => {
    const key = el.getAttribute('data-se-key');
    const value = el.innerHTML.trim();
    let section = 'other';
    for (const [prefix, sec] of Object.entries(sectionMap)) {
      if (key.startsWith(prefix)) { section = sec; break; }
    }
    items.push({ key, value, section, label: key });
  });

  // Manually add checkboxes and specific inputs not using .se-editable HTML
  const weatherCb = document.querySelector('input[onchange*="weather_enabled"]');
  if (weatherCb) items.push({ key: 'weather_enabled', value: weatherCb.checked ? 'true' : 'false', section: 'other', label: 'Weather Enabled' });
  
  const tideCb = document.querySelector('input[onchange*="tide_enabled"]');
  if (tideCb) items.push({ key: 'tide_enabled', value: tideCb.checked ? 'true' : 'false', section: 'other', label: 'Tide Enabled' });

  // Save the visual theme selection
  const themeSelect = document.querySelector('.se-theme-select');
  if (themeSelect) {
    items.push({
      key: 'site_theme',
      value: themeSelect.value,
      section: 'branding',
      label: 'Site Theme'
    });
  }

  // Save the dynamic activities list
  items.push({
    key: 'activities_list',
    value: JSON.stringify(_activitiesList),
    section: 'activities',
    label: 'Activities List (JSON)'
  });

  // Save the dynamic perks list
  items.push({
    key: 'perks_list',
    value: JSON.stringify(_perksList),
    section: 'perks',
    label: 'Perks List (JSON)'
  });

  // Save the dynamic contact list
  items.push({
    key: 'contact_list',
    value: JSON.stringify(_contactList),
    section: 'contact',
    label: 'Contact List (JSON)'
  });

  // Save the dynamic dining list
  items.push({
    key: 'dining_list',
    value: JSON.stringify(_diningList),
    section: 'dining',
    label: 'Dining List (JSON)'
  });

  // Save the dynamic reviews list
  items.push({
    key: 'reviews_list',
    value: JSON.stringify(_reviewsList),
    section: 'reviews',
    label: 'Reviews List (JSON)'
  });

  const btn = document.getElementById('siteEditorSaveBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';
  }

  try {
    await ABHC_DB.saveSiteContent(items);
    
    // ── SYNC HOUSE RULES TO KB ──
    const rules = items.find(i => i.key === 'house_rules')?.value;
    if (rules) {
      await ABHC_DB.updateKB({
        category: 'Policies',
        title: 'Guest House Rules',
        content: rules
      });
    }

    toast('Site content saved! Guest page updated. ✅', 'success');
    await logSystemAction(`updated guest site content (${items.length} fields)`);
  } catch (err) {
    toast('Error saving: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save All Changes';
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
async function loadAdminTheme() {
  try {
    const items = await ABHC_DB.getSiteContent();
    const themeObj = items.find(i => i.key === 'site_theme');
    if (themeObj && themeObj.value) {
      document.documentElement.setAttribute('data-theme', themeObj.value);
    }
    const bizNameObj = items.find(i => i.key === 'business_name');
    if (bizNameObj && bizNameObj.value) {
      document.title = bizNameObj.value + ' \u2013 Admin Panel';
      const words = bizNameObj.value.split(' ');
      const logoEl = document.getElementById('sidebarLogoMain');
      if (logoEl) {
        if (words.length > 1) {
          const first = words.shift();
          logoEl.innerHTML = `${first} <span>${words.join(' ')}</span>`;
        } else {
          logoEl.innerHTML = bizNameObj.value;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load admin initial content:', e);
  }
}

initStaffRole().then(() => {
  loadAdminTheme();
  renderDashboard();
  renderBookings();
});

// ── STAFF LIST RENDERING ──────────────────────────────────────────────────────
async function renderStaffList() {
  const { data, error } = await window.supa.from('staff_profiles').select('*');
  if (error) { toast('Error loading staff: ' + error.message, 'error'); return; }
  document.getElementById('empTbody').innerHTML = data.map(s => `
    <tr>
      <td style="font-family:monospace; font-weight:600; color:var(--sunset);">${s.emp_id || '---'}</td>
      <td>${s.first_name}</td>
      <td>${s.last_name}</td>
      <td><span class="badge ${s.role === 'master' ? 'badge-confirmed' : 'badge-pending'}">${s.role.toUpperCase()}</span></td>
      <td style="display:flex; gap:0.5rem;">
        <button class="btn btn-ghost btn-xs" onclick="openStaffEditModal('${s.id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-xs" onclick="deleteStaff('${s.id}')">🗑 Remove</button>
      </td>
    </tr>
  `).join('');
}

window.openStaffEditModal = async function (id) {
  try {
    const { data, error } = await window.supa.from('staff_profiles').select('*').eq('id', id).single();
    if (error) throw error;

    document.getElementById('editStaffId').value = data.id;
    document.getElementById('editStaffFName').value = data.first_name;
    document.getElementById('editStaffLName').value = data.last_name;
    document.getElementById('editStaffPhone').value = data.phone || '';
    document.getElementById('editStaffEmpId').value = data.emp_id || '---';

    openModal('staffEditModal');
  } catch (err) {
    toast('Error loading staff details: ' + err.message, 'error');
  }
}

window.saveStaffEdit = async function () {
  const id = document.getElementById('editStaffId').value;
  const firstName = document.getElementById('editStaffFName').value.trim();
  const lastName = document.getElementById('editStaffLName').value.trim();
  const phone = document.getElementById('editStaffPhone').value.trim();

  if (!firstName || !lastName) {
    toast('First and Last name are required.', 'error');
    return;
  }

  const btn = document.querySelector('#staffEditModal .btn-primary');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const { error } = await window.supa.from('staff_profiles').update({
      first_name: firstName,
      last_name: lastName,
      phone: phone
    }).eq('id', id);

    if (error) throw error;

    toast('Staff account updated successfully!', 'success');
    closeModal('staffEditModal');
    renderStaffList();
    await logSystemAction(`updated staff profile for: ${firstName} ${lastName}`);
  } catch (err) {
    toast('Error updating staff: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

async function deleteStaff(id) {
  if (_currentStaffRole !== 'master') {
    toast('Only Master Admin can delete accounts.', 'error'); return;
  }
  if (!confirm('Are you sure you want to remove this staff account?')) return;
  try {
    // Requires admin privileges in edge function or direct supabase client, 
    // but assuming simple delete profile for now
    const { error } = await window.supa.from('staff_profiles').delete().eq('id', id);
    if (error) throw error;
    toast('Staff account removed.', 'success');
    renderStaffList();
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

// ── INIT ON LOAD ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await initStaffRole();
  navTo('dashboard');
});