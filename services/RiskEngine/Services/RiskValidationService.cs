using RiskEngine.Models;
using System.Collections.Concurrent;

namespace RiskEngine.Services;

public interface IRiskValidationService
{
    Task<RiskValidationResult> ValidateOrderAsync(RiskValidationRequest request);
    Task<RiskLimits> GetRiskLimitsAsync(string userId);
}

public class RiskValidationService : IRiskValidationService
{
    private readonly IPositionService _positionService;
    private readonly IMarginCalculationService _marginCalculationService;
    private readonly ILogger<RiskValidationService> _logger;
    private readonly ConcurrentDictionary<string, List<DateTime>> _orderVelocity = new();
    private readonly ConcurrentDictionary<string, RiskLimits> _riskLimitsCache = new();

    public RiskValidationService(
        IPositionService positionService,
        IMarginCalculationService marginCalculationService,
        ILogger<RiskValidationService> logger)
    {
        _positionService = positionService;
        _marginCalculationService = marginCalculationService;
        _logger = logger;
    }

    public async Task<RiskValidationResult> ValidateOrderAsync(RiskValidationRequest request)
    {
        var result = new RiskValidationResult
        {
            ValidatedAt = DateTime.UtcNow
        };

        try
        {
            var riskLimits = await GetRiskLimitsAsync(request.UserId);
            var currentPrice = request.CurrentPrice ?? 0m;

            // 1. Check position limits
            if (!await CheckPositionLimitsAsync(request, riskLimits, currentPrice, result))
            {
                result.Approved = false;
                return result;
            }

            // 2. Check margin requirements
            if (!await CheckMarginRequirementsAsync(request, riskLimits, currentPrice, result))
            {
                result.Approved = false;
                return result;
            }

            // 3. Check daily loss limits
            if (!await CheckDailyLossLimitsAsync(request, riskLimits, result))
            {
                result.Approved = false;
                return result;
            }

            // 4. Check concentration limits
            if (!await CheckConcentrationLimitsAsync(request, riskLimits, currentPrice, result))
            {
                result.Approved = false;
                return result;
            }

            // 5. Check velocity (orders per minute)
            if (!CheckVelocityLimits(request, riskLimits, result))
            {
                result.Approved = false;
                return result;
            }

            result.Approved = true;
            result.Reason = "Order approved by risk engine";

            _logger.LogInformation("Order validated successfully: {OrderId}, UserId: {UserId}, Symbol: {Symbol}",
                request.OrderId, request.UserId, request.Symbol);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating order: {OrderId}", request.OrderId);
            result.Approved = false;
            result.Reason = "Internal error during risk validation";
            return result;
        }
    }

    private async Task<bool> CheckPositionLimitsAsync(
        RiskValidationRequest request,
        RiskLimits riskLimits,
        decimal currentPrice,
        RiskValidationResult result)
    {
        var currentPosition = await _positionService.GetPositionAsync(request.UserId, request.Symbol);
        var orderValue = request.Quantity * (request.Price ?? currentPrice);
        var currentPositionValue = currentPosition != null ? Math.Abs(currentPosition.Quantity * currentPrice) : 0;
        var newPositionValue = currentPositionValue + orderValue;

        result.CurrentPositionValue = currentPositionValue;
        result.NewPositionValue = newPositionValue;

        if (newPositionValue > riskLimits.MaxPositionSize)
        {
            result.FailedChecks.Add("Position limit exceeded");
            result.Reason = $"Position limit exceeded. Max: {riskLimits.MaxPositionSize}, New: {newPositionValue}";
            _logger.LogWarning("Position limit check failed: {OrderId}, Max: {MaxPositionSize}, New: {NewPositionValue}",
                request.OrderId, riskLimits.MaxPositionSize, newPositionValue);
            return false;
        }

        return true;
    }

    private async Task<bool> CheckMarginRequirementsAsync(
        RiskValidationRequest request,
        RiskLimits riskLimits,
        decimal currentPrice,
        RiskValidationResult result)
    {
        var requiredMargin = await _marginCalculationService.CalculateRequiredMarginAsync(request, currentPrice);
        var availableMargin = await _marginCalculationService.GetAvailableMarginAsync(request.UserId);

        result.RequiredMargin = requiredMargin;
        result.AvailableMargin = availableMargin;

        if (requiredMargin > availableMargin)
        {
            result.FailedChecks.Add("Insufficient margin");
            result.Reason = $"Insufficient margin. Required: {requiredMargin}, Available: {availableMargin}";
            _logger.LogWarning("Margin check failed: {OrderId}, Required: {RequiredMargin}, Available: {AvailableMargin}",
                request.OrderId, requiredMargin, availableMargin);
            return false;
        }

        return true;
    }

    private async Task<bool> CheckDailyLossLimitsAsync(
        RiskValidationRequest request,
        RiskLimits riskLimits,
        RiskValidationResult result)
    {
        var dailyPnl = await _positionService.GetDailyRealizedPnlAsync(request.UserId);

        if (dailyPnl < -riskLimits.MaxDailyLoss)
        {
            result.FailedChecks.Add("Daily loss limit exceeded");
            result.Reason = $"Daily loss limit exceeded. Current: {dailyPnl}, Max: {-riskLimits.MaxDailyLoss}";
            _logger.LogWarning("Daily loss limit check failed: {OrderId}, Daily PnL: {DailyPnl}, Max Loss: {MaxDailyLoss}",
                request.OrderId, dailyPnl, riskLimits.MaxDailyLoss);
            return false;
        }

        return true;
    }

    private async Task<bool> CheckConcentrationLimitsAsync(
        RiskValidationRequest request,
        RiskLimits riskLimits,
        decimal currentPrice,
        RiskValidationResult result)
    {
        var orderValue = request.Quantity * (request.Price ?? currentPrice);
        var totalPortfolioValue = await _positionService.GetTotalPositionValueAsync(request.UserId);
        var newTotalValue = totalPortfolioValue + orderValue;

        // Get position for this symbol
        var symbolPosition = await _positionService.GetPositionAsync(request.UserId, request.Symbol);
        var symbolValue = symbolPosition != null 
            ? Math.Abs(symbolPosition.Quantity * currentPrice) + orderValue
            : orderValue;

        var concentration = newTotalValue > 0 ? symbolValue / newTotalValue : 0;

        if (concentration > riskLimits.MaxConcentration)
        {
            result.FailedChecks.Add("Concentration limit exceeded");
            result.Reason = $"Concentration limit exceeded. Current: {concentration:P2}, Max: {riskLimits.MaxConcentration:P2}";
            _logger.LogWarning("Concentration limit check failed: {OrderId}, Concentration: {Concentration}, Max: {MaxConcentration}",
                request.OrderId, concentration, riskLimits.MaxConcentration);
            return false;
        }

        return true;
    }

    private bool CheckVelocityLimits(
        RiskValidationRequest request,
        RiskLimits riskLimits,
        RiskValidationResult result)
    {
        var key = request.UserId;
        var now = DateTime.UtcNow;
        var oneMinuteAgo = now.AddMinutes(-1);

        if (!_orderVelocity.TryGetValue(key, out var orderTimes))
        {
            orderTimes = new List<DateTime>();
            _orderVelocity[key] = orderTimes;
        }

        // Remove orders older than 1 minute
        orderTimes.RemoveAll(t => t < oneMinuteAgo);

        // Add current order
        orderTimes.Add(now);

        if (orderTimes.Count > riskLimits.MaxOrdersPerMinute)
        {
            result.FailedChecks.Add("Velocity limit exceeded");
            result.Reason = $"Velocity limit exceeded. Orders in last minute: {orderTimes.Count}, Max: {riskLimits.MaxOrdersPerMinute}";
            _logger.LogWarning("Velocity limit check failed: {OrderId}, Orders: {OrderCount}, Max: {MaxOrders}",
                request.OrderId, orderTimes.Count, riskLimits.MaxOrdersPerMinute);
            return false;
        }

        return true;
    }

    public Task<RiskLimits> GetRiskLimitsAsync(string userId)
    {
        // Check cache first
        if (_riskLimitsCache.TryGetValue(userId, out var cachedLimits))
        {
            return Task.FromResult(cachedLimits);
        }

        // TODO: Load from DocumentDB or configuration
        // For now, return default limits
        var defaultLimits = new RiskLimits
        {
            UserId = userId,
            MaxPositionSize = 1000000,
            MaxDailyLoss = 50000,
            MaxLeverage = 10,
            MaxConcentration = 0.5m,
            MaxOrdersPerMinute = 100,
            InitialMargin = 100000,
            UpdatedAt = DateTime.UtcNow
        };

        _riskLimitsCache[userId] = defaultLimits;
        return Task.FromResult(defaultLimits);
    }
}
