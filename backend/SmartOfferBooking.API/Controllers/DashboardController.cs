using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartOfferBooking.Core.DTOs;
using SmartOfferBooking.Infrastructure.Data;

namespace SmartOfferBooking.API.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var totalOffers = await _context.Offers.CountAsync();
            var activeOffers = await _context.Offers.CountAsync(o => o.Status == "Active");
            var totalBookings = await _context.Bookings.CountAsync(b => b.Status == "Confirmed");
            
            // Today's Bookings
            var todayUtc = DateTime.UtcNow.Date;
            var todayBookings = await _context.Bookings
                .CountAsync(b => b.CreatedAt.Date == todayUtc && b.Status == "Confirmed");

            var slots = await _context.OfferSlots.ToListAsync();
            var totalCapacity = slots.Sum(s => s.Capacity);
            var bookedSeats = slots.Sum(s => s.BookedCount);
            
            // Available seats in available unexpired slots
            var todayDate = DateOnly.FromDateTime(DateTime.UtcNow);
            var nowTime = TimeOnly.FromDateTime(DateTime.UtcNow);
            var activeSlots = slots.Where(s => 
                s.Status == "Available" && 
                (s.SlotDate > todayDate || (s.SlotDate == todayDate && s.EndTime > nowTime))
            ).ToList();
            
            var availableSeats = activeSlots.Sum(s => s.Capacity - s.BookedCount);

            // Conversion rate: (BookedSeats / TotalCapacity) * 100
            double conversionRate = 0;
            if (totalCapacity > 0)
            {
                conversionRate = Math.Round(((double)bookedSeats / totalCapacity) * 100, 2);
            }

            // Total Revenue
            var bookingsWithPrices = await _context.Bookings
                .Include(b => b.Offer)
                .Where(b => b.Status == "Confirmed")
                .ToListAsync();

            decimal totalRevenue = bookingsWithPrices
                .Sum(b => b.PeopleCount * (b.Offer?.OfferPrice ?? 0));

            // Recent Bookings (top 15)
            var recentBookings = bookingsWithPrices
                .OrderByDescending(b => b.CreatedAt)
                .Take(15)
                .Select(b => new BookingResponse
                {
                    Id = b.Id,
                    BookingReference = b.BookingReference,
                    OfferId = b.OfferId,
                    SlotId = b.SlotId,
                    CustomerName = b.CustomerName,
                    CustomerPhone = b.CustomerPhone,
                    CustomerEmail = b.CustomerEmail,
                    PeopleCount = b.PeopleCount,
                    SpecialNote = b.SpecialNote,
                    Status = b.Status,
                    CreatedAt = b.CreatedAt,
                    OfferTitle = b.Offer?.Title ?? "Unknown Offer",
                    OfferPrice = b.Offer?.OfferPrice ?? 0
                })
                .ToList();

            var summary = new DashboardSummaryResponse
            {
                TotalOffers = totalOffers,
                ActiveOffers = activeOffers,
                TotalBookings = totalBookings,
                TodayBookings = todayBookings,
                TotalCapacity = totalCapacity,
                BookedSeats = bookedSeats,
                AvailableSeats = availableSeats,
                ConversionRate = conversionRate,
                TotalRevenue = totalRevenue,
                RecentBookings = recentBookings
            };

            return Ok(summary);
        }
    }
}
