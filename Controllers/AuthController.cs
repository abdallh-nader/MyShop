using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopApp.Models;
namespace ShopApp.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(IConfiguration cfg) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = cfg["Admin:Username"] ?? "";
        // Both checks always run, so timing does not reveal which one was wrong
        bool userOk = CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(req.Username ?? ""), Encoding.UTF8.GetBytes(user));
        bool passOk = VerifyPassword(req.Password ?? "", cfg["Admin:PasswordHash"] ?? "");
        if (!(userOk && passOk))
        {
            await Task.Delay(600);                     // slows down password guessing
            return Unauthorized(new { error = "invalid_credentials" });
        }
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, user), new Claim(ClaimTypes.Role, "Admin") },
                                          CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(new ClaimsPrincipal(identity)); // issues the login cookie
        return Ok();
    }

    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync();
        return Ok();
    }

    // Stored format: pbkdf2$iterations$saltBase64$hashBase64 (the plain password is never stored)
    private static bool VerifyPassword(string password, string stored)
    {
        var parts = stored.Split('$');
        if (parts.Length != 4 || parts[0] != "pbkdf2") return false;
        var salt = Convert.FromBase64String(parts[2]);
        var expected = Convert.FromBase64String(parts[3]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, int.Parse(parts[1]), HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
