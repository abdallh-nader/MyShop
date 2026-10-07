using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopApp.Data;
using ShopApp.Services;
namespace ShopApp.Controllers;

// PUBLIC: what the customer page needs: description, options, original price and price after discount.
[ApiController, Route("api/products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await db.Products.AsNoTracking().Include(p => p.Options.OrderBy(o => o.Id))
            .OrderByDescending(p => p.Id).ToListAsync();
        return Ok(list.Select(p => new
        {
            p.Id, p.Name, p.Description, p.Stock, p.ImageUrl, p.OptionsName, p.DiscountPercent,
            p.Price, SalePrice = Pricing.Apply(p.Price, p.DiscountPercent),      // before / after discount
            Options = p.Options.Select(o => new { o.Id, o.Label, o.Price, SalePrice = Pricing.Apply(o.Price, p.DiscountPercent) })
        }));
    }
}
