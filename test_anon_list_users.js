const { createClient } = require('@supabase/supabase-js');

// Using the ANON key instead of SERVICE ROLE key
const supabase = createClient(
  'https://aubuwrjwkfxhpuvtlggf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YnV3cmp3a2Z4aHB1dnRsZ2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODE4NTcsImV4cCI6MjA5MTc1Nzg1N30.rQfL8h-Fw_A1uB4k4r2Xp5J-W1h78rWb28N1E0gL_Z0' // Assume this is a generic anon key format. Wait, let me just grab the anon key from auth.js
);

async function test() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.log("Error EXACT message:", error.message);
  } else {
    console.log("Success!");
  }
}

test();
