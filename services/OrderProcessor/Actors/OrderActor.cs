using Proto;
using OrderProcessor.Models;
using OrderProcessor.Services;
using System.Net.Http.Json;

namespace OrderProcessor.Actors;

public class OrderActor : IActor
{
    private OrderState _state = new();
    private readonly IOrderPersistenceService _persistenceService;
    private readonly IKafkaExecutionProducer _executionProducer;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OrderActor> _logger;

    public OrderActor(
        IOrderPersistenceService persistenceService,
        IKafkaExecutionProducer executionProducer,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<OrderActor> logger)
    {
        _persistenceService = persistenceService;
        _executionProducer = executionProducer;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task ReceiveAsync(IContext context)
    {
        switch (context.Message)
        {
            case OrderCreatedEvent evt:
                await HandleOrderCreatedAsync(context, evt);
                break;

            case RiskValidatedEvent evt:
                await HandleRiskValidatedAsync(context, evt);
                break;

            case OrderFilledMessage msg:
                await HandleOrderFilledAsync(context, msg);
                break;

            case OrderCancelledMessage msg:
                await HandleOrderCancelledAsync(context, msg);
                break;

            default:
                _logger.LogWarning("Unknown message type received: {MessageType}", context.Message?.GetType().Name);
                break;
        }
    }

    private async Task HandleOrderCreatedAsync(IContext context, OrderCreatedEvent evt)
    {
        try
        {
            _state = new OrderState
            {
                OrderId = evt.OrderId,
                UserId = evt.UserId,
                Symbol = evt.Symbol,
                Side = evt.Side,
                OrderType = evt.OrderType,
                Quantity = evt.Quantity,
                Price = evt.Price,
                Status = OrderStatus.NEW,
                CreatedAt = evt.Timestamp,
                IdempotencyKey = evt.IdempotencyKey
            };

            _logger.LogInformation("Order created. OrderId: {OrderId}, Symbol: {Symbol}, Side: {Side}, Quantity: {Quantity}",
                _state.OrderId, _state.Symbol, _state.Side, _state.Quantity);

            // Request risk validation from Risk Engine
            await RequestRiskValidationAsync(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling OrderCreatedEvent. OrderId: {OrderId}", evt.OrderId);
        }
    }

    private async Task RequestRiskValidationAsync(IContext context)
    {
        try
        {
            var riskEngineUrl = _configuration["RiskEngine:BaseUrl"] ?? "http://localhost:5001";
            var httpClient = _httpClientFactory.CreateClient();
            
            var request = new
            {
                orderId = _state.OrderId,
                userId = _state.UserId,
                symbol = _state.Symbol,
                side = _state.Side,
                orderType = _state.OrderType,
                quantity = _state.Quantity,
                price = _state.Price,
                currentPrice = _state.Price // TODO: Get from market data service
            };

            var response = await httpClient.PostAsJsonAsync($"{riskEngineUrl}/api/risk/validate", request);
            
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<RiskValidationResult>();
                
                if (result != null)
                {
                    var riskEvent = new RiskValidatedEvent
                    {
                        OrderId = _state.OrderId,
                        Approved = result.Approved,
                        Reason = result.Reason,
                        ValidatedAt = result.ValidatedAt
                    };

                    await context.SendAsync(context.Self, riskEvent);
                }
                else
                {
                    _logger.LogWarning("Risk validation returned null result. OrderId: {OrderId}", _state.OrderId);
                    await HandleRiskRejectionAsync("Risk validation returned null result");
                }
            }
            else
            {
                _logger.LogError("Risk validation failed with status: {StatusCode}. OrderId: {OrderId}",
                    response.StatusCode, _state.OrderId);
                await HandleRiskRejectionAsync($"Risk validation failed with status: {response.StatusCode}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting risk validation. OrderId: {OrderId}", _state.OrderId);
            await HandleRiskRejectionAsync($"Error requesting risk validation: {ex.Message}");
        }
    }

    private async Task HandleRiskValidatedAsync(IContext context, RiskValidatedEvent evt)
    {
        try
        {
            if (evt.Approved)
            {
                _state.Status = OrderStatus.ACCEPTED;
                _logger.LogInformation("Order accepted by risk engine. OrderId: {OrderId}", _state.OrderId);
                
                await _persistenceService.SaveOrderAsync(_state);
                
                // TODO: Simulate order execution or wait for external execution
                // For now, we'll simulate immediate fill for MARKET orders
                if (_state.OrderType == "MARKET")
                {
                    await SimulateMarketOrderFillAsync(context);
                }
            }
            else
            {
                await HandleRiskRejectionAsync(evt.Reason ?? "Risk validation failed");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling RiskValidatedEvent. OrderId: {OrderId}", _state.OrderId);
        }
    }

    private async Task HandleRiskRejectionAsync(string reason)
    {
        _state.Status = OrderStatus.REJECTED;
        _state.RejectionReason = reason;
        _state.UpdatedAt = DateTime.UtcNow;

        _logger.LogWarning("Order rejected by risk engine. OrderId: {OrderId}, Reason: {Reason}",
            _state.OrderId, reason);

        await _persistenceService.UpdateOrderAsync(_state);
    }

    private async Task SimulateMarketOrderFillAsync(IContext context)
    {
        // Simulate immediate fill for MARKET orders
        // In production, this would be handled by an exchange or matching engine
        await Task.Delay(100); // Simulate processing time

        var fillMessage = new OrderFilledMessage
        {
            OrderId = _state.OrderId,
            FilledQuantity = _state.Quantity,
            FillPrice = _state.Price ?? 0m // Use order price or get from market
        };

        await context.SendAsync(context.Self, fillMessage);
    }

    private async Task HandleOrderFilledAsync(IContext context, OrderFilledMessage msg)
    {
        try
        {
            _state.Status = OrderStatus.FILLED;
            _state.FilledQuantity = msg.FilledQuantity;
            _state.FillPrice = msg.FillPrice;
            _state.UpdatedAt = DateTime.UtcNow;

            _logger.LogInformation("Order filled. OrderId: {OrderId}, FilledQuantity: {FilledQuantity}, FillPrice: {FillPrice}",
                _state.OrderId, _state.FilledQuantity, _state.FillPrice);

            await _persistenceService.UpdateOrderAsync(_state);

            // Publish execution event to Kafka
            var executionEvent = new ExecutionEvent
            {
                OrderId = _state.OrderId,
                Symbol = _state.Symbol,
                Side = _state.Side,
                FilledQuantity = _state.FilledQuantity,
                FillPrice = _state.FillPrice ?? 0m,
                Status = _state.Status,
                ExecutedAt = DateTime.UtcNow
            };

            await _executionProducer.PublishExecutionEventAsync(executionEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling OrderFilledMessage. OrderId: {OrderId}", _state.OrderId);
        }
    }

    private async Task HandleOrderCancelledAsync(IContext context, OrderCancelledMessage msg)
    {
        try
        {
            _state.Status = OrderStatus.CANCELLED;
            _state.UpdatedAt = DateTime.UtcNow;

            _logger.LogInformation("Order cancelled. OrderId: {OrderId}", _state.OrderId);

            await _persistenceService.UpdateOrderAsync(_state);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling OrderCancelledMessage. OrderId: {OrderId}", _state.OrderId);
        }
    }
}

// Message types for actor communication
public class OrderFilledMessage
{
    public Guid OrderId { get; set; }
    public decimal FilledQuantity { get; set; }
    public decimal FillPrice { get; set; }
}

public class OrderCancelledMessage
{
    public Guid OrderId { get; set; }
    public string? Reason { get; set; }
}

// Risk validation result model
public class RiskValidationResult
{
    public bool Approved { get; set; }
    public string? Reason { get; set; }
    public DateTime ValidatedAt { get; set; }
}
