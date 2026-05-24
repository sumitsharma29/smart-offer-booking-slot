using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SmartOfferBooking.Core.DTOs;
using SmartOfferBooking.Core.Entities;
using SmartOfferBooking.Core.Interfaces;
using SmartOfferBooking.Infrastructure.Data;
using SmartOfferBooking.Infrastructure.Services;

namespace SmartOfferBooking.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IRepository<User> _userRepo;
        private readonly IRepository<Business> _businessRepo;
        private readonly TokenService _tokenService;
        private readonly ApplicationDbContext _context;

        public AuthController(
            IRepository<User> userRepo,
            IRepository<Business> businessRepo,
            TokenService tokenService,
            ApplicationDbContext context)
        {
            _userRepo = userRepo;
            _businessRepo = businessRepo;
            _tokenService = tokenService;
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var existingUsers = await _userRepo.FindAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (existingUsers.Any())
            {
                return BadRequest(new { error = "Email is already registered" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var user = new User
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    Email = request.Email,
                    PasswordHash = TokenService.HashPassword(request.Password),
                    Role = request.Role,
                    CreatedAt = DateTime.UtcNow
                };

                await _userRepo.AddAsync(user);
                await _userRepo.SaveChangesAsync();

                Guid? businessId = null;
                if (request.Role == "Business")
                {
                    if (string.IsNullOrEmpty(request.BusinessName))
                    {
                        return BadRequest(new { error = "Business name is required when registering as a business" });
                    }

                    var business = new Business
                    {
                        Id = Guid.NewGuid(),
                        Name = request.BusinessName,
                        BusinessType = request.BusinessType ?? "Other",
                        OwnerName = request.OwnerName ?? request.Name,
                        Phone = request.ContactPhone ?? "000-000-0000",
                        Email = request.Email,
                        Address = request.Address ?? "Not Provided",
                        City = request.City ?? "Not Provided",
                        OpeningTime = "09:00",
                        ClosingTime = "21:00",
                        CreatedAt = DateTime.UtcNow
                    };

                    await _businessRepo.AddAsync(business);
                    await _businessRepo.SaveChangesAsync();
                    businessId = business.Id;
                }

                await transaction.CommitAsync();

                var token = _tokenService.GenerateToken(user, businessId);
                return Ok(new LoginResponse
                {
                    Token = token,
                    Email = user.Email,
                    Role = user.Role,
                    Name = user.Name,
                    BusinessId = businessId
                });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var users = await _userRepo.FindAsync(u => u.Email.ToLower() == request.Email.ToLower());
            var user = users.FirstOrDefault();

            if (user == null || !TokenService.VerifyPassword(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { error = "Invalid email or password" });
            }

            Guid? businessId = null;
            if (user.Role == "Business" || user.Role == "Admin")
            {
                var businesses = await _businessRepo.FindAsync(b => b.Email.ToLower() == user.Email.ToLower());
                businessId = businesses.FirstOrDefault()?.Id;
            }

            var token = _tokenService.GenerateToken(user, businessId);

            return Ok(new LoginResponse
            {
                Token = token,
                Email = user.Email,
                Role = user.Role,
                Name = user.Name,
                BusinessId = businessId
            });
        }
    }
}
