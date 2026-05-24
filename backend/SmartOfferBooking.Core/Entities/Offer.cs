using System;
using System.Collections.Generic;

namespace SmartOfferBooking.Core.Entities
{
    public class Offer
    {
        public Guid Id { get; set; }
        public Guid BusinessId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Category { get; set; } = string.Empty; // e.g. "Lunch Hour", "Gym Trial"
        public decimal OriginalPrice { get; set; }
        public decimal OfferPrice { get; set; }
        public decimal DiscountPercentage { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? TermsAndConditions { get; set; }
        public string Status { get; set; } = "Active"; // Draft, Active, Paused, Expired, Cancelled
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Business? Business { get; set; }
        public ICollection<OfferSlot> Slots { get; set; } = new List<OfferSlot>();
    }
}
