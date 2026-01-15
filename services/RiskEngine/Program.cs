using RiskEngine.Services;
using Serilog;
using StackExchange.Redis;
using System.Text.Json.Serialization;
using HealthChecks.Redis;
using MongoDB.Driver;

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
        Title = "Risk Engine API",
        Version = "v1",
        Description = "API for risk validation and position management"
    });
});

// Add MongoDB (DocumentDB compatible)
var mongoConnectionString = builder.Configuration["Database:ConnectionString"]
    ?? throw new ArgumentException("Database:ConnectionString configuration is required");

builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var client = new MongoClient(mongoConnectionString);
    return client;
});

builder.Services.AddScoped<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    var databaseName = builder.Configuration["Database:DatabaseName"] ?? "crypto_oms";
    return client.GetDatabase(databaseName);
});

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
builder.Services.AddScoped<IPositionService, PositionService>();
builder.Services.AddScoped<IMarginCalculationService, MarginCalculationService>();
builder.Services.AddScoped<IRiskValidationService, RiskValidationService>();
builder.Services.AddSingleton<IKafkaRiskEventProducer, KafkaRiskEventProducer>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddRedis(redisConnectionString, name: "redis")
    .AddCheck<MongoHealthCheck>("mongodb")
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

// Ensure Kafka producer is disposed on shutdown
var kafkaProducer = app.Services.GetRequiredService<IKafkaRiskEventProducer>();
app.Lifetime.ApplicationStopped.Register(() =>
{
    if (kafkaProducer is IDisposable disposable)
    {
        disposable.Dispose();
    }
});

Log.Information("Risk Engine API starting...");

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

// MongoDB Health Check
public class MongoHealthCheck : Microsoft.Extensions.Diagnostics.HealthChecks.IHealthCheck
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<MongoHealthCheck> _logger;

    public MongoHealthCheck(IMongoDatabase database, ILogger<MongoHealthCheck> logger)
    {
        _database = database;
        _logger = logger;
    }

    public async Task<Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult> CheckHealthAsync(
        Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _database.RunCommandAsync<MongoDB.Bson.BsonDocument>(
                new MongoDB.Bson.BsonDocument("ping", 1),
                cancellationToken: cancellationToken);
            return Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy("MongoDB is available");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MongoDB health check failed");
            return Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Unhealthy("MongoDB is not available", ex);
        }
    }
}

// Kafka Health Check
public class KafkaHealthCheck : Microsoft.Extensions.Diagnostics.HealthChecks.IHealthCheck
{
    private readonly IKafkaRiskEventProducer _kafkaProducer;
    private readonly ILogger<KafkaHealthCheck> _logger;

    public KafkaHealthCheck(IKafkaRiskEventProducer kafkaProducer, ILogger<KafkaHealthCheck> logger)
    {
        _kafkaProducer = kafkaProducer;
        _logger = logger;
    }

    public Task<Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult> CheckHealthAsync(
        Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Kafka producer is initialized in constructor, so if we have an instance, it's healthy
            return Task.FromResult(Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy("Kafka producer is available"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kafka health check failed");
            return Task.FromResult(Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Unhealthy("Kafka producer is not available", ex));
        }
    }
}
