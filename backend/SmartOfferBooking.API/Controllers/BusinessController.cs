using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SmartOfferBooking.Core.DTOs;
using SmartOfferBooking.Core.Entities;
using SmartOfferBooking.Core.Interfaces;

namespace SmartOfferBooking.API.Controllers
{
    [ApiController]
    [Route("api/business")]
    public class BusinessController : ControllerBase
    {
        private readonly IRepository<Business> _businessRepo;

        public BusinessController(IRepository<Business> businessRepo)
        {
            _businessRepo = businessRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var businesses = await _businessRepo.GetAllAsync();
            var response = businesses.Select(b => new BusinessResponse
            {
                Id = b.Id,
                Name = b.Name,
                BusinessType = b.BusinessType,
                OwnerName = b.OwnerName,
                Phone = b.Phone,
                Email = b.Email,
                Address = b.Address,
                City = b.City,
                OpeningTime = b.OpeningTime,
                ClosingTime = b.ClosingTime,
                CreatedAt = b.CreatedAt
            });

            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var business = await _businessRepo.GetByIdAsync(id);
            if (business == null)
            {
                return NotFound(new { error = "Business profile not found" });
            }

            var response = new BusinessResponse
            {
                Id = business.Id,
                Name = business.Name,
                BusinessType = business.BusinessType,
                OwnerName = business.OwnerName,
                Phone = business.Phone,
                Email = business.Email,
                Address = business.Address,
                City = business.City,
                OpeningTime = business.OpeningTime,
                ClosingTime = business.ClosingTime,
                CreatedAt = business.CreatedAt
            };

            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BusinessRequest request)
        {
            var business = new Business
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                BusinessType = request.BusinessType,
                OwnerName = request.OwnerName,
                Phone = request.Phone,
                Email = request.Email,
                Address = request.Address,
                City = request.City,
                OpeningTime = request.OpeningTime,
                ClosingTime = request.ClosingTime,
                CreatedAt = DateTime.UtcNow
            };

            await _businessRepo.AddAsync(business);
            await _businessRepo.SaveChangesAsync();

            var response = new BusinessResponse
            {
                Id = business.Id,
                Name = business.Name,
                BusinessType = business.BusinessType,
                OwnerName = business.OwnerName,
                Phone = business.Phone,
                Email = business.Email,
                Address = business.Address,
                City = business.City,
                OpeningTime = business.OpeningTime,
                ClosingTime = business.ClosingTime,
                CreatedAt = business.CreatedAt
            };

            return CreatedAtAction(nameof(GetById), new { id = business.Id }, response);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] BusinessRequest request)
        {
            var business = await _businessRepo.GetByIdAsync(id);
            if (business == null)
            {
                return NotFound(new { error = "Business profile not found" });
            }

            business.Name = request.Name;
            business.BusinessType = request.BusinessType;
            business.OwnerName = request.OwnerName;
            business.Phone = request.Phone;
            business.Email = request.Email;
            business.Address = request.Address;
            business.City = request.City;
            business.OpeningTime = request.OpeningTime;
            business.ClosingTime = request.ClosingTime;

            _businessRepo.Update(business);
            await _businessRepo.SaveChangesAsync();

            return Ok(new { message = "Business profile updated successfully" });
        }
    }
}
