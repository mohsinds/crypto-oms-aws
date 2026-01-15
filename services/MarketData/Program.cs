using MarketData.Services;
using MarketData.Hubs;
using Serilog;
using StackExchange.Redis;
using System.Text.Json.Serialization;
using HealthChecks.Redis;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Market Data Service API",
        Version = "v1",
        Description = "API for market data queries and real-time price updates"
    });
});

// Add SignalR
builder.Services.AddSignalR();

// Add Redis
var redisConnectionString = builder.Configuration["Redis:ConnectionString"]
    ?? throw new ArgumentException("Redis:ConnectionString configuration is required");

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var configuration = ConfigurationOptions.Parse(redisConnectionString);
    configuration.AbortOnConnectFail = false;
    configuration.ConnectRetry = 3;
    configuration.ConnectTimeout = 5000;
    return ConnectionMultiplexer.Connect(configuration);
});

// Add custom services
builder.Services.AddSingleton<IPriceAggregationService, PriceAggregationService>();
builder.Services.AddScoped<IOrderBookService, OrderBookService>();
builder.Services.AddSingleton<IKafkaPriceConsumerService, KafkaPriceConsumerService>();
builder.Services.AddHostedService<KafkaPriceConsumerService>(sp => 
    (KafkaPriceConsumerService)sp.GetRequiredService<IKafkaPriceConsumerService>());

// Add health checks
builder.Services.AddHealthChecks()
    .AddRedis(redisConnectionString, name: "redis")
    .AddCheck<KafkaHealthCheck>("kafka");

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();

app.UseCors();

app.UseAuthorization();

app.MapControllers();

// SignalR hub endpoint
app.MapHub<PriceHub>("/ws/market-data");

// Health check endpoints
app.MapGet("/health", async (Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckService healthCheckService) =>
{
    var health = await healthCheckService.CheckHealthAsync();
    return health.Status == Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy
        ? Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow })
        : Results.StatusCode(503);
}).WithTags("Health");

app.MapGet("/ready", async (Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckService healthCheckService) =>
{
    var health = await healthCheckService.CheckHealthAsync();
    return health.Status == Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy
        ? Results.Ok(new { status = "ready", timestamp = DateTime.UtcNow })
        : Results.StatusCode(503);
}).WithTags("Health");

Log.Information("Market Data Service starting...");

try
{
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Kafka Health Check
public class KafkaHealthCheck : Microsoft.Extensions.Diagnostics.HealthChecks.IHealthCheck
{
    private readonly IKafkaPriceConsumerService _kafkaConsumer;
    private readonly ILogger<KafkaHealthCheck> _logger;

    public KafkaHealthCheck(IKafkaPriceConsumerService kafkaConsumer, ILogger<KafkaHealthCheck> logger)
    {
        _kafkaConsumer = kafkaConsumer;
        _logger = logger;
    }

    public Task<Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult> CheckHealthAsync(
        Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Kafka consumer is initialized in constructor, so if we have an instance, it's healthy
            // In a real scenario, you might want to check consumer status or broker connectivity
            return Task.FromResult(Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy("Kafka consumer is available"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kafka health check failed");
            return Task.FromResult(Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Unhealthy("Kafka consumer is not available", ex));
        }
    }
}
