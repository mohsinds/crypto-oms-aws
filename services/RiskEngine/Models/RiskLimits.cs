namespace RiskEngine.Models;

public class RiskLimits
{
    public string UserId { get; set; } = string.Empty;
    public decimal MaxPositionSize { get; set; } = 1000000; // Maximum position value in USD
    public decimal MaxDailyLoss { get; set; } = 50000; // Maximum daily loss in USD
    public decimal MaxLeverage { get; set; } = 10; // Maximum leverage (10x)
    public decimal MaxConcentration { get; set; } = 0.5m; // Maximum 50% of portfolio in single symbol
    public int MaxOrdersPerMinute { get; set; } = 100; // Velocity check
    public decimal InitialMargin { get; set; } = 100000; // Initial margin in USD
    public DateTime UpdatedAt { get; set; }
}
