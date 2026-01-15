using Confluent.Kafka;
using System.Text.Json;
using OrderProcessor.Models;
using Proto;
using OrderProcessor.Actors;
using Microsoft.Extensions.DependencyInjection;

namespace OrderProcessor.Services;

public interface IKafkaConsumerService
{
    Task StartAsync(CancellationToken cancellationToken);
    Task StopAsync(CancellationToken cancellationToken);
}

public class KafkaConsumerService : BackgroundService, IKafkaConsumerService
{
    private readonly IConsumer<string, string> _consumer;
    private readonly ActorSystem _actorSystem;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<KafkaConsumerService> _logger;
    private readonly string _ordersTopic;

    public KafkaConsumerService(
        IConfiguration configuration,
        ActorSystem actorSystem,
        IServiceProvider serviceProvider,
        ILogger<KafkaConsumerService> logger)
    {
        _actorSystem = actorSystem;
        _serviceProvider = serviceProvider;
        _logger = logger;
        
        var bootstrapServers = configuration["Kafka:BootstrapServers"]
            ?? throw new ArgumentException("Kafka:BootstrapServers configuration is required");
        
        _ordersTopic = configuration["Kafka:OrdersTopic"] ?? "orders";

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = bootstrapServers,
            GroupId = "order-processor-group",
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

        _logger.LogInformation("Kafka consumer initialized. Topic: {Topic}, ConsumerGroup: {GroupId}",
            _ordersTopic, consumerConfig.GroupId);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _consumer.Subscribe(_ordersTopic);

        _logger.LogInformation("Kafka consumer started. Subscribed to topic: {Topic}", _ordersTopic);

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

                    await ProcessMessageAsync(result.Message.Key, result.Message.Value);
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

    private async Task ProcessMessageAsync(string? key, string value)
    {
        try
        {
            var orderEvent = JsonSerializer.Deserialize<OrderCreatedEvent>(value);
            if (orderEvent == null)
            {
                _logger.LogWarning("Failed to deserialize OrderCreatedEvent. Key: {Key}", key);
                return;
            }

            _logger.LogInformation("Received order event. OrderId: {OrderId}, Symbol: {Symbol}, Side: {Side}",
                orderEvent.OrderId, orderEvent.Symbol, orderEvent.Side);

            // Create or get Order Actor for this order
            // Use order ID as actor name for persistence
            var actorName = $"order-{orderEvent.OrderId}";
            
            // Create actor props with dependencies from service provider
            var props = Props.FromProducer(() =>
            {
                var persistenceService = _serviceProvider.GetRequiredService<IOrderPersistenceService>();
                var executionProducer = _serviceProvider.GetRequiredService<IKafkaExecutionProducer>();
                var httpClientFactory = _serviceProvider.GetRequiredService<IHttpClientFactory>();
                var config = _serviceProvider.GetRequiredService<IConfiguration>();
                var logger = _serviceProvider.GetRequiredService<ILogger<OrderActor>>();
                
                return new OrderActor(
                    persistenceService,
                    executionProducer,
                    httpClientFactory,
                    config,
                    logger
                );
            });
            
            // Spawn or get existing actor by name
            var actorPid = _actorSystem.Root.SpawnNamed(props, actorName);
            
            _logger.LogDebug("Sending OrderCreatedEvent to actor. OrderId: {OrderId}, PID: {PID}",
                orderEvent.OrderId, actorPid);

            // Send order event to actor
            await _actorSystem.Root.SendAsync(actorPid, orderEvent);

            _logger.LogDebug("Sent OrderCreatedEvent to actor. OrderId: {OrderId}", orderEvent.OrderId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message. Key: {Key}", key);
        }
    }

    public override void Dispose()
    {
        _consumer?.Dispose();
        base.Dispose();
    }
}
