namespace MarketData.Models;

public class OrderBookEntry
{
    public decimal Price { get; set; }
    public decimal Quantity { get; set; }
}

public class OrderBook
{
    public string Symbol { get; set; } = string.Empty;
    public List<OrderBookEntry> Bids { get; set; } = new();
    public List<OrderBookEntry> Asks { get; set; } = new();
    public DateTime Timestamp { get; set; }
}
