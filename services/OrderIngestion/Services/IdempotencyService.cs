using StackExchange.Redis;
using System.Text.Json;
using OrderIngestion.Models;

namespace OrderIngestion.Services;

public interface IIdempotencyService
{
    Task<OrderResponse?> GetCachedResponseAsync(string idempotencyKey);
    Task CacheResponseAsync(string idempotencyKey, OrderResponse response, TimeSpan expiry);
}

public class IdempotencyService : IIdempotencyService
{
    private readonly IDatabase _redis;
    private readonly ILogger<IdempotencyService> _logger;
    private const string KeyPrefix = "idempotency:";

    public IdempotencyService(IConnectionMultiplexer redis, ILogger<IdempotencyService> logger)
    {
        _redis = redis.GetDatabase();
        _logger = logger;
    }

    public async Task<OrderResponse?> GetCachedResponseAsync(string idempotencyKey)
    {
        try
        {
            var key = $"{KeyPrefix}{idempotencyKey}";
            var cachedValue = await _redis.StringGetAsync(key);

            if (!cachedValue.HasValue)
            {
                _logger.LogDebug("No cached response found for idempotency key: {IdempotencyKey}", idempotencyKey);
                return null;
            }

            var response = JsonSerializer.Deserialize<OrderResponse>(cachedValue!);
            _logger.LogInformation("Retrieved cached response for idempotency key: {IdempotencyKey}, OrderId: {OrderId}",
                idempotencyKey, response?.OrderId);
            
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving cached response for idempotency key: {IdempotencyKey}", idempotencyKey);
            return null;
        }
    }

    public async Task CacheResponseAsync(string idempotencyKey, OrderResponse response, TimeSpan expiry)
    {
        try
        {
            var key = $"{KeyPrefix}{idempotencyKey}";
            var serialized = JsonSerializer.Serialize(response);
            
            await _redis.StringSetAsync(key, serialized, expiry);
            
            _logger.LogInformation("Cached response for idempotency key: {IdempotencyKey}, OrderId: {OrderId}, TTL: {Expiry}",
                idempotencyKey, response.OrderId, expiry);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching response for idempotency key: {IdempotencyKey}", idempotencyKey);
            // Don't throw - idempotency caching failure shouldn't fail the request
        }
    }
}
