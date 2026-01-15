using MongoDB.Driver;
using OrderProcessor.Models;

namespace OrderProcessor.Services;

public interface IOrderPersistenceService
{
    Task SaveOrderAsync(OrderState order);
    Task UpdateOrderAsync(OrderState order);
    Task<OrderState?> GetOrderAsync(Guid orderId);
}

public class OrderPersistenceService : IOrderPersistenceService
{
    private readonly IMongoCollection<OrderState> _orders;
    private readonly ILogger<OrderPersistenceService> _logger;

    public OrderPersistenceService(IMongoDatabase database, ILogger<OrderPersistenceService> logger)
    {
        _orders = database.GetCollection<OrderState>("orders");
        _logger = logger;
    }

    public async Task SaveOrderAsync(OrderState order)
    {
        try
        {
            order.UpdatedAt = DateTime.UtcNow;
            await _orders.InsertOneAsync(order);
            
            _logger.LogInformation("Order saved to DocumentDB. OrderId: {OrderId}, Status: {Status}",
                order.OrderId, order.Status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving order to DocumentDB. OrderId: {OrderId}", order.OrderId);
            throw;
        }
    }

    public async Task UpdateOrderAsync(OrderState order)
    {
        try
        {
            order.UpdatedAt = DateTime.UtcNow;
            var filter = Builders<OrderState>.Filter.Eq(o => o.OrderId, order.OrderId);
            await _orders.ReplaceOneAsync(filter, order);
            
            _logger.LogInformation("Order updated in DocumentDB. OrderId: {OrderId}, Status: {Status}",
                order.OrderId, order.Status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating order in DocumentDB. OrderId: {OrderId}", order.OrderId);
            throw;
        }
    }

    public async Task<OrderState?> GetOrderAsync(Guid orderId)
    {
        try
        {
            var filter = Builders<OrderState>.Filter.Eq(o => o.OrderId, orderId);
            var order = await _orders.Find(filter).FirstOrDefaultAsync();
            return order;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving order from DocumentDB. OrderId: {OrderId}", orderId);
            return null;
        }
    }
}
