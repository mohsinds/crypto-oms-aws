using Confluent.Kafka;
using System.Text.Json;
using OrderProcessor.Models;

namespace OrderProcessor.Services;

public interface IKafkaExecutionProducer
{
    Task PublishExecutionEventAsync(ExecutionEvent executionEvent);
    void Dispose();
}

public class KafkaExecutionProducer : IKafkaExecutionProducer, IDisposable
{
    private readonly IProducer<string, string> _producer;
    private readonly string _topic;
    private readonly ILogger<KafkaExecutionProducer> _logger;
    private bool _disposed = false;

    public KafkaExecutionProducer(IConfiguration configuration, ILogger<KafkaExecutionProducer> logger)
    {
        _logger = logger;
        _topic = configuration["Kafka:ExecutionsTopic"] ?? "executions";
        
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

        _logger.LogInformation("Kafka execution producer initialized for topic: {Topic}", _topic);
    }

    public async Task PublishExecutionEventAsync(ExecutionEvent executionEvent)
    {
        try
        {
            var key = executionEvent.OrderId.ToString();
            var value = JsonSerializer.Serialize(executionEvent);

            var message = new Message<string, string>
            {
                Key = key,
                Value = value,
                Headers = new Headers
                {
                    { "eventType", System.Text.Encoding.UTF8.GetBytes("Execution") },
                    { "timestamp", System.Text.Encoding.UTF8.GetBytes(executionEvent.ExecutedAt.ToString("O")) }
                }
            };

            var deliveryResult = await _producer.ProduceAsync(_topic, message);

            _logger.LogInformation(
                "Execution event published to Kafka. OrderId: {OrderId}, Topic: {Topic}, Partition: {Partition}, Offset: {Offset}",
                executionEvent.OrderId, deliveryResult.Topic, deliveryResult.Partition, deliveryResult.Offset);
        }
        catch (ProduceException<string, string> ex)
        {
            _logger.LogError(ex, "Failed to produce execution event to Kafka. OrderId: {OrderId}, Error: {Error}",
                executionEvent.OrderId, ex.Error.Reason);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error producing execution event to Kafka. OrderId: {OrderId}",
                executionEvent.OrderId);
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
            _logger.LogInformation("Kafka execution producer disposed");
        }
    }
}
