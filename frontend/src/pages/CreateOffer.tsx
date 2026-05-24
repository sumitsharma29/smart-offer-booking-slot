import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function CreateOffer() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states - Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Lunch Hour');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [offerPrice, setOfferPrice] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('Active');
  const [terms, setTerms] = useState('');

  // Form states - Step 2 (Slot Generator)
  const [generateSlots, setGenerateSlots] = useState(true);
  const [slotsStartDate, setSlotsStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [daysToGenerate, setDaysToGenerate] = useState(3);
  const [startTimeStr, setStartTimeStr] = useState('11:00');
  const [endTimeStr, setEndTimeStr] = useState('18:00');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(60);
  const [slotCapacity, setSlotCapacity] = useState(10);
  const [maxBookingPerCustomer, setMaxBookingPerCustomer] = useState(2);

  // Dynamic slot generation preview for visual feedback in Step 2
  const slotPreviews = useMemo(() => {
    if (!generateSlots) return [];
    
    try {
      const list = [];
      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      const [endHour, endMin] = endTimeStr.split(':').map(Number);
      
      const testStart = new Date();
      testStart.setHours(startHour, startMin, 0, 0);
      
      const testEnd = new Date();
      testEnd.setHours(endHour, endMin, 0, 0);

      let current = testStart.getTime();
      const endLimit = testEnd.getTime();
      const intervalMs = slotDurationMinutes * 60 * 1000;

      while (current + intervalMs <= endLimit) {
        const blockStart = new Date(current);
        const blockEnd = new Date(current + intervalMs);
        
        list.push({
          start: blockStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          end: blockEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        current += intervalMs;
      }
      return list;
    } catch {
      return [];
    }
  }, [generateSlots, startTimeStr, endTimeStr, slotDurationMinutes]);

  // Validations
  const validateStep1 = () => {
    if (!title.trim()) return 'Title is required.';
    if (originalPrice === '' || originalPrice <= 0) return 'Original price must be greater than 0.';
    if (offerPrice === '' || offerPrice <= 0) return 'Offer price must be greater than 0.';
    if (Number(offerPrice) >= Number(originalPrice)) return 'Offer price must be strictly less than original price.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const calculatedDiscount = originalPrice && offerPrice 
      ? Math.round(((Number(originalPrice) - Number(offerPrice)) / Number(originalPrice)) * 100)
      : 0;

    const startDateVal = generateSlots ? new Date(slotsStartDate).toISOString() : new Date().toISOString();
    const endDateVal = new Date(startDateVal);
    if (generateSlots) {
      endDateVal.setDate(endDateVal.getDate() + daysToGenerate);
    } else {
      endDateVal.setDate(endDateVal.getDate() + 1);
    }

    const payload = {
      businessId: localStorage.getItem('businessId') || 'c3b346af-bdde-4c5c-9a52-87a4601a9400',
      title,
      description,
      category,
      originalPrice: Number(originalPrice),
      offerPrice: Number(offerPrice),
      discountPercentage: calculatedDiscount,
      startDate: startDateVal,
      endDate: endDateVal.toISOString(),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=650&auto=format&fit=crop&q=60',
      status,
      termsAndConditions: terms,
      generateSlots,
      slotsStartDate: generateSlots ? slotsStartDate : null,
      daysToGenerate,
      startTimeStr,
      endTimeStr,
      slotDurationMinutes,
      slotCapacity,
      maxBookingPerCustomer
    };

    try {
      await axios.post(`${API_BASE_URL}/api/offers`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert('Offer and slot schedules generated successfully!');
      navigate('/admin');
    } catch (err: any) {
      console.warn('API connection failed. Simulating offer creation locally.', err);
      
      const newOfferId = 'offer-' + Math.random().toString(36).substring(2, 9);
      const generatedSlots = [];
      
      if (generateSlots) {
        const startDay = new Date(slotsStartDate);
        const [startHour, startMin] = startTimeStr.split(':').map(Number);
        const [endHour, endMin] = endTimeStr.split(':').map(Number);
        
        for (let day = 0; day < daysToGenerate; day++) {
          const currentDay = new Date(startDay);
          currentDay.setDate(startDay.getDate() + day);
          
          const slotStart = new Date(currentDay);
          slotStart.setHours(startHour, startMin, 0, 0);
          
          const dayEnd = new Date(currentDay);
          dayEnd.setHours(endHour, endMin, 0, 0);
          
          while (slotStart.getTime() + slotDurationMinutes * 60000 <= dayEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60000);
            
            generatedSlots.push({
              id: 'slot-' + Math.random().toString(36).substring(2, 9),
              offerId: newOfferId,
              offerTitle: title,
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              capacity: slotCapacity,
              bookedCount: 0,
              maxBookingPerCustomer: maxBookingPerCustomer,
              status: 'Available'
            });
            
            slotStart.setTime(slotEnd.getTime());
          }
        }
      }

      const mockOffer = {
        id: newOfferId,
        businessId: payload.businessId,
        businessName: 'Gourmet Bistro & Cafe',
        title,
        description,
        originalPrice: payload.originalPrice,
        offerPrice: payload.offerPrice,
        imageUrl: payload.imageUrl,
        status,
        category,
        termsAndConditions: terms,
        createdAt: new Date().toISOString(),
        slots: generatedSlots
      };

      const existingCustom = JSON.parse(localStorage.getItem('customOffers') || '[]');
      existingCustom.push(mockOffer);
      localStorage.setItem('customOffers', JSON.stringify(existingCustom));

      setLoading(false);
      alert('API is offline. Offer has been saved in [Local Demo Storage] and will show up in the Browse Listing.');
      navigate('/admin');
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-all duration-300">
      
      {/* Header bar with step progress */}
      <div className="bg-slate-50 dark:bg-slate-950 p-6 border-b border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-outfit">Create New Flash Offer</h1>
          <p className="text-xs text-slate-400 mt-0.5">Generate a premium locked discount slot schedule.</p>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center space-x-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
            step === 1 ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}>
            1
          </div>
          <div className="h-0.5 w-6 bg-slate-200 dark:bg-slate-800"></div>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
            step === 2 ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}>
            2
          </div>
        </div>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-center space-x-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Offer Details */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h2 className="font-extrabold text-slate-700 dark:text-slate-350 text-xs uppercase tracking-widest">Offer Specifications</h2>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Offer Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 60% Off Luxury Swedish Massage Treatment"
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Offer Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="premium-input text-xs sm:text-sm font-semibold"
                >
                  <option value="Lunch Hour">Lunch Hour</option>
                  <option value="Happy Hour">Happy Hour</option>
                  <option value="Dinner Special">Dinner Special</option>
                  <option value="Gym Trial">Gym Trial</option>
                  <option value="Spa Session">Spa Session</option>
                  <option value="Clinic Session">Clinic Session</option>
                  <option value="Coaching Session">Coaching Session</option>
                  <option value="Weekend Special">Weekend Special</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Description & details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Provide details about what this offer includes..."
                  className="premium-input text-xs sm:text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Regular Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1000"
                    className="premium-input text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Flash Offer Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="400"
                    className="premium-input text-xs sm:text-sm"
                  />
                  {offerPrice !== '' && originalPrice !== '' && Number(offerPrice) >= Number(originalPrice) && (
                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">Offer price must be strictly less than original price.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Cover Image URL (Optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Leave empty for beautiful category stock fallback"
                  className="premium-input text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Terms and Conditions</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={2}
                  placeholder="e.g. Valid only for new customers. 24h cancellation applies."
                  className="premium-input text-xs sm:text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="premium-input text-xs sm:text-sm font-semibold"
                >
                  <option value="Active">Active / Publish Instantly</option>
                  <option value="Draft">Draft / Private</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
                >
                  Continue to Slots &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Slot Generator Settings */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                <h2 className="font-extrabold text-slate-700 dark:text-slate-350 text-xs uppercase tracking-widest">Generate Slots Schedule</h2>
                
                <label className="flex items-center space-x-2 text-xs font-bold uppercase cursor-pointer text-slate-500 hover:text-slate-700">
                  <input
                    type="checkbox"
                    checked={generateSlots}
                    onChange={(e) => setGenerateSlots(e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 h-4 w-4 bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                  <span>Auto-generate Slots</span>
                </label>
              </div>

              {generateSlots ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Start Date</label>
                      <input
                        type="date"
                        required
                        value={slotsStartDate}
                        onChange={(e) => setSlotsStartDate(e.target.value)}
                        className="premium-input text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Days to Populate</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        required
                        value={daysToGenerate}
                        onChange={(e) => setDaysToGenerate(Number(e.target.value))}
                        className="premium-input text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Daily Open Time (HH:MM)</label>
                      <input
                        type="time"
                        required
                        value={startTimeStr}
                        onChange={(e) => setStartTimeStr(e.target.value)}
                        className="premium-input text-xs sm:text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Daily Close Time (HH:MM)</label>
                      <input
                        type="time"
                        required
                        value={endTimeStr}
                        onChange={(e) => setEndTimeStr(e.target.value)}
                        className="premium-input text-xs sm:text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Interval Duration</label>
                      <select
                        value={slotDurationMinutes}
                        onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                        className="premium-input text-xs sm:text-sm font-semibold"
                      >
                        <option value="30">30 Min</option>
                        <option value="45">45 Min</option>
                        <option value="60">60 Min (1 Hour)</option>
                        <option value="90">90 Min</option>
                        <option value="120">120 Min (2 Hours)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Slot Seat Capacity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={slotCapacity}
                        onChange={(e) => setSlotCapacity(Number(e.target.value))}
                        className="premium-input text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-350 uppercase tracking-widest mb-1.5">Max Booking Limit / Cust</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={maxBookingPerCustomer}
                        onChange={(e) => setMaxBookingPerCustomer(Number(e.target.value))}
                        className="premium-input text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Dynamic Slots Preview Grid */}
                  {slotPreviews.length > 0 && (
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-955/40 border border-slate-200/50 dark:border-slate-800 space-y-3">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previewing daily slot blocks:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {slotPreviews.map((preview, i) => (
                          <div 
                            key={i} 
                            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl text-center text-xs font-bold font-mono text-slate-700 dark:text-slate-300"
                          >
                            {preview.start} - {preview.end}
                          </div>
                        ))}
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold">
                        This generator will create exactly <strong>{slotPreviews.length * daysToGenerate} slots</strong> over the next {daysToGenerate} days.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 rounded-2xl text-xs sm:text-sm font-semibold">
                  Slots will not be created automatically. You must manually generate them later in the dashboard.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  &larr; Back to Specs
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-violet-500/10 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Publishing Offer...</span>
                    </>
                  ) : (
                    <span>Publish Offer & Slots</span>
                  )}
                </button>
              </div>

            </div>
          )}
        </form>
      </div>
    </div>
  );
}
