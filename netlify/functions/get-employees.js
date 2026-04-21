const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY 
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader) throw new Error("Missing authorization token.");
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid or expired session.");

    const { data: profile } = await supabase.from('staff_profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'master') {
      return { statusCode: 403, body: JSON.stringify({ error: "Access Denied: Only the Master Admin can view employee emails." }) };
    }

    // Fetch staff profiles
    const { data: staffProfiles, error: staffErr } = await supabase.from('staff_profiles').select('*').order('created_at', { ascending: true });
    if (staffErr) throw staffErr;

    // Fetch auth users
    const { data: authUsers, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) throw usersErr;

    // Join data
    const staffList = staffProfiles.map(staff => {
      const authUser = authUsers.users.find(u => u.id === staff.id);
      return {
        ...staff,
        email: authUser ? authUser.email : 'No Email'
      };
    });

    return { statusCode: 200, body: JSON.stringify(staffList) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};
