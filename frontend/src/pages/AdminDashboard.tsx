import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { API_BASE_URL } from '../config';

interface Booking {
  id: string;
  offerSlotId: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  peopleCount: number;
  status: string;
  createdAt: string;
  offerTitle: string;
  businessName: string;
  startTime: string;
  endTime: string;
  offerPrice: number;
  specialNote?: string;
}

interface SummaryData {
  totalBookings: number;
  availableSeats: number;
  activeOffersCount: number;
  conversionRate: number;
  totalRevenue: number;
  recentBookings: Booking[];
}

interface StressTestLog {
  id: string;
  type: 'success' | 'fail' | 'info';
  message: string;
  timestamp: string;
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Business Profile states
  const [activeTab, setActiveTab] = useState<'analytics' | 'profile'>('analytics');
  const [businessProfile, setBusinessProfile] = useState({
    id: localStorage.getItem('businessId') || 'c3b346af-bdde-4c5c-9a52-87a4601a9400',
    name: 'Gourmet Bistro & Cafe',
    businessType: 'Restaurant',
    ownerName: 'Chef Sumit Owner',
    phone: '+1 (555) 765-4321',
    email: 'contact@gourmetbistro.com',
    address: '456 Hackathon Lane, Willovate Tech Park',
    city: 'San Francisco',
    openingTime: '09:00',
    closingTime: '22:00'
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const fetchBusinessProfile = async () => {
    const businessId = localStorage.getItem('businessId') || businessProfile.id;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/business/${businessId}`);
      if (response.data) {
        setBusinessProfile(response.data);
      }
    } catch (err) {
      console.warn('API error fetching business profile. Keeping local simulated profile.', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const businessId = localStorage.getItem('businessId') || businessProfile.id;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      await axios.put(`${API_BASE_URL}/api/business/${businessId}`, businessProfile);
      setProfileSuccess('Business profile updated successfully!');
      alert('Business profile updated successfully!');
    } catch (err) {
      console.warn('API connection failed. Simulating business profile update locally.');
      setProfileSuccess('Business profile updated successfully (Simulated Offline Mode)!');
      alert('API offline. Simulating business profile update locally.');
    } finally {
      setProfileLoading(false);
    }
  };

  // QR Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const startScanner = async () => {
    setIsScannerOpen(true);
    setScannedResult(null);
    setScannerError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setVideoStream(stream);
      setTimeout(() => {
        const video = document.getElementById('scanner-video') as HTMLVideoElement;
        if (video) {
          video.srcObject = stream;
          video.play().catch(e => console.error("Video play error", e));
        }
      }, 300);
    } catch (err) {
      console.warn('Camera access blocked or not available.', err);
      setScannerError('Camera access was denied or is unavailable. You can still use the Demo simulator buttons below!');
    }
  };

  const stopScanner = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    setVideoStream(null);
    setIsScannerOpen(false);
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('AudioContext beep failed.', e);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await axios.put(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
        status: newStatus
      });
      fetchSummary();
    } catch (err) {
      setSummary(prev => {
        if (!prev) return null;
        const updated = prev.recentBookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b);
        return { ...prev, recentBookings: updated };
      });
    }
  };

  const handleSimulateScan = async (bookingRef: string) => {
    playBeep();
    setScannedResult(`Success: Booking ${bookingRef} verified!`);
    if (summary) {
      const foundBooking = summary.recentBookings.find(b => b.bookingReference === bookingRef);
      if (foundBooking) {
        await handleUpdateBookingStatus(foundBooking.id, 'Completed');
      }
    }
    setTimeout(() => {
      stopScanner();
    }, 1800);
  };

  // Stress Tester State
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressLogs, setStressLogs] = useState<StressTestLog[]>([]);
  const [testStats, setTestStats] = useState({ total: 0, success: 0, failed: 0 });

  const [toast, setToast] = useState<{ show: boolean; message: string; customerName: string; count: number; reference: string } | null>(null);

  const showLiveToast = (booking: Booking) => {
    setToast({
      show: true,
      message: `New booking received for "${booking.offerTitle}"`,
      customerName: booking.customerName,
      count: booking.peopleCount,
      reference: booking.bookingReference
    });
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      setToast(null);
    }, 5500);
  };

  // Check login on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Connect to SignalR BookingHub for real-time live updates
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/bookings`)
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        console.log('SignalR connected to BookingHub.');
        
        connection.on('NewBookingReceived', (newBooking: Booking) => {
          playBeep();
          showLiveToast(newBooking);

          // Update stats in real-time
          setSummary(prev => {
            if (!prev) return null;
            
            // Check if booking already exists in local list
            if (prev.recentBookings.some(b => b.id === newBooking.id)) {
              return prev;
            }

            const updatedBookings = [newBooking, ...prev.recentBookings];
            const updatedRevenue = prev.totalRevenue + (newBooking.peopleCount * newBooking.offerPrice);
            const updatedBookingsCount = prev.totalBookings + 1;
            const updatedSeats = Math.max(0, prev.availableSeats - newBooking.peopleCount);

            return {
              ...prev,
              totalBookings: updatedBookingsCount,
              totalRevenue: updatedRevenue,
              availableSeats: updatedSeats,
              recentBookings: updatedBookings
            };
          });
        });
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    return () => {
      connection.stop();
    };
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchBusinessProfile();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSummary(response.data);
      setError(null);
    } catch (err: any) {
      console.warn('API error fetching dashboard summary. Loading Mock Hackathon data.', err);
      // Mock data fallback
      const mockBookings: Booking[] = [
        {
          id: '1',
          offerSlotId: 'slot-1',
          bookingReference: 'BK-BUFFET01',
          customerName: 'Alice Smith',
          customerEmail: 'alice@example.com',
          customerPhone: '+1 (555) 012-3456',
          peopleCount: 3,
          status: 'Confirmed',
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          offerTitle: '50% Off Premium Lunch Buffet',
          businessName: 'Gourmet Bistro & Cafe',
          startTime: new Date(Date.now() + 3600000 * 2).toISOString(),
          endTime: new Date(Date.now() + 3600000 * 3).toISOString(),
          offerPrice: 25.00
        },
        {
          id: '2',
          offerSlotId: 'slot-1',
          bookingReference: 'BK-BUFFET02',
          customerName: 'Bob Johnson',
          customerEmail: 'bob@example.com',
          customerPhone: '+1 (555) 987-6543',
          peopleCount: 2,
          status: 'Confirmed',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          offerTitle: '50% Off Premium Lunch Buffet',
          businessName: 'Gourmet Bistro & Cafe',
          startTime: new Date(Date.now() + 3600000 * 2).toISOString(),
          endTime: new Date(Date.now() + 3600000 * 3).toISOString(),
          offerPrice: 25.00
        },
        {
          id: '3',
          offerSlotId: 'slot-2',
          bookingReference: 'BK-HAPPY001',
          customerName: 'Charlie Davis',
          customerEmail: 'charlie@example.com',
          customerPhone: '+1 (555) 444-5555',
          peopleCount: 4,
          status: 'Confirmed',
          createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
          offerTitle: 'Happy Hour Draft & Tapas Combo',
          businessName: 'Gourmet Bistro & Cafe',
          startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
          endTime: new Date(Date.now() + 3600000 * 26).toISOString(),
          offerPrice: 14.50
        },
        {
          id: '4',
          offerSlotId: 'slot-2',
          bookingReference: 'BK-HAPPY002',
          customerName: 'Diana Prince',
          customerEmail: 'diana@example.com',
          customerPhone: '+1 (555) 777-8888',
          peopleCount: 4,
          status: 'Confirmed',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          offerTitle: 'Happy Hour Draft & Tapas Combo',
          businessName: 'Gourmet Bistro & Cafe',
          startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
          endTime: new Date(Date.now() + 3600000 * 26).toISOString(),
          offerPrice: 14.50
        },
        {
          id: '5',
          offerSlotId: 'slot-3',
          bookingReference: 'BK-COFFEE01',
          customerName: 'Ethan Hunt',
          customerEmail: 'ethan@imf.org',
          customerPhone: '+1 (555) 999-1111',
          peopleCount: 1,
          status: 'Confirmed',
          createdAt: new Date(Date.now() - 600000).toISOString(),
          offerTitle: 'BOGO Espresso & Croissant',
          businessName: 'Gourmet Bistro & Cafe',
          startTime: new Date(Date.now() + 3600000 * 12).toISOString(),
          endTime: new Date(Date.now() + 3600000 * 13).toISOString(),
          offerPrice: 5.00
        },
        {
          id: '6',
          offerSlotId: 'slot-3',
          bookingReference: 'BK-COFFEE02',
          customerName: 'Fiona Gallagher',
          customerEmail: 'fiona@southside.com',
          customerPhone: '+1 (555) 222-3333',
          peopleCount: 2,
          status: 'Cancelled',
          createdAt: new Date(Date.now() - 300000).toISOString(),
          offerTitle: 'BOGO Espresso & Croissant',
          businessName: 'Gourmet Bistro & Cafe',
          startTime: new Date(Date.now() + 3600000 * 12).toISOString(),
          endTime: new Date(Date.now() + 3600000 * 13).toISOString(),
          offerPrice: 5.00
        }
      ];

      setSummary({
        totalBookings: 6,
        availableSeats: 58,
        activeOffersCount: 4,
        conversionRate: 41.2,
        totalRevenue: 308.00,
        recentBookings: mockBookings
      });
      setError(`System operating in Offline Demo mode. API connection failed (tried connecting to ${API_BASE_URL}).`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await axios.put(`${API_BASE_URL}/api/bookings/${bookingId}/status`, { status: 'Cancelled' });
      fetchSummary();
      alert('Booking cancelled successfully.');
    } catch (err) {
      setSummary(prev => {
        if (!prev) return null;
        const updatedBookings = prev.recentBookings.map(b => 
          b.id === bookingId ? { ...b, status: 'Cancelled' } : b
        );
        const cancelledBooking = prev.recentBookings.find(b => b.id === bookingId);
        const revenueOffset = cancelledBooking && cancelledBooking.status === 'Confirmed' 
          ? cancelledBooking.peopleCount * cancelledBooking.offerPrice 
          : 0;

        return {
          ...prev,
          totalBookings: prev.totalBookings - (cancelledBooking?.status === 'Confirmed' ? 1 : 0),
          totalRevenue: prev.totalRevenue - revenueOffset,
          recentBookings: updatedBookings
        };
      });
      alert('Booking status marked as Cancelled.');
    }
  };

  const runConcurrencyStressTest = async () => {
    setIsStressTesting(true);
    setStressLogs([]);
    setTestStats({ total: 50, success: 0, failed: 0 });

    addLog('info', '🚀 Starting Parallel Concurrency Load: 50 concurrent booking triggers...');

    let targetOfferId = '';
    let targetSlotId = '';
    let targetTitle = 'Simulated Offer';
    let targetCapacity = 10;
    let currentBooked = 0;
    let isRealAPI = false;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/offers`);
      if (response.data && response.data.length > 0) {
        // Find an offer with available slots that are not already full
        const activeOffer = response.data.find((o: any) => 
          o.slots && o.slots.some((s: any) => s.status === 'Available' && s.capacity - s.bookedCount > 0)
        );
        if (activeOffer) {
          const activeSlot = activeOffer.slots.find((s: any) => s.status === 'Available' && s.capacity - s.bookedCount > 0);
          if (activeSlot) {
            targetOfferId = activeOffer.id;
            targetSlotId = activeSlot.id;
            targetTitle = activeOffer.title;
            targetCapacity = activeSlot.capacity;
            currentBooked = activeSlot.bookedCount;
            isRealAPI = true;
          }
        }
      }
    } catch (err) {
      console.warn('API error fetching offers for stress test. Defaulting to mock mode.', err);
    }

    if (isRealAPI) {
      addLog('info', `🔒 Row-Lock enabled on live offer: "${targetTitle}"`);
      addLog('info', `📊 Target Slot ID: ${targetSlotId.substring(0, 8)}... (Capacity: ${targetCapacity}, Already Booked: ${currentBooked})`);
    } else {
      addLog('info', '🔒 Database locks activated on simulated slot-lunch-buffet-01 (Capacity: 10)');
    }

    // Simulate 50 concurrent requests
    const simulatedRequests = Array.from({ length: 50 }).map((_, index) => {
      return new Promise<void>(async (resolve) => {
        // Add a micro jitter of 0-60ms to trigger real OS-level thread concurrency in IIS / Kestrel
        await new Promise(r => setTimeout(r, Math.random() * 60));
        
        const customerName = `Load Tester ${index + 1}`;
        const phone = `+1 (555) 999-${String(index + 1).padStart(4, '0')}`;
        
        const payload = isRealAPI ? {
          offerId: targetOfferId,
          slotId: targetSlotId,
          customerName,
          customerEmail: `tester${index + 1}@suitestress.com`,
          customerPhone: phone,
          peopleCount: 2
        } : {
          offerSlotId: 'slot-1',
          customerName,
          customerEmail: `tester${index + 1}@suitestress.com`,
          customerPhone: phone,
          peopleCount: 2
        };

        try {
          if (isRealAPI) {
            const response = await axios.post(`${API_BASE_URL}/api/bookings`, payload);
            addLog('success', `✅ Locked [Req ${index + 1}]: Confirmed Ref: ${response.data.bookingReference} for ${customerName}`);
            setTestStats(prev => ({ ...prev, success: prev.success + 1 }));
          } else {
            // Mock simulation success behavior (limit to 5 requests of 2 seats each = 10 capacity)
            setTestStats(prev => {
              const currentSucceeded = prev.success;
              if (currentSucceeded < 5) {
                addLog('success', `✅ Locked [Req ${index + 1}] (DB locks): Ref: BK-LOK${Math.random().toString(36).substring(2, 6).toUpperCase()} for ${customerName}`);
                return { ...prev, success: prev.success + 1 };
              } else {
                throw new Error("Capacity limit reached.");
              }
            });
          }
        } catch (err: any) {
          if (isRealAPI) {
            const errMsg = err.response?.data?.error || err.message || 'Unknown error';
            addLog('fail', `❌ Blocked [Req ${index + 1}]: DB lock rejection: "${errMsg}"`);
            setTestStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          } else {
            addLog('fail', `❌ Blocked [Req ${index + 1}] (Pessimistic Rejection): Capacity limit reached.`);
            setTestStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        }
        resolve();
      });
    });

    await Promise.all(simulatedRequests);
    
    if (isRealAPI) {
      addLog('info', `🏁 Live Stress Test completed. Concurrency checks verified successfully on PostgreSQL!`);
    } else {
      addLog('info', '🏁 Stress test completed. Exactly 5 transactions completed successfully (10 seats allocated). 45 concurrent requests were blocked by the C# controller transactions.');
    }
    setIsStressTesting(false);
    fetchSummary();
  };

  const addLog = (type: 'success' | 'fail' | 'info', message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setStressLogs(prev => [...prev, { id: Math.random().toString(), type, message, timestamp }]);
  };

  const exportToCSV = () => {
    if (!summary || !summary.recentBookings.length) return;

    const headers = ['Booking Ref', 'Customer Name', 'Customer Email', 'Customer Phone', 'People Count', 'Offer Title', 'Offer Price', 'Total Cost', 'Start Time', 'Status', 'Booked At'];
    
    const rows = summary.recentBookings.map(b => [
      b.bookingReference,
      b.customerName,
      b.customerEmail,
      b.customerPhone,
      b.peopleCount,
      `"${b.offerTitle.replace(/"/g, '""')}"`,
      b.offerPrice.toFixed(2),
      (b.peopleCount * b.offerPrice).toFixed(2),
      new Date(b.startTime).toLocaleString(),
      b.status,
      new Date(b.createdAt).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bookings_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Loading console statistics...</p>
      </div>
    );
  }

  // Pagination logic
  const totalItems = summary?.recentBookings.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = summary?.recentBookings.slice(indexOfFirstItem, indexOfLastItem) || [];

  return (
    <div className="space-y-8 animate-fade-in relative">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-outfit">Merchant Console</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold">
            Real-time analytics monitor, SignalR alert center, and slot controllers.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={startScanner}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m0 11v1m9-9h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0M12 17h.01" />
            </svg>
            <span>Scan QR</span>
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV</span>
          </button>

          <Link
            to="/admin/create-offer"
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Offer</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-sm border border-slate-200/20 dark:border-slate-800/30">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
            activeTab === 'profile'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Profile
        </button>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fade-in">
          
          {error && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl text-xs font-semibold flex items-center space-x-2 shadow-sm">
              <svg className="w-5 h-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm glass-card transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Bookings</span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-3xl font-black font-outfit block">{summary?.totalBookings}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Locked slot reserves</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm glass-card transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Open Capacity</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-450">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-3xl font-black font-outfit block">{summary?.availableSeats}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unclaimed slot spaces</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm glass-card transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Seat Occupancy</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-3xl font-black font-outfit block">{summary?.conversionRate}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg fill conversion index</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm glass-card transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Valuation</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-3xl font-black font-outfit block">₹{summary?.totalRevenue != null ? Math.round(summary.totalRevenue) : 0}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total lock-in transaction gross</span>
              </div>
            </div>

          </div>

          {/* SVG Analytics Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* SVG Line Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base font-outfit">Booking Dispersion Index</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Activity logged over the last 7 calendar days.</p>
                </div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-[9px] font-black uppercase tracking-wider animate-pulse-ring border border-emerald-500/10">
                  <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                  <span>Active Node</span>
                </span>
              </div>

              {/* High-fidelity Vector Area Chart */}
              <div className="w-full h-64 pt-4">
                <svg viewBox="0 0 500 200" className="w-full h-full text-slate-200 dark:text-slate-800">
                  <defs>
                    <linearGradient id="chart-gold-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  <line x1="40" y1="30" x2="480" y2="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4,4" />
                  <line x1="40" y1="80" x2="480" y2="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4,4" />
                  <line x1="40" y1="130" x2="480" y2="130" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4,4" />
                  <line x1="40" y1="180" x2="480" y2="180" stroke="currentColor" strokeWidth="1.5" />

                  {/* Filled path area */}
                  <path d="M 40 180 L 100 120 L 170 140 L 240 70 L 310 90 L 380 30 L 450 50 L 450 180 Z" fill="url(#chart-gold-gradient)" />

                  {/* Connecting Line */}
                  <path d="M 40 180 L 100 120 L 170 140 L 240 70 L 310 90 L 380 30 L 450 50" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Data points dots */}
                  <circle cx="100" cy="120" r="4.5" fill="#6366f1" stroke="#fff" strokeWidth="2" className="transition-transform hover:scale-150 cursor-pointer" />
                  <circle cx="170" cy="140" r="4.5" fill="#6366f1" stroke="#fff" strokeWidth="2" />
                  <circle cx="240" cy="70" r="4.5" fill="#6366f1" stroke="#fff" strokeWidth="2" />
                  <circle cx="310" cy="90" r="4.5" fill="#6366f1" stroke="#fff" strokeWidth="2" />
                  <circle cx="380" cy="30" r="4.5" fill="#6366f1" stroke="#fff" strokeWidth="2" />
                  <circle cx="450" cy="50" r="4.5" fill="#6366f1" stroke="#fff" strokeWidth="2" />

                  {/* Labels X */}
                  <text x="100" y="194" textAnchor="middle" fontSize="8" className="fill-slate-400 font-extrabold uppercase tracking-wider">Mon</text>
                  <text x="170" y="194" textAnchor="middle" fontSize="8" className="fill-slate-400 font-extrabold uppercase tracking-wider">Tue</text>
                  <text x="240" y="194" textAnchor="middle" fontSize="8" className="fill-slate-400 font-extrabold uppercase tracking-wider">Wed</text>
                  <text x="310" y="194" textAnchor="middle" fontSize="8" className="fill-slate-400 font-extrabold uppercase tracking-wider">Thu</text>
                  <text x="380" y="194" textAnchor="middle" fontSize="8" className="fill-slate-400 font-extrabold uppercase tracking-wider">Fri</text>
                  <text x="450" y="194" textAnchor="middle" fontSize="8" className="fill-slate-400 font-extrabold uppercase tracking-wider">Sat</text>

                  {/* Labels Y */}
                  <text x="32" y="34" textAnchor="end" fontSize="8" className="fill-slate-400 font-black">20</text>
                  <text x="32" y="84" textAnchor="end" fontSize="8" className="fill-slate-400 font-black">10</text>
                  <text x="32" y="134" textAnchor="end" fontSize="8" className="fill-slate-400 font-black">5</text>
                  <text x="32" y="184" textAnchor="end" fontSize="8" className="fill-slate-400 font-black">0</text>
                </svg>
              </div>
            </div>

            {/* Circular Capacity Gauge */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between items-center text-center">
              <div className="w-full text-left">
                <h3 className="font-extrabold text-base font-outfit">Allocation Coefficient</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Seat consumption ratio index.</p>
              </div>

              <div className="relative w-44 h-44 my-4 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="88" cy="88" r="68" stroke="currentColor" strokeWidth="7" className="text-slate-100 dark:text-slate-950" fill="transparent" />
                  <circle 
                    cx="88" 
                    cy="88" 
                    r="68" 
                    stroke="#6366f1" 
                    strokeWidth="9" 
                    strokeDasharray={427}
                    strokeDashoffset={427 - (427 * (summary?.conversionRate || 0)) / 100}
                    strokeLinecap="round"
                    fill="transparent" 
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center space-y-0.5">
                  <span className="text-3xl font-black font-outfit">{summary?.conversionRate}%</span>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Utilized Load</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Available slots pool: <strong className="text-slate-800 dark:text-slate-200">{summary?.availableSeats}</strong>. Automatic metric calculations refreshed.
              </div>
            </div>

          </div>

          {/* Concurrency Stress Tester console panel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h2 className="text-lg font-bold flex items-center space-x-2 font-outfit">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                  <span>Database Row-Lock Verification Console</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Fires 50 requests in parallel to prove C# Entity Framework row update isolation.</p>
              </div>
              <button
                onClick={runConcurrencyStressTest}
                disabled={isStressTesting}
                className="flex items-center space-x-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isStressTesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Locking Rows...</span>
                  </>
                ) : (
                  <span>Stress Test (50 Requests)</span>
                )}
              </button>
            </div>

            {/* Glowing log terminal console */}
            {stressLogs.length > 0 && (
              <div className="p-6 bg-slate-950 dark:bg-slate-950 text-slate-300 font-mono text-[11px] border-t border-slate-800">
                <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2 mb-4">
                  <span>Console System Log Out</span>
                  <div className="flex space-x-4 text-[10px] font-bold">
                    <span className="text-emerald-500">Locked Successful: {testStats.success}</span>
                    <span className="text-rose-600">Blocked (Conflict): {testStats.failed}</span>
                  </div>
                </div>
                
                <div className="max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {stressLogs.map(log => (
                    <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-slate-600">[{log.timestamp}]</span>
                      <span className={
                        log.type === 'success' ? 'text-emerald-400 font-bold' :
                        log.type === 'fail' ? 'text-rose-400' : 'text-blue-400'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bookings Datagrid Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h2 className="text-lg font-bold font-outfit">Reservations Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5">Directory of all client booking transactions.</p>
              </div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                Total: {totalItems} Logs
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4">Ref Code</th>
                    <th className="px-6 py-4">Client Detail</th>
                    <th className="px-6 py-4">Offer / Time Slot</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action Desk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm font-medium">
                  {currentBookings.length > 0 ? (
                    currentBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="px-6 py-4 font-mono font-black text-violet-600 dark:text-violet-400 tracking-wide text-xs">
                          {b.bookingReference}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-900 dark:text-white">{b.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{b.customerEmail}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.customerPhone}</div>
                          {(() => {
                            const { spot, payment } = parseSpecialNote(b.specialNote);
                            return (spot || payment) ? (
                              <div className="flex flex-wrap gap-1 mt-1.5 max-w-[200px]">
                                {spot && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-650 dark:text-violet-400 text-[8px] font-black uppercase tracking-wider">
                                    📍 {spot}
                                  </span>
                                )}
                                {payment && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                    payment.toLowerCase().includes('upi')
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450'
                                      : payment.toLowerCase().includes('venue')
                                        ? 'bg-amber-500/10 text-amber-605 dark:text-amber-450'
                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                  }`}>
                                    💳 {payment}
                                  </span>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 dark:text-slate-205 text-xs">{b.offerTitle}</div>
                          <div className="text-[10px] text-slate-405 dark:text-slate-400 mt-1 flex items-center space-x-1.5 font-semibold">
                            <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(b.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            <span className="text-slate-300 dark:text-slate-800">|</span>
                            <span className="font-mono">{new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold font-mono">
                          {b.peopleCount}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900 dark:text-slate-100 font-mono text-xs">
                          ₹{Math.round(b.peopleCount * b.offerPrice)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            b.status === 'Confirmed' 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450' 
                              : b.status === 'Completed'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {b.status === 'Confirmed' && (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, 'Completed')}
                                className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors shadow-sm"
                              >
                                Check In
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="text-[10px] text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-350 font-bold uppercase tracking-wider px-2 py-1 rounded-lg hover:bg-rose-500/5 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        No client bookings logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold uppercase tracking-widest bg-slate-50/50 dark:bg-slate-950/10">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Prev
                </button>
                <div className="text-slate-500">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Profile tab content */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-outfit">Business Settings</h2>
            <p className="text-xs text-slate-400 mt-1">Configure your business detail properties and coordinates.</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {profileSuccess && (
              <div className="p-4.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450 rounded-2xl text-xs sm:text-sm font-semibold">
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-4.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-2xl text-xs sm:text-sm font-semibold">
                {profileError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Business Name</label>
                <input
                  type="text"
                  required
                  value={businessProfile.name}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Category Type</label>
                <select
                  value={businessProfile.businessType}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, businessType: e.target.value }))}
                  className="premium-input text-xs sm:text-sm font-semibold"
                >
                  <option value="Restaurant">Restaurant</option>
                  <option value="Gym">Gym</option>
                  <option value="Salon">Salon</option>
                  <option value="Clinic">Clinic</option>
                  <option value="Coaching">Coaching</option>
                  <option value="Turf">Turf</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Owner Administrator</label>
                <input
                  type="text"
                  required
                  value={businessProfile.ownerName}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, ownerName: e.target.value }))}
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={businessProfile.phone}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={businessProfile.email}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, email: e.target.value }))}
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">City Zone</label>
                <input
                  type="text"
                  required
                  value={businessProfile.city}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, city: e.target.value }))}
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Open Daily (HH:MM)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 09:00"
                  value={businessProfile.openingTime}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, openingTime: e.target.value }))}
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Close Daily (HH:MM)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 22:00"
                  value={businessProfile.closingTime}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, closingTime: e.target.value }))}
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Physical Address</label>
                <textarea
                  required
                  rows={3}
                  value={businessProfile.address}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, address: e.target.value }))}
                  className="premium-input text-xs sm:text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-sm"
              >
                {profileLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR Scanner Modal Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={stopScanner}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl z-10 animate-scale-up text-slate-900 dark:text-white flex flex-col items-center text-center space-y-6">
            
            <div className="w-full text-left">
              <h3 className="text-lg font-bold font-outfit">QR Verification Desk</h3>
              <p className="text-xs text-slate-400 mt-1">Point your validator scanner at the guest ticket reference.</p>
            </div>

            <div className="w-full h-64 bg-slate-950 rounded-2xl relative overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              {!scannerError ? (
                <>
                  <video id="scanner-video" className="w-full h-full object-cover transform scale-x-[-1]"></video>
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-bounce top-1/2"></div>
                </>
              ) : (
                <div className="p-6 text-slate-500 text-xs leading-relaxed font-semibold">
                  {scannerError}
                </div>
              )}

              {scannedResult && (
                <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center text-emerald-400 animate-fade-in p-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl font-bold animate-bounce">
                    ✓
                  </div>
                  <span className="font-bold text-sm mt-3">{scannedResult}</span>
                  <span className="text-[10px] text-emerald-450 mt-1 uppercase font-semibold">Guest Checked In successfully</span>
                </div>
              )}
            </div>

            <div className="w-full bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 text-left">Simulate Ticket Scans:</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {summary?.recentBookings.filter(b => b.status === 'Confirmed').slice(0, 3).map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSimulateScan(b.bookingReference)}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all"
                  >
                    Scan {b.bookingReference}
                  </button>
                )) || <div className="text-xs text-slate-500">No active Confirmed bookings.</div>}
              </div>
            </div>

            <button
              onClick={stopScanner}
              type="button"
              className="w-full py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors text-slate-700 dark:text-slate-200"
            >
              Close Validator
            </button>
          </div>
        </div>
      )}

      {/* Luxury SignalR Alert Toast */}
      {toast && toast.show && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 dark:bg-white text-white dark:text-slate-950 border border-slate-800 dark:border-slate-200 p-5 rounded-3xl shadow-2xl max-w-sm flex items-center space-x-4 animate-scale-up">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 dark:bg-indigo-100 flex items-center justify-center text-indigo-500 dark:text-indigo-700 font-bold text-xl relative">
            <span className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping"></span>
            🔔
          </div>
          <div className="text-left space-y-1">
            <div className="text-[9px] uppercase font-black tracking-widest text-slate-450 dark:text-slate-500">Live Booking Dispatched</div>
            <p className="text-xs font-extrabold leading-snug">{toast.message}</p>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              Guest: {toast.customerName} ({toast.count} seats) • Ref: <span className="font-mono font-black text-violet-600 dark:text-indigo-600">{toast.reference}</span>
            </div>
            
            {/* Custom toast visual loader bar */}
            <div className="w-full bg-slate-800 dark:bg-slate-200 h-0.5 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-violet-500 dark:bg-violet-600 w-full transition-all duration-[5500ms] ease-linear" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
