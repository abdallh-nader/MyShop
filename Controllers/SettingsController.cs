using Microsoft.AspNetCore.Mvc;
namespace ShopApp.Controllers;

// PUBLIC: delivery prices so the customer page can show them (the server still re-reads them when ordering).
[ApiController, Route("api/settings")]
public class SettingsController(IConfiguration cfg) : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        amman = cfg.GetValue<decimal>("Delivery:AmmanFee"),
        outside = cfg.GetValue<decimal>("Delivery:OutsideAmmanFee")
    });
}
