// netlify/functions/rooms.js
// Handles: GET /rooms, POST /rooms, PATCH /rooms/:id, DELETE /rooms/:id

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const method = event.httpMethod;
  const id = event.queryStringParameters?.id;

  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Map snake_case → camelCase for frontend compatibility
      const mapped = data.map(r => ({
        id:        r.id,
        name:      r.name,
        price12h:  r.price_12h,
        price24h:  r.price_24h,
        cap:       r.cap,
        emoji:     r.emoji,
        quantity: r.quantity,
        img:       r.img,
        badge:     r.badge,
        amenities: r.amenities || [],
        active:    r.active,
        sortOrder: r.sort_order,

      }));

      return { statusCode: 200, headers, body: JSON.stringify(mapped) };
    }

    if (method === 'POST') {
      const room = JSON.parse(event.body);
      const { data, error } = await supabase.from('rooms').insert([{
        id:         room.id,
        name:       room.name,
        price_12h:  room.price12h,
        price_24h:  room.price24h,
        quantity: room.quantity || 1,
        cap:        room.cap,
        emoji:      room.emoji,
        img:        room.img || 'cottage',
        badge:      room.badge || '',
        amenities:  room.amenities || [],
        active:     room.active !== false,
        sort_order: room.sortOrder || 99,
      }]).select().single();

      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    if (method === 'PATCH' && id) {
      const updates = JSON.parse(event.body);
      const mapped = {};
      if (updates.name      !== undefined) mapped.name       = updates.name;
      if (updates.price12h  !== undefined) mapped.price_12h  = updates.price12h;
      if (updates.price24h  !== undefined) mapped.price_24h  = updates.price24h;
      if (updates.quantity  !== undefined) mapped.quantity   = updates.quantity;
      if (updates.cap       !== undefined) mapped.cap        = updates.cap;
      if (updates.emoji     !== undefined) mapped.emoji      = updates.emoji;
      if (updates.badge     !== undefined) mapped.badge      = updates.badge;
      if (updates.amenities !== undefined) mapped.amenities  = updates.amenities;
      if (updates.active    !== undefined) mapped.active     = updates.active;
      if (updates.sortOrder !== undefined) mapped.sort_order = updates.sortOrder;

      const { data, error } = await supabase
        .from('rooms')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (method === 'DELETE' && id) {
      // Soft delete — just deactivate
      const { error } = await supabase
        .from('rooms')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('rooms function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
