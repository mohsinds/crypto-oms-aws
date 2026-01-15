namespace OrderIngestion.Models;

public enum OrderSide
{
    BUY,
    SELL
}

public enum OrderType
{
    MARKET,
    LIMIT
}

public enum OrderStatus
{
    NEW,
    ACCEPTED,
    REJECTED,
    FILLED,
    CANCELLED,
    SETTLED
}

public class Order
{
    public Guid OrderId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public OrderSide Side { get; set; }
    public OrderType OrderType { get; set; }
    public decimal Quantity { get; set; }
    public decimal? Price { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? IdempotencyKey { get; set; }
    public string? RejectionReason { get; set; }
}
