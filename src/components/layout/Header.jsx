import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard',   subtitle: 'Monitoring suhu real-time' },
  '/charts':    { title: 'Grafik',      subtitle: 'Visualisasi data sensor' },
  '/history':   { title: 'History',     subtitle: 'Riwayat data historis' },
  '/settings':  { title: 'Pengaturan',  subtitle: 'Konfigurasi sistem' },
};

export default function Header() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout }        = useAuth();
  const location                = useLocation();
  const navigate                = useNavigate();
  const pageInfo                = PAGE_TITLES[location.pathname] || { title: 'HydroControl', subtitle: '' };

  return (
    <header
      className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b backdrop-blur-sm"
      style={{
        background:   'var(--header-bg)',
        borderColor:  'var(--border-color)',
      }}
    >
      {/* ── Page Title ── */}
      <div>
        <h1 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
          {pageInfo.title}
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {pageInfo.subtitle}
        </p>
      </div>

      {/* ── Right Actions ── */}
      <div className="flex items-center gap-3">


        {/* Theme Toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          title={isDark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
          id="theme-toggle"
        >
          <motion.div
            key={isDark ? 'moon' : 'sun'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0,   opacity: 1 }}
            exit={{ rotate: 90,    opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.div>
        </motion.button>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: 'var(--border-color)' }} />

        {/* User Badge / Login Component */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'var(--accent)' }}
              >
                {user?.username?.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {user?.username}
                </p>
                <p className="text-xs" style={{ color: isDark ? 'white' : 'var(--text-muted)' }}>admin</p>
              </div>
            </div>

            {/* Logout */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={logout}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{ color: 'var(--text-muted)' }}
              title="Logout"
              id="logout-btn"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all shadow-sm hover:opacity-90 ml-2"
            style={{ background: 'var(--accent)' }}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Login Admin</span>
          </motion.button>
        )}
      </div>
    </header>
  );
}
