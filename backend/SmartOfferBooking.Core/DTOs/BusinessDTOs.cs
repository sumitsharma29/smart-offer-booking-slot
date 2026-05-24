using System;
using System.ComponentModel.DataAnnotations;

namespace SmartOfferBooking.Core.DTOs
{
    public class BusinessRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string BusinessType { get; set; } = string.Empty; // Restaurant, Gym, Salon, Clinic, Coaching, Turf, Other

        [Required]
        public string OwnerName { get; set; } = string.Empty;

        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Address { get; set; } = string.Empty;

        [Required]
        public string City { get; set; } = string.Empty;

        [Required]
        public string OpeningTime { get; set; } = "09:00";

        [Required]
        public string ClosingTime { get; set; } = "21:00";
    }

    public class BusinessResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string BusinessType { get; set; } = string.Empty;
        public string OwnerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string OpeningTime { get; set; } = "09:00";
        public string ClosingTime { get; set; } = "21:00";
        public DateTime CreatedAt { get; set; }
    }
}
