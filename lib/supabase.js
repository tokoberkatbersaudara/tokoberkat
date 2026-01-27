// lib/supabase.js
// Wajib: sudah load CDN supabase-js sebelum file ini.

const SUPABASE_URL = "https://uorlbeapdkgrnxvttbus.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcmxiZWFwZGtncm54dnR0YnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDYzNjUsImV4cCI6MjA2NTQ4MjM2NX0.NftY81NHUzY6HO4ZwkX1EiTPz2sHLqBnXe5Q3RjSe8o";

// pakai nama db supaya tidak tabrakan dengan global "supabase" dari CDN
window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);