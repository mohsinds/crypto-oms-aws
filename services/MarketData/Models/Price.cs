namespace MarketData.Models;

public class Price
{
    public string Symbol { get; set; } = string.Empty;
    public decimal PriceValue { get; set; }
    public decimal Change24h { get; set; }
    public decimal ChangePercent24h { get; set; }
    public decimal High24h { get; set; }
    public decimal Low24h { get; set; }
    public decimal Volume24h { get; set; }
    public DateTime Timestamp { get; set; }
}
