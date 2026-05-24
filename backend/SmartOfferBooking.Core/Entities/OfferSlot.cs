using System;
using System.Collections.Generic;

namespace SmartOfferBooking.Core.Entities
{
    public class OfferSlot
    {
        public Guid Id { get; set; }
        public Guid OfferId { get; set; }
        public DateOnly SlotDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public int Capacity { get; set; }
        public int BookedCount { get; set; } = 0;
        public string Status { get; set; } = "Available"; // Available, Full, Closed, Expired, Cancelled
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Offer? Offer { get; set; }
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
