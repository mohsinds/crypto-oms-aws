namespace OrderProcessor.Models;

public class ExecutionEvent
{
    public Guid OrderId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string Side { get; set; } = string.Empty;
    public decimal FilledQuantity { get; set; }
    public decimal FillPrice { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime ExecutedAt { get; set; }
}
