import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Booking {
  id: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  peopleCount: number;
  specialNote?: string;
  status: string; // Pending, Confirmed, Cancelled, Completed, No Show
  createdAt: string;
  offerTitle: string;
  slotDate: string;
  startTime: string;
  endTime: string;
}

export default function ManageBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bookings`);
      setBookings(response.data);
      setError(null);
    } catch (err) {
      console.warn('API connection failed. Loading local simulated bookings.');
      
      const mockBookings: Booking[] = [
        {
          id: '1',
          bookingReference: 'BK-BUFFET01',
          customerName: 'Alice Smith',
          customerEmail: 'alice@example.com',
          customerPhone: '+1 (555) 012-3456',
          peopleCount: 3,
          specialNote: 'No nuts, allergic.',
          status: 'Confirmed',
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          offerTitle: '50% Off Premium Lunch Buffet',
          slotDate: new Date(Date.now() + 3600000 * 2).toISOString().substring(0, 10),
          startTime: '11:30',
          endTime: '12:30'
        },
        {
          id: '2',
          bookingReference: 'BK-BUFFET02',
          customerName: 'Bob Johnson',
          customerEmail: 'bob@example.com',
          customerPhone: '+1 (555) 987-6543',
          peopleCount: 2,
          status: 'Confirmed',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          offerTitle: '50% Off Premium Lunch Buffet',
          slotDate: new Date(Date.now() + 3600000 * 2).toISOString().substring(0, 10),
          startTime: '11:30',
          endTime: '12:30'
        },
        {
          id: '3',
          bookingReference: 'BK-HAPPY001',
          customerName: 'Charlie Davis',
          customerEmail: 'charlie@example.com',
          customerPhone: '+1 (555) 444-5555',
          peopleCount: 4,
          specialNote: 'Window booth.',
          status: 'Confirmed',
          createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
          offerTitle: 'Happy Hour Draft & Tapas Combo',
          slotDate: new Date(Date.now() + 3600000 * 24).toISOString().substring(0, 10),
          startTime: '16:00',
          endTime: '17:30'
        },
        {
          id: '4',
          bookingReference: 'BK-HAPPY002',
          customerName: 'Diana Prince',
          customerEmail: 'diana@example.com',
          customerPhone: '+1 (555) 777-8888',
          peopleCount: 4,
          status: 'Pending',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          offerTitle: 'Happy Hour Draft & Tapas Combo',
          slotDate: new Date(Date.now() + 3600000 * 24).toISOString().substring(0, 10),
          startTime: '16:00',
          endTime: '17:30'
        }
      ];

      setBookings(mockBookings);
      setError('System operating in Offline Demo mode. API connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await axios.put(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
        status: newStatus
      });
      alert(`Booking reference updated to ${newStatus}`);
      fetchBookings();
    } catch (err) {
      // Simulation offline update
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      alert(`API offline. Simulating booking status update to "${newStatus}" locally.`);
    }
  };

  // Filter bookings
  const filteredBookings = statusFilter === 'All' 
    ? bookings 
    : bookings.filter(b => b.status === statusFilter);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Manage Bookings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Review guest arrivals, approve pending reservations, or mark cancellations.</p>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl text-xs sm:text-sm font-medium flex items-center space-x-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        {['All', 'Pending', 'Confirmed', 'Cancelled', 'Completed', 'No Show'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              statusFilter === status 
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading bookings database...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-xs font-semibold tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Reserved Offer & Slot</th>
                <th className="px-6 py-4">Guests</th>
                <th className="px-6 py-4">Special Notes</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-350">
                      {b.bookingReference}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{b.customerName}</div>
                      <div className="text-xs text-slate-400">{b.customerPhone}</div>
                      {b.customerEmail && <div className="text-xs text-slate-400 mt-0.5">{b.customerEmail}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-300">{b.offerTitle}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                        <span>{new Date(b.slotDate).toLocaleDateString()}</span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>{b.startTime} - {b.endTime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {b.peopleCount}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {b.specialNote || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        b.status === 'Pending' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' :
                        b.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                        b.status === 'Completed' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Action Dropdown Selector */}
                      <select
                        value={b.status}
                        onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-1 focus:ring-violet-600 dark:focus:ring-violet-400"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Completed">Completed</option>
                        <option value="No Show">No Show</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No reservations matched this status criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
