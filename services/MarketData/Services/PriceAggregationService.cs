using MarketData.Models;
using System.Collections.Concurrent;

namespace MarketData.Services;

public interface IPriceAggregationService
{
    Task<Price?> GetPriceAsync(string symbol);
    Task UpdatePriceAsync(string symbol, Price price);
    Task<List<Price>> GetAllPricesAsync();
}

public class PriceAggregationService : IPriceAggregationService
{
    private readonly ConcurrentDictionary<string, Price> _prices = new();
    private readonly ILogger<PriceAggregationService> _logger;

    public PriceAggregationService(ILogger<PriceAggregationService> logger)
    {
        _logger = logger;
    }

    public Task<Price?> GetPriceAsync(string symbol)
    {
        var normalizedSymbol = symbol.ToUpper();
        _prices.TryGetValue(normalizedSymbol, out var price);
        
        if (price == null)
        {
            _logger.LogDebug("Price not found for symbol: {Symbol}", symbol);
        }
        
        return Task.FromResult(price);
    }

    public Task UpdatePriceAsync(string symbol, Price price)
    {
        var normalizedSymbol = symbol.ToUpper();
        price.Symbol = normalizedSymbol;
        price.Timestamp = DateTime.UtcNow;
        
        _prices.AddOrUpdate(normalizedSymbol, price, (key, oldValue) => price);
        
        _logger.LogDebug("Updated price for symbol: {Symbol}, Price: {Price}, Change24h: {Change24h}%",
            normalizedSymbol, price.PriceValue, price.ChangePercent24h);
        
        return Task.CompletedTask;
    }

    public Task<List<Price>> GetAllPricesAsync()
    {
        return Task.FromResult(_prices.Values.ToList());
    }
}
