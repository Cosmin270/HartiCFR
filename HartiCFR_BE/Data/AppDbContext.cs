using Microsoft.EntityFrameworkCore;
using HartiCFR_BE.Models;

namespace HartiCFR_BE.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }

    public DbSet<Log> Logs { get; set; }

    public DbSet<Station> Stations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Log>(entity =>
        {
            entity.ComplexProperty(l => l.Location);
            entity.ComplexProperty(l => l.Position);

            entity.Property(l => l.LocationType).HasConversion<string>();
            entity.Property(l => l.ElectricType).HasConversion<string>();
            entity.Property(l => l.ConfigType).HasConversion<string>();
            entity.Property(l => l.Producer).HasConversion<string>();
            entity.Property(l => l.OperatingMode).HasConversion<string>();
        });

        modelBuilder.Entity<Station>(entity =>
        {
            entity.ComplexProperty(s => s.Position);
        });
    }
}