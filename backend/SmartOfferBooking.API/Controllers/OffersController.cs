using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartOfferBooking.Core.DTOs;
using SmartOfferBooking.Core.Entities;
using SmartOfferBooking.Core.Interfaces;
using SmartOfferBooking.Infrastructure.Data;

namespace SmartOfferBooking.API.Controllers
{
    [ApiController]
    [Route("api/offers")]
    public class OffersController : ControllerBase
    {
        private readonly IRepository<Offer> _offerRepo;
        private readonly IRepository<Business> _businessRepo;
        private readonly ApplicationDbContext _context;

        public OffersController(
            IRepository<Offer> offerRepo,
            IRepository<Business> businessRepo,
            ApplicationDbContext context)
        {
            _offerRepo = offerRepo;
            _businessRepo = businessRepo;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetOffers(
            [FromQuery] Guid? businessId,
            [FromQuery] string? businessType,
            [FromQuery] string? category,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] bool? availableOnly)
        {
            var query = _context.Offers
                .Include(o => o.Business)
                .Include(o => o.Slots)
                .AsQueryable();

            // Default business logic constraint: Cancelled/expired offers should not appear on public pages
            // If status is not queried, default to Active
            if (string.IsNullOrEmpty(status))
            {
                query = query.Where(o => o.Status == "Active");
            }
            else if (status.ToLower() != "all")
            {
                query = query.Where(o => o.Status.ToLower() == status.ToLower());
            }

            if (businessId.HasValue)
            {
                query = query.Where(o => o.BusinessId == businessId.Value);
            }

            if (!string.IsNullOrEmpty(businessType))
            {
                query = query.Where(o => o.Business != null && o.Business.BusinessType.ToLower() == businessType.ToLower());
            }

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(o => o.Category.ToLower() == category.ToLower());
            }

            if (!string.IsNullOrEmpty(search))
            {
                var term = search.ToLower();
                query = query.Where(o => o.Title.ToLower().Contains(term) || (o.Description != null && o.Description.ToLower().Contains(term)));
            }

            if (minPrice.HasValue)
            {
                query = query.Where(o => o.OfferPrice >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(o => o.OfferPrice <= maxPrice.Value);
            }

            var offers = await query.ToListAsync();

            if (startDate.HasValue)
            {
                var targetDate = DateOnly.FromDateTime(startDate.Value);
                offers = offers.Where(o => o.Slots.Any(s => s.SlotDate >= targetDate)).ToList();
            }

            if (endDate.HasValue)
            {
                var targetDate = DateOnly.FromDateTime(endDate.Value);
                offers = offers.Where(o => o.Slots.Any(s => s.SlotDate <= targetDate)).ToList();
            }

            if (availableOnly.HasValue && availableOnly.Value)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var nowTime = TimeOnly.FromDateTime(DateTime.UtcNow);
                offers = offers.Where(o => o.Slots.Any(s => 
                    s.Status == "Available" && 
                    (s.SlotDate > today || (s.SlotDate == today && s.EndTime > nowTime)) && 
                    s.BookedCount < s.Capacity
                )).ToList();
            }

            var response = offers.Select(o => new OfferResponse
            {
                Id = o.Id,
                BusinessId = o.BusinessId,
                BusinessName = o.Business?.Name ?? "Unknown Business",
                Title = o.Title,
                Description = o.Description,
                Category = o.Category,
                OriginalPrice = o.OriginalPrice,
                OfferPrice = o.OfferPrice,
                DiscountPercentage = o.DiscountPercentage,
                StartDate = o.StartDate,
                EndDate = o.EndDate,
                TermsAndConditions = o.TermsAndConditions,
                Status = o.Status,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                Slots = o.Slots.Select(s => new SlotResponse
                {
                    Id = s.Id,
                    OfferId = s.OfferId,
                    OfferTitle = o.Title,
                    SlotDate = s.SlotDate,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Capacity = s.Capacity,
                    BookedCount = s.BookedCount,
                    Status = s.Status
                }).OrderBy(s => s.SlotDate).ThenBy(s => s.StartTime).ToList()
            });

            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var offer = await _context.Offers
                .Include(o => o.Business)
                .Include(o => o.Slots)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (offer == null)
            {
                return NotFound(new { error = "Offer not found" });
            }

            var response = new OfferResponse
            {
                Id = offer.Id,
                BusinessId = offer.BusinessId,
                BusinessName = offer.Business?.Name ?? "Unknown Business",
                Title = offer.Title,
                Description = offer.Description,
                Category = offer.Category,
                OriginalPrice = offer.OriginalPrice,
                OfferPrice = offer.OfferPrice,
                DiscountPercentage = offer.DiscountPercentage,
                StartDate = offer.StartDate,
                EndDate = offer.EndDate,
                TermsAndConditions = offer.TermsAndConditions,
                Status = offer.Status,
                CreatedAt = offer.CreatedAt,
                UpdatedAt = offer.UpdatedAt,
                Slots = offer.Slots.Select(s => new SlotResponse
                {
                    Id = s.Id,
                    OfferId = s.OfferId,
                    OfferTitle = offer.Title,
                    SlotDate = s.SlotDate,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Capacity = s.Capacity,
                    BookedCount = s.BookedCount,
                    Status = s.Status
                }).OrderBy(s => s.SlotDate).ThenBy(s => s.StartTime).ToList()
            };

            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] OfferCreateRequest request)
        {
            if (request.OfferPrice >= request.OriginalPrice)
            {
                return BadRequest(new { error = "Offer price must be strictly less than original price." });
            }

            var business = await _businessRepo.GetByIdAsync(request.BusinessId);
            if (business == null)
            {
                return BadRequest(new { error = "Valid BusinessId is required" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var offer = new Offer
                {
                    Id = Guid.NewGuid(),
                    BusinessId = request.BusinessId,
                    Title = request.Title,
                    Description = request.Description,
                    Category = request.Category,
                    OriginalPrice = request.OriginalPrice,
                    OfferPrice = request.OfferPrice,
                    DiscountPercentage = request.DiscountPercentage,
                    StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc),
                    EndDate = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc),
                    TermsAndConditions = request.TermsAndConditions,
                    Status = request.Status,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _offerRepo.AddAsync(offer);
                await _offerRepo.SaveChangesAsync();

                var generatedSlots = new List<SlotResponse>();

                // Automatically generate slots schedule if specified
                if (request.GenerateSlots && request.SlotsStartDate.HasValue)
                {
                    var startDay = request.SlotsStartDate.Value;
                    var days = request.DaysToGenerate <= 0 ? 1 : request.DaysToGenerate;

                    // Parse start and end hour strings
                    var startTime = TimeOnly.Parse(request.StartTimeStr);
                    var endTime = TimeOnly.Parse(request.EndTimeStr);
                    var duration = TimeSpan.FromMinutes(request.SlotDurationMinutes);

                    for (int day = 0; day < days; day++)
                    {
                        var currentDay = startDay.AddDays(day);
                        var slotStart = startTime;

                        while (slotStart.Add(duration) <= endTime)
                        {
                            var slotEnd = slotStart.Add(duration);
                            var slot = new OfferSlot
                            {
                                Id = Guid.NewGuid(),
                                OfferId = offer.Id,
                                SlotDate = currentDay,
                                StartTime = slotStart,
                                EndTime = slotEnd,
                                Capacity = request.SlotCapacity,
                                BookedCount = 0,
                                Status = "Available",
                                CreatedAt = DateTime.UtcNow
                            };

                            _context.OfferSlots.Add(slot);
                            
                            generatedSlots.Add(new SlotResponse
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
                            });

                            slotStart = slotEnd;
                        }
                    }
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                var response = new OfferResponse
                {
                    Id = offer.Id,
                    BusinessId = offer.BusinessId,
                    BusinessName = business.Name,
                    Title = offer.Title,
                    Description = offer.Description,
                    Category = offer.Category,
                    OriginalPrice = offer.OriginalPrice,
                    OfferPrice = offer.OfferPrice,
                    DiscountPercentage = offer.DiscountPercentage,
                    StartDate = offer.StartDate,
                    EndDate = offer.EndDate,
                    TermsAndConditions = offer.TermsAndConditions,
                    Status = offer.Status,
                    CreatedAt = offer.CreatedAt,
                    UpdatedAt = offer.UpdatedAt,
                    Slots = generatedSlots.OrderBy(s => s.SlotDate).ThenBy(s => s.StartTime).ToList()
                };

                return CreatedAtAction(nameof(GetById), new { id = offer.Id }, response);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] OfferCreateRequest request)
        {
            var offer = await _offerRepo.GetByIdAsync(id);
            if (offer == null)
            {
                return NotFound(new { error = "Offer not found" });
            }

            if (request.OfferPrice >= request.OriginalPrice)
            {
                return BadRequest(new { error = "Offer price must be strictly less than original price." });
            }

            offer.Title = request.Title;
            offer.Description = request.Description;
            offer.Category = request.Category;
            offer.OriginalPrice = request.OriginalPrice;
            offer.OfferPrice = request.OfferPrice;
            offer.DiscountPercentage = request.DiscountPercentage;
            offer.StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc);
            offer.EndDate = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc);
            offer.TermsAndConditions = request.TermsAndConditions;
            offer.Status = request.Status;
            offer.UpdatedAt = DateTime.UtcNow;

            _offerRepo.Update(offer);
            await _offerRepo.SaveChangesAsync();

            return Ok(new { message = "Offer updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var offer = await _offerRepo.GetByIdAsync(id);
            if (offer == null)
            {
                return NotFound(new { error = "Offer not found" });
            }

            _offerRepo.Delete(offer);
            await _offerRepo.SaveChangesAsync();

            return Ok(new { message = "Offer deleted successfully" });
        }
    }
}
