using System;
using System.ComponentModel.DataAnnotations;

namespace SmartOfferBooking.Core.DTOs
{
    public class BookingRequest
    {
        [Required]
        public Guid OfferId { get; set; }

        [Required]
        public Guid SlotId { get; set; }

        [Required]
        [StringLength(100)]
        public string CustomerName { get; set; } = string.Empty;

        [Required]
        [Phone]
        [StringLength(20)]
        public string CustomerPhone { get; set; } = string.Empty;

        [EmailAddress]
        [StringLength(100)]
        public string? CustomerEmail { get; set; }

        [Required]
        [Range(1, 100)]
        public int PeopleCount { get; set; } = 1;

        public string? SpecialNote { get; set; }
    }

    public class BookingResponse
    {
        public Guid Id { get; set; }
        public string BookingReference { get; set; } = string.Empty;
        public Guid OfferId { get; set; }
        public Guid SlotId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public int PeopleCount { get; set; }
        public string? SpecialNote { get; set; }
        public string Status { get; set; } = string.Empty; // Pending, Confirmed, Cancelled, Completed, No Show
        public DateTime CreatedAt { get; set; }

        // Extra details for UI
        public string OfferTitle { get; set; } = string.Empty;
        public string BusinessName { get; set; } = string.Empty;
        public DateOnly SlotDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public decimal OfferPrice { get; set; }
    }

    public class BookingStatusUpdateRequest
    {
        [Required]
        [RegularExpression("^(Pending|Confirmed|Cancelled|Completed|No Show)$", ErrorMessage = "Invalid booking status value.")]
        public string Status { get; set; } = string.Empty;
    }
}
