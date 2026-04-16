const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  const { action, caseId } = event.queryStringParameters || {};

  try {
    if (event.httpMethod === 'GET') {
      if (action === 'kb') {
        const { data } = await supabase.from('knowledge_base').select('*');
        return { statusCode: 200, headers, body: JSON.stringify(data || []) };
      }
      if (action === 'cases') {
        const { data } = await supabase.from('support_cases').select('*').order('created_at', { ascending: false });
        return { statusCode: 200, headers, body: JSON.stringify(data || []) };
      }
      if (action === 'messages' && caseId) {
        const { data } = await supabase.from('support_messages').select('*').eq('case_id', caseId).order('created_at', { ascending: true });
        return { statusCode: 200, headers, body: JSON.stringify(data || []) };
      }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      if (action === 'createCase') {
        const { data, error } = await supabase.from('support_cases').insert([body]).select().single();
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
      if (action === 'sendMessage') {
        const { data, error } = await supabase.from('support_messages').insert([body]).select().single();
        if (error) throw error;
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
    }

    if (event.httpMethod === 'PATCH' && action === 'updateCase' && caseId) {
      const body = JSON.parse(event.body);
      const { data, error } = await supabase.from('support_cases').update(body).eq('case_id', caseId).select().single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};