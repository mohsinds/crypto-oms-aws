namespace OrderIngestion.Models;

public class OrderCreatedEvent
{
    public Guid OrderId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public OrderSide Side { get; set; }
    public OrderType OrderType { get; set; }
    public decimal Quantity { get; set; }
    public decimal? Price { get; set; }
    public DateTime Timestamp { get; set; }
}
