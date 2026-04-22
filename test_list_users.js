const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aubuwrjwkfxhpuvtlggf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YnV3cmp3a2Z4aHB1dnRsZ2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE4MTg1NywiZXhwIjoyMDkxNzU3ODU3fQ.kz1_ydC7DtYvxdKuzkDsqa7QltOJHTEwBQFlit0gKSs'
);

async function test() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error from listUsers:", error.message);
  } else {
    console.log("Success! Users count:", data.users.length);
  }
}

test();
