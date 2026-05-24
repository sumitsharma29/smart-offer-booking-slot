using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmartOfferBooking.Core.DTOs
{
    public class OfferCreateRequest
    {
        [Required]
        public Guid BusinessId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        [Required]
        [Range(0.01, 1000000.00)]
        public decimal OriginalPrice { get; set; }

        [Required]
        [Range(0.01, 1000000.00)]
        public decimal OfferPrice { get; set; }

        [Required]
        [Range(0.00, 100.00)]
        public decimal DiscountPercentage { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public string? TermsAndConditions { get; set; }

        [Required]
        public string Status { get; set; } = "Active"; // Draft, Active, Paused, Expired, Cancelled

        // Slot Generation settings (optional, to generate automatically on creation)
        public bool GenerateSlots { get; set; }
        public DateOnly? SlotsStartDate { get; set; }
        public int DaysToGenerate { get; set; } = 1;
        public string StartTimeStr { get; set; } = "09:00"; // e.g. "09:00"
        public string EndTimeStr { get; set; } = "17:00"; // e.g. "17:00"
        public int SlotDurationMinutes { get; set; } = 60;
        public int SlotCapacity { get; set; } = 10;
    }

    public class OfferResponse
    {
        public Guid Id { get; set; }
        public Guid BusinessId { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal OriginalPrice { get; set; }
        public decimal OfferPrice { get; set; }
        public decimal DiscountPercentage { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? TermsAndConditions { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public List<SlotResponse> Slots { get; set; } = new();
    }
}
