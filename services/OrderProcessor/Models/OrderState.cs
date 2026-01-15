namespace OrderProcessor.Models;

public enum OrderStatus
{
    NEW,
    ACCEPTED,
    REJECTED,
    FILLED,
    CANCELLED,
    SETTLED
}

public class OrderState
{
    public Guid OrderId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string Side { get; set; } = string.Empty; // BUY or SELL
    public string OrderType { get; set; } = string.Empty; // MARKET or LIMIT
    public decimal Quantity { get; set; }
    public decimal? Price { get; set; }
    public OrderStatus Status { get; set; }
    public decimal FilledQuantity { get; set; }
    public decimal? FillPrice { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? IdempotencyKey { get; set; }
}
