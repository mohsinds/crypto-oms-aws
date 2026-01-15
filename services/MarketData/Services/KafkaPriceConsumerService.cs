using Confluent.Kafka;
using System.Text.Json;
using MarketData.Models;
using Microsoft.AspNetCore.SignalR;

namespace MarketData.Services;

public interface IKafkaPriceConsumerService
{
    Task StartAsync(CancellationToken cancellationToken);
    Task StopAsync(CancellationToken cancellationToken);
}

public class KafkaPriceConsumerService : BackgroundService, IKafkaPriceConsumerService
{
    private readonly IConsumer<string, string> _consumer;
    private readonly IPriceAggregationService _priceAggregationService;
    private readonly IOrderBookService _orderBookService;
    private readonly IHubContext<Hubs.PriceHub> _hubContext;
    private readonly ILogger<KafkaPriceConsumerService> _logger;
    private readonly string _pricesTopic;
    private readonly string _executionsTopic;

    public KafkaPriceConsumerService(
        IConfiguration configuration,
        IPriceAggregationService priceAggregationService,
        IOrderBookService orderBookService,
        IHubContext<Hubs.PriceHub> hubContext,
        ILogger<KafkaPriceConsumerService> logger)
    {
        _priceAggregationService = priceAggregationService;
        _orderBookService = orderBookService;
        _hubContext = hubContext;
        _logger = logger;
        
        var bootstrapServers = configuration["Kafka:BootstrapServers"]
            ?? throw new ArgumentException("Kafka:BootstrapServers configuration is required");
        
        _pricesTopic = configuration["Kafka:PricesTopic"] ?? "prices";
        _executionsTopic = configuration["Kafka:ExecutionsTopic"] ?? "executions";

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = bootstrapServers,
            GroupId = "market-data-group",
            AutoOffsetReset = AutoOffsetReset.Latest,
            EnableAutoCommit = true,
            EnablePartitionEof = true
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig)
            .SetErrorHandler((consumer, error) =>
            {
                _logger.LogError("Kafka consumer error: {Error}", error);
            })
            .SetLogHandler((consumer, logMessage) =>
            {
                _logger.LogDebug("Kafka log: {Message}", logMessage.Message);
            })
            .Build();

        _logger.LogInformation("Kafka price consumer initialized. Topics: {PricesTopic}, {ExecutionsTopic}",
            _pricesTopic, _executionsTopic);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _consumer.Subscribe(new[] { _pricesTopic, _executionsTopic });

        _logger.LogInformation("Kafka consumer started. Subscribed to topics: {PricesTopic}, {ExecutionsTopic}",
            _pricesTopic, _executionsTopic);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var result = _consumer.Consume(stoppingToken);

                    if (result.IsPartitionEOF)
                    {
                        _logger.LogDebug("Reached end of partition {Partition} for topic {Topic}",
                            result.Partition, result.Topic);
                        continue;
                    }

                    await ProcessMessageAsync(result.Topic, result.Message.Key, result.Message.Value);
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming message from Kafka");
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Kafka consumer cancellation requested");
                    break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in Kafka consumer");
        }
        finally
        {
            _consumer.Close();
            _logger.LogInformation("Kafka consumer stopped");
        }
    }

    private async Task ProcessMessageAsync(string topic, string? key, string value)
    {
        try
        {
            if (topic == _pricesTopic)
            {
                await ProcessPriceUpdateAsync(value);
            }
            else if (topic == _executionsTopic)
            {
                await ProcessExecutionEventAsync(value);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message from topic {Topic}, Key: {Key}", topic, key);
        }
    }

    private async Task ProcessPriceUpdateAsync(string messageValue)
    {
        var priceEvent = JsonSerializer.Deserialize<PriceUpdateEvent>(messageValue);
        if (priceEvent == null)
        {
            _logger.LogWarning("Failed to deserialize price update event");
            return;
        }

        var price = new Price
        {
            Symbol = priceEvent.Symbol,
            PriceValue = priceEvent.Price,
            Change24h = priceEvent.Change24h,
            ChangePercent24h = priceEvent.ChangePercent24h,
            High24h = priceEvent.High24h,
            Low24h = priceEvent.Low24h,
            Volume24h = priceEvent.Volume24h,
            Timestamp = priceEvent.Timestamp
        };

        await _priceAggregationService.UpdatePriceAsync(priceEvent.Symbol, price);

        // Broadcast to SignalR clients
        await _hubContext.Clients.All.SendAsync("PriceUpdate", price, cancellationToken: CancellationToken.None);

        _logger.LogDebug("Processed price update for symbol: {Symbol}, Price: {Price}",
            priceEvent.Symbol, priceEvent.Price);
    }

    private async Task ProcessExecutionEventAsync(string messageValue)
    {
        // TODO: Process execution events to update order book
        // For now, just log the event
        _logger.LogDebug("Received execution event: {Event}", messageValue);
        await Task.CompletedTask;
    }

    public override void Dispose()
    {
        _consumer?.Dispose();
        base.Dispose();
    }
}
