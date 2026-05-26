import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import CoverImage from '../components/CoverImage';
import QRCode from '../components/QRCode';
import { API_BASE_URL } from '../config';

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  remainingSeats: number;
  maxBookingPerCustomer: number;
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
  imageUrl: string;
  status: string;
  createdAt: string;
  slots: Slot[];
}

export default function PublicOfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  
  // Checkout Stepper State (1: Slot Selection, 2: Seat/Spot Selection, 3: Contact Details)
  const [checkoutStep, setCheckoutStep] = useState(1);

  // Form State
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('name') || '');
  const [customerEmail, setCustomerEmail] = useState(() => localStorage.getItem('email') || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [bookingProgress, setBookingProgress] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'venue'>('card');
  const [upiId, setUpiId] = useState('');

  // Auth Modal States for Guest Checkout
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Seating and Spot definitions based on offer category
  const getSpotsForCategory = (catName: string = '') => {
    const cat = catName.toLowerCase();
    if (cat.includes('spa') || cat.includes('salon') || cat.includes('wellness') || cat.includes('clinic')) {
      return {
        title: 'Select Treatment Room / Therapist Station',
        legend: ['Available Room', 'Selected Station', 'Occupied Station'],
        spots: [
          { id: 'R1', name: 'Suite 101 (Orchid Room)', capacity: 1, booked: false, x: 30, y: 55, w: 50, h: 30 },
          { id: 'R2', name: 'Suite 102 (Lotus Room)', capacity: 1, booked: false, x: 320, y: 45, w: 50, h: 30 },
          { id: 'R3', name: 'Suite 103 (Zen Lounge)', capacity: 2, booked: true, x: 320, y: 95, w: 50, h: 30 },
          { id: 'R4', name: 'Suite 104 (Hydra Station)', capacity: 1, booked: false, x: 180, y: 55, w: 40, h: 40 },
          { id: 'R5', name: 'Massage Chair Alpha', capacity: 1, booked: false, x: 30, y: 105, w: 50, h: 30 },
          { id: 'R6', name: 'Therapy Room Beta', capacity: 1, booked: true, x: 185, y: 110, w: 40, h: 25 }
        ]
      };
    } else if (cat.includes('gym') || cat.includes('fitness') || cat.includes('workout') || cat.includes('turf')) {
      return {
        title: 'Select Workout Zone / Locker Bay',
        legend: ['Available Zone', 'Selected Zone', 'Fully Reserved'],
        spots: [
          { id: 'Z1', name: 'Cardio Zone A (Treadmills)', capacity: 5, booked: false, x: 30, y: 55, w: 40, h: 30 },
          { id: 'Z2', name: 'Strength Deck B (Free Weights)', capacity: 8, booked: false, x: 320, y: 45, w: 40, h: 30 },
          { id: 'Z3', name: 'Yoga Studio C (Mats)', capacity: 15, booked: true, x: 320, y: 95, w: 40, h: 30 },
          { id: 'Z4', name: 'Crossfit Turf Area D', capacity: 10, booked: false, x: 180, y: 55, w: 40, h: 40 },
          { id: 'Z5', name: 'Boxing Ring / Bags Bay', capacity: 4, booked: false, x: 30, y: 105, w: 40, h: 30 },
          { id: 'Z6', name: 'Spin Cycling Room E', capacity: 12, booked: true, x: 185, y: 110, w: 40, h: 25 }
        ]
      };
    } else if (cat.includes('coaching') || cat.includes('class') || cat.includes('learn')) {
      return {
        title: 'Select Lecture Row / Lab Desk',
        legend: ['Available Desk', 'Selected Seat', 'Reserved Seat'],
        spots: [
          { id: 'D1', name: 'Front Row - Desk 1', capacity: 2, booked: false, x: 30, y: 55, w: 30, h: 30 },
          { id: 'D2', name: 'Front Row - Desk 2', capacity: 2, booked: false, x: 325, y: 45, w: 30, h: 30 },
          { id: 'D3', name: 'Middle Row - Desk 3', capacity: 2, booked: true, x: 325, y: 95, w: 30, h: 30 },
          { id: 'D4', name: 'Lab Station A (Workstations)', capacity: 4, booked: false, x: 180, y: 55, w: 40, h: 40 },
          { id: 'D5', name: 'Back Row - Desk 4', capacity: 2, booked: false, x: 30, y: 105, w: 30, h: 30 },
          { id: 'D6', name: 'Back Row - Desk 5', capacity: 2, booked: true, x: 185, y: 110, w: 30, h: 25 }
        ]
      };
    } else {
      // Dining / Restaurant Default
      return {
        title: 'Select Dining Table / Lounge Area',
        legend: ['Available Table', 'Selected Table', 'Booked Table'],
        spots: [
          { id: 'T1', name: 'Table 1 (Premium Booth)', capacity: 2, booked: false, x: 30, y: 55, w: 30, h: 30 },
          { id: 'T2', name: 'Table 2 (Window Side)', capacity: 4, booked: false, x: 325, y: 45, w: 30, h: 30 },
          { id: 'T3', name: 'Table 3 (Window Side)', capacity: 4, booked: true, x: 325, y: 95, w: 30, h: 30 },
          { id: 'T4', name: 'Table 4 (VIP Garden Lounge)', capacity: 6, booked: false, x: 180, y: 55, w: 40, h: 40 },
          { id: 'T5', name: 'Table 5 (Bar Side Seatings)', capacity: 2, booked: false, x: 30, y: 105, w: 30, h: 30 },
          { id: 'T6', name: 'Table 6 (Executive Dining)', capacity: 8, booked: true, x: 185, y: 110, w: 30, h: 25 }
        ]
      };
    }
  };

  const currentLayout = getSpotsForCategory(offer?.category);

  useEffect(() => {
    fetchOfferDetails();
  }, [id]);

  const fetchOfferDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/offers/${id}`);
      setOffer(response.data);
      setError(null);
    } catch (err: any) {
      console.warn('API error fetching offer details. Trying LocalStorage/Mock fallback.', err);
      
      const customOffers = JSON.parse(localStorage.getItem('customOffers') || '[]');
      const found = customOffers.find((o: any) => o.id === id);
      
      if (found) {
        setOffer(found);
        setError(`System operating in Offline Demo mode. API connection failed (tried connecting to ${API_BASE_URL}).`);
      } else {
        // Fallback Mock offer details
        const mockOffers = [
          {
            id: 'offer-1',
            businessId: 'bistro-id',
            businessName: 'Spice Route Bistro & Cafe',
            title: '50% Off Premium Thali & Lunch Buffet',
            description: 'Savor our chef-curated premium thali with dal makhani, paneer dishes, naan, biryani, and exotic Indian desserts – all at half price!',
            category: 'Lunch Hour',
            originalPrice: 800,
            offerPrice: 400,
            imageUrl: '',
            status: 'Active',
            createdAt: new Date().toISOString(),
            slots: [
              { id: '1', startTime: new Date(Date.now() + 3600000 * 2).toISOString(), endTime: new Date(Date.now() + 3600000 * 3).toISOString(), capacity: 15, bookedCount: 5, remainingSeats: 10, maxBookingPerCustomer: 2, status: 'Available' },
              { id: '2', startTime: new Date(Date.now() + 3600000 * 4).toISOString(), endTime: new Date(Date.now() + 3600000 * 5).toISOString(), capacity: 15, bookedCount: 15, remainingSeats: 0, maxBookingPerCustomer: 2, status: 'FullyBooked' },
              { id: '3', startTime: new Date(Date.now() + 3600000 * 24).toISOString(), endTime: new Date(Date.now() + 3600000 * 25).toISOString(), capacity: 15, bookedCount: 0, remainingSeats: 15, maxBookingPerCustomer: 2, status: 'Available' }
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
            imageUrl: '',
            status: 'Active',
            createdAt: new Date().toISOString(),
            slots: [
              { id: '4', startTime: new Date(Date.now() + 3600000 * 24).toISOString(), endTime: new Date(Date.now() + 3600000 * 26).toISOString(), capacity: 10, bookedCount: 8, remainingSeats: 2, maxBookingPerCustomer: 4, status: 'Available' },
              { id: '5', startTime: new Date(Date.now() + 3600000 * 48).toISOString(), endTime: new Date(Date.now() + 3600000 * 50).toISOString(), capacity: 10, bookedCount: 0, remainingSeats: 10, maxBookingPerCustomer: 4, status: 'Available' }
            ]
          }
        ];
        
        const mockFound = mockOffers.find((o: any) => o.id === id);
        if (mockFound) {
          setOffer(mockFound);
          setError(`System operating in Offline Demo mode. API connection failed (tried connecting to ${API_BASE_URL}).`);
        } else {
          setError('Offer not found.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !offer) return;

    if (peopleCount > selectedSlot.remainingSeats) {
      setBookingError(`Only ${selectedSlot.remainingSeats} seat(s) are remaining in this slot.`);
      return;
    }

    // Payment validation
    if (paymentMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCvc) {
        setBookingError('Please enter all credit card details.');
        return;
      }
      if (cardNumber.replace(/\s+/g, '').length < 15) {
        setBookingError('Please enter a valid card number.');
        return;
      }
    } else if (paymentMethod === 'upi') {
      if (!upiId) {
        setBookingError('Please enter your UPI ID.');
        return;
      }
      if (!upiId.includes('@')) {
        setBookingError('UPI ID must contain "@" symbol (e.g. user@okaxis).');
        return;
      }
    }

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token || userRole !== 'Customer') {
      setIsAuthModalOpen(true);
      return;
    }

    await executeBooking(token);
  };

  const executeBooking = async (authToken: string) => {
    if (!offer || !selectedSlot) {
      setBookingError('Session details are missing. Please select a slot again.');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    // Premium Concurrency & SSL Loader Simulation
    setBookingProgress('Acquiring database locks...');
    await new Promise(r => setTimeout(r, 600));

    if (paymentMethod === 'card') {
      setBookingProgress('Verifying card authorization...');
      await new Promise(r => setTimeout(r, 850));
    } else if (paymentMethod === 'upi') {
      setBookingProgress('Awaiting UPI app authorization...');
      await new Promise(r => setTimeout(r, 850));
    } else {
      setBookingProgress('Securing postpaid venue voucher...');
      await new Promise(r => setTimeout(r, 850));
    }

    setBookingProgress('Finalizing seat transaction...');
    await new Promise(r => setTimeout(r, 450));

    // Force pre-filled name & email matching the authenticated profile
    const activeEmail = localStorage.getItem('email') || customerEmail;
    const activeName = localStorage.getItem('name') || customerName;

    let paymentDesc = '';
    if (paymentMethod === 'card') {
      paymentDesc = `Card (ending in ${cardNumber.replace(/\s+/g, '').slice(-4) || 'XXXX'})`;
    } else if (paymentMethod === 'upi') {
      paymentDesc = `UPI (${upiId})`;
    } else {
      paymentDesc = 'Pay at Venue';
    }

    const noteParts = [];
    if (selectedSpot) noteParts.push(`Spot: ${selectedSpot}`);
    noteParts.push(`Payment: ${paymentDesc}`);
    const finalSpecialNote = noteParts.join(' | ');

    const payload = {
      offerId: offer.id,
      slotId: selectedSlot.id,
      customerName: activeName,
      customerEmail: activeEmail,
      customerPhone,
      peopleCount,
      specialNote: finalSpecialNote
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/bookings`, payload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const booking = response.data;
      
      // Save details to confirmation buffer in localStorage
      localStorage.setItem(`booking-detail-${booking.id}`, JSON.stringify(booking));
      
      // Dispatch new booking event to simulate real-time notification
      const bookingEvent = new CustomEvent('new-booking', { detail: booking });
      window.dispatchEvent(bookingEvent);

      navigate(`/booking-confirmation/${booking.id}`);
    } catch (err: any) {
      console.warn('API booking creation failed. Simulating booking creation locally.', err);
      
      if (err.response && err.response.data && err.response.data.error) {
        setBookingError(err.response.data.error);
        setBookingLoading(false);
      } else {
        // Local Concurrency locking simulation
        const mockBookingId = 'booking-' + Math.random().toString(36).substring(2, 9);
        const bookingRef = 'BK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        
        const mockBooking = {
          id: mockBookingId,
          offerSlotId: selectedSlot.id,
          bookingReference: bookingRef,
          customerName: activeName,
          customerEmail: activeEmail,
          customerPhone,
          peopleCount,
          specialNote: finalSpecialNote,
          status: 'Confirmed',
          createdAt: new Date().toISOString(),
          offerTitle: offer.title,
          businessName: offer.businessName,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          offerPrice: offer.offerPrice
        };

        // Write details locally
        localStorage.setItem(`booking-detail-${mockBookingId}`, JSON.stringify(mockBooking));
        
        // Trigger notification simulator
        const bookingEvent = new CustomEvent('new-booking', { detail: mockBooking });
        window.dispatchEvent(bookingEvent);

        // Update remaining seats locally for this session
        setSelectedSlot(prev => prev ? { ...prev, bookedCount: prev.bookedCount + peopleCount, remainingSeats: prev.remainingSeats - peopleCount } : null);
        
        setBookingLoading(false);
        alert('API is offline. Booking confirmed via [Local Demo Storage] locking.');
        navigate(`/booking-confirmation/${mockBookingId}`);
      }
    }
  };

  const handleModalAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please fill in all fields.');
      return;
    }
    if (authTab === 'register' && !authName) {
      setAuthError('Please enter your full name.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authTab === 'login') {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: authEmail,
          password: authPassword
        });
        const { token, role, name } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('email', authEmail);
        localStorage.setItem('role', role);
        if (name) localStorage.setItem('name', name);

        // Synchronize form inputs immediately
        setCustomerName(name || authEmail.split('@')[0]);
        setCustomerEmail(authEmail);

        setIsAuthModalOpen(false);
        setAuthLoading(false);
        await executeBooking(token);
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
          name: authName,
          email: authEmail,
          password: authPassword,
          role: 'Customer'
        });
        const { token, role, name } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('email', authEmail);
        localStorage.setItem('role', role);
        if (name) localStorage.setItem('name', name);

        // Synchronize form inputs immediately
        setCustomerName(name || authName);
        setCustomerEmail(authEmail);

        setIsAuthModalOpen(false);
        setAuthLoading(false);
        await executeBooking(token);
      }
    } catch (err: any) {
      console.warn('Modal Auth failed. Simulating Auth locally.', err);
      // Fallback
      if (err.response && err.response.data && err.response.data.error) {
        setAuthError(err.response.data.error);
        setAuthLoading(false);
      } else {
        // Offline demo mode login/register
        const mockToken = 'mock-jwt-token-hackathon-2026';
        localStorage.setItem('token', mockToken);
        localStorage.setItem('email', authEmail);
        localStorage.setItem('role', 'Customer');
        localStorage.setItem('name', authTab === 'register' ? authName : authEmail.split('@')[0]);

        setCustomerName(authTab === 'register' ? authName : authEmail.split('@')[0]);
        setCustomerEmail(authEmail);

        setIsAuthModalOpen(false);
        setAuthLoading(false);
        await executeBooking(mockToken);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Retrieving schedule details...</p>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-black font-outfit">Offer Not Found</h2>
        <p className="text-slate-500 mt-2">The requested slot booking schedule is unavailable.</p>
        <Link to="/" className="text-violet-600 dark:text-violet-400 mt-4 inline-block hover:underline">&larr; Back to Offers</Link>
      </div>
    );
  }

  const discountPct = offer.originalPrice > 0 
    ? Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100) 
    : 0;

  // Generate next 7 days for calendar selector
  const calendarDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const now = new Date();
  const availableSlots = offer.slots.filter(s => {
    const startTime = new Date(s.startTime);
    const isSameDate = startTime.toDateString() === selectedDate.toDateString();
    return new Date(s.endTime) > now && s.status === 'Available' && isSameDate;
  });

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Background Glow Blobs */}
      <div className="absolute top-20 left-10 w-96 h-96 radial-glow-violet -z-10 animate-float pointer-events-none"></div>
      <div className="absolute top-80 right-20 w-96 h-96 radial-glow-indigo -z-10 animate-float pointer-events-none" style={{ animationDelay: '-3s' }}></div>

      {/* Back Button */}
      <Link to="/" className="inline-flex items-center space-x-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to listings</span>
      </Link>

      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl text-xs sm:text-sm font-semibold flex items-center space-x-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Column: Details & Checkout Stepper */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Main Visual Offer Card */}
          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/60 overflow-hidden shadow-sm">
            <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-955 relative">
              <CoverImage src={offer.imageUrl} alt={offer.title} category={offer.category} titleSeed={offer.title} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-md">
                Save {discountPct}%
              </div>
            </div>
            
            <div className="p-6 sm:p-8 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest block">{offer.businessName}</span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug font-outfit">{offer.title}</h1>
              </div>

              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                {offer.description || 'No description provided.'}
              </p>

              {/* Price Details */}
                <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider">Offer Price</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-outfit">₹{Math.round(offer.offerPrice)}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wider">Regular Price</span>
                  <span className="text-xl font-bold text-slate-400 line-through font-outfit">₹{Math.round(offer.originalPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Checkout Block */}
          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/60 p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Stepper Progress Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                  checkoutStep >= 1 ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  1
                </div>
                <div className="h-0.5 w-6 bg-slate-200 dark:bg-slate-800"></div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                  checkoutStep >= 2 ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  2
                </div>
                <div className="h-0.5 w-6 bg-slate-200 dark:bg-slate-800"></div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                  checkoutStep >= 3 ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  3
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Current Phase</span>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                  {checkoutStep === 1 && 'Select Slot'}
                  {checkoutStep === 2 && 'Reserve Spot'}
                  {checkoutStep === 3 && 'Secure Check-in'}
                </span>
              </div>
            </div>

            {/* Step 1 Content: Slot Selection */}
            {checkoutStep === 1 && (
              <div className="space-y-6 animate-scale-up">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base">Select Appointment Date & Time</h3>
                  <p className="text-xs text-slate-400">Choose a booking schedule from the planner below.</p>
                </div>

                {/* Date Calendar Picker */}
                <div className="flex space-x-3.5 overflow-x-auto pb-3 border-b border-slate-100 dark:border-slate-800">
                  {calendarDates.map((date, index) => {
                    const isActive = date.toDateString() === selectedDate.toDateString();
                    const dayName = date.toLocaleDateString([], { weekday: 'short' });
                    const dayNum = date.getDate();

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }}
                        className={`flex flex-col items-center justify-center min-w-[3.5rem] py-3 px-2 rounded-2xl border text-center transition-all ${
                          isActive
                            ? 'bg-violet-600 border-violet-600 text-white font-bold shadow-lg shadow-violet-600/20 scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">{dayName}</span>
                        <span className="text-base font-black mt-0.5 font-outfit">{dayNum}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Slots List */}
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      const startTime = new Date(slot.startTime);
                      const endTime = new Date(slot.endTime);
                      const fillPct = (slot.bookedCount / slot.capacity) * 100;

                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-5 rounded-3xl border text-left flex justify-between items-center gap-4 transition-all duration-200 ${
                            isSelected
                              ? 'border-violet-600 dark:border-violet-400 bg-violet-600/5 dark:bg-violet-400/5 ring-2 ring-violet-600/15 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20'
                          }`}
                        >
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-extrabold text-sm">
                              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    fillPct >= 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
                                  }`}
                                  style={{ width: `${fillPct}%` }}
                                ></div>
                              </div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {slot.bookedCount} / {slot.capacity} Seats Booked
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className={`inline-block px-3 py-1 rounded-xl text-[10px] font-extrabold tracking-wide uppercase ${
                              slot.remainingSeats <= 3 
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {slot.remainingSeats} Left
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-400 text-xs sm:text-sm">
                    No available booking slots are active for this date.
                  </div>
                )}

                {/* Continue Button */}
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      if (!selectedSlot) {
                        alert('Please select an available slot first.');
                        return;
                      }
                      setCheckoutStep(2);
                    }}
                    disabled={!selectedSlot}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-sm"
                  >
                    Select Spot &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 Content: Seating/Spot Layout Map */}
            {checkoutStep === 2 && selectedSlot && (
              <div className="space-y-6 animate-scale-up">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base">{currentLayout.title}</h3>
                  <p className="text-xs text-slate-400">Click on an available spot below to choose your preference.</p>
                </div>

                {/* SVG Seating Map */}
                <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
                  <svg viewBox="0 0 400 160" className="w-full max-w-sm text-slate-400 dark:text-slate-700">
                    
                    {/* Zone Overlays for Dining / Gym / Spa layout visual cues */}
                    {offer.category?.toLowerCase().includes('spa') ? (
                      <>
                        <rect x="10" y="10" width="120" height="140" rx="12" fill="currentColor" opacity="0.02" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="70" y="24" textAnchor="middle" fontSize="8" className="fill-slate-400 font-bold uppercase tracking-widest">Massage Bay</text>

                        <rect x="270" y="10" width="120" height="140" rx="12" fill="currentColor" opacity="0.02" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="330" y="24" textAnchor="middle" fontSize="8" className="fill-slate-400 font-bold uppercase tracking-widest">Facial Suite</text>
                      </>
                    ) : offer.category?.toLowerCase().includes('gym') ? (
                      <>
                        <rect x="10" y="10" width="120" height="140" rx="12" fill="currentColor" opacity="0.02" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="70" y="24" textAnchor="middle" fontSize="8" className="fill-slate-400 font-bold uppercase tracking-widest">Cardio Arena</text>

                        <rect x="270" y="10" width="120" height="140" rx="12" fill="currentColor" opacity="0.02" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="330" y="24" textAnchor="middle" fontSize="8" className="fill-slate-400 font-bold uppercase tracking-widest">Yoga Platform</text>
                      </>
                    ) : (
                      <>
                        {/* Default Dining Areas */}
                        <rect x="10" y="10" width="120" height="140" rx="12" fill="currentColor" opacity="0.02" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="70" y="24" textAnchor="middle" fontSize="8" className="fill-slate-400 font-bold uppercase tracking-widest">Garden Patio</text>

                        <rect x="270" y="10" width="120" height="140" rx="12" fill="currentColor" opacity="0.02" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="330" y="24" textAnchor="middle" fontSize="8" className="fill-slate-400 font-bold uppercase tracking-widest">Glass Window</text>
                      </>
                    )}

                    <text x="200" y="24" textAnchor="middle" fontSize="8" className="fill-slate-400 font-bold uppercase tracking-widest">Central Zone</text>

                    {/* Render Interactive Spots */}
                    {currentLayout.spots.map((spot) => {
                      const isSelected = selectedSpot === spot.id;
                      const rectColor = isSelected 
                        ? 'text-violet-600 dark:text-violet-400' 
                        : spot.booked 
                          ? 'text-rose-500/40' 
                          : 'text-slate-400 dark:text-slate-700 hover:text-slate-500';

                      return (
                        <g 
                          key={spot.id}
                          onClick={() => !spot.booked && setSelectedSpot(spot.id)}
                          className={`transition-all duration-200 ${spot.booked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <rect 
                            x={spot.x} 
                            y={spot.y} 
                            width={spot.w} 
                            height={spot.h} 
                            rx="8" 
                            className={`stroke-current ${rectColor}`}
                            fill="currentColor" 
                            opacity={isSelected ? 0.15 : spot.booked ? 0.08 : 0.03} 
                            strokeWidth={isSelected ? 2.5 : 1.5} 
                          />
                          <text 
                            x={spot.x + spot.w / 2} 
                            y={spot.y + spot.h / 2 + 3} 
                            textAnchor="middle" 
                            fontSize="9" 
                            className={`font-black ${isSelected ? 'fill-violet-600 dark:fill-violet-400' : spot.booked ? 'fill-rose-500/50' : 'fill-slate-500 dark:fill-slate-400'}`}
                          >
                            {spot.id}
                          </text>
                          {spot.booked && (
                            <line 
                              x1={spot.x} 
                              y1={spot.y} 
                              x2={spot.x + spot.w} 
                              y2={spot.y + spot.h} 
                              className="stroke-rose-500/40"
                              strokeWidth="1.5" 
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Legend bar */}
                  <div className="flex space-x-5 mt-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded"></span>
                      <span>{currentLayout.legend[0]}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-violet-500/20 border-2 border-violet-500 rounded"></span>
                      <span>{currentLayout.legend[1]}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-rose-500/10 border border-rose-500/30 rounded relative overflow-hidden flex items-center justify-center">
                        <span className="absolute w-full h-px bg-rose-500/40 rotate-45"></span>
                      </span>
                      <span>{currentLayout.legend[2]}</span>
                    </div>
                  </div>
                </div>

                {selectedSpot && (
                  <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-2xl text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center space-x-2.5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Selected: {currentLayout.spots.find(s => s.id === selectedSpot)?.name}</span>
                  </div>
                )}

                {/* Back / Next buttons */}
                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setCheckoutStep(1)}
                    className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedSpot) {
                        if (!confirm("Proceed without choosing a specific spot reservation? We will assign general area seating.")) return;
                      }
                      setCheckoutStep(3);
                    }}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    Guest Details &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 Content: Contact details form */}
            {checkoutStep === 3 && selectedSlot && (
              <div className="space-y-6 animate-scale-up">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base">Guest Contact & Securing Lock</h3>
                  <p className="text-xs text-slate-400">Lock the slot by completing client verification details.</p>
                </div>

                {bookingError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 rounded-2xl text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-center space-x-2">
                    <svg className="w-5 h-5 flex-shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{bookingError}</span>
                  </div>
                )}

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Guest Name</label>
                      {!!localStorage.getItem('token') && localStorage.getItem('role') === 'Customer' && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-extrabold uppercase tracking-wide">Account profile</span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Alice Smith"
                      className="premium-input text-xs sm:text-sm disabled:opacity-75 disabled:bg-slate-100/50 dark:disabled:bg-slate-950/20"
                      disabled={!!localStorage.getItem('token') && localStorage.getItem('role') === 'Customer'}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Email Address</label>
                      {!!localStorage.getItem('token') && localStorage.getItem('role') === 'Customer' && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-extrabold uppercase tracking-wide">Locked for invoice</span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. alice@example.com"
                      className="premium-input text-xs sm:text-sm disabled:opacity-75 disabled:bg-slate-100/50 dark:disabled:bg-slate-950/20"
                      disabled={!!localStorage.getItem('token') && localStorage.getItem('role') === 'Customer'}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="premium-input text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">People Count (Guests)</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedSlot.maxBookingPerCustomer}
                        required
                        value={peopleCount}
                        onChange={(e) => setPeopleCount(Number(e.target.value))}
                        className="premium-input text-xs sm:text-sm font-semibold"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Maximum limit of {selectedSlot.maxBookingPerCustomer} per customer.</span>
                    </div>
                  </div>
                  <div className="space-y-3.5">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-405 uppercase tracking-widest">Select Payment Guarantee</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/40 dark:border-slate-850/40">
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('card'); setBookingError(null); }}
                        className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                          paymentMethod === 'card'
                            ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="hidden sm:inline">Credit Card</span>
                        <span className="sm:hidden">Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('upi'); setBookingError(null); }}
                        className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                          paymentMethod === 'upi'
                            ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m-3.3 3h6.6m-6.6 4h6.6m-6.6 4h6.6M12 20v1M4 12h16" />
                        </svg>
                        <span>UPI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('venue'); setBookingError(null); }}
                        className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                          paymentMethod === 'venue'
                            ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-355'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden sm:inline">Pay at Venue</span>
                        <span className="sm:hidden">Venue</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Panel: Credit Card */}
                  {paymentMethod === 'card' && (
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4 animate-scale-up">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 font-outfit">
                          <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Card Guarantee Security</span>
                        </h4>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-extrabold uppercase tracking-widest flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-ring"></span>
                          <span>Secure SSL</span>
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[9px] font-black text-slate-405 dark:text-slate-400 uppercase tracking-widest mb-1.5">Card Number</label>
                          <div className="relative">
                            <input
                              type="text"
                              required={paymentMethod === 'card'}
                              maxLength={19}
                              value={cardNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                const parts = [];
                                for (let i = 0; i < val.length; i += 4) {
                                  parts.push(val.substring(i, i + 4));
                                }
                                setCardNumber(parts.length > 0 ? parts.join(' ') : val);
                              }}
                              placeholder="4000 1234 5678 9010"
                              className="premium-input text-xs pl-12"
                            />
                            <div className="absolute left-3.5 top-3 flex items-center">
                              {cardNumber.startsWith('4') ? (
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-405">VISA</span>
                              ) : cardNumber.startsWith('5') ? (
                                <span className="text-[10px] font-black text-orange-500">MC</span>
                              ) : cardNumber.startsWith('3') ? (
                                <span className="text-[10px] font-black text-green-600 dark:text-green-455">AMEX</span>
                              ) : (
                                <svg className="w-5 h-5 text-slate-405 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black text-slate-405 dark:text-slate-400 uppercase tracking-widest mb-1.5">Expiration Date</label>
                            <input
                              type="text"
                              required={paymentMethod === 'card'}
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9]/g, '');
                                if (val.length > 2) {
                                  val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                }
                                setCardExpiry(val);
                              }}
                              placeholder="MM/YY"
                              className="premium-input text-xs text-center font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5">Security Code (CVC)</label>
                            <input
                              type="password"
                              required={paymentMethod === 'card'}
                              maxLength={3}
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="•••"
                              className="premium-input text-xs text-center font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Panel: UPI */}
                  {paymentMethod === 'upi' && (
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4 animate-scale-up">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 font-outfit">
                          <span className="text-violet-500 font-black">UPI</span>
                          <span>Instant Transfer Guarantee</span>
                        </h4>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-extrabold uppercase tracking-widest flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-ring"></span>
                          <span>BHIM UPI Secure</span>
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[9px] font-black text-slate-405 dark:text-slate-400 uppercase tracking-widest mb-1.5">UPI ID / VPA</label>
                          <input
                            type="text"
                            required={paymentMethod === 'upi'}
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. name@okaxis"
                            className="premium-input text-xs font-semibold"
                          />
                          
                          {/* Common Suffix Sugg Chips */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {['@okaxis', '@okicici', '@okhdfcbank', '@paytm'].map((suf) => (
                              <button
                                key={suf}
                                type="button"
                                onClick={() => {
                                  const namePart = upiId.split('@')[0] || 'sumit';
                                  setUpiId(namePart + suf);
                                }}
                                className="px-2 py-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-250/20 dark:border-slate-800 rounded-lg transition-all"
                              >
                                {suf}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* UPI QR Display Panel */}
                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl flex-shrink-0">
                            <QRCode value={`upi://pay?pa=smartslot@okaxis&pn=SmartSlotBooking&am=${Math.round(peopleCount * offer.offerPrice)}&cu=INR`} size={85} />
                          </div>
                          <div className="space-y-1.5 text-center sm:text-left flex-1">
                            <span className="inline-block bg-violet-500/10 text-violet-650 dark:text-violet-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                              Or Scan UPI QR
                            </span>
                            <h5 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">Dynamic Payment QR</h5>
                            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px]">
                              Scan this UPI QR code using BHIM, GPay, PhonePe or Paytm to auto-fill the transaction total: <strong>₹{Math.round(peopleCount * offer.offerPrice)}</strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Panel: Pay at Venue */}
                  {paymentMethod === 'venue' && (
                    <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4 animate-scale-up">
                      <div className="flex items-center justify-between border-b border-slate-250 dark:border-slate-800 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350 flex items-center space-x-1.5 font-outfit">
                          <span className="text-violet-500 font-black">Postpaid</span>
                          <span>Pay at Venue</span>
                        </h4>
                        <span className="text-[9px] text-amber-600 dark:text-amber-500 font-extrabold uppercase tracking-widest flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse-ring"></span>
                          <span>Guarantee On Phone</span>
                        </span>
                      </div>

                      <div className="space-y-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-405">
                        <p>
                          No card or digital transfer is required right now. Your slot reservation will be secured instantly.
                        </p>
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          ⚠️ Rules for Postpaid Guarantee:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>You must show your booking confirmation SMS / ticket at the reception desk.</li>
                          <li>Please arrive 10 minutes prior to your slot time.</li>
                          <li>No fee is charged now. Payment is due in full at the venue.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Summary receipt box before submit */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Spot Selected:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-300">{selectedSpot ? currentLayout.spots.find(s => s.id === selectedSpot)?.name : 'General Area'}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Schedule:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(selectedSlot.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
                      <span>Total Price Due:</span>
                      <span className="text-violet-600 dark:text-violet-400">₹{Math.round(peopleCount * offer.offerPrice)}</span>
                    </div>
                  </div>

                  {/* Submit / Back row */}
                  <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep(2)}
                      className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-violet-500/10 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {bookingLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{bookingProgress}</span>
                        </>
                      ) : (
                        <span>Secure Booking Lock</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: QR Share Code & Summary Panel */}
        <div className="space-y-6">
          
          {/* Reservation overview card */}
          <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-900/40 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:8px_8px] opacity-40"></div>
            
            <div className="space-y-2 relative z-10">
              <h3 className="font-extrabold text-xl font-outfit">Quick Reservation</h3>
              <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">Secured by PostgreSQL pessimistic locking. Once selected, your seats are immediately reserved during checkout.</p>
            </div>

            {selectedSlot ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 space-y-3 relative z-10">
                <div className="text-[10px] text-indigo-300 uppercase font-black tracking-widest">Current Booking Node:</div>
                <div className="text-sm font-bold flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse-ring"></span>
                  <span>
                    {new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(selectedSlot.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                  </span>
                </div>
                <div className="text-xs text-indigo-200/80 font-medium">
                  {selectedSlot.remainingSeats} remaining spots are open for booking.
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-xs text-indigo-200/60 relative z-10">
                Please select a slot from the timesheet on the left to activate booking.
              </div>
            )}
          </div>

          {/* QR Code sharing panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center shadow-sm space-y-4">
            <h4 className="font-bold text-xs tracking-wider text-slate-700 dark:text-slate-300 uppercase">Scan to Share / Book</h4>
            
            {/* Real SVG QR code generator */}
            <div className="flex items-center justify-center">
              <QRCode value={window.location.href} size={130} />
            </div>
            
            <p className="text-[11px] text-slate-400 px-3 leading-relaxed font-medium">
              Scan this code with a smartphone to quickly open this booking page on a mobile device and complete check-out.
            </p>
          </div>
        </div>
      </div>

      {/* Premium Gateway Processing Loader Modal */}
      {bookingLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-card bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-center space-y-6 animate-scale-up">
            
            {/* Spinning Loader Ring with Gradient */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-850"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 dark:border-t-violet-400 animate-spin"></div>
              <svg className="w-8 h-8 text-violet-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white font-outfit uppercase tracking-wider">
                Securing Booking Lock
              </h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
                {bookingProgress}
              </p>
            </div>

            {/* Stepper progress checklist */}
            <div className="text-left bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-200/20 dark:border-slate-800/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">1. Pessimistic DB Lock</span>
                <span className="font-extrabold text-[10px] uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Acquired</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">2. Secure Verification</span>
                <span className={`font-extrabold text-[10px] uppercase flex items-center gap-1 ${
                  bookingProgress === 'Acquiring database locks...'
                    ? 'text-slate-405 animate-pulse'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {bookingProgress === 'Acquiring database locks...' ? (
                    <span>Pending</span>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Verified</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">3. Transaction Reference</span>
                <span className={`font-extrabold text-[10px] uppercase flex items-center gap-1 ${
                  bookingProgress === 'Finalizing seat transaction...' || bookingProgress === 'Securing postpaid venue voucher...' || bookingProgress === 'Awaiting UPI app authorization...' || bookingProgress === 'Verifying card authorization...' || bookingProgress === 'Acquiring database locks...'
                    ? 'text-slate-405'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {bookingProgress === 'Finalizing seat transaction...' ? (
                    <span className="animate-pulse">Writing Node</span>
                  ) : bookingProgress === 'Acquiring database locks...' || bookingProgress === 'Verifying card authorization...' || bookingProgress === 'Awaiting UPI app authorization...' || bookingProgress === 'Securing postpaid venue voucher...' ? (
                    <span>Pending</span>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Committed</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-405 dark:text-slate-450 leading-relaxed font-medium">
              Please do not refresh this page or close your browser tab. We are finalizing your booking lock to prevent duplicate seating.
            </p>
          </div>
        </div>
      )}

      {/* BookMyShow-style inline Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 animate-scale-up">
            <button 
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute right-4.5 top-4.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-950/30 rounded-2xl flex items-center justify-center mx-auto text-violet-600 mb-3.5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#6366f115_1px,transparent_1px)] [background-size:6px_6px]"></div>
                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-outfit">
                Reservation Authentication
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto font-medium">
                To guarantee your reservation, please sign in or sign up a quick client account.
              </p>
            </div>

            {/* Modal Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/20 dark:border-slate-800/40">
              <button
                type="button"
                onClick={() => { setAuthTab('login'); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  authTab === 'login'
                    ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('register'); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  authTab === 'register'
                    ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center space-x-2 animate-shake">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01" />
                </svg>
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleModalAuthSubmit} className="space-y-4 text-left">
              {authTab === 'register' && (
                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Alice Smith"
                    className="premium-input text-xs py-2.5"
                  />
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="alice@example.com"
                  className="premium-input text-xs py-2.5"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  placeholder="••••••••"
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="premium-input text-xs py-2.5"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-500/10 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              >
                {authLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying profile...</span>
                  </>
                ) : (
                  <span>{authTab === 'login' ? 'Confirm & Sign In' : 'Confirm & Register'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
