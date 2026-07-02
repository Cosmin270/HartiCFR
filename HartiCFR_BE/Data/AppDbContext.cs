using Microsoft.EntityFrameworkCore;
using HartiCFR_BE.Models;

namespace HartiCFR_BE.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
}