namespace ShopApp.Models;

// One confirmed customer order.
public class Order
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";    // customer name (printed on the invoice)
    public string Phone { get; set; } = "";           // customer phone number
    public double Latitude { get; set; }              // delivery location as coordinates
    public double Longitude { get; set; }
    public string DeliveryZone { get; set; } = "Amman"; // "Amman" (inside) or "Outside" Amman
    public decimal DeliveryFee { get; set; }          // fee for that zone, taken from appsettings at order time
    public string Status { get; set; } = "Received";  // Received -> InDelivery -> Delivered
    public decimal Total { get; set; }                // items + delivery fee, calculated by the server
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // order date/time (UTC)
    public List<OrderItem> Items { get; set; } = new();
}

// One product line inside an order. Name and price are copied (snapshot) so old
// orders stay correct even if the product is later edited or deleted.
public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int? ProductId { get; set; }               // becomes null if the product is deleted
    public string ProductName { get; set; } = "";
    public string OptionText { get; set; } = "";      // chosen option copied as text, e.g. "Size: M"
    public decimal UnitPrice { get; set; }                // product price + option extra price
    public int Quantity { get; set; }
}
