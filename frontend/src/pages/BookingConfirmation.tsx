import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from '../components/QRCode';

interface Booking {
  id: string;
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

export default function BookingConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Read from confirmation buffer in localStorage
    const saved = localStorage.getItem(`booking-detail-${id}`);
    if (saved) {
      setBooking(JSON.parse(saved));
    }
    // Trigger entrance animation delay
    setAnimate(true);
  }, [id]);

  if (!booking) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-black font-outfit text-slate-800 dark:text-white">Booking Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Could not retrieve booking confirmation details.</p>
        <Link to="/" className="text-violet-600 dark:text-violet-400 mt-4 inline-block hover:underline font-bold uppercase tracking-wider text-xs">&larr; Back to Offers</Link>
      </div>
    );
  }

  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const totalCost = booking.peopleCount * booking.offerPrice;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-scale-up">
      {/* Visual Header Banner */}
      <div className="text-center space-y-3">
        <div className={`w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm border border-emerald-500/15 transition-all duration-1000 ${
          animate ? 'scale-110 rotate-12' : 'scale-75'
        }`}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none font-outfit">Reservation Secured!</h1>
        <p className="text-slate-500 dark:text-slate-450 text-xs sm:text-sm font-semibold max-w-md mx-auto">
          Your spot has been locked with a database write-lock. Show the digital ticket below upon arrival.
        </p>
      </div>

      {/* Luxury Ticket Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden relative transition-all duration-300">
        
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-violet-500 rounded-br-2xl"></div>
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-violet-500 rounded-bl-2xl"></div>

        {/* Jagged dashed separator lines representing ticket cut */}
        <div className="absolute top-[48%] left-0 right-0 h-px border-t-2 border-dashed border-slate-200 dark:border-slate-800 -translate-y-1/2 z-10"></div>
        <div className="absolute top-[48%] left-0 w-4 h-8 bg-slate-50 dark:bg-slate-950 rounded-r-full -mt-4 border-y border-r border-slate-200 dark:border-slate-800 z-10"></div>
        <div className="absolute top-[48%] right-0 w-4 h-8 bg-slate-50 dark:bg-slate-950 rounded-l-full -mt-4 border-y border-l border-slate-200 dark:border-slate-800 z-10"></div>

        {/* Top Half: Booking Reference & QR Code */}
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 pb-14 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/30 dark:to-slate-900">
          <div className="space-y-4 text-center sm:text-left">
            <div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Booking Reference</span>
              <div className="text-3xl font-black tracking-widest text-violet-600 dark:text-violet-400 font-mono mt-1 glow-text-violet">
                {booking.bookingReference}
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
                {booking.businessName}
              </span>
              <h2 className="font-extrabold text-xl text-slate-900 dark:text-white leading-tight font-outfit pt-1.5">{booking.offerTitle}</h2>
            </div>
          </div>

          {/* Real client-side generated QR Code */}
          <div className="flex items-center justify-center flex-shrink-0 bg-white p-2 rounded-2xl border border-slate-100 shadow-inner">
            <QRCode value={booking.bookingReference} size={110} />
          </div>
        </div>

        {/* Bottom Half: Receipt Details */}
        <div className="p-6 sm:p-8 pt-12 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm font-semibold">
            {/* Left side */}
            <div className="space-y-4">
              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Appointment Schedule</span>
                <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 mt-1">
                  <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{startTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 ml-6 font-bold font-mono mt-0.5">
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Customer Credentials</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">{booking.customerName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">{booking.customerPhone}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">{booking.customerEmail}</div>
              </div>
            </div>

            {/* Right side */}
            <div className="space-y-4">
              {(() => {
                const { spot, payment, customNote } = parseSpecialNote(booking.specialNote);
                return (
                  <>
                    <div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Reserved Spot / Area</span>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-1 flex items-center space-x-1.5">
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{spot || customNote || 'General Area'}</span>
                      </div>
                    </div>

                    {payment && (
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Payment Guarantee</span>
                        <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-1 flex items-center space-x-1.5">
                          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>{payment}</span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Locked Pricing Rate</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {booking.peopleCount} &times; ₹{Math.round(booking.offerPrice)}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium font-mono">Guaranteed Flash rate</div>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
            <div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Lock Status</span>
              <span className="inline-flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-ring"></span>
                <span>{booking.status}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block">Total Cost Due</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-outfit">
                ₹{Math.round(totalCost)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-xs font-extrabold uppercase tracking-widest">
        <Link 
          to="/" 
          className="w-full sm:w-auto text-center px-6 py-3.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all shadow-sm"
        >
          Browse Other Offers
        </Link>
        <button 
          onClick={() => window.print()}
          className="w-full sm:w-auto text-center px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white rounded-xl shadow-lg transition-all"
        >
          Print Receipt
        </button>
      </div>
    </div>
  );
}
