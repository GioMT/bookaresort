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
    const url = new URL(path, location.origin);
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  // ── ROOMS ──────────────────────────────────────────────────────────────────
  function getRooms()            { return cached('rooms', 60_000, () => req('/api/rooms')); }
  function saveRoom(room)        { bust('rooms'); return req('/api/rooms', 'POST', room); }
  function updateRoom(id, u)     { bust('rooms'); return req('/api/rooms', 'PATCH', u, { id }); }
  function deleteRoom(id)        { bust('rooms'); return req('/api/rooms', 'DELETE', null, { id }); }

  // ── BOOKINGS ───────────────────────────────────────────────────────────────
  function getBookings()         { return cached('bookings', 30_000, () => req('/api/bookings')); }
  function addBooking(b)         { bust('bookings'); return req('/api/bookings', 'POST', b); }
  function updateBooking(id, u)  { bust('bookings'); return req('/api/bookings', 'PATCH', u, { id }); }
  function cancelBooking(id)     { bust('bookings'); return req('/api/bookings', 'DELETE', null, { id }); }
  // Hard delete used only in admin
  function deleteBooking(id)     { return cancelBooking(id); }

  // ── REPAIRS ────────────────────────────────────────────────────────────────
  function getRepairs()          { return cached('repairs', 60_000, () => req('/api/repairs')); }
  function addRepair(r)          { bust('repairs'); return req('/api/repairs', 'POST', r); }
  function deleteRepair(id)      { bust('repairs'); return req('/api/repairs', 'DELETE', null, { id }); }

  // ── FLAGGED GUESTS ─────────────────────────────────────────────────────────
  function getFlaggedGuests()    { return cached('flags', 60_000, () => req('/api/flagged-guests')); }
  function addFlaggedGuest(g)    { bust('flags'); return req('/api/flagged-guests', 'POST', g); }
  function removeFlaggedGuest(id){ bust('flags'); return req('/api/flagged-guests', 'DELETE', null, { id }); }
  async function isGuestFlagged(email, fname, lname) {
    const flags = await getFlaggedGuests();
    const eml = (email  || '').toLowerCase().trim();
    const nm  = ((fname || '') + ' ' + (lname || '')).toLowerCase().trim();
    return flags.find(f =>
      (f.email && f.email.toLowerCase() === eml) ||
      (f.name  && f.name.toLowerCase()  === nm)
    ) || null;
  }

  // ── AVAILABILITY HELPERS ───────────────────────────────────────────────────
  function fmtD(d) { return d instanceof Date ? d.toISOString().split('T')[0] : d; }

  function _bookedMap(bookings) {
    const map = {};
    bookings.forEach(b => {
      if (b.status === 'cancelled') return;
      const roomId = b.room_id || b.roomId;
      let d  = new Date(b.check_in  || b.checkIn);
      const co = new Date(b.check_out || b.checkOut);
      while (d < co) {
        const k = fmtD(d);
        if (!map[k]) map[k] = {};
        map[k][roomId] = true;
        d.setDate(d.getDate() + 1);
      }
    });
    return map;
  }

  async function allBooked(date) {
    const [rooms, bookings] = await Promise.all([getRooms(), getBookings()]);
    const map = _bookedMap(bookings);
    const k = fmtD(date);
    return rooms.filter(r => r.active).every(r => !!(map[k] && map[k][r.id]));
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

  return {
    getRooms, saveRoom, updateRoom, deleteRoom,
    getBookings, addBooking, updateBooking, cancelBooking, deleteBooking,
    getRepairs, addRepair, deleteRepair,
    getFlaggedGuests, addFlaggedGuest, removeFlaggedGuest, isGuestFlagged,
    allBooked, getRoomAvailability,
    fmtD,
  };
})();
