using Microsoft.EntityFrameworkCore;
using SmartOfferBooking.Core.Entities;

namespace SmartOfferBooking.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Business> Businesses => Set<Business>();
        public DbSet<Offer> Offers => Set<Offer>();
        public DbSet<OfferSlot> OfferSlots => Set<OfferSlot>();
        public DbSet<Booking> Bookings => Set<Booking>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User mapping
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
                entity.Property(e => e.PasswordHash).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Role).HasMaxLength(50).IsRequired();
            });

            // Business mapping
            modelBuilder.Entity<Business>(entity =>
            {
                entity.ToTable("Businesses");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
                entity.Property(e => e.BusinessType).HasMaxLength(100).IsRequired();
                entity.Property(e => e.OwnerName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Phone).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Address).IsRequired();
                entity.Property(e => e.City).HasMaxLength(255).IsRequired();
                entity.Property(e => e.OpeningTime).HasMaxLength(50).IsRequired();
                entity.Property(e => e.ClosingTime).HasMaxLength(50).IsRequired();
            });

            // Offer mapping
            modelBuilder.Entity<Offer>(entity =>
            {
                entity.ToTable("Offers");
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Business)
                    .WithMany(b => b.Offers)
                    .HasForeignKey(e => e.BusinessId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
                
                // Fluent API check constraint: OfferPrice < OriginalPrice
                entity.ToTable(t => t.HasCheckConstraint("CK_Offer_PriceCheck", "\"OfferPrice\" < \"OriginalPrice\""));

                entity.HasIndex(e => e.BusinessId);
                entity.HasIndex(e => e.Status);
            });

            // OfferSlot mapping
            modelBuilder.Entity<OfferSlot>(entity =>
            {
                entity.ToTable("OfferSlots");
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Offer)
                    .WithMany(o => o.Slots)
                    .HasForeignKey(e => e.OfferId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
                entity.HasIndex(e => e.OfferId);
                entity.HasIndex(e => e.Status);
            });

            // Booking mapping
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.ToTable("Bookings");
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Offer)
                    .WithMany()
                    .HasForeignKey(e => e.OfferId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.OfferSlot)
                    .WithMany(s => s.Bookings)
                    .HasForeignKey(e => e.SlotId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.BookingReference).HasMaxLength(100).IsRequired();
                entity.Property(e => e.CustomerName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.CustomerPhone).HasMaxLength(50).IsRequired();
                entity.Property(e => e.CustomerEmail).HasMaxLength(255);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired();

                entity.HasIndex(e => e.OfferId);
                entity.HasIndex(e => e.SlotId);
                entity.HasIndex(e => e.BookingReference).IsUnique();
            });
        }
    }
}
