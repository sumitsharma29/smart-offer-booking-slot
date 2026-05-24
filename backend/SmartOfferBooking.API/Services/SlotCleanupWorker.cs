using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using SmartOfferBooking.Infrastructure.Data;

namespace SmartOfferBooking.API.Services
{
    public class SlotCleanupWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SlotCleanupWorker> _logger;

        public SlotCleanupWorker(IServiceProvider serviceProvider, ILogger<SlotCleanupWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Slot Expiry Cleanup Worker is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DoCleanupAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing slot expiry cleanup.");
                }

                // Check every 1 minute
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }

            _logger.LogInformation("Slot Expiry Cleanup Worker is stopping.");
        }

        private async Task DoCleanupAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var nowTime = TimeOnly.FromDateTime(DateTime.UtcNow);

            // Fetch slots that should be expired but are still marked as Available or Full
            var expiredSlots = await context.OfferSlots
                .Where(s => s.Status == "Available" || s.Status == "Full")
                .Where(s => s.SlotDate < today || (s.SlotDate == today && s.EndTime < nowTime))
                .ToListAsync();

            if (expiredSlots.Any())
            {
                _logger.LogInformation("Found {Count} expired slots to update.", expiredSlots.Count);
                foreach (var slot in expiredSlots)
                {
                    slot.Status = "Expired";
                }

                context.OfferSlots.UpdateRange(expiredSlots);
                await context.SaveChangesAsync();
            }
        }
    }
}
