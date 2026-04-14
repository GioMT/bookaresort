// netlify/functions/bookings.js
// Handles: GET /bookings, POST /bookings, PATCH /bookings/:id, DELETE /bookings/:id

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key — server-side only, never exposed to browser
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const method = event.httpMethod;
  const id = event.queryStringParameters?.id;

  try {
    // ── GET all bookings ──────────────────────────────────────────────────────
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ── POST create booking ───────────────────────────────────────────────────
    if (method === 'POST') {
      const payload = JSON.parse(event.body);
      // Ensure we always process an array (cart checkout)
      const bookingsArray = Array.isArray(payload) ? payload : [payload];
      
      const inserts = bookingsArray.map(booking => ({
        ref:           booking.ref,
        room_id:       booking.roomId,
        room_name:     booking.roomName,
        room_quantity: booking.roomQuantity || 1,
        guest_name:    booking.guestName,
        guest_fname:   booking.guestFname,
        guest_lname:   booking.guestLname,
        guest_email:   booking.guestEmail,
        guest_phone:   booking.guestPhone,
        check_in:      booking.checkIn,
        check_out:     booking.checkOut,
        nights:        booking.nights,
        subtotal:      booking.subtotal,
        tax:           booking.tax,
        total:         booking.total,
        special_req:   booking.specialReq || '',
        notes:         booking.notes || '',
        repair_cost:   booking.repairCost || 0,
        status:        booking.status || 'confirmed',
        flagged:       booking.flagged || false,
      }));

      const { data, error } = await supabase.from('bookings').insert(inserts).select();
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    // ── PATCH update booking ──────────────────────────────────────────────────
    if (method === 'PATCH' && id) {
      const updates = JSON.parse(event.body);

      // Map camelCase → snake_case for any fields sent
      const mapped = {};
      if (updates.status     !== undefined) mapped.status      = updates.status;
      if (updates.notes      !== undefined) mapped.notes       = updates.notes;
      if (updates.repairCost !== undefined) mapped.repair_cost = updates.repairCost;
      if (updates.flagged    !== undefined) mapped.flagged     = updates.flagged;
      if (updates.guestPhone !== undefined) mapped.guest_phone = updates.guestPhone;
      if (updates.specialReq !== undefined) mapped.special_req = updates.specialReq;

      const { data, error } = await supabase
        .from('bookings')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ── DELETE cancel booking ─────────────────────────────────────────────────
    if (method === 'DELETE' && id) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })   // soft delete — keep for revenue history
        .eq('id', id);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('bookings function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
