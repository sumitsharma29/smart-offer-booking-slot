import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Offer {
  id: string;
  title: string;
  category: string;
  originalPrice: number;
  offerPrice: number;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  status: string;
}

export default function ManageOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      // Fetch status='all' to see drafts, paused, cancelled, etc.
      const response = await axios.get(`${API_BASE_URL}/api/offers?status=all`);
      setOffers(response.data);
      setError(null);
    } catch (err) {
      console.warn('API connection failed. Loading custom offers from Local Demo storage.');
      const localOffers = JSON.parse(localStorage.getItem('customOffers') || '[]');
      
      const mockOffers: Offer[] = [
        {
          id: 'offer-1',
          title: '50% Off Premium Lunch Buffet',
          category: 'Lunch Hour',
          originalPrice: 50.00,
          offerPrice: 25.00,
          discountPercentage: 50.00,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 3600000 * 240).toISOString(),
          status: 'Active'
        },
        {
          id: 'offer-2',
          title: 'Happy Hour Draft & Tapas Combo',
          category: 'Happy Hour',
          originalPrice: 30.00,
          offerPrice: 14.50,
          discountPercentage: 51.60,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 3600000 * 240).toISOString(),
          status: 'Active'
        }
      ];

      // Merge unique
      const apiIds = new Set(localOffers.map((o: any) => o.id));
      const merged = [
        ...mockOffers.filter(o => !apiIds.has(o.id)),
        ...localOffers
      ];

      setOffers(merged);
      setError('System operating in Offline Demo mode. API connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (offerId: string, newStatus: string) => {
    try {
      // Find full details to resubmit or update via partial
      const offerToUpdate = offers.find(o => o.id === offerId);
      if (!offerToUpdate) return;

      const payload = {
        businessId: localStorage.getItem('businessId') || 'c3b346af-bdde-4c5c-9a52-87a4601a9400',
        title: offerToUpdate.title,
        originalPrice: offerToUpdate.originalPrice,
        offerPrice: offerToUpdate.offerPrice,
        discountPercentage: offerToUpdate.discountPercentage,
        category: offerToUpdate.category,
        startDate: offerToUpdate.startDate,
        endDate: offerToUpdate.endDate,
        status: newStatus
      };

      await axios.put(`${API_BASE_URL}/api/offers/${offerId}`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert(`Offer status updated to ${newStatus}`);
      fetchOffers();
    } catch (err) {
      // Offline mode mock update
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: newStatus } : o));
      
      // Update in localStorage list
      const localOffers = JSON.parse(localStorage.getItem('customOffers') || '[]');
      const updatedLocal = localOffers.map((o: any) => o.id === offerId ? { ...o, status: newStatus } : o);
      localStorage.setItem('customOffers', JSON.stringify(updatedLocal));
      
      alert(`API offline. Simulating status update to "${newStatus}" locally.`);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer? This will delete all generated slots.')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/offers/${offerId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert('Offer deleted successfully.');
      fetchOffers();
    } catch (err) {
      // Offline mock delete
      setOffers(prev => prev.filter(o => o.id !== offerId));
      
      const localOffers = JSON.parse(localStorage.getItem('customOffers') || '[]');
      const updatedLocal = localOffers.filter((o: any) => o.id !== offerId);
      localStorage.setItem('customOffers', JSON.stringify(updatedLocal));

      alert('API offline. Simulating deletion locally.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading offers catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Manage Offers</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review active, draft, paused, or cancelled promotions.</p>
        </div>
        <Link
          to="/admin/create-offer"
          className="flex items-center space-x-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/10 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Offer</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl text-xs sm:text-sm font-medium flex items-center space-x-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Offers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-xs font-semibold tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Offer Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price / Discount</th>
                <th className="px-6 py-4">Duration Range</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {offers.length > 0 ? (
                offers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {o.title}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                      {o.category}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">₹{Math.round(o.offerPrice)}</span>
                        <span className="text-xs text-slate-400 line-through">₹{Math.round(o.originalPrice)}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                        Save {Math.round(o.discountPercentage)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      <div>Start: {new Date(o.startDate).toLocaleDateString()}</div>
                      <div>End: {new Date(o.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        o.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        o.status === 'Paused' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        o.status === 'Draft' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      {o.status === 'Active' ? (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'Paused')}
                          className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-450 font-semibold"
                        >
                          Pause
                        </button>
                      ) : o.status === 'Paused' ? (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'Active')}
                          className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold"
                        >
                          Resume
                        </button>
                      ) : null}

                      {o.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'Cancelled')}
                          className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteOffer(o.id)}
                        className="text-xs text-slate-400 hover:text-rose-600 font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No offers are registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
