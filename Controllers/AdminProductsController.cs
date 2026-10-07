using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopApp.Data;
using ShopApp.Models;
using ShopApp.Services;
namespace ShopApp.Controllers;

// ADMIN ONLY: [Authorize] makes every action return 401 without the admin cookie.
[ApiController, Authorize, Route("api/admin/products")]
public class AdminProductsController(AppDbContext db, ImageStorage images) : ControllerBase
{
    private record OptionInput(int Id, string Label, decimal Price);

    // Reads the options sent by the admin form (JSON text) and validates them. Returns null if invalid.
    private static List<OptionInput>? ParseOptions(ProductForm f)
    {
        if (string.IsNullOrWhiteSpace(f.OptionsJson)) return new();
        try
        {
            var list = JsonSerializer.Deserialize<List<OptionInput>>(f.OptionsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
            if (list.Count > 20 || list.Any(o => string.IsNullOrWhiteSpace(o.Label) || o.Label.Trim().Length > 60 ||
                                                 o.Price <= 0 || o.Price > 1000000)) return null;
            if (list.Count > 0 && string.IsNullOrWhiteSpace(f.OptionsName)) return null; // group name is required
            return list;
        }
        catch (JsonException) { return null; }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await db.Products.AsNoTracking().Include(p => p.Options.OrderBy(o => o.Id))
            .OrderByDescending(p => p.Id).ToListAsync();
        return Ok(list.Select(p => new
        {
            p.Id, p.Name, p.Description, p.Price, p.DiscountPercent, SalePrice = Pricing.Apply(p.Price, p.DiscountPercent),
            p.Stock, p.ImageUrl, p.OptionsName,
            Options = p.Options.Select(o => new { o.Id, o.Label, o.Price, SalePrice = Pricing.Apply(o.Price, p.DiscountPercent) })
        }));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromForm] ProductForm f)
    {
        var opts = ParseOptions(f);
        if (opts == null) return BadRequest(new { error = "invalid_options" });
        var p = new Product
        {
            Name = f.Name.Trim(), Stock = f.Stock, DiscountPercent = f.DiscountPercent,
            Description = string.IsNullOrWhiteSpace(f.Description) ? null : f.Description.Trim(),
            Price = opts.Count > 0 ? opts.Min(o => o.Price) : f.Price,   // with options, the product price = lowest option price
            OptionsName = opts.Count > 0 ? f.OptionsName!.Trim() : null,
            Options = opts.Select(o => new ProductOption { Label = o.Label.Trim(), Price = o.Price }).ToList()
        };
        try { p.ImageUrl = await images.SaveAsync(f.Image); }          // upload image (if any)
        catch (InvalidOperationException) { return BadRequest(new { error = "invalid_image" }); }
        db.Products.Add(p);
        await db.SaveChangesAsync();
        return Ok(p);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromForm] ProductForm f)
    {
        var p = await db.Products.Include(x => x.Options).FirstOrDefaultAsync(x => x.Id == id);
        if (p == null) return NotFound();
        var opts = ParseOptions(f);
        if (opts == null) return BadRequest(new { error = "invalid_options" });
        try
        {
            var newImage = await images.SaveAsync(f.Image);
            if (newImage != null) { images.Delete(p.ImageUrl); p.ImageUrl = newImage; } // replace old image
        }
        catch (InvalidOperationException) { return BadRequest(new { error = "invalid_image" }); }

        // Options: remove the ones the admin deleted, update the existing ones, add the new ones
        foreach (var old in p.Options.Where(o => !opts.Any(i => i.Id == o.Id)).ToList()) p.Options.Remove(old);
        foreach (var i in opts)
        {
            var existing = i.Id > 0 ? p.Options.FirstOrDefault(o => o.Id == i.Id) : null;
            if (existing != null) { existing.Label = i.Label.Trim(); existing.Price = i.Price; }
            else p.Options.Add(new ProductOption { Label = i.Label.Trim(), Price = i.Price });
        }
        p.OptionsName = opts.Count > 0 ? f.OptionsName!.Trim() : null;
        p.Name = f.Name.Trim(); p.Stock = f.Stock; p.DiscountPercent = f.DiscountPercent;
        p.Description = string.IsNullOrWhiteSpace(f.Description) ? null : f.Description.Trim();
        p.Price = opts.Count > 0 ? opts.Min(o => o.Price) : f.Price;
        await db.SaveChangesAsync();
        return Ok(p);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var p = await db.Products.FindAsync(id);
        if (p == null) return NotFound();
        db.Products.Remove(p);                                         // options are deleted with it; old orders keep their copied text
        await db.SaveChangesAsync();
        images.Delete(p.ImageUrl);
        return NoContent();
    }
}
