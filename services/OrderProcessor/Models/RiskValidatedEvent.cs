namespace OrderProcessor.Models;

public class RiskValidatedEvent
{
    public Guid OrderId { get; set; }
    public bool Approved { get; set; }
    public string? Reason { get; set; }
    public DateTime ValidatedAt { get; set; }
}
