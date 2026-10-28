import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { LogoMark, LogoutIcon, UserIcon } from './Icons';

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (e.key === 'Escape' || (e.type === 'mousedown' && !menuRef.current?.contains(e.target))) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/dashboard" className="topbar__brand">
          <LogoMark /> <span>Momentum</span>
        </Link>
        <nav className="topbar__nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="menu" ref={menuRef}>
          <button
            className="menu__trigger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <Avatar name={user.name} size={34} />
          </button>
          {menuOpen && (
            <div className="menu__popover" role="menu">
              <div className="menu__who">
                <strong>{user.name}</strong>
                <span>@{user.username}</span>
              </div>
              <Link to="/profile" role="menuitem" className="menu__item" onClick={() => setMenuOpen(false)}>
                <UserIcon /> Your profile
              </Link>
              <button role="menuitem" className="menu__item menu__item--danger" onClick={handleLogout}>
                <LogoutIcon /> Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  );
}
