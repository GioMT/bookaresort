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
    // Intruders are instantly sent to the login page.
    // Using .replace() means they can't just hit the "Back" button to bypass it.
    window.location.replace('login.html');
  } else {
    // Authorized admins get to see the page!
    // We wait for the page to finish loading before trying to change the body style.
    document.addEventListener("DOMContentLoaded", () => {
      document.body.style.opacity = '1';
      document.body.style.transition = 'opacity 0.3s ease';
    });
  }
}

// 4. Logout Function
async function handleLogout() {
  await window.supa.auth.signOut();
  window.location.href = 'login.html';
}