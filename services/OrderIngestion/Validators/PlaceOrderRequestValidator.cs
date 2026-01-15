using FluentValidation;
using OrderIngestion.Models;

namespace OrderIngestion.Validators;

public class PlaceOrderRequestValidator : AbstractValidator<PlaceOrderRequest>
{
    public PlaceOrderRequestValidator()
    {
        RuleFor(x => x.Symbol)
            .NotEmpty()
            .WithMessage("Symbol is required")
            .Matches(@"^[A-Z]+/[A-Z]+$")
            .WithMessage("Symbol must be in format BASE/QUOTE (e.g., BTC/USD)");

        RuleFor(x => x.Side)
            .IsInEnum()
            .WithMessage("Side must be either BUY or SELL");

        RuleFor(x => x.OrderType)
            .IsInEnum()
            .WithMessage("OrderType must be either MARKET or LIMIT");

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantity must be greater than zero")
            .LessThanOrEqualTo(1000000)
            .WithMessage("Quantity exceeds maximum allowed value");

        RuleFor(x => x.Price)
            .GreaterThan(0)
            .When(x => x.OrderType == OrderType.LIMIT)
            .WithMessage("Price is required and must be greater than zero for LIMIT orders")
            .LessThanOrEqualTo(1000000000)
            .When(x => x.OrderType == OrderType.LIMIT)
            .WithMessage("Price exceeds maximum allowed value");
    }
}
