using System.Collections.Generic;

namespace SmartOfferBooking.Core.DTOs
{
    public class DashboardSummaryResponse
    {
        public int TotalOffers { get; set; }
        public int ActiveOffers { get; set; }
        public int TotalBookings { get; set; }
        public int TodayBookings { get; set; }
        public int TotalCapacity { get; set; }
        public int BookedSeats { get; set; }
        public int AvailableSeats { get; set; }
        public double ConversionRate { get; set; }
        public decimal TotalRevenue { get; set; } // Extra value
        public List<BookingResponse> RecentBookings { get; set; } = new();
    }
}
