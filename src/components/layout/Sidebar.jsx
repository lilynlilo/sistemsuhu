import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, LineChart, History, Settings,
  Leaf, ChevronLeft, ChevronRight, Wifi
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/charts',    icon: LineChart,       label: 'Grafik' },
  { path: '/history',   icon: History,          label: 'History' },
  { path: '/settings',  icon: Settings,         label: 'Pengaturan' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  
  const currentMenuItems = menuItems.filter(item => 
    item.path !== '/settings' || isAuthenticated
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative hidden md:flex flex-col h-screen shrink-0 overflow-hidden border-r z-20"
      style={{
        background:   'var(--sidebar-bg)',
        borderColor:  'var(--border-color)',
        boxShadow:    'var(--shadow)',
      }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                HydroControl
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Monitoring System
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>



      {/* ── Nav Menu ── */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {currentMenuItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
              ${isActive
                ? 'font-semibold'
                : 'hover:opacity-80'
              }`
            }
            style={({ isActive }) => {
              const isSettings = path === '/settings';
              return {
                background: isActive ? 'var(--accent)' : (isSettings ? 'var(--accent-light)' : 'transparent'),
                color:      isActive ? '#fff' : (isSettings ? 'var(--accent)' : 'var(--text-secondary)'),
              };
            }}
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'var(--accent)' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18 }}
                      className="text-sm relative z-10 whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Version ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4"
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
             2026
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapse Button ── */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full border flex items-center justify-center z-30 transition-colors hover:opacity-80"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </motion.aside>
  );
}
