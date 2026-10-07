using System.ComponentModel.DataAnnotations;
namespace ShopApp.Models;

// A product the customer can buy. Everything here is stored in MySQL.
public class Product
{
    public int Id { get; set; }                       // primary key
    [Required, MaxLength(150)] public string Name { get; set; } = "";
    public decimal Price { get; set; }                // current price (orders keep their own copy)
    public int Stock { get; set; }                    // units available; never below 0
    public string? ImageUrl { get; set; }             // e.g. /uploads/abc123.jpg
    public string? OptionsName { get; set; }          // name of the option group, e.g. "Size" or "Weight" (null = no options)
    public string? Description { get; set; }         // short text shown on the product card
    public int DiscountPercent { get; set; }          // 0 = no discount; 20 = 20% off (applies to the product and all its options)
    public List<ProductOption> Options { get; set; } = new();
}

// One choice the customer can pick for a product, e.g. "1 kg" or "M".
public class ProductOption
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    [Required, MaxLength(60)] public string Label { get; set; } = "";
    public decimal Price { get; set; }                // the FULL price of this choice, set by the admin (e.g. 1 kg = 5, 2 kg = 9)
}
