using OrderProcessor.Services;
using Proto;
using Serilog;
using MongoDB.Driver;
using Microsoft.Extensions.DependencyInjection;

var builder = Host.CreateApplicationBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

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

// Add HTTP client for Risk Engine
builder.Services.AddHttpClient();

// Add custom services
builder.Services.AddScoped<IOrderPersistenceService, OrderPersistenceService>();
builder.Services.AddSingleton<IKafkaExecutionProducer, KafkaExecutionProducer>();

// Add Proto.Actor system
builder.Services.AddSingleton<ActorSystem>(sp =>
{
    var system = new ActorSystem();
    return system;
});

// Register KafkaConsumerService as hosted service
builder.Services.AddSingleton<IKafkaConsumerService, KafkaConsumerService>();
builder.Services.AddHostedService<KafkaConsumerService>(sp =>
    (KafkaConsumerService)sp.GetRequiredService<IKafkaConsumerService>());

Log.Information("Order Processor Service starting...");

try
{
    var host = builder.Build();
    
    // Ensure Kafka producer is disposed on shutdown
    var kafkaProducer = host.Services.GetRequiredService<IKafkaExecutionProducer>();
    var actorSystem = host.Services.GetRequiredService<ActorSystem>();
    
    host.Services.GetRequiredService<IHostApplicationLifetime>().ApplicationStopped.Register(() =>
    {
        if (kafkaProducer is IDisposable disposable)
        {
            disposable.Dispose();
        }
        actorSystem.ShutdownAsync().Wait();
    });

    await host.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
