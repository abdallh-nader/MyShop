using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using ShopApp.Data;
using ShopApp.Services;

var builder = WebApplication.CreateBuilder(args);
// --- Render Port Configuration ---
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://*:{port}");

// --- Database: MySQL / MariaDB through EF Core ---
var cs = builder.Configuration.GetConnectionString("Default") 
         ?? throw new InvalidOperationException("Connection string 'Default' not found in configuration.");

// Fix: Use explicit MySQL version to prevent crashes on startup from AutoDetect
var serverVersion = new MySqlServerVersion(new Version(8, 0, 30));

builder.Services.AddDbContext<AppDbContext>(o => o.UseMySql(cs, serverVersion, mysqlOptions =>
{
    mysqlOptions.EnableRetryOnFailure(
        maxRetryCount: 5,
        maxRetryDelay: TimeSpan.FromSeconds(10),
        errorNumbersToAdd: null);
}));

// --- Admin login: secure cookie (HttpOnly, SameSite=Strict so other sites cannot send it) ---
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "admin_auth";
    o.Cookie.HttpOnly = true;                           // JavaScript cannot read the cookie
    o.Cookie.SameSite = SameSiteMode.Strict;           // blocks cross-site (CSRF) requests
    o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // use HTTPS in production
    o.ExpireTimeSpan = TimeSpan.FromHours(8);
    // APIs should answer 401/403 instead of redirecting to a login page
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.AddAuthorization();

builder.Services.AddControllers();

// --- تسجيل خدمة رفع الصور السحابية (Cloudinary) ---
builder.Services.AddScoped<IPhotoService, PhotoService>();

builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 22 * 1024 * 1024); // upload size cap (20 MB image + form fields)
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 22 * 1024 * 1024);

var app = builder.Build();

// Create the database and tables on first run (see README for migrations).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

Directory.CreateDirectory(Path.Combine(app.Environment.WebRootPath, "uploads"));

app.UseDefaultFiles();      // "/" -> index.html (customer page)
app.UseStaticFiles();       // serves wwwroot (customer page, css, js, uploads)
app.UseAuthentication();    // reads the login cookie
app.UseAuthorization();     // enforces [Authorize]
app.MapControllers();

// Admin page: only sent to a logged-in admin, everyone else is redirected to the login form.
app.MapGet("/admin", (HttpContext c, IWebHostEnvironment env) =>
{
    c.Response.Headers.CacheControl = "no-store";
    return c.User.Identity?.IsAuthenticated == true
        ? Results.File(Path.Combine(env.ContentRootPath, "Private", "admin.html"), "text/html")
        : Results.Redirect("/admin-login.html");
});
// Invoice page (printable, "Save as PDF"): admin only
app.MapGet("/admin/invoice", (HttpContext c, IWebHostEnvironment env) =>
{
    c.Response.Headers.CacheControl = "no-store";
    return c.User.Identity?.IsAuthenticated == true
        ? Results.File(Path.Combine(env.ContentRootPath, "Private", "invoice.html"), "text/html")
        : Results.Redirect("/admin-login.html");
});
// Admin script is also private, so its code is not exposed to customers.
app.MapGet("/admin/admin.js", (IWebHostEnvironment env) =>
    Results.File(Path.Combine(env.ContentRootPath, "Private", "admin.js"), "application/javascript"))
    .RequireAuthorization();

app.Run();