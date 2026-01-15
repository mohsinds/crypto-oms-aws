using RiskEngine.Models;

namespace RiskEngine.Services;

public interface IMarginCalculationService
{
    Task<decimal> CalculateRequiredMarginAsync(RiskValidationRequest request, decimal currentPrice);
    Task<decimal> GetAvailableMarginAsync(string userId);
    Task<decimal> CalculateInitialMarginAsync(string userId);
}

public class MarginCalculationService : IMarginCalculationService
{
    private readonly IPositionService _positionService;
    private readonly ILogger<MarginCalculationService> _logger;
    private const decimal DefaultLeverage = 10m; // 10x leverage

    public MarginCalculationService(
        IPositionService positionService,
        ILogger<MarginCalculationService> logger)
    {
        _positionService = positionService;
        _logger = logger;
    }

    public Task<decimal> CalculateRequiredMarginAsync(RiskValidationRequest request, decimal currentPrice)
    {
        try
        {
            var orderValue = request.Quantity * (request.Price ?? currentPrice);
            var requiredMargin = orderValue / DefaultLeverage; // Leverage-based margin

            _logger.LogDebug("Calculated required margin: {RequiredMargin} for order: {OrderId}, Value: {OrderValue}",
                requiredMargin, request.OrderId, orderValue);

            return Task.FromResult(requiredMargin);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating required margin for order: {OrderId}", request.OrderId);
            throw;
        }
    }

    public async Task<decimal> GetAvailableMarginAsync(string userId)
    {
        try
        {
            var initialMargin = await CalculateInitialMarginAsync(userId);
            var totalPositionValue = await _positionService.GetTotalPositionValueAsync(userId);
            var usedMargin = totalPositionValue / DefaultLeverage;
            var availableMargin = initialMargin - usedMargin;

            _logger.LogDebug("Available margin for user: {UserId}, Initial: {InitialMargin}, Used: {UsedMargin}, Available: {AvailableMargin}",
                userId, initialMargin, usedMargin, availableMargin);

            return Math.Max(0, availableMargin); // Don't return negative
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating available margin for user: {UserId}", userId);
            return 0;
        }
    }

    public async Task<decimal> CalculateInitialMarginAsync(string userId)
    {
        try
        {
            // TODO: Get from user account or risk limits configuration
            // For now, return a default value
            // In production, this would come from DocumentDB or user account service
            const decimal defaultInitialMargin = 100000m; // $100,000 default

            _logger.LogDebug("Initial margin for user: {UserId}: {InitialMargin}", userId, defaultInitialMargin);
            return await Task.FromResult(defaultInitialMargin);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating initial margin for user: {UserId}", userId);
            return 0;
        }
    }
}
