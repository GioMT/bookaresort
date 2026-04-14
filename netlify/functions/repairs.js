// netlify/functions/repairs.js

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
        .from('repairs')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mapped = data.map(r => ({
        id:          r.id,
        ref:         r.ref,
        date:        r.date,
        category:    r.category,
        description: r.description,
        amount:      r.amount,
        createdAt:   r.created_at,
      }));

      return { statusCode: 200, headers, body: JSON.stringify(mapped) };
    }

    if (method === 'POST') {
      const repair = JSON.parse(event.body);
      const { data, error } = await supabase.from('repairs').insert([{
        ref:         repair.ref || '',
        date:        repair.date,
        category:    repair.category,
        description: repair.description,
        amount:      repair.amount,
      }]).select().single();

      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    if (method === 'DELETE' && id) {
      const { error } = await supabase.from('repairs').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('repairs function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
