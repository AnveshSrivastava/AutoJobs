import { Routes, Route, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Send, UserCircle } from 'lucide-react';
import DashboardPage from './pages/Dashboard';
import OutreachPage from './pages/Outreach';
import ProfilePage from './pages/Profile';

import LandingPage from './pages/Landing';

function Shell() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: '8px 16px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>AutoJobs</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Job Scraper & Outreach</p>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <NavLink 
            to="/app" 
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink 
            to="/app/outreach" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Send size={18} />
            Outreach
          </NavLink>
          <NavLink 
            to="/app/profile" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <UserCircle size={18} />
            Profiles
          </NavLink>
        </nav>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="outreach" element={<OutreachPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;
