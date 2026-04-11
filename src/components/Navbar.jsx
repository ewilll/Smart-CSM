import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Droplets, User, LayoutDashboard, LogOut } from 'lucide-react';
import { getCurrentUser, logoutUser } from '../utils/auth';
import '../index.css';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    navigate('/');
  };

  const isActive = (path) => {
    if (path.includes('#')) {
      const [pathname, hash] = path.split('#');
      return location.pathname === pathname && location.hash === `#${hash}`;
    }
    if (path === '/') {
      return location.pathname === '/' && location.hash === '';
    }
    return location.pathname === path;
  };

  const getLinkClass = (path) => {
    return `text-base font-bold tracking-tight transition-colors ${isActive(path) ? 'text-blue-600' : 'text-slate-800 hover:text-blue-600'}`;
  };

  const getMobileLinkClass = (path) => {
    return `block px-3 py-3 rounded-lg text-base font-medium transition-colors ${isActive(path) ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'}`;
  };

  const handleNavClick = (e, path) => {
    setIsOpen(false);
    if (path.startsWith('/#')) {
      const id = path.substring(2);
      const element = document.getElementById(id);
      if (element) {
        e.preventDefault();
        navigate(path);
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (path === '/') {
      // If we're already on home but have a hash, clear it and scroll up
      if (location.pathname === '/' && location.hash) {
        e.preventDefault();
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        <div className="flex items-center justify-between h-20 sm:h-24">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="bg-blue-600 rounded-lg p-1.5">
              <Droplets className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-slate-800 leading-none tracking-tight">Prime<span className="text-blue-600">Water</span></span>
              <span className="text-xs text-slate-600 font-bold uppercase tracking-widest mt-0.5">Smart CSM</span>
            </div>
          </Link>
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 lg:gap-10">
            <Link to="/" onClick={(e) => handleNavClick(e, '/')} className={getLinkClass('/')}>Plans and Services</Link>
            <Link to="/#services" onClick={(e) => handleNavClick(e, '/#services')} className={getLinkClass('/#services')}>Why PrimeWater?</Link>
            <Link to="/customer-service" className={getLinkClass('/customer-service')}>Customer Service</Link>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md flex items-center gap-2">
                  <LayoutDashboard size={18} />
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 border border-slate-200 font-black text-xs">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Logged In</span>
                    <span className="text-xs font-bold text-slate-800">{user.name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Link to="/signup" className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg">
                  Sign Up
                </Link>
                <Link to="/login" className="px-6 py-2.5 rounded-lg border-2 border-slate-200 hover:border-blue-600 text-slate-700 hover:text-blue-600 font-bold text-sm transition-all flex items-center gap-2">
                  <User size={18} />
                  My Account
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-blue-600 p-2"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full left-0 animate-slide-up shadow-xl">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link to="/" className={getMobileLinkClass('/')} onClick={(e) => handleNavClick(e, '/')}>Plans and Services</Link>
            <Link to="/#services" className={getMobileLinkClass('/#services')} onClick={(e) => handleNavClick(e, '/#services')}>Why PrimeWater?</Link>
            <Link to="/customer-service" className={getMobileLinkClass('/customer-service')}>Customer Service</Link>
            {user ? (
              <>
                <div className="mt-4 px-3 py-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{user.name}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Authenticated Session</span>
                  </div>
                </div>
                <Link to="/dashboard" className="block px-3 py-3 mt-2 text-center rounded-lg bg-blue-600 text-white font-bold shadow-md" onClick={() => setIsOpen(false)}>Go to Dashboard</Link>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-3 mt-2 text-center rounded-lg bg-rose-50 text-rose-600 font-bold border border-rose-100 flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-3 py-3 mt-4 text-center rounded-lg bg-slate-100 text-slate-700 font-bold" onClick={() => setIsOpen(false)}>My Account</Link>
                <Link to="/signup" className="block px-3 py-3 text-center rounded-lg bg-orange-500 text-white font-bold shadow-md" onClick={() => setIsOpen(false)}>Sign Up Now</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
