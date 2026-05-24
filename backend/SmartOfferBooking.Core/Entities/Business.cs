using System;
using System.Collections.Generic;

namespace SmartOfferBooking.Core.Entities
{
    public class Business
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string BusinessType { get; set; } = string.Empty; // Restaurant, Gym, Salon, Clinic, Coaching, Turf, Other
        public string OwnerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string OpeningTime { get; set; } = "09:00";
        public string ClosingTime { get; set; } = "21:00";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Offer> Offers { get; set; } = new List<Offer>();
    }
}
