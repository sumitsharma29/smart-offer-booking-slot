using System;

namespace SmartOfferBooking.Core.Entities
{
    public class Booking
    {
        public Guid Id { get; set; }
        public string BookingReference { get; set; } = string.Empty;
        public Guid OfferId { get; set; }
        public Guid SlotId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public int PeopleCount { get; set; } = 1;
        public string? SpecialNote { get; set; }
        public string Status { get; set; } = "Confirmed"; // Pending, Confirmed, Cancelled, Completed, No Show
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Offer? Offer { get; set; }
        public OfferSlot? OfferSlot { get; set; }
    }
}
