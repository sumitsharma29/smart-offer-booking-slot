using System;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SmartOfferBooking.API.Middleware;
using SmartOfferBooking.Core.Entities;
using SmartOfferBooking.Core.Interfaces;
using SmartOfferBooking.Infrastructure.Data;
using SmartOfferBooking.Infrastructure.Repositories;
using SmartOfferBooking.Infrastructure.Services;
using SmartOfferBooking.API.Hubs;
using SmartOfferBooking.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Avoid cycle issues and serialize enums/strings nicely if needed
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Configure PostgreSQL DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure Repository Pattern
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Configure JWT Token & Auth
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "hackathon_super_secret_key_2026_smart_offer_booking";
builder.Services.AddSingleton(new TokenService(jwtSecret));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

// Configure CORS
var originsStr = builder.Configuration["Cors:AllowedOrigins"];
var allowedOrigins = !string.IsNullOrEmpty(originsStr)
    ? originsStr.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries).Select(o => o.Trim()).ToArray()
    : new[] { "http://localhost:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        if (allowedOrigins.Contains("*"))
        {
            policy.SetIsOriginAllowed(origin => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

builder.Services.AddSignalR();
builder.Services.AddHostedService<SlotCleanupWorker>();

// Swagger/OpenAPI with JWT configuration
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Smart Offer Slot Booking API", 
        Version = "v1",
        Description = "Production-grade backend for booking discounted offer slots with strict concurrency controls."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            new List<string>()
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("EnableSwaggerInProd", true))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Smart Offer Booking API v1");
    });
}

// Global Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<BookingHub>("/hubs/bookings");

// Seed Database automatically on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        
        // If database exists but doesn't have all 11 premium offers, drop and recreate it
        if (context.Database.CanConnect())
        {
            try
            {
                if (context.Offers.Count() < 11)
                {
                    context.Database.EnsureDeleted();
                }
            }
            catch (Exception)
            {
                // Table might not exist yet, which is fine
            }
        }
        
        context.Database.EnsureCreated(); // Auto create database if it doesn't exist
        SeedData(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

app.Run();

// Database Seeding Logic
void SeedData(ApplicationDbContext context)
{
    if (context.Users.Any()) return; // Database already seeded

    // 1. Seed Users (Admin, Merchant, and a test Customer)
    var adminUser = new User
    {
        Id = Guid.NewGuid(),
        Name = "System Admin",
        Email = "admin@smartoffer.com",
        PasswordHash = TokenService.HashPassword("password123"),
        Role = "Admin",
        CreatedAt = DateTime.UtcNow
    };

    var merchantUser = new User
    {
        Id = Guid.NewGuid(),
        Name = "Chef Sumit Owner",
        Email = "merchant@bistro.com",
        PasswordHash = TokenService.HashPassword("password123"),
        Role = "Business",
        CreatedAt = DateTime.UtcNow
    };

    var customerUser = new User
    {
        Id = Guid.NewGuid(),
        Name = "Alice Customer",
        Email = "alice@example.com",
        PasswordHash = TokenService.HashPassword("password123"),
        Role = "Customer",
        CreatedAt = DateTime.UtcNow
    };

    context.Users.AddRange(adminUser, merchantUser, customerUser);
    context.SaveChanges();

    // 2. Seed Businesses
    var b1 = new Business
    {
        Id = Guid.Parse("c3b346af-bdde-4c5c-9a52-87a4601a9400"), // Fixed Guid for fallback convenience
        Name = "Gourmet Bistro & Cafe",
        BusinessType = "Restaurant",
        OwnerName = "Chef Sumit Owner",
        Phone = "+1 (555) 019-2834",
        Email = "merchant@bistro.com",
        Address = "123 Gourmet Lane, Willovate Park",
        City = "San Francisco",
        OpeningTime = "11:00",
        ClosingTime = "22:00",
        CreatedAt = DateTime.UtcNow
    };

    var b2 = new Business
    {
        Id = Guid.NewGuid(),
        Name = "Vedas Spa & Wellness Resort",
        BusinessType = "Salon",
        OwnerName = "Ananya Sharma",
        Phone = "+1 (555) 432-8899",
        Email = "ananya@vedasspa.com",
        Address = "88 Serenity Hills Drive",
        City = "Los Angeles",
        OpeningTime = "09:00",
        ClosingTime = "20:00",
        CreatedAt = DateTime.UtcNow
    };

    var b3 = new Business
    {
        Id = Guid.NewGuid(),
        Name = "Apex Performance Grounds",
        BusinessType = "Gym",
        OwnerName = "Vikram Rathore",
        Phone = "+1 (555) 765-1122",
        Email = "vikram@apexperf.com",
        Address = "500 High-Octane Plaza",
        City = "Austin",
        OpeningTime = "06:00",
        ClosingTime = "23:00",
        CreatedAt = DateTime.UtcNow
    };

    var b4 = new Business
    {
        Id = Guid.NewGuid(),
        Name = "Zen Aesthetic Dermatology Clinic",
        BusinessType = "Clinic",
        OwnerName = "Dr. Priya Roy",
        Phone = "+1 (555) 998-3344",
        Email = "priya@zenclinic.com",
        Address = "44 Radiance Boulevard",
        City = "New York",
        OpeningTime = "10:00",
        ClosingTime = "19:00",
        CreatedAt = DateTime.UtcNow
    };

    var b5 = new Business
    {
        Id = Guid.NewGuid(),
        Name = "Ascent Technology Academy",
        BusinessType = "Coaching",
        OwnerName = "Dev Malhotra",
        Phone = "+1 (555) 233-5566",
        Email = "dev@ascentacademy.org",
        Address = "70 Binary Boulevard, Cyber Hub",
        City = "Seattle",
        OpeningTime = "09:00",
        ClosingTime = "21:00",
        CreatedAt = DateTime.UtcNow
    };

    context.Businesses.AddRange(b1, b2, b3, b4, b5);
    context.SaveChanges();

    // 3. Seed Offers (with high-end details)
    var today = DateOnly.FromDateTime(DateTime.UtcNow);

    // Business 1 Offers
    var offer1 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b1.Id,
        Title = "70% Off Woodfired Pizza Special",
        Description = "Enjoy our signature hand-stretched, premium woodfired artisanal pizzas baked to perfection in our traditional brick oven at 70% off.",
        Category = "Special",
        OriginalPrice = 699.00m,
        OfferPrice = 210.00m,
        DiscountPercentage = 70.00m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Valid for dine-in only. Sourdough thin-crust series. Standard taxes extra.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    var offer2 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b1.Id,
        Title = "Happy Hour Draft & Tapas Combo",
        Description = "Relax after work with any craft draft beer paired with our signature gourmet tapas board.",
        Category = "Happy Hour",
        OriginalPrice = 999.00m,
        OfferPrice = 499.00m,
        DiscountPercentage = 50.05m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Only valid for age 21 and above. No substitutions allowed.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 2 Offer
    var offer3 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b2.Id,
        Title = "60% Off Luxury Aromatherapy Massage",
        Description = "Soothe your senses with our 60-minute Swedish massage infused with organic essential lavender oils.",
        Category = "Spa Session",
        OriginalPrice = 2999.00m,
        OfferPrice = 1199.00m,
        DiscountPercentage = 60.02m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Prior booking required. 24-hour cancellation policy applies.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 3 Offer
    var offer4 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b3.Id,
        Title = "75% Off Elite Personal Training Session",
        Description = "Get a one-on-one session with our master trainers to optimize your routine, nutrition, and recovery.",
        Category = "Gym Trial",
        OriginalPrice = 1999.00m,
        OfferPrice = 499.00m,
        DiscountPercentage = 75.04m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Limited to one per customer. Bring workout shoes.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 4 Offer
    var offer5 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b4.Id,
        Title = "50% Off Hydrafacial Session",
        Description = "Revitalize your skin with our multi-step facial treatment that cleanses, exfoliates, and extracts impurities while infusing hydration.",
        Category = "Spa Session",
        OriginalPrice = 4500.00m,
        OfferPrice = 2250.00m,
        DiscountPercentage = 50.00m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Valid for new customers only. Avoid direct sun exposure for 24h prior.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 5 Offer
    var offer6 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b5.Id,
        Title = "80% Off Full-Stack Architecture Masterclass",
        Description = "Accelerate your programming skills with our intensive evening bootcamp covering C#, Entity Framework Core, Postgres, and React 19.",
        Category = "Coaching Session",
        OriginalPrice = 4999.00m,
        OfferPrice = 999.00m,
        DiscountPercentage = 80.02m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Laptop required. Course materials included digitally.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 1 Additional Offer
    var offer7 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b1.Id,
        Title = "50% Off Weekend Brunch Extravaganza",
        Description = "Treat yourself to our premium unlimited weekend brunch, featuring chef-special omelet bars, fresh waffles, and unlimited mimosas.",
        Category = "Lunch Hour",
        OriginalPrice = 1499.00m,
        OfferPrice = 749.00m,
        DiscountPercentage = 50.03m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Weekend slots only. Limit 2 hours per table.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 2 Additional Offer
    var offer8 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b2.Id,
        Title = "60% Off Premium Deep Tissue Massage & Facial Combo",
        Description = "Indulge in a 90-minute therapeutic massage paired with a custom herbal glow facial.",
        Category = "Spa Session",
        OriginalPrice = 3999.00m,
        OfferPrice = 1599.00m,
        DiscountPercentage = 60.02m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Prior booking of 48h required.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 3 Additional Offer
    var offer9 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b3.Id,
        Title = "75% Off Ultimate 7-Day Gym & Pool Pass",
        Description = "Unlimited access to our high-tech weights floor, Olympic-sized swimming pool, and wet saunas for one full week.",
        Category = "Gym Trial",
        OriginalPrice = 2499.00m,
        OfferPrice = 625.00m,
        DiscountPercentage = 75.00m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Valid for new members only. Pass active from first visit.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 4 Additional Offer
    var offer10 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b4.Id,
        Title = "50% Off Advanced Laser Skin Revitalization Session",
        Description = "Non-invasive laser therapy targeting skin tone refinement, collagen production, and scar reduction.",
        Category = "Spa Session",
        OriginalPrice = 5999.00m,
        OfferPrice = 2999.00m,
        DiscountPercentage = 50.01m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Consultation included. Avoid sunbathing for 7 days post-treatment.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    // Business 5 Additional Offer
    var offer11 = new Offer
    {
        Id = Guid.NewGuid(),
        BusinessId = b5.Id,
        Title = "80% Off React 19 & Next.js 15 Masterclass",
        Description = "Master server components, React Compiler, Server Actions, and rendering architectures in this intensive 4-hour hands-on lab.",
        Category = "Coaching Session",
        OriginalPrice = 2999.00m,
        OfferPrice = 599.00m,
        DiscountPercentage = 80.03m,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(10),
        TermsAndConditions = "Prior Javascript experience required. Hands-on coding exercises.",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    context.Offers.AddRange(offer1, offer2, offer3, offer4, offer5, offer6, offer7, offer8, offer9, offer10, offer11);
    context.SaveChanges();

    // 4. Seed Slots for the next 5 days
    var slots = new List<OfferSlot>();

    for (int day = 0; day < 5; day++)
    {
        var targetDate = today.AddDays(day);

        // Slots for Offer 1 (Bistro Lunch Buffet: Capacity 15)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer1.Id, SlotDate = targetDate, StartTime = new TimeOnly(11, 30), EndTime = new TimeOnly(12, 30), Capacity = 15, BookedCount = day == 0 ? 5 : 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer1.Id, SlotDate = targetDate, StartTime = new TimeOnly(12, 45), EndTime = new TimeOnly(13, 45), Capacity = 15, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer1.Id, SlotDate = targetDate, StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(15, 0), Capacity = 15, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 2 (Bistro Happy Hour: Capacity 10)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer2.Id, SlotDate = targetDate, StartTime = new TimeOnly(16, 0), EndTime = new TimeOnly(17, 30), Capacity = 10, BookedCount = day == 0 ? 8 : 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer2.Id, SlotDate = targetDate, StartTime = new TimeOnly(17, 45), EndTime = new TimeOnly(19, 15), Capacity = 10, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 3 (Spa Massage: Capacity 4)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer3.Id, SlotDate = targetDate, StartTime = new TimeOnly(10, 0), EndTime = new TimeOnly(11, 30), Capacity = 4, BookedCount = day == 0 ? 2 : 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer3.Id, SlotDate = targetDate, StartTime = new TimeOnly(14, 30), EndTime = new TimeOnly(16, 0), Capacity = 4, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 4 (Gym Personal Training: Capacity 3)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer4.Id, SlotDate = targetDate, StartTime = new TimeOnly(07, 0), EndTime = new TimeOnly(08, 30), Capacity = 3, BookedCount = day == 0 ? 1 : 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer4.Id, SlotDate = targetDate, StartTime = new TimeOnly(18, 0), EndTime = new TimeOnly(19, 30), Capacity = 3, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 5 (Clinics Hydrafacial: Capacity 5)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer5.Id, SlotDate = targetDate, StartTime = new TimeOnly(11, 0), EndTime = new TimeOnly(12, 0), Capacity = 5, BookedCount = day == 0 ? 3 : 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer5.Id, SlotDate = targetDate, StartTime = new TimeOnly(15, 30), EndTime = new TimeOnly(16, 30), Capacity = 5, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 6 (Coding Masterclass: Capacity 30)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer6.Id, SlotDate = targetDate, StartTime = new TimeOnly(19, 0), EndTime = new TimeOnly(21, 0), Capacity = 30, BookedCount = day == 0 ? 12 : 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 7 (Brunch Buffet: Capacity 12)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer7.Id, SlotDate = targetDate, StartTime = new TimeOnly(10, 0), EndTime = new TimeOnly(11, 30), Capacity = 12, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer7.Id, SlotDate = targetDate, StartTime = new TimeOnly(11, 45), EndTime = new TimeOnly(13, 15), Capacity = 12, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 8 (Deep Tissue Massage: Capacity 4)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer8.Id, SlotDate = targetDate, StartTime = new TimeOnly(12, 0), EndTime = new TimeOnly(13, 30), Capacity = 4, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer8.Id, SlotDate = targetDate, StartTime = new TimeOnly(16, 30), EndTime = new TimeOnly(18, 0), Capacity = 4, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 9 (Gym Pool Pass: Capacity 8)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer9.Id, SlotDate = targetDate, StartTime = new TimeOnly(09, 0), EndTime = new TimeOnly(11, 0), Capacity = 8, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer9.Id, SlotDate = targetDate, StartTime = new TimeOnly(15, 0), EndTime = new TimeOnly(17, 0), Capacity = 8, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 10 (Laser Revitalization: Capacity 6)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer10.Id, SlotDate = targetDate, StartTime = new TimeOnly(10, 0), EndTime = new TimeOnly(11, 30), Capacity = 6, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer10.Id, SlotDate = targetDate, StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(15, 30), Capacity = 6, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });

        // Slots for Offer 11 (React 19 Masterclass: Capacity 25)
        slots.Add(new OfferSlot { Id = Guid.NewGuid(), OfferId = offer11.Id, SlotDate = targetDate, StartTime = new TimeOnly(18, 0), EndTime = new TimeOnly(20, 0), Capacity = 25, BookedCount = 0, Status = "Available", CreatedAt = DateTime.UtcNow });
    }

    context.OfferSlots.AddRange(slots);
    context.SaveChanges();

    // 5. Seed Bookings (to provide immediate analytics in console)
    var randomSlot1 = slots.First(s => s.OfferId == offer1.Id && s.BookedCount > 0);
    var randomSlot2 = slots.First(s => s.OfferId == offer2.Id && s.BookedCount > 0);
    var randomSlot3 = slots.First(s => s.OfferId == offer3.Id && s.BookedCount > 0);
    var randomSlot5 = slots.First(s => s.OfferId == offer5.Id && s.BookedCount > 0);
    var randomSlot6 = slots.First(s => s.OfferId == offer6.Id && s.BookedCount > 0);

    var bookings = new List<Booking>
    {
        new Booking { Id = Guid.NewGuid(), BookingReference = "BK-BUFFET01", OfferId = offer1.Id, SlotId = randomSlot1.Id, CustomerName = "Alice Smith", CustomerEmail = "alice@example.com", CustomerPhone = "+1 (555) 012-3456", PeopleCount = 3, SpecialNote = "No nuts, allergic.", Status = "Confirmed", CreatedAt = DateTime.UtcNow.AddHours(-6) },
        new Booking { Id = Guid.NewGuid(), BookingReference = "BK-BUFFET02", OfferId = offer1.Id, SlotId = randomSlot1.Id, CustomerName = "Bob Johnson", CustomerEmail = "bob@example.com", CustomerPhone = "+1 (555) 987-6543", PeopleCount = 2, SpecialNote = string.Empty, Status = "Confirmed", CreatedAt = DateTime.UtcNow.AddHours(-5) },
        new Booking { Id = Guid.NewGuid(), BookingReference = "BK-HAPPY001", OfferId = offer2.Id, SlotId = randomSlot2.Id, CustomerName = "Charlie Davis", CustomerEmail = "charlie@example.com", CustomerPhone = "+1 (555) 444-5555", PeopleCount = 4, SpecialNote = "Window table T2 if possible.", Status = "Confirmed", CreatedAt = DateTime.UtcNow.AddHours(-4) },
        new Booking { Id = Guid.NewGuid(), BookingReference = "BK-HAPPY002", OfferId = offer2.Id, SlotId = randomSlot2.Id, CustomerName = "Diana Prince", CustomerEmail = "diana@example.com", CustomerPhone = "+1 (555) 777-8888", PeopleCount = 4, SpecialNote = string.Empty, Status = "Confirmed", CreatedAt = DateTime.UtcNow.AddHours(-3) },
        new Booking { Id = Guid.NewGuid(), BookingReference = "BK-SPA001", OfferId = offer3.Id, SlotId = randomSlot3.Id, CustomerName = "Emily Blunt", CustomerEmail = "emily@gmail.com", CustomerPhone = "+1 (555) 321-4567", PeopleCount = 2, SpecialNote = "Prefers female therapist.", Status = "Confirmed", CreatedAt = DateTime.UtcNow.AddHours(-2) },
        new Booking { Id = Guid.NewGuid(), BookingReference = "BK-FACIAL01", OfferId = offer5.Id, SlotId = randomSlot5.Id, CustomerName = "Fiona Gallagher", CustomerEmail = "fiona@southside.com", CustomerPhone = "+1 (555) 888-2233", PeopleCount = 3, SpecialNote = string.Empty, Status = "Confirmed", CreatedAt = DateTime.UtcNow.AddHours(-1) },
        new Booking { Id = Guid.NewGuid(), BookingReference = "BK-CODE01", OfferId = offer6.Id, SlotId = randomSlot6.Id, CustomerName = "Gabriel Macht", CustomerEmail = "gabriel@pearson.com", CustomerPhone = "+1 (555) 474-9900", PeopleCount = 12, SpecialNote = "Suits team workshop seatings.", Status = "Confirmed", CreatedAt = DateTime.UtcNow.AddMinutes(-15) }
    };

    context.Bookings.AddRange(bookings);
    context.SaveChanges();
}

