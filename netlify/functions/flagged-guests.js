// netlify/functions/flagged-guests.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const method = event.httpMethod;
  const id = event.queryStringParameters?.id;

  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('flagged_guests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = data.map(f => ({
        id:        f.id,
        name:      f.name,
        email:     f.email,
        reason:    f.reason,
        severity:  f.severity,
        flaggedAt: f.flagged_at,
        createdAt: f.created_at,
      }));

      return { statusCode: 200, headers, body: JSON.stringify(mapped) };
    }

    // Also support a lightweight check: GET ?email=...&name=...
    // (Used by the guest site to check if a guest is flagged before booking)
    if (method === 'GET' && (event.queryStringParameters?.email || event.queryStringParameters?.name)) {
      const email = (event.queryStringParameters.email || '').toLowerCase().trim();
      const name  = (event.queryStringParameters.name  || '').toLowerCase().trim();

      let query = supabase.from('flagged_guests').select('*');

      if (email) query = query.ilike('email', email);

      const { data, error } = await query;
      if (error) throw error;

      // Also check by name in JS since ilike on one field at a time
      const match = data.find(f =>
        (email && f.email && f.email.toLowerCase() === email) ||
        (name  && f.name  && f.name.toLowerCase()  === name)
      ) || null;

      return { statusCode: 200, headers, body: JSON.stringify({ flagged: match }) };
    }

    if (method === 'POST') {
      const guest = JSON.parse(event.body);
      const { data, error } = await supabase.from('flagged_guests').insert([{
        name:      guest.name,
        email:     guest.email,
        reason:    guest.reason,
        severity:  guest.severity || 'medium',
        flagged_at: guest.flaggedAt || new Date().toISOString().split('T')[0],
      }]).select().single();

      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    if (method === 'DELETE' && id) {
      const { error } = await supabase.from('flagged_guests').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('flagged-guests function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
