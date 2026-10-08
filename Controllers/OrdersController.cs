using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopApp.Data;
using ShopApp.Models;
using ShopApp.Services;

namespace ShopApp.Controllers;

// PUBLIC: a customer confirms an order. The server re-checks everything.
[ApiController, Route("api/orders")]
public class OrdersController(AppDbContext db, IConfiguration cfg) : ControllerBase
{
    private static readonly Regex PhoneRx = new(@"^\+?[0-9]{7,15}$");

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest req)
    {
        // --- 1. Validate input ---
        var name = (req.Name ?? "").Trim();
        if (name.Length < 2 || name.Length > 100) return BadRequest(new { error = "invalid_name" });
        var phone = Regex.Replace(req.Phone ?? "", @"[\s\-()]", "");    // allow spaces/dashes in the input
        if (!PhoneRx.IsMatch(phone)) return BadRequest(new { error = "invalid_phone" });
        if (req.Latitude is < -90 or > 90 || req.Longitude is < -180 or > 180 ||
            double.IsNaN(req.Latitude) || double.IsNaN(req.Longitude))
            return BadRequest(new { error = "invalid_location" });
        if (req.Items == null || req.Items.Count is 0 or > 50 || req.Items.Any(i => i.Quantity < 1 || i.Quantity > 1000))
            return BadRequest(new { error = "invalid_items" });
        if (req.Zone != "Amman" && req.Zone != "Outside") return BadRequest(new { error = "invalid_zone" });
        
        // Delivery fee comes from appsettings.json (the browser cannot choose the price)
        var fee = cfg.GetValue<decimal>(req.Zone == "Amman" ? "Delivery:AmmanFee" : "Delivery:OutsideAmmanFee");

        // Merge duplicate lines (same product AND same option)
        var lines = req.Items.GroupBy(i => new { i.ProductId, OptionId = i.OptionId ?? 0 })
            .Select(g => new OrderLine(g.Key.ProductId, g.Sum(x => x.Quantity), g.Key.OptionId == 0 ? null : g.Key.OptionId)).ToList();

        // --- 2. Wrap transaction in ExecutionStrategy for resilience compatibility ---
        var strategy = db.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync();

            var ids = lines.Select(l => l.ProductId).Distinct().ToList();
            var products = await db.Products.AsNoTracking().Include(p => p.Options)
                .Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
            if (products.Count != ids.Count) return BadRequest(new { error = "product_not_found" });

            var order = new Order { 
                CustomerName = name, 
                Phone = phone, 
                Latitude = req.Latitude, 
                Longitude = req.Longitude,
                DeliveryZone = req.Zone, 
                DeliveryFee = fee, 
                Status = "Received" 
            };

            foreach (var line in lines)
            {
                var p = products[line.ProductId];
                // If the product has options the customer MUST pick a valid one; otherwise no option is allowed
                ProductOption? opt = null;
                if (p.Options.Count > 0)
                {
                    opt = p.Options.FirstOrDefault(o => o.Id == line.OptionId);
                    if (opt == null) return BadRequest(new { error = "invalid_option" });
                }
                else if (line.OptionId != null) return BadRequest(new { error = "invalid_option" });

                // Atomic stock check + decrease (stock is counted per product, all options share it)
                var updated = await db.Products.Where(x => x.Id == p.Id && x.Stock >= line.Quantity)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.Stock, x => x.Stock - line.Quantity));
                if (updated == 0)
                {
                    await tx.RollbackAsync();               // undo stock already taken for earlier lines
                    var available = await db.Products.AsNoTracking().Where(x => x.Id == p.Id).Select(x => x.Stock).FirstOrDefaultAsync();
                    return Conflict(new { error = "out_of_stock", productName = p.Name, available });
                }

                // Copy name, option text and the DATABASE price into the order (the browser's price is never trusted)
                order.Items.Add(new OrderItem
                {
                    ProductId = p.Id, 
                    ProductName = p.Name,
                    OptionText = opt == null ? "" : $"{p.OptionsName}: {opt.Label}",
                    UnitPrice = Pricing.Apply(opt?.Price ?? p.Price, p.DiscountPercent),   // price after the admin's discount
                    Quantity = line.Quantity
                });
            }

            order.Total = order.Items.Sum(i => i.UnitPrice * i.Quantity) + fee; // items + delivery, calculated on the server

            db.Orders.Add(order);
            await db.SaveChangesAsync();
            await tx.CommitAsync();

            return StatusCode(201, new { order.Id, order.Total });
        });
    }
}