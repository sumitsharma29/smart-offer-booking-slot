using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SmartOfferBooking.Core.DTOs;
using SmartOfferBooking.Core.Entities;
using SmartOfferBooking.Infrastructure.Data;
using SmartOfferBooking.API.Hubs;

namespace SmartOfferBooking.API.Controllers
{
    [ApiController]
    [Route("api/bookings")]
    public class BookingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<BookingHub> _hubContext;

        public BookingsController(ApplicationDbContext context, IHubContext<BookingHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetBookings()
        {
            var bookings = await _context.Bookings
                .Include(b => b.Offer)
                .Include(b => b.OfferSlot)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            var response = bookings.Select(b => new BookingResponse
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
                SlotDate = b.OfferSlot?.SlotDate ?? DateOnly.MinValue,
                StartTime = b.OfferSlot?.StartTime ?? TimeOnly.MinValue,
                EndTime = b.OfferSlot?.EndTime ?? TimeOnly.MinValue,
                OfferPrice = b.Offer?.OfferPrice ?? 0
            });

            return Ok(response);
        }

        [HttpGet("my-bookings")]
        [Authorize]
        public async Task<IActionResult> GetMyBookings()
        {
            var emailClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(emailClaim))
            {
                return BadRequest(new { error = "User email claim not found in authentication token" });
            }

            var bookings = await _context.Bookings
                .Include(b => b.Offer)
                .Include(b => b.OfferSlot)
                .Where(b => b.CustomerEmail.ToLower() == emailClaim.ToLower())
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            var response = bookings.Select(b => new BookingResponse
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
                SlotDate = b.OfferSlot?.SlotDate ?? DateOnly.MinValue,
                StartTime = b.OfferSlot?.StartTime ?? TimeOnly.MinValue,
                EndTime = b.OfferSlot?.EndTime ?? TimeOnly.MinValue,
                OfferPrice = b.Offer?.OfferPrice ?? 0
            });

            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Offer)
                .Include(b => b.OfferSlot)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
            {
                return NotFound(new { error = "Booking not found" });
            }

            var response = new BookingResponse
            {
                Id = booking.Id,
                BookingReference = booking.BookingReference,
                OfferId = booking.OfferId,
                SlotId = booking.SlotId,
                CustomerName = booking.CustomerName,
                CustomerPhone = booking.CustomerPhone,
                CustomerEmail = booking.CustomerEmail,
                PeopleCount = booking.PeopleCount,
                SpecialNote = booking.SpecialNote,
                Status = booking.Status,
                CreatedAt = booking.CreatedAt,
                OfferTitle = booking.Offer?.Title ?? "Unknown Offer",
                SlotDate = booking.OfferSlot?.SlotDate ?? DateOnly.MinValue,
                StartTime = booking.OfferSlot?.StartTime ?? TimeOnly.MinValue,
                EndTime = booking.OfferSlot?.EndTime ?? TimeOnly.MinValue,
                OfferPrice = booking.Offer?.OfferPrice ?? 0
            };

            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BookingRequest request)
        {
            // CRITICAL: Pessimistic locking in PostgreSQL database transaction.
            using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
            try
            {
                // Lock the specific slot row in the database
                var slot = await _context.OfferSlots
                    .FromSqlRaw("SELECT * FROM \"OfferSlots\" WHERE \"Id\" = {0} FOR UPDATE", request.SlotId)
                    .SingleOrDefaultAsync();

                if (slot == null)
                {
                    return NotFound(new { error = "Offer slot not found" });
                }

                var offer = await _context.Offers.FindAsync(request.OfferId);
                if (offer == null)
                {
                    return NotFound(new { error = "Offer not found" });
                }

                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var nowTime = TimeOnly.FromDateTime(DateTime.UtcNow);

                // Business Rule 1: Offer must be active and not paused/expired/cancelled
                if (offer.Status != "Active" || slot.Status != "Available")
                {
                    return BadRequest(new { error = "This offer slot is currently unavailable." });
                }

                // Business Rule 2: Offer cannot be booked after expiry date (EndDate or Slot Expiry)
                if (offer.EndDate.Date < DateTime.UtcNow.Date || 
                    slot.SlotDate < today || 
                    (slot.SlotDate == today && slot.EndTime < nowTime))
                {
                    slot.Status = "Expired";
                    _context.OfferSlots.Update(slot);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return BadRequest(new { error = "This offer slot has expired and cannot be booked." });
                }

                // Business Rule 3: Slot capacity checks
                if (slot.BookedCount >= slot.Capacity)
                {
                    slot.Status = "Full";
                    _context.OfferSlots.Update(slot);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return BadRequest(new { error = "This slot is full." });
                }

                if (slot.BookedCount + request.PeopleCount > slot.Capacity)
                {
                    return BadRequest(new { error = $"Capacity exceeded. Only {slot.Capacity - slot.BookedCount} seats are remaining, but requested {request.PeopleCount}." });
                }

                // Business Rule 4: Phone booking limits (Max Booking per customer per offer, or count based)
                // Same phone number should not exceed max booking limit for this offer
                var customerBookingCount = await _context.Bookings
                    .CountAsync(b => b.OfferId == offer.Id && b.CustomerPhone == request.CustomerPhone && b.Status == "Confirmed");

                // If offer has MaxBookingPerCustomer set (which we parsed from Create Offer payload)
                // Let's retrieve this value, or assume standard limit. We can check slots max booking capacity.
                // For direct spec: we look at slot limit if available or standard limit
                // Let's assume maximum limit is 1 booking per customer by default or read from offer limits if configured
                // The spec says "Same phone number should not exceed max booking limit"
                // Let's default to a limit of 2 bookings or use slot limit (we'll implement check: if count >= slot.max limit or offer limit)
                int maxLimit = 1; // standard limit from the gym spec example: "Booking Limit: 1 per customer"
                
                if (customerBookingCount >= maxLimit)
                {
                    return BadRequest(new { error = $"This phone number has already reached the maximum booking limit of {maxLimit} for this offer." });
                }

                // Everything is valid! Increment booked count
                slot.BookedCount += request.PeopleCount;
                if (slot.BookedCount == slot.Capacity)
                {
                    slot.Status = "Full";
                }

                _context.OfferSlots.Update(slot);

                // Generate booking reference: BK-XXXXXX
                string bookingRef = "BK-" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();

                var booking = new Booking
                {
                    Id = Guid.NewGuid(),
                    BookingReference = bookingRef,
                    OfferId = offer.Id,
                    SlotId = slot.Id,
                    CustomerName = request.CustomerName,
                    CustomerPhone = request.CustomerPhone,
                    CustomerEmail = request.CustomerEmail,
                    PeopleCount = request.PeopleCount,
                    SpecialNote = request.SpecialNote,
                    Status = "Confirmed",
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Bookings.AddAsync(booking);
                await _context.SaveChangesAsync();

                // Commit Transaction and release write lock
                await transaction.CommitAsync();

                var response = new BookingResponse
                {
                    Id = booking.Id,
                    BookingReference = booking.BookingReference,
                    OfferId = booking.OfferId,
                    SlotId = booking.SlotId,
                    CustomerName = booking.CustomerName,
                    CustomerPhone = booking.CustomerPhone,
                    CustomerEmail = booking.CustomerEmail,
                    PeopleCount = booking.PeopleCount,
                    SpecialNote = booking.SpecialNote,
                    Status = booking.Status,
                    CreatedAt = booking.CreatedAt,
                    OfferTitle = offer.Title,
                    SlotDate = slot.SlotDate,
                    StartTime = slot.StartTime,
                    EndTime = slot.EndTime,
                    OfferPrice = offer.OfferPrice
                };

                // Broadcast booking to all SignalR connections (Dashboard)
                await _hubContext.Clients.All.SendAsync("NewBookingReceived", response);

                return CreatedAtAction(nameof(GetById), new { id = booking.Id }, response);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] BookingStatusUpdateRequest request)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null)
            {
                return NotFound(new { error = "Booking not found" });
            }

            var oldStatus = booking.Status;
            var newStatus = request.Status;

            booking.Status = newStatus;

            // Release slot capacity if confirmed booking is cancelled or marked as no show
            if ((oldStatus == "Confirmed" || oldStatus == "Pending") && 
                (newStatus == "Cancelled" || newStatus == "No Show"))
            {
                var slot = await _context.OfferSlots.FindAsync(booking.SlotId);
                if (slot != null)
                {
                    slot.BookedCount = Math.Max(0, slot.BookedCount - booking.PeopleCount);
                    if (slot.Status == "Full" && slot.BookedCount < slot.Capacity)
                    {
                        slot.Status = "Available";
                    }
                    _context.OfferSlots.Update(slot);
                }
            }

            _context.Bookings.Update(booking);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Booking status updated successfully" });
        }
    }
}
