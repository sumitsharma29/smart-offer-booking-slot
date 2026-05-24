import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to call real API
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      });

      const { token, role, name, businessId } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('email', email);
      localStorage.setItem('role', role);
      if (name) {
        localStorage.setItem('name', name);
      }
      if (businessId) {
        localStorage.setItem('businessId', businessId);
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        navigate(redirect);
      } else if (role === 'Customer') {
        navigate('/customer/bookings');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      console.warn('API connection failed. Falling back to Hackathon Offline Demo mode.', err);
      
      // Check if it's a validation error or connection error
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
        setLoading(false);
      } else {
        // API offline fallback for demo purposes
        // Log in immediately with mock credentials
        const mockRole = email.includes('customer') ? 'Customer' : email.includes('merchant') ? 'Business' : 'Admin';
        localStorage.setItem('token', 'mock-jwt-token-hackathon-2026');
        localStorage.setItem('email', email);
        localStorage.setItem('role', mockRole);
        localStorage.setItem('name', email.split('@')[0]);
        localStorage.setItem('businessId', 'c3b346af-bdde-4c5c-9a52-87a4601a9400'); // gourmet bistro id from seeder
        
        setError(null);
        setLoading(false);
        alert('Backend API is offline. Automatically logging you in via [Hackathon Offline Demo Mode] for demonstration purposes.');
        
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect) {
          navigate(redirect);
        } else if (mockRole === 'Customer') {
          navigate('/customer/bookings');
        } else {
          navigate('/admin');
        }
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col md:flex-row rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-100 dark:shadow-none transition-all duration-300">
      {/* Left Column: Visual panel */}
      <div className="w-full md:w-1/2 bg-gradient-to-tr from-violet-600 to-indigo-800 p-8 sm:p-12 flex flex-col justify-between text-white relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="flex items-center space-x-2 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-white text-indigo-700 flex items-center justify-center font-bold text-lg">
            S
          </div>
          <span className="font-bold text-lg tracking-wider">SMARTSLOT ENTERPRISE</span>
        </div>

        <div className="my-16 md:my-0 space-y-6 relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
            Seamlessly Manage Your Booking Slots
          </h1>
          <p className="text-indigo-100/90 text-sm sm:text-base leading-relaxed">
            Gain full control of your retail discounts, create flash slot schedules, monitor reservations in real time, and maximize capacity.
          </p>
          <div className="flex space-x-4 pt-2">
            <div className="flex items-center space-x-2 text-xs text-indigo-200 bg-indigo-750/30 px-3 py-1.5 rounded-full border border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Pessimistic Concurrency Enabled</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-indigo-200 bg-indigo-750/30 px-3 py-1.5 rounded-full border border-indigo-500/20">
              <span>Dark Theme Integrated</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-indigo-200/60 relative z-10">
          &copy; {new Date().getFullYear()} SmartSlot booking platform. Powered by Clean Architecture .NET 8 & React.
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white dark:bg-slate-900">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sign in to admin dashboard
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Please enter your business credentials to manage offers.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="merchant@bistro.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-600 dark:focus:ring-violet-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-600 dark:focus:ring-violet-400 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-slate-500 dark:text-slate-400">
                  Remember me
                </label>
              </div>

              <div className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                Forgot password?
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-violet-500/10 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Sign In'}
            </button>
            <div className="text-center pt-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                Don't have an account?{' '}
                <Link to="/register" className="text-violet-600 dark:text-violet-400 font-bold hover:underline">
                  Sign Up
                </Link>
              </span>
            </div>
          </form>

          {/* Quick Demo Assist */}
          <div className="mt-6 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 space-y-2">
            <div className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Hackathon Quick Access:
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Use <strong className="text-slate-800 dark:text-slate-200">merchant@bistro.com</strong> and password <strong className="text-slate-800 dark:text-slate-200">password123</strong> to experience the fully functional merchant dashboard.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
