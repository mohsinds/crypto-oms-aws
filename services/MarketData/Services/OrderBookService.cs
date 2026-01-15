using StackExchange.Redis;
using System.Text.Json;
using MarketData.Models;

namespace MarketData.Services;

public interface IOrderBookService
{
    Task<OrderBook?> GetOrderBookAsync(string symbol);
    Task UpdateOrderBookAsync(string symbol, OrderBook orderBook);
    Task ClearOrderBookAsync(string symbol);
}

public class OrderBookService : IOrderBookService
{
    private readonly IDatabase _redis;
    private readonly ILogger<OrderBookService> _logger;
    private const string KeyPrefix = "orderbook:";
    private readonly TimeSpan _cacheExpiry = TimeSpan.FromSeconds(1); // 1 second TTL for order book

    public OrderBookService(IConnectionMultiplexer redis, ILogger<OrderBookService> logger)
    {
        _redis = redis.GetDatabase();
        _logger = logger;
    }

    public async Task<OrderBook?> GetOrderBookAsync(string symbol)
    {
        try
        {
            var key = $"{KeyPrefix}{symbol.ToUpper()}";
            var cachedValue = await _redis.StringGetAsync(key);

            if (!cachedValue.HasValue)
            {
                _logger.LogDebug("No cached order book found for symbol: {Symbol}", symbol);
                return null;
            }

            var orderBook = JsonSerializer.Deserialize<OrderBook>(cachedValue!);
            _logger.LogDebug("Retrieved order book from cache for symbol: {Symbol}", symbol);
            
            return orderBook;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving order book for symbol: {Symbol}", symbol);
            return null;
        }
    }

    public async Task UpdateOrderBookAsync(string symbol, OrderBook orderBook)
    {
        try
        {
            var key = $"{KeyPrefix}{symbol.ToUpper()}";
            var serialized = JsonSerializer.Serialize(orderBook);
            
            await _redis.StringSetAsync(key, serialized, _cacheExpiry);
            
            _logger.LogDebug("Updated order book cache for symbol: {Symbol}, Bids: {BidCount}, Asks: {AskCount}",
                symbol, orderBook.Bids.Count, orderBook.Asks.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating order book cache for symbol: {Symbol}", symbol);
        }
    }

    public async Task ClearOrderBookAsync(string symbol)
    {
        try
        {
            var key = $"{KeyPrefix}{symbol.ToUpper()}";
            await _redis.KeyDeleteAsync(key);
            _logger.LogInformation("Cleared order book cache for symbol: {Symbol}", symbol);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing order book cache for symbol: {Symbol}", symbol);
        }
    }
}
