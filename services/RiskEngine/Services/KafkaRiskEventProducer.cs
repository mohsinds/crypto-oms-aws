using Confluent.Kafka;
using System.Text.Json;
using RiskEngine.Models;

namespace RiskEngine.Services;

public interface IKafkaRiskEventProducer
{
    Task PublishRiskValidationEventAsync(Guid orderId, RiskValidationResult result);
    void Dispose();
}

public class KafkaRiskEventProducer : IKafkaRiskEventProducer, IDisposable
{
    private readonly IProducer<string, string> _producer;
    private readonly string _topic;
    private readonly ILogger<KafkaRiskEventProducer> _logger;
    private bool _disposed = false;

    public KafkaRiskEventProducer(IConfiguration configuration, ILogger<KafkaRiskEventProducer> logger)
    {
        _logger = logger;
        _topic = configuration["Kafka:RiskEventsTopic"] ?? "risk-events";
        
        var bootstrapServers = configuration["Kafka:BootstrapServers"]
            ?? throw new ArgumentException("Kafka:BootstrapServers configuration is required");

        var producerConfig = new ProducerConfig
        {
            BootstrapServers = bootstrapServers,
            Acks = Acks.All,
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

        _logger.LogInformation("Kafka risk event producer initialized for topic: {Topic}", _topic);
    }

    public async Task PublishRiskValidationEventAsync(Guid orderId, RiskValidationResult result)
    {
        try
        {
            var key = orderId.ToString();
            var value = JsonSerializer.Serialize(new
            {
                OrderId = orderId,
                Approved = result.Approved,
                Reason = result.Reason,
                RequiredMargin = result.RequiredMargin,
                AvailableMargin = result.AvailableMargin,
                ValidatedAt = result.ValidatedAt
            });

            var message = new Message<string, string>
            {
                Key = key,
                Value = value,
                Headers = new Headers
                {
                    { "eventType", System.Text.Encoding.UTF8.GetBytes("RiskValidation") },
                    { "timestamp", System.Text.Encoding.UTF8.GetBytes(result.ValidatedAt.ToString("O")) }
                }
            };

            var deliveryResult = await _producer.ProduceAsync(_topic, message);

            _logger.LogInformation(
                "Risk validation event published to Kafka. OrderId: {OrderId}, Topic: {Topic}, Partition: {Partition}, Offset: {Offset}",
                orderId, deliveryResult.Topic, deliveryResult.Partition, deliveryResult.Offset);
        }
        catch (ProduceException<string, string> ex)
        {
            _logger.LogError(ex, "Failed to produce risk event to Kafka. OrderId: {OrderId}, Error: {Error}",
                orderId, ex.Error.Reason);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error producing risk event to Kafka. OrderId: {OrderId}", orderId);
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
            _logger.LogInformation("Kafka risk event producer disposed");
        }
    }
}
