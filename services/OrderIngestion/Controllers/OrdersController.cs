using Microsoft.AspNetCore.Mvc;
using OrderIngestion.Models;
using OrderIngestion.Services;
using FluentValidation;

namespace OrderIngestion.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IIdempotencyService _idempotencyService;
    private readonly IKafkaProducerService _kafkaProducer;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(
        IIdempotencyService idempotencyService,
        IKafkaProducerService kafkaProducer,
        ILogger<OrdersController> logger)
    {
        _idempotencyService = idempotencyService;
        _kafkaProducer = kafkaProducer;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> PlaceOrder(
        [FromBody] PlaceOrderRequest request,
        [FromHeader(Name = "X-Idempotency-Key")] string? idempotencyKey)
    {
        // 1. Check idempotency (Redis)
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            var cachedResponse = await _idempotencyService.GetCachedResponseAsync(idempotencyKey);
            if (cachedResponse != null)
            {
                _logger.LogInformation("Returning cached response for idempotency key: {IdempotencyKey}, OrderId: {OrderId}",
                    idempotencyKey, cachedResponse.OrderId);
                return Ok(cachedResponse);
            }
        }
        else
        {
            _logger.LogWarning("Request missing X-Idempotency-Key header");
            return BadRequest(new { error = "X-Idempotency-Key header is required" });
        }

        // 2. Validate request (handled by FluentValidation middleware)
        // If we reach here, validation passed

        // 3. Create order object
        var order = new Order
        {
            OrderId = Guid.NewGuid(),
            Symbol = request.Symbol,
            Side = request.Side,
            OrderType = request.OrderType,
            Quantity = request.Quantity,
            Price = request.Price,
            Status = OrderStatus.NEW,
            CreatedAt = DateTime.UtcNow,
            IdempotencyKey = idempotencyKey
        };

        // 4. Publish to Kafka
        try
        {
            var orderEvent = new OrderCreatedEvent
            {
                OrderId = order.OrderId,
                Symbol = order.Symbol,
                Side = order.Side,
                OrderType = order.OrderType,
                Quantity = order.Quantity,
                Price = order.Price,
                Timestamp = order.CreatedAt
            };

            await _kafkaProducer.ProduceOrderCreatedEventAsync(orderEvent);
            _logger.LogInformation("Order event published to Kafka. OrderId: {OrderId}", order.OrderId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish order event to Kafka. OrderId: {OrderId}", order.OrderId);
            return StatusCode(500, new { error = "Failed to process order. Please try again." });
        }

        // 5. Create response
        var response = new OrderResponse
        {
            OrderId = order.OrderId,
            Symbol = order.Symbol,
            Side = order.Side,
            OrderType = order.OrderType,
            Quantity = order.Quantity,
            Price = order.Price,
            Status = OrderStatus.ACCEPTED,
            CreatedAt = order.CreatedAt
        };

        // 6. Cache response in Redis (24 hour TTL)
        await _idempotencyService.CacheResponseAsync(idempotencyKey!, response, TimeSpan.FromHours(24));

        // 7. Return response
        _logger.LogInformation("Order placed successfully. OrderId: {OrderId}, Symbol: {Symbol}, Side: {Side}, Quantity: {Quantity}",
            order.OrderId, order.Symbol, order.Side, order.Quantity);

        return Ok(response);
    }

    [HttpGet("{id}")]
    public IActionResult GetOrder(Guid id)
    {
        // TODO: Implement order retrieval from DocumentDB or cache
        // For now, return not implemented
        _logger.LogInformation("GetOrder called for OrderId: {OrderId}", id);
        return StatusCode(501, new { error = "Order retrieval not yet implemented" });
    }

    [HttpGet]
    public IActionResult ListOrders([FromQuery] string? symbol, [FromQuery] OrderStatus? status)
    {
        // TODO: Implement order listing from DocumentDB
        // For now, return not implemented
        _logger.LogInformation("ListOrders called with Symbol: {Symbol}, Status: {Status}", symbol, status);
        return StatusCode(501, new { error = "Order listing not yet implemented" });
    }
}
