# 💻 Development Guide - Crypto OMS AWS

## Overview

This guide provides step-by-step instructions for developing and deploying the Crypto Order Management System microservices. It covers local development setup, service implementation, Docker containerization, and Kubernetes deployment.

**For detailed backend architecture and Proto.Actor implementation, see [Backend Architecture Guide](./BACKEND_ARCHITECTURE.md).**

**For frontend development with candlestick charts and trading dashboard, see [Frontend Development Guide](./FRONTEND.md).**

---

## 📋 Prerequisites

### Required Tools

- **.NET 8 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **kubectl** - [Install Guide](https://kubernetes.io/docs/tasks/tools/)
- **AWS CLI** - Already configured
- **Terraform** - Already installed
- **IDE**: Visual Studio Code or Visual Studio

### Verify Installations

```bash
# Check .NET SDK
dotnet --version
# Expected: 8.0.x

# Check Docker
docker --version
# Expected: Docker version 24.x or later

# Check kubectl
kubectl version --client
# Expected: v1.28.x or later
```

---

## 🏗️ Project Structure

```
crypto-oms-aws/
├── services/                    # .NET Core Microservices
│   ├── OrderIngestion/         # Order intake API
│   ├── OrderProcessor/         # Proto.Actor consumer
│   ├── RiskEngine/             # Risk validation service
│   └── MarketData/             # Market data service
├── frontend/                    # React Frontend
│   └── src/
├── k8s/                         # Kubernetes Manifests
│   ├── deployments/
│   ├── services/
│   ├── configmaps/
│   └── secrets/
```

---

## 📚 Service Development Guide

### Service 1: Order Ingestion API

#### Step 1: Create Project Structure

```bash
cd services

# Create .NET 8 Web API project
dotnet new webapi -n OrderIngestion -o OrderIngestion
cd OrderIngestion

# Add required NuGet packages
dotnet add package StackExchange.Redis
dotnet add package Confluent.Kafka
dotnet add package Serilog.AspNetCore
dotnet add package Swashbuckle.AspNetCore
dotnet add package FluentValidation.AspNetCore
```

**Project Structure:**
```
OrderIngestion/
├── Program.cs                  # Application entry point
├── Controllers/
│   └── OrdersController.cs     # Order API endpoints
├── Services/
│   ├── IdempotencyService.cs   # Redis idempotency
│   └── KafkaProducerService.cs # Kafka producer
├── Models/
│   ├── Order.cs                # Order model
│   └── OrderRequest.cs         # Request DTOs
├── Middleware/
│   └── IdempotencyMiddleware.cs # Idempotency middleware
├── appsettings.json            # Configuration
├── appsettings.Development.json
└── Dockerfile                  # Docker configuration
```

#### Step 2: Configure appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Redis": {
    "ConnectionString": "localhost:6379",
    "IdempotencyKeyPrefix": "idempotency:",
    "IdempotencyKeyTTL": "24:00:00"
  },
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "OrdersTopic": "orders",
    "ClientId": "order-ingestion-api"
  },
  "Database": {
    "ConnectionString": "mongodb://localhost:27017/orders"
  }
}
```

#### Step 3: Implement Idempotency Service

Create `Services/IdempotencyService.cs`:

```csharp
using StackExchange.Redis;
using System.Text.Json;

public class IdempotencyService
{
    private readonly IDatabase _redis;
    private readonly string _prefix;
    private readonly TimeSpan _ttl;

    public IdempotencyService(IConnectionMultiplexer redis, IConfiguration config)
    {
        _redis = redis.GetDatabase();
        _prefix = config["Redis:IdempotencyKeyPrefix"] ?? "idempotency:";
        _ttl = TimeSpan.Parse(config["Redis:IdempotencyKeyTTL"] ?? "24:00:00");
    }

    public async Task<T?> GetAsync<T>(string idempotencyKey)
    {
        var key = $"{_prefix}{idempotencyKey}";
        var value = await _redis.StringGetAsync(key);
        
        if (!value.HasValue)
            return default;
            
        return JsonSerializer.Deserialize<T>(value!);
    }

    public async Task SetAsync<T>(string idempotencyKey, T value)
    {
        var key = $"{_prefix}{idempotencyKey}";
        var json = JsonSerializer.Serialize(value);
        await _redis.StringSetAsync(key, json, _ttl);
    }
}
```

#### Step 4: Implement Kafka Producer Service

Create `Services/KafkaProducerService.cs`:

```csharp
using Confluent.Kafka;

public class KafkaProducerService : IDisposable
{
    private readonly IProducer<string, string> _producer;
    private readonly string _topic;

    public KafkaProducerService(IConfiguration config)
    {
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = config["Kafka:BootstrapServers"],
            ClientId = config["Kafka:ClientId"]
        };
        
        _producer = new ProducerBuilder<string, string>(producerConfig).Build();
        _topic = config["Kafka:OrdersTopic"] ?? "orders";
    }

    public async Task ProduceAsync(string key, string value)
    {
        var message = new Message<string, string>
        {
            Key = key,
            Value = value
        };

        await _producer.ProduceAsync(_topic, message);
    }

    public void Dispose()
    {
        _producer?.Dispose();
    }
}
```

#### Step 5: Implement Order Controller

Create `Controllers/OrdersController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IdempotencyService _idempotency;
    private readonly KafkaProducerService _kafka;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(
        IdempotencyService idempotency,
        KafkaProducerService kafka,
        ILogger<OrdersController> logger)
    {
        _idempotency = idempotency;
        _kafka = kafka;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> PlaceOrder(
        [FromBody] PlaceOrderRequest request,
        [FromHeader(Name = "X-Idempotency-Key")] string idempotencyKey)
    {
        // Check idempotency
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            var existing = await _idempotency.GetAsync<Order>(idempotencyKey);
            if (existing != null)
            {
                return Ok(existing);
            }
        }

        // Create order
        var order = new Order
        {
            OrderId = Guid.NewGuid().ToString(),
            Symbol = request.Symbol,
            Side = request.Side,
            Quantity = request.Quantity,
            Price = request.Price,
            OrderType = request.OrderType,
            Status = OrderStatus.NEW,
            CreatedAt = DateTime.UtcNow
        };

        // Publish to Kafka
        var orderEvent = JsonSerializer.Serialize(new
        {
            eventType = "OrderCreated",
            orderId = order.OrderId,
            symbol = order.Symbol,
            side = order.Side,
            quantity = order.Quantity,
            price = order.Price,
            timestamp = order.CreatedAt
        });

        await _kafka.ProduceAsync(order.OrderId, orderEvent);

        // Cache in Redis
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            await _idempotency.SetAsync(idempotencyKey, order);
        }

        _logger.LogInformation("Order placed: {OrderId}", order.OrderId);

        return Ok(order);
    }

    [HttpGet("{orderId}")]
    public async Task<IActionResult> GetOrder(string orderId)
    {
        // Implementation: Query DocumentDB
        // For now, return placeholder
        return Ok(new { orderId, status = "PENDING" });
    }
}
```

#### Step 6: Configure Program.cs

Update `Program.cs`:

```csharp
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return ConnectionMultiplexer.Connect(config["Redis:ConnectionString"]!);
});
builder.Services.AddScoped<IdempotencyService>();

// Kafka
builder.Services.AddSingleton<KafkaProducerService>();

// Logging
builder.Services.AddSerilog();

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();
```

#### Step 7: Create Dockerfile

Create `Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["OrderIngestion.csproj", "./"]
RUN dotnet restore "OrderIngestion.csproj"
COPY . .
RUN dotnet build "OrderIngestion.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "OrderIngestion.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "OrderIngestion.dll"]
```

#### Step 8: Build and Test Locally

```bash
# Build project
dotnet build

# Run locally
dotnet run

# Test health endpoint
curl http://localhost:5000/health

# Test order placement
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-123" \
  -d '{"symbol":"BTC/USD","side":"BUY","quantity":0.1,"price":45000,"orderType":"LIMIT"}'
```

#### Step 9: Build Docker Image

```bash
# Build image
docker build -t crypto-oms/order-ingestion:latest .

# Run container
docker run -p 5000:80 \
  -e Redis__ConnectionString="redis:6379" \
  -e Kafka__BootstrapServers="kafka:9092" \
  crypto-oms/order-ingestion:latest
```

---

### Service 2: Order Processor Service

#### Step 1: Create Project Structure

```bash
cd services

# Create .NET 8 console project
dotnet new console -n OrderProcessor -o OrderProcessor
cd OrderProcessor

# Add required packages
dotnet add package Proto.Actor
dotnet add package Confluent.Kafka
dotnet add package MongoDB.Driver
dotnet add package Serilog
```

#### Step 2: Implement Kafka Consumer

Create `Services/KafkaConsumerService.cs`:

```csharp
using Confluent.Kafka;

public class KafkaConsumerService
{
    private readonly IConsumer<string, string> _consumer;
    private readonly OrderActorSystem _actorSystem;

    public KafkaConsumerService(IConfiguration config, OrderActorSystem actorSystem)
    {
        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = config["Kafka:BootstrapServers"],
            GroupId = config["Kafka:ConsumerGroup"] ?? "order-processor-group",
            AutoOffsetReset = AutoOffsetReset.Earliest
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
        _actorSystem = actorSystem;
    }

    public async Task ConsumeAsync(CancellationToken cancellationToken)
    {
        _consumer.Subscribe("orders");

        while (!cancellationToken.IsCancellationRequested)
        {
            var result = _consumer.Consume(cancellationToken);
            
            // Send to actor
            await _actorSystem.ProcessOrderAsync(result.Value);
        }
    }
}
```

#### Step 3: Implement Order Actor

Create `Actors/OrderActor.cs`:

```csharp
using Proto;

public class OrderActor : IActor
{
    private OrderState _state = new();

    public Task ReceiveAsync(IContext context)
    {
        switch (context.Message)
        {
            case OrderCreatedEvent evt:
                _state.OrderId = evt.OrderId;
                _state.Status = OrderStatus.ACCEPTED;
                _state.CreatedAt = evt.Timestamp;
                // Persist to DocumentDB
                break;

            case RiskValidatedEvent evt:
                if (evt.Approved)
                {
                    _state.Status = OrderStatus.ACCEPTED;
                }
                else
                {
                    _state.Status = OrderStatus.REJECTED;
                    _state.RejectionReason = evt.Reason;
                }
                break;
        }

        return Task.CompletedTask;
    }
}
```

#### Step 4: Configure Program.cs

```csharp
var builder = Host.CreateApplicationBuilder(args);

// Add services
builder.Services.AddSingleton<OrderActorSystem>();
builder.Services.AddHostedService<KafkaConsumerService>();

// DocumentDB
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return new MongoClient(config["Database:ConnectionString"]);
});

var app = builder.Build();
app.Run();
```

---

## 🐳 Docker Compose for Local Development

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: orders

  order-ingestion:
    build:
      context: ./services/OrderIngestion
    ports:
      - "5000:80"
    environment:
      Redis__ConnectionString: "redis:6379"
      Kafka__BootstrapServers: "kafka:9092"
      Database__ConnectionString: "mongodb://mongodb:27017/orders"
    depends_on:
      - redis
      - kafka
      - mongodb
```

Run locally:
```bash
docker-compose up -d
```

---

## ☸️ Kubernetes Deployment

### Step 1: Create Deployment Manifest

Create `k8s/deployments/order-ingestion-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-ingestion
  namespace: crypto-oms
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-ingestion
  template:
    metadata:
      labels:
        app: order-ingestion
    spec:
      containers:
      - name: order-ingestion
        image: <ecr-repo>/order-ingestion:latest
        ports:
        - containerPort: 80
        env:
        - name: Redis__ConnectionString
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: redis-connection
        - name: Kafka__BootstrapServers
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: kafka-bootstrap-servers
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: order-ingestion
  namespace: crypto-oms
spec:
  selector:
    app: order-ingestion
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### Step 2: Create ConfigMap

Create `k8s/configmaps/app-config.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: crypto-oms
data:
  redis-connection: "<redis-endpoint>:6379"
  kafka-bootstrap-servers: "<kafka-bootstrap-servers>"
```

### Step 3: Deploy to EKS

```bash
# Create namespace
kubectl create namespace crypto-oms

# Apply ConfigMap
kubectl apply -f k8s/configmaps/app-config.yaml

# Apply Deployment
kubectl apply -f k8s/deployments/order-ingestion-deployment.yaml

# Check deployment
kubectl get pods -n crypto-oms
kubectl get services -n crypto-oms
```

---

## 📝 Next Steps

1. ✅ Complete Order Ingestion API
2. ⏳ Implement Order Processor Service
3. ⏳ Implement Risk Engine Service
4. ⏳ Implement Market Data Service
5. ⏳ Create React Frontend (see [Frontend Development Guide](./FRONTEND.md))
6. ⏳ Deploy all services to EKS

**Related Documentation:**
- [Backend Architecture Guide](./BACKEND_ARCHITECTURE.md) - Detailed .NET microservices architecture
- [Frontend Development Guide](./FRONTEND.md) - React trading dashboard with candlestick charts
- [Implementation Status](./STATUS.md) - Detailed progress tracking

---

*Last Updated: January 2025*
