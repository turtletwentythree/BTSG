import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';

const TITLES = { '/create-requests': 'Create Request', '/dashboard': 'Dashboard' };

export default function Layout() {
  const { user, logout } = useApp();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sub, setSub] = useState(true);
  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="btn-icon hamburger" onClick={() => setOpen(!open)} aria-label="menu">
          <i className="mdi mdi-menu" />
        </button>
        <span className="topbar-title" style={{ cursor: 'pointer' }} onClick={() => nav('/')}>{TITLES[pathname] || 'Legal Request System'}</span>
        <div className="user-wrap">
          <button className="user-btn" onClick={() => setMenu(!menu)}>{user.name}</button>
          {menu && (
            <div className="user-menu">
              <a href="/login" onClick={(e) => { e.preventDefault(); logout().then(() => nav('/login')); }}>
                <i className="mdi mdi-logout text-muted me-1" /> Logout
              </a>
            </div>
          )}
        </div>
      </header>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <NavLink to="/dashboard" className="side-item side-dash">
          <i className="ri-dashboard-fill" /><span>Dashboard</span>
        </NavLink>
        <button className="side-item side-parent active" onClick={() => setSub(!sub)}>
          <i className="ri-file-3-fill" />
          <span>Request</span>
          <i className={'mdi ' + (sub ? 'mdi-chevron-down' : 'mdi-chevron-right') + ' chev'} />
        </button>
        {sub && (
          <div className="side-sub">
            <NavLink to="/" end className="side-link">Request List</NavLink>
            <NavLink to="/all-type-request" end className="side-link">All Request</NavLink>
            <NavLink to="/create-requests" className="side-link">Create Request</NavLink>
          </div>
        )}
      </aside>

      <main className="content"><Outlet /></main>
    </div>
  );
}
