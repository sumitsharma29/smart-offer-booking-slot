using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartOfferBooking.Core.DTOs;
using SmartOfferBooking.Core.Entities;
using SmartOfferBooking.Infrastructure.Data;

namespace SmartOfferBooking.API.Controllers
{
    [ApiController]
    [Route("api/slots")]
    public class SlotsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SlotsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSlots()
        {
            var slots = await _context.OfferSlots
                .Include(s => s.Offer)
                .ToListAsync();

            var response = slots.Select(s => new SlotResponse
            {
                Id = s.Id,
                OfferId = s.OfferId,
                OfferTitle = s.Offer?.Title ?? "Unknown Offer",
                SlotDate = s.SlotDate,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Capacity = s.Capacity,
                BookedCount = s.BookedCount,
                Status = s.Status
            }).OrderBy(s => s.SlotDate).ThenBy(s => s.StartTime);

            return Ok(response);
        }

        [HttpGet("offer/{offerId}")]
        [HttpGet("/api/offers/{offerId}/slots")]
        public async Task<IActionResult> GetSlotsForOffer(Guid offerId)
        {
            var slots = await _context.OfferSlots
                .Include(s => s.Offer)
                .Where(s => s.OfferId == offerId)
                .ToListAsync();

            var response = slots.Select(s => new SlotResponse
            {
                Id = s.Id,
                OfferId = s.OfferId,
                OfferTitle = s.Offer?.Title ?? "Unknown Offer",
                SlotDate = s.SlotDate,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Capacity = s.Capacity,
                BookedCount = s.BookedCount,
                Status = s.Status
            }).OrderBy(s => s.SlotDate).ThenBy(s => s.StartTime);

            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> CreateSlot([FromBody] SlotResponse request)
        {
            var offer = await _context.Offers.FindAsync(request.OfferId);
            if (offer == null)
            {
                return NotFound(new { error = "Offer not found" });
            }

            var slot = new OfferSlot
            {
                Id = Guid.NewGuid(),
                OfferId = request.OfferId,
                SlotDate = request.SlotDate,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Capacity = request.Capacity,
                BookedCount = 0,
                Status = "Available",
                CreatedAt = DateTime.UtcNow
            };

            await _context.OfferSlots.AddAsync(slot);
            await _context.SaveChangesAsync();

            var response = new SlotResponse
            {
                Id = slot.Id,
                OfferId = slot.OfferId,
                OfferTitle = offer.Title,
                SlotDate = slot.SlotDate,
                StartTime = slot.StartTime,
                EndTime = slot.EndTime,
                Capacity = slot.Capacity,
                BookedCount = slot.BookedCount,
                Status = slot.Status
            };

            return CreatedAtAction(nameof(GetSlotsForOffer), new { offerId = slot.OfferId }, response);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSlot(Guid id, [FromBody] SlotResponse request)
        {
            var slot = await _context.OfferSlots.FindAsync(id);
            if (slot == null)
            {
                return NotFound(new { error = "Slot not found" });
            }

            slot.SlotDate = request.SlotDate;
            slot.StartTime = request.StartTime;
            slot.EndTime = request.EndTime;
            slot.Capacity = request.Capacity;
            slot.Status = request.Status;

            _context.OfferSlots.Update(slot);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Slot updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSlot(Guid id)
        {
            var slot = await _context.OfferSlots.FindAsync(id);
            if (slot == null)
            {
                return NotFound(new { error = "Slot not found" });
            }

            _context.OfferSlots.Remove(slot);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Slot deleted successfully" });
        }
    }
}
