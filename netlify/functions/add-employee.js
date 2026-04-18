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

    // 1. Get the custom business tag
    const { data: contentData } = await supabase.from('site_content').select('value').eq('key', 'business_tag').single();
    const tag = (contentData && contentData.value) ? contentData.value : 'VLKN';

    // 2. Find the highest existing ID with this tag
    const { data: existingStaff } = await supabase.from('staff_profiles')
      .select('emp_id')
      .ilike('emp_id', `${tag}%`)
      .order('emp_id', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (existingStaff && existingStaff.length > 0 && existingStaff[0].emp_id) {
      const highestStr = existingStaff[0].emp_id.replace(tag, '');
      const highestNum = parseInt(highestStr, 10);
      if (!isNaN(highestNum)) nextNum = highestNum + 1;
    }
    const newEmpId = `${tag}${String(nextNum).padStart(4, '0')}`;

    // 3. Create Auth User
    const { data: newAuthUser, error: createErr } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    });
    if (createErr) throw createErr;

    // 4. Create Staff Profile with new emp_id
    const { error: profileErr } = await supabase.from('staff_profiles').insert([{
      id: newAuthUser.user.id,
      emp_id: newEmpId,
      first_name: firstName,
      last_name: lastName,
      phone: phone || '',
      role: 'staff'
    }]);
    if (profileErr) throw profileErr;

    return { statusCode: 200, body: JSON.stringify({ message: `Employee account created! ID: ${newEmpId}`, emp_id: newEmpId }) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};