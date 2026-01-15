using Confluent.Kafka;
using System.Text.Json;
using OrderIngestion.Models;

namespace OrderIngestion.Services;

public interface IKafkaProducerService
{
    Task ProduceOrderCreatedEventAsync(OrderCreatedEvent orderEvent);
    void Dispose();
}

public class KafkaProducerService : IKafkaProducerService, IDisposable
{
    private readonly IProducer<string, string> _producer;
    private readonly string _topic;
    private readonly ILogger<KafkaProducerService> _logger;
    private bool _disposed = false;

    public KafkaProducerService(IConfiguration configuration, ILogger<KafkaProducerService> logger)
    {
        _logger = logger;
        _topic = configuration["Kafka:OrdersTopic"] ?? "orders";
        
        var bootstrapServers = configuration["Kafka:BootstrapServers"] 
            ?? throw new ArgumentException("Kafka:BootstrapServers configuration is required");

        var producerConfig = new ProducerConfig
        {
            BootstrapServers = bootstrapServers,
            Acks = Acks.All, // Wait for all replicas to acknowledge
            RetryBackoffMs = 100,
            MessageSendMaxRetries = 3,
            EnableIdempotence = true,
            CompressionType = CompressionType.Snappy
        };

        _producer = new ProducerBuilder<string, string>(producerConfig)
            .SetErrorHandler((producer, error) =>
            {
                _logger.LogError("Kafka producer error: {Error}", error);
            })
            .SetLogHandler((producer, logMessage) =>
            {
                _logger.LogDebug("Kafka log: {Message}", logMessage.Message);
            })
            .Build();

        _logger.LogInformation("Kafka producer initialized for topic: {Topic}, BootstrapServers: {BootstrapServers}",
            _topic, bootstrapServers);
    }

    public async Task ProduceOrderCreatedEventAsync(OrderCreatedEvent orderEvent)
    {
        try
        {
            var key = orderEvent.OrderId.ToString();
            var value = JsonSerializer.Serialize(orderEvent);

            var message = new Message<string, string>
            {
                Key = key,
                Value = value,
                Headers = new Headers
                {
                    { "eventType", System.Text.Encoding.UTF8.GetBytes("OrderCreated") },
                    { "timestamp", System.Text.Encoding.UTF8.GetBytes(orderEvent.Timestamp.ToString("O")) }
                }
            };

            var deliveryResult = await _producer.ProduceAsync(_topic, message);

            _logger.LogInformation(
                "Order event published to Kafka. OrderId: {OrderId}, Topic: {Topic}, Partition: {Partition}, Offset: {Offset}",
                orderEvent.OrderId, deliveryResult.Topic, deliveryResult.Partition, deliveryResult.Offset);
        }
        catch (ProduceException<string, string> ex)
        {
            _logger.LogError(ex, "Failed to produce order event to Kafka. OrderId: {OrderId}, Error: {Error}",
                orderEvent.OrderId, ex.Error.Reason);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error producing order event to Kafka. OrderId: {OrderId}",
                orderEvent.OrderId);
            throw;
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _producer?.Flush(TimeSpan.FromSeconds(10));
            _producer?.Dispose();
            _disposed = true;
            _logger.LogInformation("Kafka producer disposed");
        }
    }
}
