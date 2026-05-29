import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }    from './context/AuthContext';
import { ThemeProvider }   from './context/ThemeContext';
import { SensorProvider }  from './context/SensorContext';
import ProtectedRoute      from './components/auth/ProtectedRoute';
import Layout              from './components/layout/Layout';
import Login               from './pages/Login';
import Dashboard           from './pages/Dashboard';
import Charts              from './pages/Charts';
import History             from './pages/History';
import Settings            from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SensorProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="charts"    element={<Charts />} />
                <Route path="history"   element={<History />} />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </SensorProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
