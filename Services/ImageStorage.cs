namespace ShopApp.Services;

// Saves/deletes uploaded product images inside wwwroot/uploads.
public class ImageStorage(IWebHostEnvironment env)
{
    private static readonly string[] Allowed = { ".jpg", ".jpeg", ".png", ".webp", ".gif" }; // no SVG (can hold scripts)
    private const long MaxBytes = 20 * 1024 * 1024;                                          // 20 MB limit

    // Returns the public URL of the saved image, or null when no file was sent.
    public async Task<string?> SaveAsync(IFormFile? file)
    {
        if (file == null || file.Length == 0) return null;
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!Allowed.Contains(ext) || file.Length > MaxBytes || !file.ContentType.StartsWith("image/"))
            throw new InvalidOperationException("invalid_image");
        var name = $"{Guid.NewGuid():N}{ext}";                  // random name: no path tricks, no collisions
        await using var fs = File.Create(Path.Combine(env.WebRootPath, "uploads", name));
        await file.CopyToAsync(fs);
        return "/uploads/" + name;
    }

    // Removes an old image file (ignores missing files).
    public void Delete(string? url)
    {
        if (string.IsNullOrEmpty(url)) return;
        var path = Path.Combine(env.WebRootPath, "uploads", Path.GetFileName(url)); // GetFileName blocks ../
        if (File.Exists(path)) File.Delete(path);
    }
}
