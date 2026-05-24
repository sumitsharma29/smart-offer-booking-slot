using System;

namespace SmartOfferBooking.Core.Entities
{
    public class User
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Customer"; // Admin, Business, Customer
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties (if user is linked to business, etc.)
        // Business Profile will be linked using Name, Phone, Email
    }
}
