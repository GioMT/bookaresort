/* ============================================================
   abhc-db.js — Shared data layer (Netlify functions → Supabase)
   Avellano's Beach Hut Cottage
   ============================================================ */

const ABHC_DB = (() => {
  // ── Cache (short TTL so admin changes propagate quickly) ───────────────────
  const _cache = {};
  function cached(key, ttlMs, fn) {
    const now = Date.now();
    if (_cache[key] && now - _cache[key].ts < ttlMs) return Promise.resolve(_cache[key].data);
    return fn().then(data => { _cache[key] = { data, ts: now }; return data; });
  }
  function bust(key) { delete _cache[key]; }

  // ── HTTP helper ────────────────────────────────────────────────────────────
  async function req(path, method = 'GET', body = null, params = {}) {
    // Use direct Netlify function paths to bypass potential local redirect issues
    const functionPath = path.startsWith('/api/') 
      ? path.replace('/api/', '/.netlify/functions/') 
      : path;
      
    const url = new URL(functionPath, location.origin);
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    
    const res = await fetch(url, opts);
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 50)}`);
    }
    
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  // ── ROOMS ──────────────────────────────────────────────────────────────────
  function getRooms() { return cached('rooms', 60_000, () => req('/api/rooms')); }
  function saveRoom(room) { bust('rooms'); return req('/api/rooms', 'POST', room); }
  function updateRoom(id, u) { bust('rooms'); return req('/api/rooms', 'PATCH', u, { id }); }
  function deleteRoom(id) { bust('rooms'); return req('/api/rooms', 'DELETE', null, { id }); }

  // ── BOOKINGS ───────────────────────────────────────────────────────────────
  function getBookings() { return cached('bookings', 30_000, () => req('/api/bookings')); }
  function addBooking(b) { bust('bookings'); return req('/api/bookings', 'POST', b); }
  function updateBooking(id, u) { bust('bookings'); return req('/api/bookings', 'PATCH', u, { id }); }
  function cancelBooking(id) { bust('bookings'); return updateBooking(id, { status: 'cancelled' }); }
  // Hard delete used only in admin
  function deleteBooking(id) { bust('bookings'); return req('/api/bookings', 'DELETE', null, { id }); }

  // ── REPAIRS ────────────────────────────────────────────────────────────────
  function getRepairs() { return cached('repairs', 60_000, () => req('/api/repairs')); }
  function addRepair(r) { bust('repairs'); return req('/api/repairs', 'POST', r); }
  function deleteRepair(id) { bust('repairs'); return req('/api/repairs', 'DELETE', null, { id }); }

  // ── FLAGGED GUESTS ─────────────────────────────────────────────────────────
  function getFlaggedGuests() { return cached('flags', 60_000, () => req('/api/flagged-guests')); }
  function addFlaggedGuest(g) { bust('flags'); return req('/api/flagged-guests', 'POST', g); }
  function removeFlaggedGuest(id) { bust('flags'); return req('/api/flagged-guests', 'DELETE', null, { id }); }
  async function isGuestFlagged(email, fname, lname) {
    const flags = await getFlaggedGuests();
    const eml = (email || '').toLowerCase().trim();
    const nm = ((fname || '') + ' ' + (lname || '')).toLowerCase().trim();
    return flags.find(f =>
      (f.email && f.email.toLowerCase() === eml) ||
      (f.name && f.name.toLowerCase() === nm)
    ) || null;
  }

  // ── AVAILABILITY HELPERS ───────────────────────────────────────────────────
  function fmtD(d) { return d instanceof Date ? d.toISOString().split('T')[0] : d; }

  async function allBooked(date) {
    const [rooms, bookings] = await Promise.all([getRooms(), getBookings()]);
    const activeRooms = rooms.filter(r => r.active);

    // Map how many units of each room are booked on this specific date
    const bookedCounts = {};
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    bookings.forEach(b => {
      if (b.status === 'cancelled') return;
      const bCi = new Date(b.check_in || b.checkIn);
      const bCo = new Date(b.check_out || b.checkOut);

      // If the target date falls inside this booking's stay
      if (targetDate >= bCi && targetDate < bCo) {
        const rid = b.room_id || b.roomId;
        // Add the quantity booked (default to 1 if old data)
        bookedCounts[rid] = (bookedCounts[rid] || 0) + (b.room_quantity || 1);
      }
    });

    // Check if EVERY active room is at or over capacity
    return activeRooms.every(r => {
      const totalUnits = r.quantity || 1;
      const bookedUnits = bookedCounts[r.id] || 0;
      return bookedUnits >= totalUnits;
    });
  }

  async function getRoomAvailability(roomId, ci, co) {
    const [rooms, bookings] = await Promise.all([getRooms(), getBookings()]);
    const room = rooms.find(r => r.id === roomId);
    if (!room) return 0;
    const totalQty = room.quantity || 1;

    let maxBookedOnAnyDay = 0;
    let d = new Date(ci);
    const end = new Date(co);

    while (d < end) {
      let bookedOnThisDay = 0;
      bookings.forEach(b => {
        if (b.status === 'cancelled') return;
        if ((b.room_id || b.roomId) !== roomId) return;

        const bCi = new Date(b.check_in || b.checkIn);
        const bCo = new Date(b.check_out || b.checkOut);

        // If the date 'd' falls within this booking's stay
        if (d >= bCi && d < bCo) {
          bookedOnThisDay += (b.room_quantity || 1);
        }
      });
      if (bookedOnThisDay > maxBookedOnAnyDay) maxBookedOnAnyDay = bookedOnThisDay;
      d.setDate(d.getDate() + 1);
    }
    return Math.max(0, totalQty - maxBookedOnAnyDay);
  }

  // ── SUPPORT MODULE ─────────────────────────────────────────────────────────
  function getKB() { return req('/api/support?action=kb'); }
  function getSupportCases() { return req('/api/support?action=cases'); }
  function createSupportCase(data) { return req('/api/support?action=createCase', 'POST', data); }
  function updateSupportCase(caseId, data) { return req(`/api/support?action=updateCase&caseId=${caseId}`, 'PATCH', data); }
  function getSupportMessages(caseId) { return req(`/api/support?action=messages&caseId=${caseId}`); }
  function sendSupportMessage(data) { return req('/api/support?action=sendMessage', 'POST', data); }

  // ── SITE CONTENT CMS ─────────────────────────────────────────────────────────
  function getSiteContent() { return cached('siteContent', 60_000, () => req('/api/site-content')); }
  function saveSiteContent(items) { bust('siteContent'); return req('/api/site-content', 'PATCH', items); }

  return {
    getRooms, saveRoom, updateRoom, deleteRoom,
    getBookings, addBooking, updateBooking, cancelBooking, deleteBooking,
    getRepairs, addRepair, deleteRepair,
    getFlaggedGuests, addFlaggedGuest, removeFlaggedGuest, isGuestFlagged,
    allBooked, getRoomAvailability,
    fmtD,
    getSiteContent, saveSiteContent,
    // Add these missing Customer Service functions!
    getKB, getSupportCases, createSupportCase, updateSupportCase, getSupportMessages, sendSupportMessage
  };
})();
