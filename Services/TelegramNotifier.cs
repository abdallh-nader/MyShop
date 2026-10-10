using System.Globalization;
using System.Text;
using ShopApp.Models;
namespace ShopApp.Services;

// Sends a Telegram message to the shop owner when a new order is saved.
public class TelegramNotifier(HttpClient http, IConfiguration cfg, ILogger<TelegramNotifier> log)
{
    private static string F(decimal d) => d.ToString("0.000", CultureInfo.InvariantCulture); // money text

    public async Task SendNewOrderAsync(Order o)
    {
        var token = cfg["Telegram:BotToken"];
        // ChatIds can hold several ids separated by commas (owner + employee)
        var chats = (cfg["Telegram:ChatIds"] ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (string.IsNullOrWhiteSpace(token) || chats.Length == 0) return;   // not configured -> do nothing

        var cur = cfg["Shop:Currency"] ?? "JOD";
        var sb = new StringBuilder();
        sb.AppendLine($"🛒 طلب جديد #{o.Id}");
        sb.AppendLine($"الاسم: {o.CustomerName}");
        sb.AppendLine($"الهاتف: {o.Phone}");
        sb.AppendLine($"المنطقة: {(o.DeliveryZone == "Amman" ? "داخل عمّان" : "خارج عمّان")}");
        foreach (var i in o.Items)
            sb.AppendLine($"• {i.ProductName}{(i.OptionText != "" ? $" ({i.OptionText})" : "")} × {i.Quantity}");
        sb.AppendLine($"التوصيل: {F(o.DeliveryFee)} {cur}");
        sb.AppendLine($"المجموع: {F(o.Total)} {cur}");
        sb.AppendLine($"📍 https://www.google.com/maps?q={o.Latitude.ToString(CultureInfo.InvariantCulture)},{o.Longitude.ToString(CultureInfo.InvariantCulture)}");

        foreach (var chat in chats)
        {
            try
            {
                var res = await http.PostAsJsonAsync($"https://api.telegram.org/bot{token}/sendMessage",
                    new { chat_id = chat, text = sb.ToString() });
                if (!res.IsSuccessStatusCode)   // shows Telegram's error in the terminal
                    log.LogWarning("Telegram failed {Status}: {Body}", (int)res.StatusCode, await res.Content.ReadAsStringAsync());
            }
            catch (Exception ex) { log.LogWarning(ex, "Telegram error"); }   // never break the order because of a notification
        }
    }
}