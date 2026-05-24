import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  type: 'SMS' | 'Email' | 'System';
  message: string;
  time: string;
  read: boolean;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('email') || '';
  });

  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('role') || '';
  });

  // Notification Drawer State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Sync auth state on navigation
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
    setUserEmail(localStorage.getItem('email') || '');
    setUserRole(localStorage.getItem('role') || '');
  }, [location]);

  // Listen to custom 'new-booking' event for real-time SMS/Email notification simulation
  useEffect(() => {
    const handleNewBooking = (e: Event) => {
      const customEvent = e as CustomEvent;
      const booking = customEvent.detail;
      if (!booking) return;

      const newNotifs: Notification[] = [
        {
          id: 'sms-' + Math.random().toString(36).substring(2, 9),
          type: 'SMS',
          message: `📲 SMS Sent to ${booking.customerPhone}: Booking ${booking.bookingReference} confirmed for "${booking.offerTitle}"!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          read: false
        },
        {
          id: 'email-' + Math.random().toString(36).substring(2, 9),
          type: 'Email',
          message: `✉️ Email Sent to ${booking.customerEmail}: Booking confirmation invoice details generated.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          read: false
        }
      ];

      setNotifications(prev => [...newNotifs, ...prev]);
      setUnreadCount(c => c + 2);
      setIsDrawerOpen(true); // Auto expand drawer to show it in action!
    };

    window.addEventListener('new-booking', handleNewBooking);
    return () => window.removeEventListener('new-booking', handleNewBooking);
  }, []);

  // Close notification drawer when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
    if (!isDrawerOpen) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    localStorage.removeItem('businessId');
    setIsLoggedIn(false);
    navigate('/login');
  };

  // Nav link helper
  const isLinkActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-450">
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 dark:border-slate-900/50 bg-white/75 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/10 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:6px_6px]"></div>
              <svg className="w-5 h-5 text-white animate-pulse relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
                <path d="M16.5 12h.01M7.5 12h.01" strokeWidth={3} />
              </svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-300 font-outfit">
              Smart<span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-300">Slot</span>
            </span>
          </Link>

          {/* Navigation Links - Center */}
          <nav className="hidden lg:flex items-center space-x-1.5 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
            <Link 
              to="/" 
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                isLinkActive('/') 
                  ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-slate-800 shadow-sm border border-slate-200/30 dark:border-slate-700/20' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Browse Offers
            </Link>
            {isLoggedIn && (
              <>
                {(userRole === 'Business' || userRole === 'Admin') && (
                  <>
                    <Link 
                      to="/admin" 
                      className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                        isLinkActive('/admin') 
                          ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-slate-800 shadow-sm border border-slate-200/30 dark:border-slate-700/20' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Console
                    </Link>
                    <Link 
                      to="/admin/offers" 
                      className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                        isLinkActive('/admin/offers') 
                          ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-slate-800 shadow-sm border border-slate-200/30 dark:border-slate-700/20' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Offers
                    </Link>
                    <Link 
                      to="/admin/bookings" 
                      className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                        isLinkActive('/admin/bookings') 
                          ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-slate-800 shadow-sm border border-slate-200/30 dark:border-slate-700/20' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Bookings
                    </Link>
                  </>
                )}
                {userRole === 'Customer' && (
                  <Link 
                    to="/customer/bookings" 
                    className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                      isLinkActive('/customer/bookings') 
                        ? 'text-violet-600 dark:text-violet-400 bg-white dark:bg-slate-800 shadow-sm border border-slate-200/30 dark:border-slate-700/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    My Bookings
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Navigation & Controls - Right */}
          <div className="flex items-center space-x-1.5 sm:space-x-3.5 flex-shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                {/* User email badge */}
                <div className="hidden xl:flex flex-col items-end pr-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{userEmail.split('@')[0]}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{userRole} Profile</span>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-[11px] sm:text-xs font-bold transition-all hover:border-rose-300 dark:hover:border-rose-900 hover:text-rose-600 dark:hover:text-rose-400 flex-shrink-0"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                <Link
                  to="/login"
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-colors flex-shrink-0"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-sm transition-all transform hover:-translate-y-0.5 flex-shrink-0"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800 flex-shrink-0"></div>

            {/* Notification Bell with Simulator Drawer */}
            <div className="relative flex-shrink-0" ref={drawerRef}>
              <button
                onClick={handleToggleDrawer}
                className={`p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex-shrink-0 ${
                  isDrawerOpen ? 'bg-slate-100 dark:bg-slate-900 ring-2 ring-violet-500/10' : ''
                }`}
                aria-label="Notifications Log"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>

              {/* Notification Drawer Dropdown */}
              {isDrawerOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-scale-up">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                      <h4 className="font-extrabold text-sm font-outfit">Simulation Alerts</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Real-time SMS & email trigger dispatch logs.</p>
                    </div>
                    <div className="flex space-x-2">
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearNotifications}
                          className="text-[10px] text-rose-500 hover:underline font-bold uppercase tracking-wider"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase tracking-wider"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className="p-4 space-y-2 hover:bg-slate-50/70 dark:hover:bg-slate-900/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase ${
                              n.type === 'SMS' 
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' 
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            }`}>
                              {n.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium font-mono">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                            {n.message}
                          </p>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 dark:bg-indigo-400 w-full animate-pulse"></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center space-y-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <p className="text-xs text-slate-400 px-6 leading-relaxed">
                          No recent system alerts. Select and book a slot on the details page to trigger live SMS/Email simulation notifications.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex-shrink-0"
              aria-label="Toggle Theme"
            >
              {darkMode ? (
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Links Row - visible only on small screens */}
      <div className="lg:hidden w-full bg-white/95 dark:bg-slate-950/95 border-b border-slate-200/50 dark:border-slate-900/50 backdrop-blur-sm transition-colors sticky top-16 z-30">
        <div className="flex justify-around text-[10px] font-black uppercase tracking-wider px-2">
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 flex-1 transition-colors ${isLinkActive('/') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="truncate">Browse</span>
          </Link>
          {isLoggedIn && (userRole === 'Business' || userRole === 'Admin') && (
            <>
              <Link to="/admin" className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 flex-1 transition-colors ${isLinkActive('/admin') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="truncate">Console</span>
              </Link>
              <Link to="/admin/offers" className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 flex-1 transition-colors ${isLinkActive('/admin/offers') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="truncate">Offers</span>
              </Link>
              <Link to="/admin/bookings" className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 flex-1 transition-colors ${isLinkActive('/admin/bookings') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="truncate">Bookings</span>
              </Link>
            </>
          )}
          {isLoggedIn && userRole === 'Customer' && (
            <Link to="/customer/bookings" className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 flex-1 transition-colors ${isLinkActive('/customer/bookings') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span className="truncate">My Tickets</span>
            </Link>
          )}
          {!isLoggedIn && (
            <>
              <Link to="/login" className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 flex-1 transition-colors text-slate-500 dark:text-slate-400`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="truncate">Sign In</span>
              </Link>
              <Link to="/register" className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 flex-1 transition-colors text-violet-600 dark:text-violet-400`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="truncate">Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/60 dark:border-slate-900/70 bg-white dark:bg-slate-950/70 py-12 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-200/50 dark:border-slate-900/50 text-sm">
            {/* Logo and Intro */}
            <div className="space-y-4 md:col-span-2 pr-0 md:pr-12">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                  S
                </div>
                <span className="font-extrabold text-base font-outfit text-slate-800 dark:text-white">SmartSlot Booking</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                The premier spot-locking and real-time concurrency-secured discount slot coordinator. Find, reserve, and scan flash offers in seconds.
              </p>
            </div>

            {/* Platform Quick links */}
            <div className="space-y-3.5">
              <h5 className="font-bold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">Platform</h5>
              <ul className="space-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <li><Link to="/" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Browse Offers</Link></li>
                <li><Link to="/login" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Merchant Portal</Link></li>
                <li><Link to="/register" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Customer Register</Link></li>
              </ul>
            </div>

            {/* Newsletter Simulation */}
            <div className="space-y-3.5">
              <h5 className="font-bold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">Special Releases</h5>
              <div className="flex space-x-2">
                <input 
                  type="email" 
                  placeholder="Enter email"
                  className="px-3 py-1.5 w-full border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <button 
                  onClick={() => alert('Successfully joined the notification dispatch list!')}
                  className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Join
                </button>
              </div>
              <p className="text-[10px] text-slate-400">Subscribe for early slots access notifications.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 dark:text-slate-500 mt-8 font-medium">
            <div>
              © {new Date().getFullYear()} SmartSlot Booking Systems Ltd. All rights reserved.
            </div>
            <div className="flex space-x-5 mt-4 sm:mt-0 font-semibold">
              <span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Support Desk</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
