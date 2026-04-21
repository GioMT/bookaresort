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
      return { statusCode: 403, body: JSON.stringify({ error: "Access Denied: Only the Master Admin can update employee details." }) };
    }

    const { id, firstName, lastName, phone, email } = JSON.parse(event.body);

    if (!id || !firstName || !lastName) {
      throw new Error("Missing required fields.");
    }

    // Update staff_profiles
    const { error: profileErr } = await supabase.from('staff_profiles').update({
      first_name: firstName,
      last_name: lastName,
      phone: phone || ''
    }).eq('id', id);
    if (profileErr) throw profileErr;

    // Update auth.users (email) if provided
    if (email) {
      const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(id, {
        email: email,
        email_confirm: true // auto confirm the new email
      });
      if (updateAuthErr) throw updateAuthErr;
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Employee updated successfully.' }) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};
