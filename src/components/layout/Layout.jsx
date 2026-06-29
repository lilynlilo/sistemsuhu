import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, LineChart, History, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

const mobileMenuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/charts',    icon: LineChart,       label: 'Grafik' },
  { path: '/history',   icon: History,         label: 'History' },
  { path: '/settings',  icon: Settings,        label: 'Setting' },
];

export default function Layout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const visibleMobileMenu = mobileMenuItems.filter(item =>
    item.path !== '/settings' || isAuthenticated
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar — only visible on md and above */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main
          className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20 md:pb-6"
          style={{ background: 'var(--bg-primary)' }}
        >
          <div className="page-enter max-w-screen-xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation — only visible on mobile (below md) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t bottom-nav"
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--border-color)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {visibleMobileMenu.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 py-2 px-3 transition-all duration-200 relative"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {isActive && (
                <span
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
