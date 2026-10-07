# ShopApp – simple bilingual e-commerce (ASP.NET Core + MySQL)

## Run
1. Install .NET 8 SDK and MySQL 8.
2. Put your MySQL password in `appsettings.json` -> `ConnectionStrings:Default`.
3. `dotnet run` (tables are created automatically on first start).
4. Customer page: `/`  |  Admin: `/admin` (redirects to the login form)

Browser location needs **https** or `localhost`.

## Structure
- `Models/` entities + request DTOs · `Data/AppDbContext.cs` EF Core mapping
- `Controllers/` public: Products, Orders · admin ([Authorize]): AdminProducts, AdminOrders · Auth
- `Private/` admin.html + admin.js (not in wwwroot, served only after login)
- `wwwroot/` customer page, login page, css, js, uploads

## Admin login
Username/password hash are in `appsettings.json` (`Admin:*`). The password is stored as a PBKDF2 hash.
To change the password, generate a new hash in the same format `pbkdf2$100000$<salt>$<hash>`.

## Migrations (optional, instead of EnsureCreated)
Remove `EnsureCreated()` in Program.cs, then:
`dotnet tool install -g dotnet-ef` → `dotnet ef migrations add Init` → `dotnet ef database update`
and call `db.Database.Migrate()` at startup.
