// use native fetch
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aubuwrjwkfxhpuvtlggf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YnV3cmp3a2Z4aHB1dnRsZ2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE4MTg1NywiZXhwIjoyMDkxNzU3ODU3fQ.kz1_ydC7DtYvxdKuzkDsqa7QltOJHTEwBQFlit0gKSs'
);

async function testApi() {
  console.log("Logging in...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@login.com',
    password: 'Admin8888!'
  });

  if (authErr) {
    console.error("Login failed:", authErr.message);
    return;
  }

  const token = authData.session.access_token;
  console.log("Logged in. Fetching /api/get-employees from localhost:3999...");

  try {
    const res = await fetch('http://localhost:8888/api/get-employees', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log("Status:", res.status);
    const body = await res.text();
    console.log("Body:", body);
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testApi();
