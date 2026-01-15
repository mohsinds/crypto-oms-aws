namespace RiskEngine.Models;

public class RiskValidationResult
{
    public bool Approved { get; set; }
    public string? Reason { get; set; }
    public decimal? RequiredMargin { get; set; }
    public decimal? AvailableMargin { get; set; }
    public decimal? CurrentPositionValue { get; set; }
    public decimal? NewPositionValue { get; set; }
    public List<string> FailedChecks { get; set; } = new();
    public DateTime ValidatedAt { get; set; }
}
