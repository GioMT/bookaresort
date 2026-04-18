// netlify/functions/site-content.js
// Handles: GET /site-content, PATCH /site-content (bulk upsert)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const method = event.httpMethod;

  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .order('section', { ascending: true });

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (method === 'PATCH') {
      // Bulk upsert — expects an array of { key, value, section, label }
      const items = JSON.parse(event.body);

      if (!Array.isArray(items) || items.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Expected array of items' }) };
      }

      const rows = items.map(i => ({
        key: i.key,
        value: i.value,
        section: i.section,
        label: i.label,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('site_content')
        .upsert(rows, { onConflict: 'key' })
        .select();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('site-content function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
