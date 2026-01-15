namespace MarketData.Models;

public class Candlestick
{
    public string Symbol { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public decimal Volume { get; set; }
    public string Interval { get; set; } = string.Empty; // 1m, 5m, 15m, 1h, 1d
}
