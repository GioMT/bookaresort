// public/js/auth.js

// 1. Replace these with your actual Supabase Project URL and Anon Key!
const SUPA_URL = 'https://aubuwrjwkfxhpuvtlggf.supabase.co';
const SUPA_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YnV3cmp3a2Z4aHB1dnRsZ2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODE4NTcsImV4cCI6MjA5MTc1Nzg1N30.y0vw8T3Cpjfh4dQI8bgMh7iJ8mvERN0_MVoVg7v5zGA';

// 2. Initialize the Supabase frontend client
window.supa = window.supabase.createClient(SUPA_URL, SUPA_ANON_KEY);

// 3. The Security Gate (Checks if user is logged in)
async function enforceAdminAuth() {
  const { data: { session } } = await window.supa.auth.getSession();

  if (!session) {
    // Intruders are sent to the login page
    window.location.replace('login.html');
  } else {
    // Function to safely make the page visible
    const revealPage = () => {
      if (document.body) {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.3s ease';
      }
    };

    // If the browser is still loading, wait. If it's already done, reveal immediately!
    if (document.readyState === 'loading') {
      document.addEventListener("DOMContentLoaded", revealPage);
    } else {
      revealPage();
    }
  }
}

// 4. Logout Function (Upgraded with System Log Sensor)
async function handleLogout() {
  // 1. Try to log the action while the user is still technically logged in
  try {
    const { data: { session } } = await window.supa.auth.getSession();
    
    if (session) {
      // Look up their real name from the staff profiles table
      const { data: profile } = await window.supa.from('staff_profiles').select('first_name, last_name').eq('id', session.user.id).single();
      const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Staff';
      
      // Write the action to the System Logs
      await window.supa.from('system_logs').insert([{ 
        source: 'Internal', 
        actor: name, 
        message: `logged out of the admin panel` 
      }]);
    }
  } catch (e) { 
    // We leave this catch block empty so that if the log fails for any reason,
    // the system ignores it and successfully logs the user out anyway.
  }
  
  // 2. Actually destroy the session and kick them out to the login page
  await window.supa.auth.signOut();
  window.location.replace('login.html');
}