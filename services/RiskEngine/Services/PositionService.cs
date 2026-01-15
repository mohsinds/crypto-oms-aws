using MongoDB.Driver;
using RiskEngine.Models;
using StackExchange.Redis;
using System.Text.Json;

namespace RiskEngine.Services;

public interface IPositionService
{
    Task<Position?> GetPositionAsync(string userId, string symbol);
    Task<List<Position>> GetUserPositionsAsync(string userId);
    Task<Position> UpdatePositionAsync(string userId, string symbol, decimal quantity, decimal price);
    Task<decimal> GetTotalPositionValueAsync(string userId);
    Task<decimal> GetDailyRealizedPnlAsync(string userId);
}

public class PositionService : IPositionService
{
    private readonly IMongoCollection<Position> _positions;
    private readonly IDatabase _redis;
    private readonly ILogger<PositionService> _logger;
    private const string CacheKeyPrefix = "position:";
    private readonly TimeSpan _cacheExpiry = TimeSpan.FromMinutes(5);

    public PositionService(
        IMongoDatabase database,
        IConnectionMultiplexer redis,
        ILogger<PositionService> logger)
    {
        _positions = database.GetCollection<Position>("positions");
        _redis = redis.GetDatabase();
        _logger = logger;
    }

    public async Task<Position?> GetPositionAsync(string userId, string symbol)
    {
        try
        {
            // Try cache first
            var cacheKey = $"{CacheKeyPrefix}{userId}:{symbol.ToUpper()}";
            var cachedValue = await _redis.StringGetAsync(cacheKey);
            
            if (cachedValue.HasValue)
            {
                var cachedPosition = JsonSerializer.Deserialize<Position>(cachedValue!);
                _logger.LogDebug("Retrieved position from cache: {UserId}, {Symbol}", userId, symbol);
                return cachedPosition;
            }

            // If not in cache, query database
            var filter = Builders<Position>.Filter.And(
                Builders<Position>.Filter.Eq(p => p.UserId, userId),
                Builders<Position>.Filter.Eq(p => p.Symbol, symbol.ToUpper())
            );

            var position = await _positions.Find(filter).FirstOrDefaultAsync();

            // Cache the result
            if (position != null)
            {
                await _redis.StringSetAsync(cacheKey, JsonSerializer.Serialize(position), _cacheExpiry);
            }

            return position;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving position for user: {UserId}, symbol: {Symbol}", userId, symbol);
            return null;
        }
    }

    public async Task<List<Position>> GetUserPositionsAsync(string userId)
    {
        try
        {
            var filter = Builders<Position>.Filter.Eq(p => p.UserId, userId);
            var positions = await _positions.Find(filter).ToListAsync();
            return positions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving positions for user: {UserId}", userId);
            return new List<Position>();
        }
    }

    public async Task<Position> UpdatePositionAsync(string userId, string symbol, decimal quantity, decimal price)
    {
        try
        {
            var existingPosition = await GetPositionAsync(userId, symbol);
            var now = DateTime.UtcNow;

            Position position;
            if (existingPosition == null)
            {
                // Create new position
                position = new Position
                {
                    UserId = userId,
                    Symbol = symbol.ToUpper(),
                    Quantity = quantity,
                    AvgPrice = price,
                    CurrentPrice = price,
                    UnrealizedPnl = 0,
                    RealizedPnl = 0,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                await _positions.InsertOneAsync(position);
            }
            else
            {
                // Update existing position
                var newQuantity = existingPosition.Quantity + quantity;
                
                // Calculate new average price
                var totalValue = (existingPosition.Quantity * existingPosition.AvgPrice) + (quantity * price);
                var newAvgPrice = newQuantity != 0 ? totalValue / newQuantity : existingPosition.AvgPrice;

                position = existingPosition with
                {
                    Quantity = newQuantity,
                    AvgPrice = newAvgPrice,
                    CurrentPrice = price,
                    UpdatedAt = now
                };

                var filter = Builders<Position>.Filter.And(
                    Builders<Position>.Filter.Eq(p => p.UserId, userId),
                    Builders<Position>.Filter.Eq(p => p.Symbol, symbol.ToUpper())
                );

                await _positions.ReplaceOneAsync(filter, position);
            }

            // Update cache
            var cacheKey = $"{CacheKeyPrefix}{userId}:{symbol.ToUpper()}";
            await _redis.StringSetAsync(cacheKey, JsonSerializer.Serialize(position), _cacheExpiry);

            _logger.LogInformation("Updated position: {UserId}, {Symbol}, Quantity: {Quantity}, AvgPrice: {AvgPrice}",
                userId, symbol, position.Quantity, position.AvgPrice);

            return position;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating position for user: {UserId}, symbol: {Symbol}", userId, symbol);
            throw;
        }
    }

    public async Task<decimal> GetTotalPositionValueAsync(string userId)
    {
        try
        {
            var positions = await GetUserPositionsAsync(userId);
            return positions.Sum(p => Math.Abs(p.Quantity * p.CurrentPrice));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating total position value for user: {UserId}", userId);
            return 0;
        }
    }

    public async Task<decimal> GetDailyRealizedPnlAsync(string userId)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var filter = Builders<Position>.Filter.And(
                Builders<Position>.Filter.Eq(p => p.UserId, userId),
                Builders<Position>.Filter.Gte(p => p.UpdatedAt, today)
            );

            var positions = await _positions.Find(filter).ToListAsync();
            return positions.Sum(p => p.RealizedPnl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating daily realized PnL for user: {UserId}", userId);
            return 0;
        }
    }
}
