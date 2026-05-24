import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import CoverImage from '../components/CoverImage';
import { API_BASE_URL } from '../config';

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  status: string;
}

interface Offer {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  category?: string;
  originalPrice: number;
  offerPrice: number;
  discountPercentage: number;
  imageUrl: string;
  status: string;
  createdAt: string;
  slots: Slot[];
}

// Countdown Timer Component for each card
function CountdownTimer({ endTimeStr }: { endTimeStr: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(endTimeStr) - +new Date();
      if (difference <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const hoursStr = hours.toString().padStart(2, '0');
      const minutesStr = minutes.toString().padStart(2, '0');
      const secondsStr = seconds.toString().padStart(2, '0');

      setTimeLeft(`${hoursStr}:${minutesStr}:${secondsStr}`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTimeStr]);

  if (timeLeft === 'Expired') {
    return <span className="text-rose-500 dark:text-rose-400 font-black text-[10px] uppercase bg-rose-500/10 px-2.5 py-1 rounded-lg">Expired</span>;
  }

  return (
    <div className="flex items-center space-x-1.5 font-mono text-[10px] font-bold text-rose-500 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-950/40 px-2.5 py-1.5 rounded-xl border border-rose-500/20 shadow-sm backdrop-blur-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse-ring"></span>
      <span className="tracking-wide">Ends in {timeLeft}</span>
    </div>
  );
}

export default function PublicOfferListing() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // UI States
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Categories helper with icons
  const categoriesList = [
    { name: 'All', icon: '✨' },
    { name: 'Lunch Hour', icon: '🍱' },
    { name: 'Happy Hour', icon: '🍸' },
    { name: 'Special', icon: '🍕' },
    { name: 'Spa Session', icon: '💆' },
    { name: 'Gym Trial', icon: '💪' },
    { name: 'Clinic Session', icon: '🔬' },
    { name: 'Coaching Session', icon: '💻' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedBusiness, searchQuery, minPrice, maxPrice, filterDate, availableOnly, selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build API query parameters
      const params: any = { status: 'Active' };
      if (selectedBusiness) params.businessId = selectedBusiness;
      if (searchQuery) params.search = searchQuery;
      if (minPrice) params.minPrice = Number(minPrice);
      if (maxPrice) params.maxPrice = Number(maxPrice);
      if (filterDate) params.startDate = new Date(filterDate).toISOString();
      if (availableOnly) params.availableOnly = true;
      if (selectedCategory !== 'All') params.category = selectedCategory;

      const response = await axios.get(`${API_BASE_URL}/api/offers`, { params });
      
      // Merge custom offers from localStorage (Hackathon Demo ease)
      const customOffers = JSON.parse(localStorage.getItem('customOffers') || '[]');
      const filteredCustom = customOffers.filter((o: Offer) => {
        if (selectedBusiness && o.businessId !== selectedBusiness) return false;
        if (selectedCategory !== 'All' && o.category !== selectedCategory) return false;
        if (searchQuery && !o.title.toLowerCase().includes(searchQuery.toLowerCase()) && !o.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (minPrice && o.offerPrice < Number(minPrice)) return false;
        if (maxPrice && o.offerPrice > Number(maxPrice)) return false;
        if (filterDate && !o.slots.some(s => s.startTime.startsWith(filterDate))) return false;
        if (availableOnly && !o.slots.some(s => s.status === 'Available' && new Date(s.endTime) > new Date() && s.bookedCount < s.capacity)) return false;
        return true;
      });

      // Avoid duplication by ID if API runs and also local is present
      const apiIds = new Set(response.data.map((o: any) => o.id));
      const merged = [
        ...response.data,
        ...filteredCustom.filter((co: any) => !apiIds.has(co.id))
      ];

      setOffers(merged);

      // Fetch businesses list for filter dropdown
      try {
        const busResp = await axios.get(`${API_BASE_URL}/api/business`);
        setBusinesses(busResp.data);
      } catch {
        // Fallback businesses
        setBusinesses([
          { id: 'c3b346af-bdde-4c5c-9a52-87a4601a9400', name: 'Gourmet Bistro & Cafe' }
        ]);
      }

      setError(null);
    } catch (err: any) {
      console.warn('API connection failed. Loading local mock offers for demo.', err);
      // Mock Fallback
      const customOffers = JSON.parse(localStorage.getItem('customOffers') || '[]');
      const mockOffers: Offer[] = [
        {
          id: 'offer-1',
          businessId: 'bistro-id',
          businessName: 'Spice Route Bistro & Cafe',
          title: '50% Off Premium Thali & Lunch Buffet',
          description: 'Savor our chef-curated premium thali with dal makhani, paneer dishes, naan, biryani, and exotic Indian desserts – all at half price!',
          category: 'Lunch Hour',
          originalPrice: 800,
          offerPrice: 400,
          discountPercentage: 50,
          imageUrl: '',
          status: 'Active',
          createdAt: new Date().toISOString(),
          slots: [
            { id: '1', startTime: new Date(Date.now() + 3600000 * 2).toISOString(), endTime: new Date(Date.now() + 3600000 * 3).toISOString(), capacity: 15, bookedCount: 5, status: 'Available' }
          ]
        },
        {
          id: 'offer-2',
          businessId: 'bar-id',
          businessName: 'The Urban Taproom Mumbai',
          title: 'Happy Hour: 52% Off Cocktails & Appetizers',
          description: 'Unwind with premium cocktails and our signature chaat-style appetizers. Craft beers, mocktails and signature drinks included.',
          category: 'Happy Hour',
          originalPrice: 1200,
          offerPrice: 579,
          discountPercentage: 52,
          imageUrl: '',
          status: 'Active',
          createdAt: new Date().toISOString(),
          slots: [
            { id: '2', startTime: new Date(Date.now() + 3600000 * 24).toISOString(), endTime: new Date(Date.now() + 3600000 * 26).toISOString(), capacity: 10, bookedCount: 8, status: 'Available' }
          ]
        },
        {
          id: 'offer-3',
          businessId: 'spa-id',
          businessName: 'Vedas Ayurveda & Wellness Retreat',
          title: '60% Off Signature Abhyanga Massage',
          description: 'Experience the authentic Kerala Abhyanga – 60 minutes of warm herbal oil full-body massage by certified Ayurvedic therapists.',
          category: 'Spa Session',
          originalPrice: 3500,
          offerPrice: 1400,
          discountPercentage: 60,
          imageUrl: '',
          status: 'Active',
          createdAt: new Date().toISOString(),
          slots: [
            { id: '3', startTime: new Date(Date.now() + 3600000 * 4).toISOString(), endTime: new Date(Date.now() + 3600000 * 5.5).toISOString(), capacity: 4, bookedCount: 2, status: 'Available' }
          ]
        },
        {
          id: 'offer-4',
          businessId: 'gym-id',
          businessName: 'Apex Fitness & Performance Studio',
          title: '75% Off Elite Personal Training Session',
          description: 'One-on-one session with a ISSA-certified trainer. Includes body composition analysis, custom workout plan, and nutrition guidance.',
          category: 'Gym Trial',
          originalPrice: 3200,
          offerPrice: 800,
          discountPercentage: 75,
          imageUrl: '',
          status: 'Active',
          createdAt: new Date().toISOString(),
          slots: [
            { id: '4', startTime: new Date(Date.now() + 3600000 * 6).toISOString(), endTime: new Date(Date.now() + 3600000 * 7.5).toISOString(), capacity: 3, bookedCount: 1, status: 'Available' }
          ]
        },
        {
          id: 'offer-5',
          businessId: 'coaching-id',
          businessName: 'CodeCraft Academy Bengaluru',
          title: '65% Off Full-Stack Development Bootcamp',
          description: 'Intensive 3-hour live session on React, Node.js & MongoDB by IIT alumni. Includes mentorship, project review, and placement guidance.',
          category: 'Coaching Session',
          originalPrice: 5000,
          offerPrice: 1749,
          discountPercentage: 65,
          imageUrl: '',
          status: 'Active',
          createdAt: new Date().toISOString(),
          slots: [
            { id: '5', startTime: new Date(Date.now() + 3600000 * 10).toISOString(), endTime: new Date(Date.now() + 3600000 * 13).toISOString(), capacity: 20, bookedCount: 12, status: 'Available' }
          ]
        },
        {
          id: 'offer-6',
          businessId: 'clinic-id',
          businessName: 'Apollo Wellness Diagnostics',
          title: '40% Off Full Body Health Checkup',
          description: 'Comprehensive health screening: CBC, lipid profile, liver function, thyroid, vitamin D, HbA1c, ECG, and consultation with senior physician.',
          category: 'Clinic Session',
          originalPrice: 4500,
          offerPrice: 2699,
          discountPercentage: 40,
          imageUrl: '',
          status: 'Active',
          createdAt: new Date().toISOString(),
          slots: [
            { id: '6', startTime: new Date(Date.now() + 3600000 * 8).toISOString(), endTime: new Date(Date.now() + 3600000 * 10).toISOString(), capacity: 8, bookedCount: 3, status: 'Available' }
          ]
        }
      ];

      // Merge and filter
      const mergedMock = [...mockOffers, ...customOffers].filter((o: Offer) => {
        if (selectedBusiness && o.businessId !== selectedBusiness) return false;
        if (selectedCategory !== 'All' && o.category !== selectedCategory) return false;
        if (searchQuery && !o.title.toLowerCase().includes(searchQuery.toLowerCase()) && !o.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (minPrice && o.offerPrice < Number(minPrice)) return false;
        if (maxPrice && o.offerPrice > Number(maxPrice)) return false;
        if (filterDate && !o.slots.some((s: Slot) => s.startTime.startsWith(filterDate))) return false;
        if (availableOnly && !o.slots.some((s: Slot) => s.status === 'Available' && new Date(s.endTime) > new Date() && s.bookedCount < s.capacity)) return false;
        return true;
      });

      setOffers(mergedMock);
      setBusinesses([
        { id: 'bistro-id', name: 'Spice Route Bistro & Cafe' },
        { id: 'bar-id', name: 'The Urban Taproom Mumbai' },
        { id: 'spa-id', name: 'Vedas Ayurveda & Wellness Retreat' },
        { id: 'gym-id', name: 'Apex Fitness & Performance Studio' },
        { id: 'coaching-id', name: 'CodeCraft Academy Bengaluru' },
        { id: 'clinic-id', name: 'Apollo Wellness Diagnostics' }
      ]);
      setError('System operating in Offline Demo mode. API connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const getEarliestSlotEndTime = (offer: Offer) => {
    const activeSlots = offer.slots.filter(s => new Date(s.endTime) > new Date() && s.status === 'Available');
    if (!activeSlots.length) return null;
    const sorted = [...activeSlots].sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    return sorted[0].endTime;
  };

  const handleResetFilters = () => {
    setSelectedBusiness('');
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setFilterDate('');
    setAvailableOnly(false);
    setSelectedCategory('All');
  };

  return (
    <div className="space-y-12 animate-fade-in relative">
      {/* Background Glow Blobs */}
      <div className="absolute top-20 left-10 w-96 h-96 radial-glow-violet -z-10 animate-float pointer-events-none"></div>
      <div className="absolute top-80 right-20 w-96 h-96 radial-glow-indigo -z-10 animate-float pointer-events-none" style={{ animationDelay: '-3s' }}></div>

      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6 py-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-violet-500/10 rounded-full border border-violet-500/15 dark:bg-violet-955/30">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse-ring"></span>
          <span className="text-[10px] font-black tracking-widest text-violet-600 dark:text-violet-400 uppercase">Live Concurrency Secured</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none font-outfit">
          Lock In Flash Offers{' '}
          <span className="text-gradient">
            Before They Expire
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
          Discover exclusive discount slots at premium spas, lounges, athletic turf grounds, and clinics. Double booking is prevented via real-time database locks.
        </p>

        {/* Small Live Stats Bar */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-6 border-t border-slate-200/50 dark:border-slate-800/40 text-center text-slate-500 dark:text-slate-400">
          <div>
            <span className="block text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-outfit">24h</span>
            <span className="text-[9px] uppercase tracking-wider font-bold">Lock Guarantee</span>
          </div>
          <div className="border-x border-slate-200/50 dark:border-slate-800">
            <span className="block text-xl sm:text-2xl font-black text-violet-600 dark:text-violet-400 font-outfit">100%</span>
            <span className="text-[9px] uppercase tracking-wider font-bold">Secure Booking</span>
          </div>
          <div>
            <span className="block text-xl sm:text-2xl font-black text-amber-500 font-outfit">10k+</span>
            <span className="text-[9px] uppercase tracking-wider font-bold">User Savings</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 rounded-2xl text-xs sm:text-sm font-semibold flex items-center space-x-2.5 max-w-xl mx-auto shadow-sm">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Category Selection Bar */}
      <div className="flex space-x-2.5 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
        {categoriesList.map((cat) => {
          const isActive = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center space-x-2 px-5 py-3 rounded-2xl border text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md shadow-slate-950/10 dark:shadow-white/5 scale-[1.01]'
                  : 'bg-white dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name.replace(' Session', '').replace(' Trial', '')}</span>
            </button>
          );
        })}
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm space-y-4">
        
        {/* Search row */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by title, keywords or business name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:focus:ring-violet-500/10"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center space-x-2 px-4 py-3 border rounded-2xl text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
                showAdvancedFilters
                  ? 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-950/30 dark:border-violet-900/30 dark:text-violet-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Filters</span>
            </button>

            {(selectedBusiness || searchQuery || minPrice || maxPrice || filterDate || availableOnly) && (
              <button 
                onClick={handleResetFilters}
                className="px-4 py-3 border border-dashed border-rose-200 dark:border-rose-900/40 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/10 text-xs font-bold uppercase rounded-2xl transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Collapsible advanced filters drawer */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-scale-up">
            {/* Business Dropdown */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5">Business Merchant</label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
              >
                <option value="">All Businesses</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Calendar Date selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5">Target Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
              />
            </div>

            {/* Price Slider/Range limits */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5">Offer Budget (₹)</label>
              <div className="flex space-x-3 items-center">
                <input
                  type="number"
                  placeholder="Min (₹)"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                />
                <span className="text-slate-400 text-xs font-medium">to</span>
                <input
                  type="number"
                  placeholder="Max (₹)"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Toggle options bar */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="available-only"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="rounded text-violet-600 focus:ring-violet-500 h-4 w-4 cursor-pointer border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
          />
          <label htmlFor="available-only" className="text-xs text-slate-500 dark:text-slate-400 font-semibold cursor-pointer">
            Show available and unexpired appointment slots only
          </label>
        </div>
      </div>

      {/* Offers Grid section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-9 h-9 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">Loading live offer schedules...</span>
        </div>
      ) : offers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
          {offers.map((offer) => {
            const earliestEndTime = getEarliestSlotEndTime(offer);
            const discountPct = offer.originalPrice > 0 
              ? Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100) 
              : 0;

            let rating = (4.2 + (offer.title.charCodeAt(0) % 8) / 10).toFixed(1);
            let reviewsCount = (offer.title.charCodeAt(1) || 12) * 5 + 32;
            if (offer.title.toLowerCase().includes("pizza")) {
              rating = "4.9";
              reviewsCount = 272;
            }

            const totalRemaining = offer.slots.reduce((sum, s) => sum + (s.capacity - s.bookedCount), 0);
            const isSellingFast = totalRemaining > 0 && totalRemaining <= 5;
            const isHotDeal = discountPct >= 50;

            return (
              <div 
                key={offer.id} 
                className="group relative flex flex-col glass-card rounded-3xl overflow-hidden shadow-sm"
              >
                {/* Image Cover container */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-950 border-b border-slate-200/10">
                  <CoverImage 
                    src={offer.imageUrl} 
                    alt={offer.title} 
                    category={offer.category}
                    titleSeed={offer.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
                  />
                  
                  {/* Luxury Tag overlay */}
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-full shadow-md tracking-wider uppercase border border-amber-400/25 z-10">
                    Save {discountPct}%
                  </div>

                  {/* Urgency Ribbon Overlay */}
                  {isSellingFast && (
                    <div className="absolute top-4 right-4 bg-rose-600 text-white font-black text-[9px] px-2.5 py-1.5 rounded-xl tracking-wider uppercase animate-pulse shadow-md border border-rose-500/25 z-10">
                      Selling Fast 🔥
                    </div>
                  )}
                  {!isSellingFast && isHotDeal && (
                    <div className="absolute top-4 right-4 bg-violet-600 text-white font-black text-[9px] px-2.5 py-1.5 rounded-xl tracking-wider uppercase shadow-md border border-violet-500/25 z-10">
                      Hot Deal ⚡
                    </div>
                  )}

                  {/* Expiry Timer Overlay */}
                  {earliestEndTime && (
                    <div className="absolute bottom-4 right-4">
                      <CountdownTimer endTimeStr={earliestEndTime} />
                    </div>
                  )}
                </div>

                {/* Offer Card Details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-2">
                    {/* Merchant & category badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 tracking-widest uppercase">
                        {offer.businessName}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100/50 dark:bg-slate-900/60 px-2 py-0.5 rounded-lg border border-slate-200/20 dark:border-slate-800/30">
                        {offer.category || 'Special'}
                      </span>
                    </div>

                    {/* BookMyShow Style Ratings */}
                    <div className="flex items-center space-x-1.5 text-xs text-amber-500 font-bold">
                      <span className="text-sm">★</span>
                      <span className="text-slate-800 dark:text-slate-200 text-xs font-extrabold">{rating}</span>
                      <span className="text-slate-400 dark:text-slate-400 font-medium text-[11px]">({reviewsCount} ratings)</span>
                    </div>

                    <h3 className="font-outfit font-extrabold text-lg text-slate-900 dark:text-white leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {offer.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed line-clamp-3">
                      {offer.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white font-outfit">
                          ₹{Math.round(offer.offerPrice)}
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                          ₹{Math.round(offer.originalPrice)}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Per Reserved Seat</span>
                    </div>

                    <Link 
                      to={`/offer/${offer.id}`}
                      className="px-4 py-2 sm:px-4.5 sm:py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center space-x-1.5 border border-slate-800 dark:border-white/10 whitespace-nowrap"
                    >
                      <span>View Slots</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md mx-auto space-y-4 bg-white dark:bg-slate-950/20">
          <div className="p-3.5 bg-slate-100 dark:bg-slate-900 w-fit mx-auto rounded-full text-slate-400">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-bold text-lg">No Active Offers Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed px-4">
            Try adjusting your search terms, target dates, or category selections to find available slot schedules.
          </p>
        </div>
      )}
    </div>
  );
}
