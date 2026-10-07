using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopApp.Data;
using ShopApp.Models;
namespace ShopApp.Controllers;

// ADMIN ONLY: list orders, read one (for the invoice), change status, delete.
[ApiController, Authorize, Route("api/admin/orders")]
public class AdminOrdersController(AppDbContext db) : ControllerBase
{
    private static readonly string[] Statuses = { "Received", "InDelivery", "Delivered" };

    // Shape returned to the admin page / invoice
    private IQueryable<object> Shape(IQueryable<Order> q) => q.Select(o => (object)new
    {
        o.Id, o.CustomerName, o.Phone, o.Latitude, o.Longitude, o.DeliveryZone, o.DeliveryFee, o.Status, o.Total, o.CreatedAt,
        Items = o.Items.Select(i => new { i.ProductName, i.OptionText, i.UnitPrice, i.Quantity })
    });

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await Shape(db.Orders.AsNoTracking().OrderByDescending(o => o.CreatedAt).Take(500)).ToListAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetOne(int id)
    {
        var o = await Shape(db.Orders.AsNoTracking().Where(x => x.Id == id)).FirstOrDefaultAsync();
        return o == null ? NotFound() : Ok(o);
    }

    // Change status: Received / InDelivery / Delivered
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, StatusRequest req)
    {
        if (!Statuses.Contains(req.Status)) return BadRequest();
        var o = await db.Orders.FindAsync(id);
        if (o == null) return NotFound();
        o.Status = req.Status;
        await db.SaveChangesAsync();
        return Ok();
    }

    // Delete an order (its items are deleted with it; stock is NOT given back)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var o = await db.Orders.FindAsync(id);
        if (o == null) return NotFound();
        db.Orders.Remove(o);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
