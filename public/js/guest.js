/* ============================================================
   guest.js — Guest page logic
   Avellano's Beach Hut Cottage
   ============================================================ */

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtD(d)    { return d instanceof Date ? d.toISOString().split('T')[0] : d; }
function parseD(s)  { const [y,m,dy] = s.split('-').map(Number); return new Date(y, m-1, dy); }
function readableDate(s) { return parseD(s).toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'}); }

// ── CURSOR GLOW ───────────────────────────────────────────────────────────────
const glow = document.getElementById('cursor-glow');
document.addEventListener('mousemove', e => {
  glow.style.left = e.clientX + 'px';
  glow.style.top  = e.clientY + 'px';
});

// ── STARS ─────────────────────────────────────────────────────────────────────
(function generateStars() {
  const sc = document.getElementById('starsContainer');
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*75}%;
      --dur:${2+Math.random()*4}s;--del:${Math.random()*4}s;
      opacity:${0.15+Math.random()*0.85};
      width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;`;
    sc.appendChild(s);
  }
})();

// ── NAV SCROLL ────────────────────────────────────────────────────────────────
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 80));

// ── SCROLL REVEAL ─────────────────────────────────────────────────────────────
const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.1 }
);
document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => observer.observe(el));

// ── VIRTUAL TOUR ──────────────────────────────────────────────────────────────
function setTourBg(btn) {
  document.querySelectorAll('.tour-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tourBg').className = 'tour-bg ' + btn.dataset.bg;
}

// ── RENDER ROOMS SECTION ──────────────────────────────────────────────────────
async function renderRoomsSection() {
  const rooms = (await ABHC_DB.getRooms()).filter(r => r.active);
  const grid  = document.getElementById('roomsGrid');
  grid.innerHTML = rooms.map((r, i) => `
    <article class="room-card reveal stagger-${i+1}">
      <div class="room-img ${r.img}">
        <div class="room-img ${r.img ? 'has-photo' : r.img||'cottage'}">
  ${r.img ? `<img src="${r.img}" alt="${r.name}">` : `<div class="room-img-inner">${r.badge||'🏠'}</div>`}
        <span class="room-badge">${r.badge}</span>
      </div>
      <div class="room-body">
        <h3 class="room-name">${r.name}</h3>
        <p class="room-capacity">👤 ${r.cap}</p>
        <div class="room-amenities">${(r.amenities||[]).map(a => `<span class="amenity-tag">${a}</span>`).join('')}</div>
        <div class="room-footer">
          <div>
            <span class="price-amount" style="font-size:1.1rem;">₱${(r.price12h||0).toLocaleString()}</span><span class="price-per">/12h</span>
            <span style="color:var(--sand-mid);margin:0 4px;">|</span>
            <span class="price-amount" style="font-size:1.1rem;">₱${(r.price24h||0).toLocaleString()}</span><span class="price-per">/24h</span>
          </div>
          <a href="#booking" class="btn-room">Book Room</a>
        </div>
      </div>
    </article>`).join('');
  grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
renderRoomsSection();

// ── REVIEWS ───────────────────────────────────────────────────────────────────
const REVIEWS = [
  { stars:5, text:'Absolute magic. Woke up to ocean sounds every morning — felt like a dream we never wanted to leave.', guest:'Maria S. · Manila' },
  { stars:5, text:'The staff remembered my coffee order on day two. That kind of warmth is rare anywhere in the world.',  guest:'James T. · Singapore' },
  { stars:5, text:'Our anniversary here was the most romantic trip we\'ve ever taken. The sunset villa is breathtaking.', guest:'Ana & Carlo M. · Cebu' },
  { stars:5, text:'Kids loved the island hopping, adults loved the cocktails. Everyone was happy. Perfect family getaway.', guest:'The Reyes Family · Makati' },
  { stars:4, text:'Pristine beach, crystal water, and the freshest seafood I\'ve ever tasted. We\'re coming back every year.', guest:'Sophie L. · Paris' },
  { stars:5, text:'From booking to checkout, everything was seamless and thoughtful. This place truly cares about guests.',  guest:'Daniel K. · London' },
];
(function renderReviews() {
  const track = document.getElementById('reviewsTrack');
  const doubled = [...REVIEWS, ...REVIEWS];
  track.innerHTML = doubled.map(r => `
    <div class="review-card">
      <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
      <p class="review-text">"${r.text}"</p>
      <div class="review-guest">— ${r.guest}</div>
    </div>`).join('');
})();

// ── BOOKING STATE ─────────────────────────────────────────────────────────────
let ROOMS   = [];
let selIn   = null;
let selOut  = null;
let cart = {};
let off1 = 0, off2 = 1;

// Helper to update the cart quantities
function updateCart(id, delta, maxAvail) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] < 0) cart[id] = 0;
  if (cart[id] > maxAvail) cart[id] = maxAvail;
  renderRoomsTab();
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
async function renderCal(id, offset) {
  const today = new Date(); today.setHours(0,0,0,0);
  const base  = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const yr = base.getFullYear(), mo = base.getMonth();
  const mName    = base.toLocaleString('en-US',{month:'long',year:'numeric'});
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMo = new Date(yr, mo+1, 0).getDate();
  const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  let h = `<div class="cal-header">
    <button class="cal-nav" onclick="shiftCal('${id}',${offset},-1)">‹</button>
    <div class="cal-title">${mName}</div>
    <button class="cal-nav" onclick="shiftCal('${id}',${offset},1)">›</button>
  </div><div class="cal-grid">
  ${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}`;

  for (let i = 0; i < firstDay; i++) h += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= daysInMo; d++) {
    const date = new Date(yr, mo, d);
    const ds   = fmtD(date);
    const isPast  = date < today;
    const isToday = ds === fmtD(today);
    const allBk   = await ABHC_DB.allBooked(date);

    let cls = 'cal-day';
    if (isPast)      cls += ' past';
    else if (allBk)  cls += ' unavailable';
    else if (isToday)cls += ' today';

    if (selIn && selOut) {
      const ci = parseD(selIn), co = parseD(selOut);
      if (ds === selIn)      cls += ' selected-in';
      else if (ds === selOut) cls += ' selected-out';
      else if (date > ci && date < co) cls += ' in-range';
    } else if (selIn && ds === selIn) {
      cls += ' selected-in';
    }

    const clickable = !isPast && !allBk;
    h += `<div class="${cls}"${clickable ? ` onclick="dayClick('${ds}')"` : ''}>${d}</div>`;
  }

  h += '</div>';
  document.getElementById(id).innerHTML = h;
}

function shiftCal(id, offset, dir) {
  if (id === 'cal1') { off1 = Math.max(0, off1 + dir); renderCal('cal1', off1); }
  else               { off2 = Math.max(0, off2 + dir); renderCal('cal2', off2); }
}

async function dayClick(ds) {
  if (!selIn || (selIn && selOut)) {
    selIn = ds; selOut = null; selRoom = null;
  } else {
    if (ds <= selIn) { selIn = ds; selOut = null; }
    else             { selOut = ds; }
  }
  await renderCal('cal1', off1);
  await renderCal('cal2', off2);
  updateSummary();
}

function updateSummary() {
  const area = document.getElementById('booking-summary-area');
  const btn  = document.getElementById('btnToRoom');
  if (!selIn || !selOut) {
    area.innerHTML = `<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
      <div style="font-size:3rem;margin-bottom:1rem;">🗓️</div>
      <p style="font-size:0.95rem;">Click a <strong>check-in</strong> date, then a <strong>check-out</strong> date to see your stay summary.</p>
    </div>`;
    btn.style.display = 'none';
    return;
  }
  const nights = Math.round((parseD(selOut) - parseD(selIn)) / 86400000);
  area.innerHTML = `
    <div class="booking-summary">
      <div class="summary-row"><span class="summary-label">Check-in</span><span>${readableDate(selIn)}</span></div>
      <div class="summary-row"><span class="summary-label">Check-out</span><span>${readableDate(selOut)}</span></div>
      <div class="summary-row"><span class="summary-label">Duration</span><span>${nights} night${nights!==1?'s':''}</span></div>
    </div>`;
  btn.style.display = 'block';
}

// ── BOOKING TABS ──────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.booking-tab,.booking-tab-pane').forEach(el => el.classList.remove('active'));
  document.getElementById('tabBtn-'+tab).classList.add('active');
  document.getElementById('tab-'+tab).classList.add('active');
  if (tab === 'room')    renderRoomsTab();
  if (tab === 'confirm') renderConfirm();
}

async function renderRoomsTab() {
  ROOMS = (await ABHC_DB.getRooms()).filter(r => r.active);
  const banner = document.getElementById('dateRangeBanner');
  const sel    = document.getElementById('roomSelector');
  const btn    = document.getElementById('btnToConfirm');

  if (!selIn || !selOut) {
    banner.textContent = '⚠️ Please select your dates first.';
    sel.innerHTML = ''; btn.style.display = 'none'; return;
  }

  const ci = parseD(selIn), co = parseD(selOut);
  const nights = Math.round((co - ci) / 86400000);
  banner.innerHTML = `📅 <strong>${readableDate(selIn)}</strong> → <strong>${readableDate(selOut)}</strong> &nbsp;·&nbsp; ${nights} night${nights!==1?'s':''}`;

const availResults = await Promise.all(ROOMS.map(r => ABHC_DB.getRoomAvailability(r.id, ci, co)));
  
  sel.innerHTML = ROOMS.map((r, i) => {
    const avail = availResults[i];
    const qtyInCart = cart[r.id] || 0;
    const total = (r.price24h * nights * qtyInCart).toLocaleString();
    
    let unitSelectHtml = '';
    // If they have selected a quantity, AND this room has specific units defined in the admin panel, show the dropdown!
    if (qtyInCart > 0 && r.unitIds && r.unitIds.length > 0) {
      const options = r.unitIds.map(u => `<option value="${u}">${u}</option>`).join('');
      unitSelectHtml = `
        <div style="margin-top:1.2rem;text-align:left;">
          <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:0.3rem;">Select Unit Preference (Optional)</label>
          <select id="prefUnit_${r.id}" style="width:100%;padding:0.5rem;font-size:0.85rem;border:1.5px solid var(--sand-mid);border-radius:8px;outline:none;">
            <option value="">Any available unit</option>
            ${options}
          </select>
        </div>`;
    }

    return `<div class="room-option ${avail===0?'unavail-room':''}" style="cursor:default;">
      <span class="room-opt-badge ${avail>0?'avail-badge':'unavail-badge'}">${avail>0 ? `✅ ${avail} Available` : '❌ Fully Booked'}</span>
      ${r.img ? `<img class="room-opt-photo" src="${r.img}" alt="${r.name}">` : `<div class="room-opt-emoji">🏠</div>`}
      <div class="room-opt-name">${r.name}</div>
      <div class="room-opt-price">₱${r.price24h.toLocaleString()} / night</div>
      <div class="room-opt-cap">👤 ${r.cap}</div>
      
      <div style="display:flex;align-items:center;justify-content:center;gap:1.2rem;margin-top:1rem;">
        <button class="btn btn-ghost btn-sm" style="width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;font-size:1.5rem;line-height:0;" onclick="updateCart('${r.id}', -1, ${avail})" ${qtyInCart===0?'disabled':''}>&minus;</button>
        <span style="font-weight:600;font-size:1.2rem;width:24px;text-align:center;">${qtyInCart}</span>
        <button class="btn btn-primary btn-sm" style="width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem;line-height:0;" onclick="updateCart('${r.id}', 1, ${avail})" ${qtyInCart===avail?'disabled':''}>+</button>
      </div>
      
      ${qtyInCart > 0 ? `<div class="room-opt-total">Room Subtotal: ₱${total}</div>` : ''}
      ${unitSelectHtml}
    </div>`;
  }).join('');

  const totalItems = Object.values(cart).reduce((a,b)=>a+b,0);
  btn.style.display = totalItems > 0 ? 'block' : 'none';
}

function pickRoom(id) {
  selRoom = id;
  renderRoomsTab();
  document.getElementById('btnToConfirm').style.display = 'block';
}

function renderConfirm() {
  const div = document.getElementById('confirmSummary');
  
  // Calculate total items in cart to check if they selected anything
  const totalItems = Object.values(cart).reduce((a,b)=>a+b,0);
  
  if (!selIn || !selOut || totalItems === 0) {
    div.innerHTML = '<p style="color:var(--text-muted);">Please complete the previous steps first.</p>';
    return;
  }
  
  const nights = Math.round((parseD(selOut) - parseD(selIn)) / 86400000);
  
  let totalSub = 0;
  let roomBreakdownHtml = '';
  
  // Loop through the cart and build a line item for each room they selected
  Object.keys(cart).forEach(id => {
    if (cart[id] > 0) {
      const r = ROOMS.find(room => room.id === id);
      const roomSub = r.price24h * nights * cart[id];
      totalSub += roomSub;
      roomBreakdownHtml += `<div class="summary-row"><span class="summary-label">${cart[id]}x ${r.name}</span><span>₱${roomSub.toLocaleString()}</span></div>`;
    }
  });

  // Replace the old tax math with this:
  const tax = 0;
  const grandTotal = totalSub;

  div.innerHTML = `
    <div style="font-family:var(--font-serif);font-size:1.1rem;color:var(--text-dark);margin-bottom:1rem;">Booking Summary</div>
    <div class="summary-row"><span class="summary-label">Check-in</span><span>${readableDate(selIn)}</span></div>
    <div class="summary-row"><span class="summary-label">Check-out</span><span>${readableDate(selOut)}</span></div>
    <div class="summary-row"><span class="summary-label">Nights</span><span>${nights}</span></div>
    <hr style="border:none;border-top:1px dashed var(--sand-mid);margin:0.5rem 0;">
    ${roomBreakdownHtml}
    <hr style="border:none;border-top:1px dashed var(--sand-mid);margin:0.5rem 0;">
    <div class="summary-row"><span class="summary-label">Total (Tax Inclusive)</span><span style="font-size:1.1rem;color:var(--aqua-deep);font-weight:600;">₱${grandTotal.toLocaleString()}</span></div>`;
}

// ── FLAGGED GUEST CHECK ───────────────────────────────────────────────────────
let flagAlertShown = false;
async function checkFlagged() {
  const fn = document.getElementById('guestFname').value.trim();
  const ln = document.getElementById('guestLname').value.trim();
  const em = document.getElementById('guestEmail').value.trim();
  if (!fn && !ln && !em) return;

  const flagged = await ABHC_DB.isGuestFlagged(em, fn, ln);
  const warn = document.getElementById('flaggedWarning');
  const msg  = document.getElementById('flaggedMsg');

  if (flagged) {
    warn.classList.add('show');
    msg.textContent = `This guest has been flagged: ${flagged.reason||'Property damage reported'}. Admin has been notified.`;
    if (!flagAlertShown) {
      flagAlertShown = true;
      setTimeout(() => {
        document.getElementById('flagModalMsg').textContent =
          `Guest "${fn} ${ln}" (${em}) appears in the flagged guest list. Reason: ${flagged.reason||'Property damage reported'}. Please review before confirming.`;
        document.getElementById('flagModal').classList.add('open');
      }, 600);
    }
  } else {
    warn.classList.remove('show');
  }
}

function closeFlagModal() {
  document.getElementById('flagModal').classList.remove('open');
}

// ── SUBMIT RESERVATION ────────────────────────────────────────────────────────
async function submitReservation() {
  const fn  = document.getElementById('guestFname').value.trim();
  const ln  = document.getElementById('guestLname').value.trim();
  const em  = document.getElementById('guestEmail').value.trim();
  const ph  = document.getElementById('guestPhone').value.trim();
  const req = document.getElementById('guestReq').value.trim();

  if (!fn || !ln || !em) { alert('Please fill in your name and email to proceed.'); return; }
  
  // Make sure they have selected at least one room
  const totalItems = Object.values(cart).reduce((a,b)=>a+b,0);
  if (!selIn || !selOut || totalItems === 0) { alert('Please complete all steps and select at least one room.'); return; }

  const nights = Math.round((parseD(selOut) - parseD(selIn)) / 86400000);
  const ref    = 'ABHC-' + Date.now().toString(36).toUpperCase().slice(-6);
  
  const bookingsArray = [];
  let grandTotal = 0;
  let roomNamesHtml = '';

  // Loop through cart to build individual booking records
  Object.keys(cart).forEach(id => {
    if (cart[id] > 0) {
      const r = ROOMS.find(room => room.id === id);
      const sub = r.price24h * nights * cart[id];
      const tax = 0; // Tax inclusive
      const total = sub;
      
      grandTotal += total;
      roomNamesHtml += `<div>${cart[id]}x ${r.name}</div>`;

      // Grab their unit preference if they selected one
      const prefDropdown = document.getElementById(`prefUnit_${id}`);
      const preferredUnit = prefDropdown ? prefDropdown.value : '';
      
      // Attach the preference to their special requests so it shows up on your admin panel!
      let finalReq = req;
      if (preferredUnit) {
        finalReq = finalReq ? `[Preferred Unit: ${preferredUnit}] - ${finalReq}` : `[Preferred Unit: ${preferredUnit}]`;
      }

      bookingsArray.push({
        ref, roomId: r.id, roomName: r.name, roomQuantity: cart[id],
        guestName: fn+' '+ln, guestFname: fn, guestLname: ln,
        guestEmail: em, guestPhone: ph, checkIn: selIn, checkOut: selOut, 
        nights, subtotal: sub, tax, total,
        specialReq: finalReq, // Saved here!
        notes: '', repairCost: 0, status: 'confirmed', flagged: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Send the array to Supabase
  try {
    await ABHC_DB.addBooking(bookingsArray);
  } catch (err) {
    alert('Booking failed: ' + err.message);
    return;
  }

  // Build the success modal receipt
  document.getElementById('modalSub').textContent = `Thank you, ${fn}! A confirmation will be sent to ${em}.`;
  document.getElementById('modalDetails').innerHTML = `
    <div class="modal-detail-row"><span class="modal-detail-label">Reference</span><span class="ref-num">${ref}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Guest</span><span class="modal-detail-val">${fn} ${ln}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Rooms</span><span class="modal-detail-val" style="text-align:right;">${roomNamesHtml}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Check-in</span><span class="modal-detail-val">${readableDate(selIn)}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Check-out</span><span class="modal-detail-val">${readableDate(selOut)}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Nights</span><span class="modal-detail-val">${nights}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Total (incl. tax)</span><span class="modal-detail-val" style="color:var(--aqua-deep);font-weight:600;">₱${grandTotal.toLocaleString()}</span></div>`;
  
  document.getElementById('bookingModal').classList.add('open');

  // Reset state (Empty the cart!)
  selIn = null; selOut = null; cart = {}; flagAlertShown = false;
  renderCal('cal1', off1); renderCal('cal2', off2); updateSummary();
  ['guestFname','guestLname','guestEmail','guestPhone','guestReq'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('flaggedWarning').classList.remove('show');
}

// ── GUEST PHOTO FEED ──────────────────────────────────────────────────────────

async function loadApprovedFeed() {
  const container = document.getElementById('liveGuestFeed');
  if (!container) return;
  try {
    const res = await fetch('/api/guest-feed?status=approved');
    const posts = await res.json();
    
    container.innerHTML = posts.map(p => `
      <div class="room-card" style="border-radius:12px;overflow:hidden;background:white;">
        <img src="${p.image_url}" style="width:100%;height:220px;object-fit:cover;display:block;">
        <div style="padding:1rem;">
          <p style="font-size:0.85rem;color:var(--text-dark);font-style:italic;margin-bottom:0.5rem;">"${p.caption}"</p>
          <div style="font-size:0.75rem;color:var(--text-muted);font-weight:500;">— ${p.guest_name}</div>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error("Failed to load feed", e); }
}

async function submitFeedPost() {
  const name = document.getElementById('feedName').value.trim();
  const refNo = document.getElementById('feedRef').value.trim();
  const caption = document.getElementById('feedCaption').value.trim();
  const fileInput = document.getElementById('feedPhoto');
  const btn = document.getElementById('feedSubmitBtn');

  if (!name || !fileInput.files[0]) {
    alert("Please provide your name and select a photo!");
    return;
  }

  btn.textContent = "Uploading...";
  btn.disabled = true;

  const file = fileInput.files[0];
  const ext = file.name.split('.').pop();
  const reader = new FileReader();

  reader.onload = async (e) => {
    const payload = {
      guestName: name,
      guestRef: refNo,       // <-- Sending the new Reference Number
      caption: caption,
      imageBase64: e.target.result,
      imageExt: ext
    };

    try {
      const res = await fetch('/api/guest-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Upload failed');
      
      // The new success message!
      alert("Your post has been submitted and will be reviewed for approval. Thank you for sharing your story!");
      
      // Clear the form
      document.getElementById('feedName').value = '';
      document.getElementById('feedRef').value = '';
      document.getElementById('feedCaption').value = '';
      fileInput.value = '';

      // Hide the form and bring the "Share your story" button back
      document.getElementById('feedFormContainer').style.display = 'none';
      document.getElementById('openFeedFormBtn').style.display = 'inline-block';

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      btn.textContent = "Submit Story";
      btn.disabled = false;
    }
  };
  reader.readAsDataURL(file);
}

// Load the feed when the page starts
loadApprovedFeed();



// ── GUEST CHAT WIDGET ─────────────────────────────────────────────────────────
let chatCaseId = null;
let kbData = [];
let botMode = true;
let guestRealtimeChannel = null;

async function toggleGuestChat() {
  const win = document.getElementById('guestChatWindow');
  win.classList.toggle('open');
  if (win.classList.contains('open') && document.getElementById('guestChatBody').innerHTML === '') {
    kbData = await ABHC_DB.getKB();
    appendMsg('bot', "Hi! I'm the Avellano's virtual assistant. How can I help you today?");
  }
}

function appendMsg(type, text) {
  const body = document.getElementById('guestChatBody');
  body.innerHTML += `<div class="chat-msg msg-${type}">${text}</div>`;
  body.scrollTop = body.scrollHeight;
}

async function sendGuestMsg() {
  const input = document.getElementById('guestChatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  appendMsg('guest', text);

  if (botMode) {
    const match = kbData.find(k => k.keywords.split(',').some(kw => text.toLowerCase().includes(kw.trim())));
    setTimeout(() => {
      if (match) {
        appendMsg('bot', match.answer);
      } else {
        appendMsg('bot', "I'm not exactly sure about that. Would you like me to connect you to a human agent?");
        const body = document.getElementById('guestChatBody');
        body.innerHTML += `<button class="btn btn-sm btn-ghost" style="align-self:flex-start;margin-top:-0.5rem;" onclick="showPreChatForm(this)">Yes, connect me</button>`;
        body.scrollTop = body.scrollHeight;
      }
    }, 600);
  } else if (chatCaseId) {
    await ABHC_DB.sendSupportMessage({ case_id: chatCaseId, sender_type: 'guest', sender_name: 'Guest', message: text });
  }
}

function showPreChatForm(btn) {
  btn.style.display = 'none';
  const body = document.getElementById('guestChatBody');
  body.innerHTML += `
    <div class="prechat-form" id="prechatForm">
      <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.5rem;">Connect with an Agent</div>
      <input type="text" id="pcName" class="chat-input" placeholder="Name (Required)">
      <input type="email" id="pcEmail" class="chat-input" placeholder="Email (Required)">
      <input type="text" id="pcPhone" class="chat-input" placeholder="Phone (Optional)">
      <input type="text" id="pcRef" class="chat-input" placeholder="Booking Ref (Optional)">
      <textarea id="pcConcern" class="chat-input" rows="2" placeholder="Briefly describe your concern..."></textarea>
      <button class="btn btn-primary btn-sm" onclick="submitPreChat()">Start Chat</button>
    </div>`;
  body.scrollTop = body.scrollHeight;
}

async function submitPreChat() {
  const name = document.getElementById('pcName').value.trim();
  const email = document.getElementById('pcEmail').value.trim();
  const concern = document.getElementById('pcConcern').value.trim();
  if (!name || !email) return alert("Name and Email are required.");

  document.getElementById('prechatForm').style.display = 'none';
  appendMsg('sys', 'Creating case...');

  const newId = 'CS-' + Date.now().toString(36).toUpperCase().slice(-5);
  await ABHC_DB.createSupportCase({
    case_id: newId, guest_name: name, guest_email: email,
    guest_phone: document.getElementById('pcPhone').value.trim(),
    ref_no: document.getElementById('pcRef').value.trim(),
    concern: concern
  });

  chatCaseId = newId;
  botMode = false;
  appendMsg('sys', `Case ${newId} created. Please wait for an agent...`);
  
  // Realtime WebSocket Listener (Zero Polling!)
  if (!guestRealtimeChannel) {
    guestRealtimeChannel = window.supa.channel(`guest-chat-${chatCaseId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'support_messages', 
        filter: `case_id=eq.${chatCaseId}` 
      }, (payload) => {
        if (payload.new.sender_type !== 'guest') {
          const typeMap = { 'system': 'sys', 'bot': 'bot', 'staff': 'bot' };
          appendMsg(typeMap[payload.new.sender_type], payload.new.message);
        }
      })
      .subscribe();
  }
}

// ── INIT CALENDARS ────────────────────────────────────────────────────────────
renderCal('cal1', off1);
renderCal('cal2', off2);
