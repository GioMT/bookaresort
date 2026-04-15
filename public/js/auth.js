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

// 4. Logout Function
async function handleLogout() {
  await window.supa.auth.signOut();
  window.location.href = 'login.html';
}