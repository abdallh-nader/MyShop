using System.ComponentModel.DataAnnotations;
namespace ShopApp.Models;

// Data the browser sends. Note: NO price field – the server always uses the DB price.
public record OrderLine(int ProductId, int Quantity, int? OptionId = null);
public record CreateOrderRequest(string Name, string Phone, double Latitude, double Longitude, string Zone, List<OrderLine> Items);
public record StatusRequest(string Status);
public record LoginRequest(string Username, string Password);

// Admin product form (multipart/form-data so an image file can be uploaded).
public class ProductForm
{
    [Required, StringLength(150)] public string Name { get; set; } = "";
    [Range(0.01, 99999999)] public decimal Price { get; set; }
    [Range(0, 1000000)] public int Stock { get; set; }
    [StringLength(50)] public string? OptionsName { get; set; }  // e.g. Size / Weight
    public string? OptionsJson { get; set; }                      // [{id,label,price}] as JSON text
    [StringLength(1000)] public string? Description { get; set; }
    [Range(0, 99)] public int DiscountPercent { get; set; }
    public IFormFile? Image { get; set; }             // optional on edit (keeps old image)
}
