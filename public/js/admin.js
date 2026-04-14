/* ============================================================
   admin.js — Admin panel logic
   Avellano's Beach Hut Cottage
   ============================================================ */

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtD(d)     { return d instanceof Date ? d.toISOString().split('T')[0] : d; }
function parseD(s)   { if (!s) return null; const [y,m,dy] = s.split('-').map(Number); return new Date(y,m-1,dy); }
function fmtMoney(n) { return '₱' + (+n||0).toLocaleString(); }
function fmt(s)      { if (!s) return '—'; const d = parseD(s); return d ? d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : s; }

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
  const sb  = document.getElementById('mainSidebar');
  const ov  = document.getElementById('sidebarOverlay');
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
  calendar:  'Availability Calendar', rooms: 'Manage Rooms',
  repairs:   'Repair Costs', guests: 'Flagged Guests', export: 'Export Data',
};

function navTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || page;
  if (page === 'dashboard') renderDashboard();
  if (page === 'bookings')  renderBookings();
  if (page === 'rooms')     renderRoomCards();
  if (page === 'repairs')   renderRepairs();
  if (page === 'guests')    renderFlaggedTable();
  if (page === 'calendar')  renderAdminCal();
  if (window.innerWidth <= 900) closeSidebar();
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function renderDashboard() {
  const [bookings, repairs, flaggedGuests] = await Promise.all([
    ABHC_DB.getBookings(),
    ABHC_DB.getRepairs(),
    ABHC_DB.getFlaggedGuests(),
  ]);

  const confirmed   = bookings.filter(b => b.status !== 'cancelled');
  const today       = new Date(); today.setHours(0,0,0,0);
  const totalRev    = confirmed.reduce((s,b) => s+(b.total||0), 0);
  const totalRepairs= repairs.reduce((s,r) => s+(+r.amount||0), 0);
  const netRev      = totalRev - totalRepairs;

  const active   = confirmed.filter(b => {
    const ci = parseD(b.check_in||b.checkIn), co = parseD(b.check_out||b.checkOut);
    return ci && co && ci <= today && co > today;
  }).length;
  const upcoming = confirmed.filter(b => {
    const ci = parseD(b.check_in||b.checkIn);
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
    const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
    months.push({ label: d.toLocaleString('en-US',{month:'short'}), year: d.getFullYear(), month: d.getMonth() });
  }
  const maxRev = Math.max(...months.map(m =>
    confirmed.filter(b => { const ci = parseD(b.check_in||b.checkIn); return ci && ci.getFullYear()===m.year && ci.getMonth()===m.month; })
             .reduce((s,b) => s+(b.total||0), 0)
  ), 1);
  document.getElementById('revenueChart').innerHTML = months.map(m => {
    const rev = confirmed.filter(b => { const ci = parseD(b.check_in||b.checkIn); return ci && ci.getFullYear()===m.year && ci.getMonth()===m.month; })
                         .reduce((s,b) => s+(b.total||0), 0);
    const pct = Math.round(rev/maxRev*100);
    return `<div class="bar-group">
      <div class="bar-val">₱${rev>999?(rev/1000).toFixed(0)+'k':rev}</div>
      <div class="bar-fill" style="height:${pct}%;background:linear-gradient(180deg,var(--aqua-dark),var(--aqua-deep));"></div>
      <div class="bar-label">${m.label}</div>
    </div>`;
  }).join('');

  // Donut chart by room
  const rooms  = await ABHC_DB.getRooms();
  const colors = ['#4EC6C0','#FF7043','#F59E0B','#10B981','#3B82F6'];
  const roomCounts = rooms.map(r => ({
    name:  r.name,
    count: confirmed.filter(b => (b.room_id||b.roomId) === r.id).length,
  }));
  const totalBk = roomCounts.reduce((s,r) => s+r.count, 0) || 1;
  let offset = 0;
  const arcs = roomCounts.map((r,i) => {
    const pct = r.count / totalBk;
    const a   = pct * 2 * Math.PI;
    const x1  = 50 + 45*Math.cos(offset); const y1 = 50 + 45*Math.sin(offset);
    offset += a;
    const x2  = 50 + 45*Math.cos(offset); const y2 = 50 + 45*Math.sin(offset);
    const large = pct > 0.5 ? 1 : 0;
    return `<path d="M50,50 L${x1},${y1} A45,45 0 ${large},1 ${x2},${y2} Z" fill="${colors[i%colors.length]}"/>`;
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
      ${roomCounts.map((r,i) => `<div class="donut-item"><div class="donut-dot" style="background:${colors[i%colors.length]};"></div><span>${r.name.split(' ').slice(0,2).join(' ')}</span><span style="margin-left:auto;font-weight:500;">${r.count}</span></div>`).join('')}
    </div>`;

  // Revenue breakdown
  const taxTotal = confirmed.reduce((s,b) => s+(b.tax||0), 0);
  const subTotal = confirmed.reduce((s,b) => s+(b.subtotal||0), 0);
  document.getElementById('revBreakdown').innerHTML = `
    <div class="rev-line"><span>Gross Subtotal (pre-tax)</span><span>${fmtMoney(subTotal)}</span></div>
    <div class="rev-line"><span>Tax Collected (12%)</span><span class="rev-pos">${fmtMoney(taxTotal)}</span></div>
    <div class="rev-line"><span>Total Revenue</span><span>${fmtMoney(totalRev)}</span></div>
    <div class="rev-line"><span>Repair / Maintenance Costs</span><span class="rev-neg">− ${fmtMoney(totalRepairs)}</span></div>
    <div class="rev-line"><span>Net Revenue</span><span class="${netRev>=0?'rev-pos':'rev-neg'}">${fmtMoney(netRev)}</span></div>`;
}

// ── BOOKINGS TABLE ────────────────────────────────────────────────────────────
let bookingPage = 1;
const BPP = 10;

async function renderBookings() {
  const rf = document.getElementById('roomFilter');
  if (rf.options.length <= 1) {
    const rooms = await ABHC_DB.getRooms();
    rooms.forEach(r => {
      const o = document.createElement('option');
      o.value = r.id; o.textContent = r.name; rf.appendChild(o);
    });
  }
  renderBookingsTable();
}

async function renderBookingsTable() {
  const q   = (document.getElementById('bookingSearch').value || '').toLowerCase();
  const sf  = document.getElementById('statusFilter').value;
  const rf  = document.getElementById('roomFilter').value;
  const fo  = document.getElementById('flaggedOnly').checked;
  let bk    = await ABHC_DB.getBookings();

  if (q)  bk = bk.filter(b => (b.ref||'').toLowerCase().includes(q) || (b.guest_name||b.guestName||'').toLowerCase().includes(q) || (b.guest_email||b.guestEmail||'').toLowerCase().includes(q) || (b.room_name||b.roomName||'').toLowerCase().includes(q));
  if (sf) bk = bk.filter(b => b.status === sf);
  if (rf) bk = bk.filter(b => (b.room_id||b.roomId) === rf);
  if (fo) bk = bk.filter(b => b.flagged);
  bk.sort((a,b) => new Date(b.created_at||b.createdAt||0) - new Date(a.created_at||a.createdAt||0));

  const total = bk.length;
  const pages = Math.ceil(total/BPP) || 1;
  bookingPage = Math.min(bookingPage, pages);
  const slice = bk.slice((bookingPage-1)*BPP, bookingPage*BPP);

  document.getElementById('bookingsTbody').innerHTML = slice.map(b => {
    const name  = b.guest_name  || b.guestName  || '—';
    const email = b.guest_email || b.guestEmail || '';
    const room  = b.room_name   || b.roomName   || b.room_id || b.roomId || '—';
    const ci    = b.check_in    || b.checkIn;
    const co    = b.check_out   || b.checkOut;
    const rc    = b.repair_cost || b.repairCost || 0;
    return `<tr class="${b.flagged?'flagged-row':''}">
      <td><span style="font-family:monospace;font-size:0.78rem;color:var(--aqua-deep);">${b.ref||'—'}</span></td>
      <td>
        <div style="font-weight:500;">${name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${email}</div>
        ${b.flagged?'<span class="badge badge-flagged">🚩 Flagged</span>':''}
      </td>
      <td>${room}</td>
      <td>${fmt(ci)}</td><td>${fmt(co)}</td>
      <td style="text-align:center;">${b.stay_type==='12hr'||b.stayType==='12hr' ? '🌙 12hr' : (b.nights||0)+' day'+(b.nights>1?'s':'')}</td>
      <td><strong>${fmtMoney(b.total)}</strong>${rc?`<div style="font-size:0.72rem;color:var(--danger);">Repair: ${fmtMoney(rc)}</div>`:''}</td>
      <td><span class="badge badge-${b.status||'confirmed'}">${(b.status||'confirmed').charAt(0).toUpperCase()+(b.status||'confirmed').slice(1)}</span></td>
      <td style="max-width:160px;"><div style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.notes||'—'}</div></td>
      <td>
        <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-xs"   onclick="viewBooking('${b.id}')">👁</button>
          <button class="btn btn-primary btn-xs" onclick="editBooking('${b.id}')">✏️</button>
          <button class="btn btn-${b.flagged?'ghost':'danger'} btn-xs" onclick="toggleFlag('${b.id}')">${b.flagged?'🏳':'🚩'}</button>
          <button class="btn btn-danger btn-xs"  onclick="deleteBooking('${b.id}')">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:2rem;">No bookings found.</td></tr>';

  // Pagination
  const pag = document.getElementById('bookingsPag');
  pag.innerHTML = '';
  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i===bookingPage?' active':'');
    btn.textContent = i;
    btn.onclick = () => { bookingPage = i; renderBookingsTable(); };
    pag.appendChild(btn);
  }
  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${total} booking${total!==1?'s':''}`;
  pag.appendChild(info);
}

async function viewBooking(id) {
  const bk = await ABHC_DB.getBookings();
  const b  = bk.find(b => b.id === id);
  if (!b) return;
  const name  = b.guest_name  || b.guestName;
  const email = b.guest_email || b.guestEmail || '—';
  const phone = b.guest_phone || b.guestPhone || '—';
  const room  = b.room_name   || b.roomName;
  const ci    = b.check_in    || b.checkIn;
  const co    = b.check_out   || b.checkOut;
  const rc    = b.repair_cost || b.repairCost || 0;
  const req   = b.special_req || b.specialReq || '';
  document.getElementById('bookingDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-bottom:1rem;">
      <div><div class="stat-label" style="font-size:0.72rem;">Reference</div><div style="font-family:monospace;font-size:1rem;color:var(--aqua-deep);font-weight:600;">${b.ref}</div></div>
      <div><div class="stat-label" style="font-size:0.72rem;">Status</div><span class="badge badge-${b.status}">${b.status}</span>${b.flagged?'&nbsp;<span class="badge badge-flagged">🚩 Flagged</span>':''}</div>
    </div>
    <div style="background:var(--sand);border-radius:12px;padding:1rem;margin-bottom:1rem;">
      <div class="rev-line"><span style="color:var(--text-muted);">Guest</span><span><strong>${name}</strong></span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Email</span><span>${email}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Phone</span><span>${phone}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Room</span><span>${room}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Check-in</span><span>${fmt(ci)}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Check-out</span><span>${fmt(co)}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Nights</span><span>${b.nights}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Subtotal</span><span>${fmtMoney(b.subtotal)}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Tax (12%)</span><span>${fmtMoney(b.tax)}</span></div>
      ${rc?`<div class="rev-line"><span style="color:var(--danger);">Repair Cost</span><span class="rev-neg">− ${fmtMoney(rc)}</span></div>`:''}
      <div class="rev-line"><span><strong>Total</strong></span><span style="color:var(--aqua-deep);font-weight:600;">${fmtMoney(b.total)}</span></div>
    </div>
    ${req?`<div style="margin-bottom:0.8rem;"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Special Requests</div><div style="font-size:0.85rem;">${req}</div></div>`:''}
    ${b.notes?`<div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.3rem;">Admin Notes</div><div style="font-size:0.85rem;background:var(--aqua-light);padding:0.8rem;border-radius:8px;">${b.notes}</div></div>`:''}`;
  document.getElementById('editFromDetailBtn').onclick = () => { closeModal('bookingDetailModal'); editBooking(id); };
  openModal('bookingDetailModal');
}



async function deleteBooking(id) {
  if (!confirm('Delete this booking? This cannot be undone.')) return;
  await ABHC_DB.deleteBooking(id);
  toast('Booking deleted.', 'success');
  renderBookingsTable();
}

async function toggleFlag(id) {
  const bk = await ABHC_DB.getBookings();
  const b  = bk.find(b => b.id === id);
  if (!b) return;
  const newFlagged = !b.flagged;
  await ABHC_DB.updateBooking(id, { flagged: newFlagged });
  toast(newFlagged ? 'Booking flagged 🚩' : 'Flag removed.', newFlagged ? 'warning' : 'success');
  renderBookingsTable();
}

// ── BOOKING MODAL ─────────────────────────────────────────────────────────────
let _currentStayType = '12hr';

function setStayType(type) {
  _currentStayType = type;
  document.getElementById('stayBtn12').classList.toggle('active', type === '12hr');
  document.getElementById('stayBtn24').classList.toggle('active', type === '24hr');
  document.getElementById('stayFields12').style.display = type === '12hr' ? '' : 'none';
  document.getElementById('stayFields24').style.display = type === '24hr' ? '' : 'none';
  calcBTotal();
}

async function populateRoomSelect(selected) {
  const rooms = await ABHC_DB.getRooms();
  document.getElementById('bRoom').innerHTML = rooms.filter(r => r.active)
    .map(r => `<option value="${r.id}" data-p12="${r.price12h}" data-p24="${r.price24h}" ${r.id===selected?'selected':''}>${r.name} — ₱${r.price12h}/12h | ₱${r.price24h}/24h</option>`).join('');
}

async function openBookingModal() {
  document.getElementById('bookingModalTitle').textContent = 'New Booking';
  document.getElementById('editBookingId').value = '';
  ['bFname','bLname','bEmail','bPhone','bReq','bNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('bCheckIn12').value   = '';
  document.getElementById('bCheckInTime').value = '14:00';
  document.getElementById('bCheckIn24').value   = '';
  document.getElementById('bDays').value        = '1';
  document.getElementById('bStatus').value      = 'confirmed';
  document.getElementById('bTotalPreview').innerHTML = '';
  setStayType('12hr');
  await populateRoomSelect('');
  openModal('bookingModal');
}
document.querySelector('[onclick="openModal(\'bookingModal\')"]').onclick = () => openBookingModal();
document.getElementById('bRoom').addEventListener('change', calcBTotal);

function calcBTotal() {
  const rid = document.getElementById('bRoom').value;
  if (!rid) { document.getElementById('bTotalPreview').innerHTML = ''; return; }
  
  const opt = document.getElementById('bRoom').selectedOptions[0];
  if (!opt) return;

  // Pull the safe data attributes instead of reading the text
  const pricePer12 = parseInt(opt.dataset.p12) || 0;
  const pricePer24 = parseInt(opt.dataset.p24) || 0;
  
  let durationLabel = '', totalBase = 0, rateLabel = '';

  if (_currentStayType === '12hr') {
    const ci = document.getElementById('bCheckIn12').value;
    if (!ci) { document.getElementById('bTotalPreview').innerHTML = ''; return; }
    durationLabel = '12-Hour Stay';
    rateLabel = `${fmtMoney(pricePer12)} / 12h`;
    totalBase = pricePer12; // Use exactly the 12h price
  } else {
    const ci   = document.getElementById('bCheckIn24').value;
    const days = parseInt(document.getElementById('bDays').value) || 1;
    if (!ci || days < 1) { document.getElementById('bTotalPreview').innerHTML = ''; return; }
    durationLabel = `${days} Day${days>1?'s':''}`;
    rateLabel = `${fmtMoney(pricePer24)} / 24h`;
    totalBase = pricePer24 * days; // Use the 24h price multiplied by days
  }

  const tax   = Math.round(totalBase * 0.12);
  const total = totalBase + tax;
  document.getElementById('bTotalPreview').innerHTML = `
    <div class="rev-line"><span>Stay Type</span><span>${_currentStayType === '12hr' ? '🌙 12-Hour' : '☀️ 24-Hour'}</span></div>
    <div class="rev-line"><span>Duration</span><span>${durationLabel}</span></div>
    <div class="rev-line"><span>Room Rate</span><span>${rateLabel}</span></div>
    <div class="rev-line"><span>Subtotal</span><span>${fmtMoney(totalBase)}</span></div>
    <div class="rev-line"><span>Tax (12%)</span><span>${fmtMoney(tax)}</span></div>
    <div class="rev-line"><span><strong>Total</strong></span><span style="color:var(--aqua-deep);"><strong>${fmtMoney(total)}</strong></span></div>`;
}

async function saveBooking() {
  const fn       = document.getElementById('bFname').value.trim();
  const ln       = document.getElementById('bLname').value.trim();
  const em       = document.getElementById('bEmail').value.trim();
  const ph       = document.getElementById('bPhone').value.trim();
  const rid      = document.getElementById('bRoom').value;
  const status   = document.getElementById('bStatus').value;
  const req      = document.getElementById('bReq').value.trim();
  const notes    = document.getElementById('bNotes').value.trim();
  const editId   = document.getElementById('editBookingId').value;
  const stayType = _currentStayType;
  if (!fn||!ln||!em||!rid) { toast('Please fill all required fields.','error'); return; }

  const rooms = await ABHC_DB.getRooms();
  const room  = rooms.find(r => r.id === rid);
  let checkIn, checkOut, nights, subtotal, checkInTime = '14:00';

  if (stayType === '12hr') {
    checkIn     = document.getElementById('bCheckIn12').value;
    checkInTime = document.getElementById('bCheckInTime').value || '14:00';
    if (!checkIn) { toast('Please select a check-in date.','error'); return; }
    checkOut = checkIn;
    nights   = 0.5;
    subtotal = room.price12h; // <-- Directly use the 12-hour price
  } else {
    checkIn      = document.getElementById('bCheckIn24').value;
    const days   = parseInt(document.getElementById('bDays').value) || 1;
    if (!checkIn || days < 1) { toast('Please select a check-in date and number of days.','error'); return; }
    const coDate = new Date(checkIn); coDate.setDate(coDate.getDate() + days);
    checkOut = fmtD(coDate); nights = days; subtotal = room.price24h * days; // <-- Use the 24-hour price
  }

  const tax = Math.round(subtotal * 0.12), total = subtotal + tax;
  const payload = {
    guestFname:fn, guestLname:ln, guestName:fn+' '+ln,
    guestEmail:em, guestPhone:ph, roomId:rid, roomName:room.name,
    checkIn, checkOut, checkInTime, nights, stayType,
    subtotal, tax, total, specialReq:req, notes, status,
  };

  try {
    if (editId) {
      await ABHC_DB.updateBooking(editId, payload);
      toast('Booking updated! ✅', 'success');
    } else {
      await ABHC_DB.addBooking({ ...payload,
        ref:'ABHC-'+Date.now().toString(36).toUpperCase().slice(-6),
        repairCost:0, flagged:false, createdAt:new Date().toISOString(),
      });
      toast('Booking created! ✅', 'success');
    }
    closeModal('bookingModal');
    renderBookingsTable();
    renderDashboard();
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

async function editBooking(id) {
  const bk = await ABHC_DB.getBookings();
  const b  = bk.find(b => b.id === id);
  if (!b) return;
  document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
  document.getElementById('editBookingId').value = id;
  document.getElementById('bFname').value  = b.guest_fname || b.guestFname || '';
  document.getElementById('bLname').value  = b.guest_lname || b.guestLname || '';
  document.getElementById('bEmail').value  = b.guest_email || b.guestEmail || '';
  document.getElementById('bPhone').value  = b.guest_phone || b.guestPhone || '';
  document.getElementById('bStatus').value = b.status || 'confirmed';
  document.getElementById('bReq').value    = b.special_req || b.specialReq || '';
  document.getElementById('bNotes').value  = b.notes || '';
  const stayType = b.stay_type || b.stayType || '24hr';
  setStayType(stayType);
  if (stayType === '12hr') {
    document.getElementById('bCheckIn12').value   = b.check_in || b.checkIn || '';
    document.getElementById('bCheckInTime').value = b.check_in_time || b.checkInTime || '14:00';
  } else {
    document.getElementById('bCheckIn24').value = b.check_in || b.checkIn || '';
    document.getElementById('bDays').value      = b.nights || 1;
  }
  await populateRoomSelect(b.room_id || b.roomId);
  calcBTotal();
  openModal('bookingModal');
}

// ── ROOMS ADMIN ───────────────────────────────────────────────────────────────
async function renderRoomCards() {
  const rooms = await ABHC_DB.getRooms();
  document.getElementById('roomsGrid').innerHTML = rooms.map(r => `
    <div class="card" style="transition:all 0.3s;">
      <div style="border-radius:10px;overflow:hidden;margin-bottom:1rem;height:120px;background:var(--sand-mid);">
        ${r.imgUrl
          ? `<img src="${r.imgUrl}" alt="${r.name}" style="width:100%;height:100%;object-fit:cover;display:block;">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.8rem;">No photo</div>`}
      </div>
      <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1rem;">
        <div>
          <div style="font-weight:600;font-size:0.95rem;">${r.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${r.cap}</div>
        </div>
        <span class="badge ${r.active?'badge-confirmed':'badge-cancelled'}" style="margin-left:auto;">${r.active?'Active':'Inactive'}</span>
      </div>
      <div class="rev-line"><span style="color:var(--text-muted);">Rates</span><span style="color:var(--aqua-deep);font-weight:600;">12h: ${fmtMoney(r.price12h)} | 24h: ${fmtMoney(r.price24h)}</span></div>
      <div class="rev-line"><span style="color:var(--text-muted);">Badge</span><span>${r.badge||'—'}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin:0.6rem 0;">
        ${(r.amenities||[]).map(a => `<span style="background:var(--aqua-light);color:var(--aqua-deep);font-size:0.68rem;padding:0.15rem 0.5rem;border-radius:50px;">${a}</span>`).join('')}
      </div>

      <div style="margin-bottom: 0.8rem;">
        <span class="badge" style="background:#E5E7EB;color:#374151;">Total Inventory: ${r.quantity||1}</span>
      </div>
        
      <div style="display:flex;gap:0.5rem;margin-top:0.8rem;">
        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="editRoom('${r.id}')">✏️ Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleRoomActive('${r.id}')">${r.active?'Deactivate':'Activate'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRoom('${r.id}')">🗑</button>
      </div>
    </div>`).join('');
}

// Image upload helpers
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
  ['rName','rId','rPrice12h','rPrice24h', 'rQuantity', 'rCap','rBadge','rAmenities'].forEach(id => document.getElementById(id).value = '');
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
  document.getElementById('rName').value      = r.name;
  document.getElementById('rId').value        = r.id;
  document.getElementById('rPrice12h').value  = r.price12h || 0;
  document.getElementById('rPrice24h').value  = r.price24h || 0;
  document.getElementById('rQuantity').value = r.quantity || 1;
  document.getElementById('rCap').value       = r.cap;
  document.getElementById('rBadge').value     = r.badge || '';
  document.getElementById('rAmenities').value = (r.amenities||[]).join(', ');
  document.getElementById('rActive').checked  = !!r.active;
  _setRoomImagePreview(r.imgUrl || '');
  openModal('roomModal');
}

async function saveRoom() {
  const name      = document.getElementById('rName').value.trim();
  const id        = document.getElementById('rId').value.trim().toLowerCase().replace(/\s+/g,'-');
  const price12h  = +document.getElementById('rPrice12h').value;
  const price24h  = +document.getElementById('rPrice24h').value;
  const quantity = +document.getElementById('rQuantity').value || 1;
  const cap       = document.getElementById('rCap').value.trim();
  const badge     = document.getElementById('rBadge').value.trim();
  const imgUrl    = document.getElementById('rImgUrl').value;
  const amenities = document.getElementById('rAmenities').value.split(',').map(a => a.trim()).filter(Boolean);
  const active    = document.getElementById('rActive').checked;
  const editId    = document.getElementById('editRoomId').value;
  if (!name || !id || !price24h) { toast('Room name, ID and 24h price required.', 'error'); return; }
  try {
    if (editId) {
      await ABHC_DB.updateRoom(editId, { name, price12h, price24h, cap, badge, imgUrl, amenities, active });
    } else {
      await ABHC_DB.saveRoom({ id, name, price12h, price24h, cap, badge, imgUrl, amenities, active });
    }
    toast('Room saved! ✅', 'success');
    closeModal('roomModal');
    renderRoomCards();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

async function toggleRoomActive(id) {
  const rooms = await ABHC_DB.getRooms();
  const r = rooms.find(r => r.id === id);
  if (!r) return;
  await ABHC_DB.updateRoom(id, { active: !r.active });
  toast(`Room ${!r.active?'activated':'deactivated'}.`, 'success');
  renderRoomCards();
}

async function deleteRoom(id) {
  if (!confirm('Delete this room? Existing bookings will not be affected.')) return;
  await ABHC_DB.deleteRoom(id);
  toast('Room deleted.', 'success');
  renderRoomCards();
}

// ── REPAIRS ───────────────────────────────────────────────────────────────────
async function renderRepairs() {
  const repairs = await ABHC_DB.getRepairs();
  const total   = repairs.reduce((s,r) => s+(+r.amount||0), 0);
  document.getElementById('totalRepairBadge').textContent = fmtMoney(total);
  document.getElementById('repairsTbody').innerHTML = repairs
    .sort((a,b) => b.date > a.date ? 1 : -1)
    .map(r => `<tr>
      <td>${fmt(r.date)}</td>
      <td><span style="font-family:monospace;font-size:0.78rem;">${r.ref||'—'}</span></td>
      <td>${r.category||'—'}</td>
      <td>${r.description}</td>
      <td style="color:var(--danger);font-weight:500;">${fmtMoney(r.amount)}</td>
      <td><button class="btn btn-danger btn-xs" onclick="deleteRepair('${r.id}')">🗑</button></td>
    </tr>`).join('')
    || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No repair costs logged.</td></tr>';
  if (!document.getElementById('repairDate').value)
    document.getElementById('repairDate').value = fmtD(new Date());
}

async function addRepair() {
  const ref  = document.getElementById('repairRef').value.trim();
  const desc = document.getElementById('repairDesc').value.trim();
  const amt  = +document.getElementById('repairAmt').value;
  const date = document.getElementById('repairDate').value;
  const cat  = document.getElementById('repairCat').value;
  if (!desc || !amt || !date) { toast('Description, amount and date are required.', 'error'); return; }
  try {
    await ABHC_DB.addRepair({ ref, description:desc, amount:amt, date, category:cat });
    toast('Repair cost logged! 🔧', 'success');
    ['repairRef','repairDesc','repairAmt'].forEach(id => document.getElementById(id).value = '');
    renderRepairs();
    renderDashboard();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

async function deleteRepair(id) {
  if (!confirm('Remove this repair entry?')) return;
  await ABHC_DB.deleteRepair(id);
  toast('Repair cost removed.', 'success');
  renderRepairs();
  renderDashboard();
}

// ── FLAGGED GUESTS ────────────────────────────────────────────────────────────
async function renderFlaggedTable() {
  const q     = (document.getElementById('flagSearch').value || '').toLowerCase();
  let flags   = await ABHC_DB.getFlaggedGuests();
  if (q) flags = flags.filter(f => (f.name||'').toLowerCase().includes(q)||(f.email||'').toLowerCase().includes(q)||(f.reason||'').toLowerCase().includes(q));
  document.getElementById('flagCountBadge').textContent = flags.length;
  const sevMap = { low:'⚠️ Low', medium:'🟠 Medium', high:'🔴 High' };
  document.getElementById('flagsTbody').innerHTML = flags.map(f => `
    <tr>
      <td><strong>${f.name||'—'}</strong></td>
      <td>${f.email||'—'}</td>
      <td>${sevMap[f.severity]||f.severity||'—'}</td>
      <td style="max-width:200px;font-size:0.82rem;">${f.reason||'—'}</td>
      <td>${fmt(f.flagged_at||f.flaggedAt)}</td>
      <td><button class="btn btn-danger btn-xs" onclick="removeFlaggedGuest('${f.id}')">Remove</button></td>
    </tr>`).join('')
    || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No flagged guests.</td></tr>';
}

async function addFlaggedGuest() {
  const name     = document.getElementById('flagName').value.trim();
  const email    = document.getElementById('flagEmail').value.trim();
  const reason   = document.getElementById('flagReason').value.trim();
  const severity = document.getElementById('flagSeverity').value;
  if (!name && !email) { toast('Name or email required.', 'error'); return; }
  if (!reason)         { toast('Please describe the incident.', 'error'); return; }
  try {
    await ABHC_DB.addFlaggedGuest({ name, email, reason, severity, flaggedAt: fmtD(new Date()) });
    toast('Guest flagged! 🚩', 'warning');
    ['flagName','flagEmail','flagReason'].forEach(id => document.getElementById(id).value = '');
    renderFlaggedTable();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

async function removeFlaggedGuest(id) {
  if (!confirm('Remove this flag? This cannot be undone.')) return;
  await ABHC_DB.removeFlaggedGuest(id);
  toast('Flag removed.', 'success');
  renderFlaggedTable();
}

// ── AVAILABILITY CALENDAR ─────────────────────────────────────────────────────
async function renderAdminCal() {
  const today   = new Date(); today.setHours(0,0,0,0);
  const [rooms, bookings] = await Promise.all([ABHC_DB.getRooms(), ABHC_DB.getBookings()]);
  const active  = rooms.filter(r => r.active);
  const months  = [];
  for (let m = 0; m < 3; m++) months.push(new Date(today.getFullYear(), today.getMonth()+m, 1));

  // Build booked map
  const bookedMap = {};
  bookings.forEach(b => {
    if (b.status === 'cancelled') return;
    const rid = b.room_id || b.roomId;
    let d = new Date(b.check_in || b.checkIn);
    const co = new Date(b.check_out || b.checkOut);
    while (d < co) {
      const k = fmtD(d);
      if (!bookedMap[k]) bookedMap[k] = {};
      bookedMap[k][rid] = true;
      d.setDate(d.getDate()+1);
    }
  });

  let html = '';
  months.forEach(base => {
    const yr = base.getFullYear(), mo = base.getMonth();
    const mName    = base.toLocaleString('en-US',{month:'long',year:'numeric'});
    const firstDay = new Date(yr,mo,1).getDay();
    const daysInMo = new Date(yr,mo+1,0).getDate();
    const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    html += `<div style="margin-bottom:2rem;"><h3 style="font-family:var(--font-serif);font-size:1.2rem;margin-bottom:0.8rem;">${mName}</h3>`;
    html += `<div style="display:grid;grid-template-columns:repeat(${7+active.length},1fr);gap:2px;min-width:${(7+active.length)*40}px;">`;
    html += `<div style="grid-column:1/8;"></div>`;
    active.forEach(r => { html += `<div style="text-align:center;font-size:0.65rem;font-weight:600;color:var(--text-muted);padding:0.3rem;background:var(--sand);border-radius:4px;">${r.emoji}</div>`; });
    DOW.forEach(d => { html += `<div style="text-align:center;font-size:0.65rem;color:var(--text-muted);padding:0.3rem;">${d}</div>`; });
    active.forEach(() => { html += `<div></div>`; });
    for (let i = 0; i < firstDay; i++) { html += `<div></div>`; active.forEach(() => html += `<div></div>`); }
    for (let d = 1; d <= daysInMo; d++) {
      const date  = new Date(yr,mo,d);
      const ds    = fmtD(date);
      const isPast= date < today;
      const isToday= ds === fmtD(today);
      html += `<div style="text-align:center;font-size:0.72rem;padding:0.25rem;${isToday?'font-weight:700;color:var(--aqua-deep);':''}${isPast?'color:#ccc;':'color:var(--text-dark);'}">${d}</div>`;
      active.forEach(r => {
        const booked = !!(bookedMap[ds] && bookedMap[ds][r.id]);
        html += `<div title="${r.name}" style="height:22px;border-radius:3px;${isPast?'background:#f5f5f5;':booked?'background:linear-gradient(135deg,var(--sunset),var(--sunset-dark));':'background:var(--aqua-light);'}"></div>`;
      });
    }
    html += `</div>`;
    html += `<div style="display:flex;gap:1rem;margin-top:0.5rem;font-size:0.72rem;color:var(--text-muted);">
      <span style="display:flex;align-items:center;gap:0.3rem;"><span style="width:12px;height:12px;background:var(--aqua-light);border-radius:2px;display:inline-block;"></span>Available</span>
      <span style="display:flex;align-items:center;gap:0.3rem;"><span style="width:12px;height:12px;background:var(--sunset);border-radius:2px;display:inline-block;"></span>Booked</span>
    </div></div>`;
  });
  document.getElementById('adminCalWrap').innerHTML = html;
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────────
async function exportCSV(type) {
  const today = new Date();
  let rows = [], filename = '';
  const range   = document.getElementById('exportDateRange')?.value;
  const estatus = document.getElementById('exportStatus')?.value;

  if (type === 'bookings') {
    let bk = await ABHC_DB.getBookings();
    if (estatus) bk = bk.filter(b => b.status === estatus);
    if (range && range !== 'all') {
      bk = bk.filter(b => {
        const d = parseD(b.check_in||b.checkIn); if (!d) return false;
        if (range==='month')   return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear();
        if (range==='quarter') { const q=Math.floor(today.getMonth()/3); return Math.floor(d.getMonth()/3)===q&&d.getFullYear()===today.getFullYear(); }
        if (range==='year')    return d.getFullYear()===today.getFullYear();
        return true;
      });
    }
    rows = [['Reference','Guest Name','Email','Phone','Room','Check-In','Check-Out','Nights','Subtotal','Tax','Repair Cost','Total','Status','Flagged','Special Requests','Admin Notes','Created At']];
    bk.forEach(b => rows.push([b.ref, b.guest_name||b.guestName, b.guest_email||b.guestEmail, b.guest_phone||b.guestPhone, b.room_name||b.roomName, b.check_in||b.checkIn, b.check_out||b.checkOut, b.nights, b.subtotal, b.tax, b.repair_cost||b.repairCost||0, b.total, b.status, b.flagged?'YES':'NO', b.special_req||b.specialReq||'', b.notes||'', b.created_at||b.createdAt||'']));
    filename = 'avellanos_bookings_' + fmtD(new Date());
  } else if (type === 'revenue') {
    const bk      = (await ABHC_DB.getBookings()).filter(b => b.status !== 'cancelled');
    const repairs = await ABHC_DB.getRepairs();
    rows = [['Month','Gross Revenue','Tax Collected','Repair Costs','Net Revenue','# Bookings']];
    for (let i = 5; i >= 0; i--) {
      const d  = new Date(today.getFullYear(), today.getMonth()-i, 1);
      const mn = bk.filter(b => { const ci=parseD(b.check_in||b.checkIn); return ci&&ci.getFullYear()===d.getFullYear()&&ci.getMonth()===d.getMonth(); });
      const rep= repairs.filter(r => { const rd=parseD(r.date); return rd&&rd.getFullYear()===d.getFullYear()&&rd.getMonth()===d.getMonth(); });
      const gross=mn.reduce((s,b)=>s+(b.total||0),0);
      const tax  =mn.reduce((s,b)=>s+(b.tax||0),0);
      const rc   =rep.reduce((s,r)=>s+(+r.amount||0),0);
      rows.push([d.toLocaleString('en-US',{month:'long',year:'numeric'}),gross,tax,rc,gross-rc,mn.length]);
    }
    filename = 'avellanos_revenue_' + fmtD(new Date());
  } else if (type === 'repairs') {
    rows = [['Date','Reference','Category','Description','Amount','Created At']];
    (await ABHC_DB.getRepairs()).forEach(r => rows.push([r.date,r.ref||'',r.category,r.description,r.amount,r.created_at||r.createdAt||'']));
    filename = 'avellanos_repairs_' + fmtD(new Date());
  } else if (type === 'flags') {
    rows = [['Name','Email','Severity','Reason','Flagged Date']];
    (await ABHC_DB.getFlaggedGuests()).forEach(f => rows.push([f.name,f.email,f.severity,f.reason,f.flagged_at||f.flaggedAt||'']));
    filename = 'avellanos_flagged_guests_' + fmtD(new Date());
  }

  const csv  = rows.map(r => r.map(c => '"'+(String(c||'').replace(/"/g,'""'))+'"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename + '.csv';
  a.click();
  toast('Exported: ' + filename + '.csv', 'success');
}

// ── INIT ──────────────────────────────────────────────────────────────────────
renderDashboard();
renderBookings();