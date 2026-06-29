import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL ERROR: Supabase Environment Variables are missing!');
  // Menampilkan pesan error di layar agar layar tidak blank putih
  if (typeof document !== 'undefined') {
    setTimeout(() => {
      document.body.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif; text-align: center; color: #ef4444;">
          <h1 style="font-size: 24px; font-weight: bold;">⚠️ Konfigurasi Vercel Belum Lengkap!</h1>
          <p style="color: #333; margin-top: 10px;">Aplikasi gagal dimuat karena <b>VITE_SUPABASE_URL</b> dan <b>VITE_SUPABASE_ANON_KEY</b> belum terbaca oleh sistem.</p>
          <div style="background: #f8717122; border: 1px solid #ef4444; padding: 15px; border-radius: 8px; max-width: 500px; margin: 20px auto; text-align: left;">
            <b>Cara Memperbaiki:</b><br/>
            1. Buka Dashboard Vercel Anda.<br/>
            2. Ke menu <b>Settings > Environment Variables</b>.<br/>
            3. Pastikan ke-4 variabel rahasia Anda sudah ada di daftar.<br/>
            4. <b>SANGAT PENTING:</b> Pergi ke tab <b>Deployments</b>, klik titik tiga (...), lalu pilih <b>Redeploy</b>.<br/>
            <i>(Vercel harus melakukan redeploy agar mengenali kunci tersebut)</i>
          </div>
        </div>
      `;
    }, 100);
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);
