// netlify/functions/guest-feed.js

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

  try {
    // GET: Fetch posts
    if (method === 'GET') {
      const status = event.queryStringParameters?.status;
      let query = supabase.from('guest_feed').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // POST: Upload image and create pending post
    if (method === 'POST') {
      const payload = JSON.parse(event.body);
      
      const fileExt = payload.imageExt || 'jpg';
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const buffer = Buffer.from(payload.imageBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

      // 1. Upload to Storage Bucket
      const { error: uploadError } = await supabase.storage
        .from('guest-photos')
        .upload(fileName, buffer, { contentType: `image/${fileExt}` });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage.from('guest-photos').getPublicUrl(fileName);
      const finalImageUrl = publicUrlData.publicUrl;

      // 3. Save to Database
      const { data: dbData, error: dbError } = await supabase.from('guest_feed').insert([{
        guest_name: payload.guestName,
        guest_ref: payload.guestRef || '',
        caption: payload.caption || '',
        image_url: finalImageUrl,
        status: 'pending'
      }]).select().single();

      if (dbError) throw dbError;
      return { statusCode: 201, headers, body: JSON.stringify(dbData) };
    }

    // PATCH: Approve or Reject
    if (method === 'PATCH') {
      const { id, status } = JSON.parse(event.body);
      const { data, error } = await supabase.from('guest_feed').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};