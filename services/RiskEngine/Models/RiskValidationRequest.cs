namespace RiskEngine.Models;

public class RiskValidationRequest
{
    public Guid OrderId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string Side { get; set; } = string.Empty; // BUY or SELL
    public string OrderType { get; set; } = string.Empty; // MARKET or LIMIT
    public decimal Quantity { get; set; }
    public decimal? Price { get; set; }
    public decimal? CurrentPrice { get; set; } // Current market price for the symbol
}
