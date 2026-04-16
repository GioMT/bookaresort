const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY 
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader) throw new Error("Missing authorization token.");
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid or expired session.");

    const { data: profile } = await supabase.from('staff_profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'master') {
      return { statusCode: 403, body: JSON.stringify({ error: "Access Denied: Only the Master Admin can create accounts." }) };
    }

    const { email, password, firstName, lastName, phone } = JSON.parse(event.body);

    const { data: newAuthUser, error: createErr } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    });
    if (createErr) throw createErr;

    const { error: profileErr } = await supabase.from('staff_profiles').insert([{
      id: newAuthUser.user.id,
      first_name: firstName,
      last_name: lastName,
      phone: phone || '',
      role: 'staff'
    }]);
    if (profileErr) throw profileErr;

    return { statusCode: 200, body: JSON.stringify({ message: "Employee account created successfully!" }) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};