import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Booking {
  id: string;
  bookingReference: string;
  offerId: string;
  slotId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  peopleCount: number;
  specialNote: string;
  status: string;
  createdAt: string;
  offerTitle: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  offerPrice: number;
}

const parseSpecialNote = (note?: string) => {
  if (!note) return { spot: '', payment: '', customNote: '' };
  
  const parts = note.split(' | ');
  let spot = '';
  let payment = '';
  let customNote = '';
  
  parts.forEach(part => {
    if (part.startsWith('Spot:')) {
      spot = part.replace('Spot:', '').trim();
    } else if (part.startsWith('Spot ID:')) {
      spot = part.replace('Spot ID:', '').trim();
    } else if (part.startsWith('Payment:')) {
      payment = part.replace('Payment:', '').trim();
    } else {
      if (part !== 'General Admission' && part !== 'General Area') {
        customNote = part;
      }
    }
  });

  if (!spot && !payment) {
    customNote = note;
  }
  
  return { spot, payment, customNote };
};

export default function CustomerBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Confirmed' | 'Cancelled' | 'Completed'>('All');
  
  // Modal State
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  useEffect(() => {
    if (!token || userRole !== 'Customer') {
      navigate('/login');
      return;
    }
    fetchMyBookings();
  }, [token, navigate]);

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      let serverBookings: Booking[] = [];
      try {
        const response = await axios.get(`${API_BASE_URL}/api/bookings/my-bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        serverBookings = response.data;
      } catch (err) {
        console.warn('API error fetching bookings, falling back to local list if available.', err);
      }

      // Read local bookings from localStorage
      const localKeys = Object.keys(localStorage).filter(key => key.startsWith('booking-detail-'));
      const localBookings: Booking[] = [];
      
      const loggedInEmail = localStorage.getItem('email');
      
      localKeys.forEach(key => {
        try {
          const b = JSON.parse(localStorage.getItem(key) || '');
          // Match by customer email (case insensitive)
          if (b && b.customerEmail && loggedInEmail && b.customerEmail.toLowerCase() === loggedInEmail.toLowerCase()) {
            localBookings.push({
              id: b.id,
              bookingReference: b.bookingReference,
              offerId: b.offerSlotId || b.offerId,
              slotId: b.offerSlotId || b.slotId,
              customerName: b.customerName,
              customerPhone: b.customerPhone,
              customerEmail: b.customerEmail,
              peopleCount: b.peopleCount,
              specialNote: b.specialNote,
              status: b.status,
              createdAt: b.createdAt,
              offerTitle: b.offerTitle,
              slotDate: b.slotDate || (b.startTime ? b.startTime.substring(0, 10) : new Date().toISOString().substring(0, 10)),
              startTime: b.startTime ? (b.startTime.includes('T') ? new Date(b.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : b.startTime) : '12:00',
              endTime: b.endTime ? (b.endTime.includes('T') ? new Date(b.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : b.endTime) : '13:00',
              offerPrice: b.offerPrice
            });
          }
        } catch (e) {
          console.error('Error parsing local booking:', e);
        }
      });

      // Combine and filter out duplicates by bookingReference
      const allBookingsMap = new Map<string, Booking>();
      serverBookings.forEach(b => allBookingsMap.set(b.bookingReference, b));
      localBookings.forEach(b => {
        if (!allBookingsMap.has(b.bookingReference)) {
          allBookingsMap.set(b.bookingReference, b);
        }
      });

      const mergedList = Array.from(allBookingsMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setBookings(mergedList);
      setError(null);
    } catch (err: any) {
      console.error('Error in fetchMyBookings flow:', err);
      setError('Failed to load your bookings. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);
    try {
      await axios.put(
        `${API_BASE_URL}/api/bookings/${cancellingBooking.id}/status`,
        { status: 'Cancelled' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state list
      setBookings(prev =>
        prev.map(b => (b.id === cancellingBooking.id ? { ...b, status: 'Cancelled' } : b))
      );
      
      showToast('Booking cancelled successfully. Capacity released.');
      setCancellingBooking(null);
    } catch (err: any) {
      console.error('Cancellation failed:', err);
      alert('Could not cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'All') return true;
    return b.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25';
      case 'Completed':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/25';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/25';
    }
  };

  return (
    <div className="relative min-h-[80vh] py-6 overflow-hidden">
      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-4s' }}></div>

      <div className="max-w-5xl mx-auto px-4 z-10 relative">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 glass-card bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-emerald-500 animate-slide-in">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold text-sm">{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-slate-200/50 dark:border-slate-800/50">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-outfit">
              My Reservations
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Manage your active discounts, tickets, and check-in schedules.
            </p>
          </div>
          <Link
            to="/"
            className="mt-4 md:mt-0 inline-flex items-center space-x-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Browse More Offers</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8 bg-slate-100/60 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 max-w-md">
          {(['All', 'Confirmed', 'Cancelled', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                filter === tab
                  ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <svg className="animate-spin h-8 w-8 text-violet-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium text-slate-500">Loading your tickets...</span>
          </div>
        ) : error ? (
          <div className="glass-card bg-rose-50 dark:bg-rose-950/10 border border-rose-200/40 dark:border-rose-800/20 p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto">
            <div className="text-rose-500 font-extrabold text-lg">Failed to Load Bookings</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <button
              onClick={fetchMyBookings}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl transition-all"
            >
              Retry
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="glass-card bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 p-12 rounded-3xl text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No bookings found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {filter === 'All'
                ? "You haven't made any bookings yet. Head back to the browse page to discover premium discounts!"
                : `You don't have any bookings matching the status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBookings.map(booking => (
              <div
                key={booking.id}
                className="glass-card bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-lg shadow-slate-100/50 dark:shadow-none hover:shadow-xl hover:scale-[1.01] transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
              >
                {/* Decorative cutouts to look like a ticket */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-full border border-slate-200/50 dark:border-slate-800/50 z-10"></div>
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-full border border-slate-200/50 dark:border-slate-800/50 z-10"></div>

                <div>
                  {/* Top Row: Ref & Status */}
                  <div className="flex items-center justify-between mb-4 border-b border-dashed border-slate-200/80 dark:border-slate-800/80 pb-3">
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Ref: {booking.bookingReference}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>

                  {/* Body Content */}
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight font-outfit mb-1">
                    {booking.offerTitle}
                  </h2>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 my-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Date</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{booking.slotDate}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Time Schedule</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        {booking.startTime.substring(0, 5)} - {booking.endTime.substring(0, 5)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Reserved For</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{booking.peopleCount} {booking.peopleCount === 1 ? 'Person' : 'People'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Value</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">₹{Math.round(booking.offerPrice)}</span>
                    </div>
                  </div>

                  {(() => {
                    const { spot, payment, customNote } = parseSpecialNote(booking.specialNote);
                    return (
                      <div className="space-y-2 mt-2">
                        {/* Spot & Payment Badges */}
                        {(spot || payment) && (
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {spot && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-wider border border-violet-500/10">
                                <span>📍</span>
                                <span>{spot}</span>
                              </span>
                            )}
                            {payment && (
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                                payment.toLowerCase().includes('upi')
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/10'
                                  : payment.toLowerCase().includes('venue')
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/10'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10'
                              }`}>
                                <span>💳</span>
                                <span>{payment}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {customNote && (
                          <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-2xl text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200/20 dark:border-slate-800/45 italic leading-relaxed">
                            " {customNote} "
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Booking actions */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400">
                    Booked on: {new Date(booking.createdAt).toLocaleDateString()}
                  </div>
                  
                  {booking.status === 'Confirmed' && (
                    <button
                      onClick={() => setCancellingBooking(booking)}
                      className="px-3.5 py-1.5 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 dark:text-rose-500 rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Cancel Slot
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-scale-up">
            <div className="text-center">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto text-rose-500 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-outfit">
                Cancel Offer Slot?
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to cancel booking <strong className="text-slate-800 dark:text-slate-200">{cancellingBooking.bookingReference}</strong> for <strong className="text-slate-800 dark:text-slate-200">"{cancellingBooking.offerTitle}"</strong>? This action will immediately release the seat capacity back to the public and cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setCancellingBooking(null)}
                disabled={cancelLoading}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {cancelLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Slot</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
