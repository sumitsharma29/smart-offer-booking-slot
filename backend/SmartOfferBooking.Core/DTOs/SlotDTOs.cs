using System;
using System.ComponentModel.DataAnnotations;

namespace SmartOfferBooking.Core.DTOs
{
    public class SlotResponse
    {
        public Guid Id { get; set; }
        public Guid OfferId { get; set; }
        public string OfferTitle { get; set; } = string.Empty;
        public DateOnly SlotDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public int Capacity { get; set; }
        public int BookedCount { get; set; }
        public int AvailableCount => Capacity - BookedCount;
        public string Status { get; set; } = string.Empty; // Available, Full, Closed, Expired, Cancelled
    }

    public class SlotGenerateRequest
    {
        [Required]
        public Guid OfferId { get; set; }

        [Required]
        public DateOnly StartDate { get; set; }

        [Required]
        [Range(1, 30)]
        public int DaysToGenerate { get; set; } = 7;

        [Required]
        [RegularExpression(@"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "Start time must be in HH:mm format")]
        public string StartTimeStr { get; set; } = "09:00";

        [Required]
        [RegularExpression(@"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "End time must be in HH:mm format")]
        public string EndTimeStr { get; set; } = "17:00";

        [Required]
        [Range(15, 480)]
        public int SlotDurationMinutes { get; set; } = 60;

        [Required]
        [Range(1, 1000)]
        public int Capacity { get; set; } = 10;
    }
}
