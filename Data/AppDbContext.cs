using Microsoft.EntityFrameworkCore;
using ShopApp.Models;
namespace ShopApp.Data;

// EF Core database context: maps C# classes to MySQL tables.
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<ProductOption> ProductOptions => Set<ProductOption>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Product>(e =>
        {
            e.Property(p => p.Price).HasPrecision(10, 2);                       // money column
            e.Property(p => p.OptionsName).HasMaxLength(50);
            e.Property(p => p.Description).HasMaxLength(1000);
            e.ToTable(t => t.HasCheckConstraint("CK_Product_Stock", "Stock >= 0")); // DB-level safety net
        });
        b.Entity<ProductOption>(e =>
        {
            e.Property(o => o.Label).HasMaxLength(60);
            e.Property(o => o.Price).HasPrecision(10, 2);        // deleting a product deletes its options too
        });
        b.Entity<Order>(e =>
        {
            e.Property(o => o.Total).HasPrecision(12, 2);
            e.Property(o => o.Phone).HasMaxLength(20);
            e.Property(o => o.CustomerName).HasMaxLength(100);
            e.Property(o => o.DeliveryFee).HasPrecision(10, 2);
            e.Property(o => o.Status).HasMaxLength(20);
            e.Property(o => o.DeliveryZone).HasMaxLength(10);
            // MySQL returns dates without a timezone; mark them UTC so the browser converts correctly
            e.Property(o => o.CreatedAt).HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
            e.HasIndex(o => o.CreatedAt);                                       // fast "newest first" listing
        });
        b.Entity<OrderItem>(e =>
        {
            e.Property(i => i.UnitPrice).HasPrecision(10, 2);
            e.Property(i => i.ProductName).HasMaxLength(150);
            e.Property(i => i.OptionText).HasMaxLength(200);
            // Deleting a product keeps the order lines (ProductId just becomes NULL)
            e.HasOne<Product>().WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
