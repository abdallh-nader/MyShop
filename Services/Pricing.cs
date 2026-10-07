namespace ShopApp.Services;

// One place that applies a product discount, so the shop page, the order and the invoice always agree.
public static class Pricing
{
    // price 10.00 with 20 (%) discount -> 8.00 (rounded to 2 decimals)
    public static decimal Apply(decimal price, int discountPercent) =>
        discountPercent <= 0 ? price : Math.Round(price * (100 - discountPercent) / 100m, 2, MidpointRounding.AwayFromZero);
}
