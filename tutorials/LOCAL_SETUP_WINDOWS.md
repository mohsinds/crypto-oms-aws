# 🪟 Local Development Setup - Windows

Complete step-by-step guide to run the Crypto OMS project on your local Windows machine.

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] Windows 10 (version 1903 or later) or Windows 11
- [ ] Administrator access
- [ ] At least 8GB RAM (16GB recommended)
- [ ] 20GB free disk space
- [ ] Internet connection

## ⏱️ Estimated Time

- **Initial Setup**: 1-2 hours
- **Subsequent Runs**: 5-10 minutes

---

## Step 1: Install Git

Git is required to clone the repository.

### Download and Install

1. **Download Git**:
   - Visit: https://git-scm.com/download/win
   - Download the latest version (64-bit)
   - Run the installer

2. **Installation Options**:
   - **Select Components**: Keep defaults (Git Bash, Git GUI, etc.)
   - **Default Editor**: Choose your preferred editor (VS Code recommended)
   - **PATH Environment**: Choose "Git from the command line and also from 3rd-party software"
   - **Line Ending Conversions**: Choose "Checkout Windows-style, commit Unix-style line endings"
   - Click "Install"

### Verify Installation

Open **PowerShell** or **Command Prompt**:

```powershell
git --version
# Expected: git version 2.x.x

# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Step 2: Install Docker Desktop

Docker Desktop is required to run Redis, Kafka, MongoDB, and other services locally.

### Download and Install

1. **Download Docker Desktop**:
   - Visit: https://www.docker.com/products/docker-desktop
   - Click "Download for Windows"
   - Download the installer

2. **Install Docker Desktop**:
   - Run the installer (`Docker Desktop Installer.exe`)
   - **Important**: Check "Use WSL 2 instead of Hyper-V" (recommended)
   - Follow the installation wizard
   - Restart your computer when prompted

3. **Start Docker Desktop**:
   - Launch Docker Desktop from Start menu
   - Wait for Docker to start (whale icon in system tray)
   - Click "Accept" on the terms of service

### Verify Installation

Open **PowerShell**:

```powershell
# Check Docker version
docker --version
# Expected: Docker version 24.x or later

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v2.x or later

# Test Docker
docker run hello-world
# Expected: "Hello from Docker!" message
```

### Configure Docker Resources

1. Open Docker Desktop
2. Click **Settings** (gear icon) → **Resources**
3. Set:
   - **CPUs**: 4 (or at least 2)
   - **Memory**: 4GB (or at least 2GB)
   - **Disk**: 20GB
4. Click **Apply & Restart**

---

## Step 3: Install WSL 2 (Windows Subsystem for Linux)

WSL 2 is required for Docker Desktop on Windows.

### Check if WSL 2 is Installed

Open **PowerShell as Administrator**:

```powershell
wsl --version
```

If you see a version, WSL is installed. Skip to Step 4.

### Install WSL 2

```powershell
# Run PowerShell as Administrator
# Install WSL 2
wsl --install

# Restart your computer when prompted
```

After restart, WSL 2 will be installed with Ubuntu.

### Set WSL 2 as Default

```powershell
wsl --set-default-version 2
```

---

## Step 4: Install .NET 8 SDK

The backend services are built with .NET Core 8.

### Download and Install

1. **Download .NET 8 SDK**:
   - Visit: https://dotnet.microsoft.com/download/dotnet/8.0
   - Click "Download .NET SDK 8.0.x" (Windows x64)
   - Run the installer

2. **Installation**:
   - Follow the installation wizard
   - Keep all default options
   - Click "Install"

### Verify Installation

Open **PowerShell**:

```powershell
dotnet --version
# Expected: 8.0.x or later

dotnet --list-sdks
# Should show: 8.0.x [C:\Program Files\dotnet\sdk]
```

---

## Step 5: Install Node.js and npm

Required for the React frontend.

### Download and Install

1. **Download Node.js**:
   - Visit: https://nodejs.org/
   - Download "LTS" version (18.x or later)
   - Choose Windows Installer (.msi) 64-bit

2. **Installation**:
   - Run the installer
   - Keep all default options
   - Check "Automatically install the necessary tools"
   - Click "Install"

### Verify Installation

Open **PowerShell**:

```powershell
node --version
# Expected: v18.x.x or later

npm --version
# Expected: 9.x.x or later
```

---

## Step 6: Install Visual Studio Code (Recommended Editor)

While any editor works, VS Code is recommended.

### Download and Install

1. **Download VS Code**:
   - Visit: https://code.visualstudio.com/
   - Download for Windows
   - Run the installer

2. **Installation**:
   - Keep default options
   - Check "Add to PATH"
   - Click "Install"

### Recommended VS Code Extensions

After installing VS Code, open it and install these extensions:

1. **C#** (by Microsoft) - .NET development
2. **ES7+ React/Redux/React-Native snippets** - React development
3. **Docker** - Docker support
4. **Kubernetes** - Kubernetes support
5. **YAML** - YAML file support

---

## Step 7: Clone the Repository

Open **PowerShell**:

```powershell
# Navigate to your projects directory
cd C:\Users\<YourUsername>\Projects
# Or create a Projects folder:
mkdir C:\Users\<YourUsername>\Projects
cd C:\Users\<YourUsername>\Projects

# Clone the repository
git clone <your-repo-url> crypto-oms-aws
# OR if you have the project locally, navigate to it:
cd crypto-oms-aws

# Verify you're in the right directory
dir
# Should see: docs, services, frontend, terraform, k8s
```

---

## Step 8: Set Up Local Infrastructure (Docker Compose)

We'll use Docker Compose to run Redis, Kafka, Zookeeper, and MongoDB locally.

### Create Docker Compose File

Create `docker-compose.yml` in the project root:

```powershell
cd crypto-oms-aws
New-Item -ItemType File -Name "docker-compose.yml"
```

Open `docker-compose.yml` in VS Code and add the following content:

```yaml
version: '3.8'

services:
  # Redis for idempotency and caching
  redis:
    image: redis:7-alpine
    container_name: crypto-oms-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Zookeeper for Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: crypto-oms-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "2181"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Kafka broker
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: crypto-oms-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT_INTERNAL
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_SEGMENT_BYTES: 1073741824
    volumes:
      - kafka-data:/var/lib/kafka/data
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MongoDB (DocumentDB compatible) for order persistence
  mongodb:
    image: mongo:7
    container_name: crypto-oms-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: crypto_oms
    volumes:
      - mongodb-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis-data:
  kafka-data:
  mongodb-data:
```

### Start Infrastructure Services

Open **PowerShell** in the project root:

```powershell
# Start all services
docker compose up -d

# Verify services are running
docker compose ps
# Expected: All services should show "Up" status

# Check logs
docker compose logs
```

### Verify Services

```powershell
# Test Redis
docker exec -it crypto-oms-redis redis-cli ping
# Expected: PONG

# Test MongoDB
docker exec -it crypto-oms-mongodb mongosh --eval "db.adminCommand('ping')"
# Expected: { ok: 1 }

# Test Kafka (wait 30 seconds after starting)
docker exec -it crypto-oms-kafka kafka-topics.sh --list --bootstrap-server localhost:9092
# Expected: (may be empty initially, that's OK)
```

---

## Step 9: Create Kafka Topics

Kafka topics need to be created before services can use them.

```powershell
# Enter Kafka container
docker exec -it crypto-oms-kafka bash

# Create orders topic
kafka-topics.sh --create `
  --bootstrap-server localhost:9092 `
  --topic orders `
  --partitions 3 `
  --replication-factor 1

# Create executions topic
kafka-topics.sh --create `
  --bootstrap-server localhost:9092 `
  --topic executions `
  --partitions 3 `
  --replication-factor 1

# Create prices topic
kafka-topics.sh --create `
  --bootstrap-server localhost:9092 `
  --topic prices `
  --partitions 3 `
  --replication-factor 1

# Create risk-events topic
kafka-topics.sh --create `
  --bootstrap-server localhost:9092 `
  --topic risk-events `
  --partitions 3 `
  --replication-factor 1

# List all topics
kafka-topics.sh --list --bootstrap-server localhost:9092

# Exit container
exit
```

**Note**: In PowerShell, use backticks (`) for line continuation instead of backslashes (\).

**Expected Output**:
```
Created topic orders
Created topic executions
Created topic prices
Created topic risk-events
orders
executions
prices
risk-events
```

---

## Step 10: Set Up Backend Services

### Step 10.1: Order Ingestion API

Open **PowerShell**:

```powershell
cd services\OrderIngestion

# Restore dependencies
dotnet restore

# Verify project builds
dotnet build

# Run the service
dotnet run

# Service will start on http://localhost:5000
# Swagger UI: http://localhost:5000/swagger
```

**Keep this PowerShell window open** - the service needs to keep running.

### Step 10.2: Risk Engine (New PowerShell Window)

Open a new PowerShell window:

```powershell
cd services\RiskEngine

# Restore dependencies
dotnet restore

# Build
dotnet build

# Run the service
dotnet run

# Service will start on http://localhost:5001
# Swagger UI: http://localhost:5001/swagger
```

**Keep this PowerShell window open**.

### Step 10.3: Market Data Service (New PowerShell Window)

Open another new PowerShell window:

```powershell
cd services\MarketData

# Restore dependencies
dotnet restore

# Build
dotnet build

# Run the service
dotnet run

# Service will start on http://localhost:5002
# Swagger UI: http://localhost:5002/swagger
# WebSocket: ws://localhost:5002/ws/market-data
```

**Keep this PowerShell window open**.

### Step 10.4: Order Processor (New PowerShell Window)

Open another new PowerShell window:

```powershell
cd services\OrderProcessor

# Restore dependencies
dotnet restore

# Build
dotnet build

# Run the service
dotnet run

# This is a background service - no HTTP endpoints
# Check logs for "Kafka consumer started" message
```

**Keep this PowerShell window open**.

---

## Step 11: Set Up Frontend

### Step 11.1: Install Dependencies

Open a new PowerShell window:

```powershell
cd frontend

# Install npm packages
npm install

# This may take 2-5 minutes
```

### Step 11.2: Configure Environment Variables

Create `.env` file in `frontend\` directory:

```powershell
cd frontend
New-Item -ItemType File -Name ".env"
```

Open `.env` in VS Code and add:

```bash
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5002/ws/market-data
```

### Step 11.3: Run Frontend

```powershell
# Start development server
npm run dev

# Application will be available at http://localhost:3000
```

---

## Step 12: Verify Everything Works

### Test Order Ingestion API

Open a new PowerShell window:

```powershell
# Test health endpoint
curl http://localhost:5000/health

# Place a test order
curl -X POST http://localhost:5000/api/orders `
  -H "Content-Type: application/json" `
  -H "X-Idempotency-Key: test-123" `
  -d '{\"symbol\":\"BTC/USD\",\"side\":\"BUY\",\"orderType\":\"LIMIT\",\"quantity\":0.1,\"price\":45000}'
```

**Note**: In PowerShell, use backticks (`) for line continuation and escape quotes with backslash.

**Expected**: JSON response with `orderId` and `status: "ACCEPTED"`

### Test Risk Engine

```powershell
# Test health endpoint
curl http://localhost:5001/health

# Test risk validation
curl -X POST http://localhost:5001/api/risk/validate `
  -H "Content-Type: application/json" `
  -d '{\"orderId\":\"test-123\",\"userId\":\"user123\",\"symbol\":\"BTC/USD\",\"side\":\"BUY\",\"orderType\":\"LIMIT\",\"quantity\":0.1,\"price\":45000,\"currentPrice\":45000}'
```

**Expected**: JSON response with `approved: true`

### Test Market Data Service

```powershell
# Test health endpoint
curl http://localhost:5002/health

# Test price endpoint
curl http://localhost:5002/api/market-data/prices/BTC%2FUSD
```

### Verify Kafka Messages

```powershell
# Check if order was published to Kafka
docker exec -it crypto-oms-kafka kafka-console-consumer.sh `
  --bootstrap-server localhost:9092 `
  --topic orders `
  --from-beginning `
  --max-messages 1
```

**Expected**: JSON message with order details

### Verify Order in MongoDB

```powershell
# Connect to MongoDB
docker exec -it crypto-oms-mongodb mongosh crypto_oms

# Query orders collection
db.orders.find().pretty()

# Exit
exit
```

### Test Frontend

1. Open browser: http://localhost:3000
2. You should see the trading dashboard
3. Try placing an order using the order entry form
4. Check active orders table
5. View candlestick chart

---

## Step 13: Access Swagger UI

Each service has Swagger UI for API testing:

- **Order Ingestion**: http://localhost:5000/swagger
- **Risk Engine**: http://localhost:5001/swagger
- **Market Data**: http://localhost:5002/swagger

---

## 🛠️ Troubleshooting

### Issue: Docker Desktop won't start

**Solution**:
1. Check if WSL 2 is installed: `wsl --version`
2. Restart Docker Desktop
3. Check Docker resources in Settings → Resources
4. Restart your computer if needed

### Issue: Port already in use

**Symptoms**: Error like "port 5000 is already in use"

**Solution**:
```powershell
# Find process using the port
netstat -ano | findstr :5000

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F

# Or change port in appsettings.Development.json
```

### Issue: Kafka topics not created

**Solution**:
```powershell
# Wait 30 seconds after starting Kafka
# Then try creating topics again
docker exec -it crypto-oms-kafka kafka-topics.sh --list --bootstrap-server localhost:9092
```

### Issue: Cannot connect to Redis/MongoDB/Kafka

**Solution**:
1. Check if containers are running: `docker compose ps`
2. Check container logs: `docker compose logs <service-name>`
3. Restart containers: `docker compose restart <service-name>`

### Issue: .NET SDK not found

**Solution**:
1. Reinstall .NET SDK from https://dotnet.microsoft.com/download
2. Restart PowerShell after installation
3. Verify: `dotnet --version`

### Issue: npm install fails

**Solution**:
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Reinstall
npm install
```

### Issue: PowerShell execution policy error

**Symptoms**: "cannot be loaded because running scripts is disabled"

**Solution**:
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Verify
Get-ExecutionPolicy
```

---

## 📝 Daily Development Workflow

Once everything is set up, your daily workflow:

### Start Infrastructure

```powershell
# Start Docker services
docker compose up -d

# Verify services
docker compose ps
```

### Start Backend Services

Open 4 PowerShell windows:

**PowerShell 1 - Order Ingestion**:
```powershell
cd services\OrderIngestion
dotnet run
```

**PowerShell 2 - Risk Engine**:
```powershell
cd services\RiskEngine
dotnet run
```

**PowerShell 3 - Market Data**:
```powershell
cd services\MarketData
dotnet run
```

**PowerShell 4 - Order Processor**:
```powershell
cd services\OrderProcessor
dotnet run
```

### Start Frontend

**PowerShell 5 - Frontend**:
```powershell
cd frontend
npm run dev
```

### Stop Everything

```powershell
# Stop backend services: Press Ctrl+C in each PowerShell window

# Stop frontend: Press Ctrl+C

# Stop Docker services
docker compose down

# Or stop and remove volumes (clean slate)
docker compose down -v
```

---

## 🎯 Next Steps

1. ✅ **Read Service READMEs**: Each service has detailed documentation
   - [Order Ingestion README](../services/OrderIngestion/README.md)
   - [Order Processor README](../services/OrderProcessor/README.md)
   - [Risk Engine README](../services/RiskEngine/README.md)
   - [Market Data README](../services/MarketData/README.md)

2. ✅ **Explore the Code**: Familiarize yourself with the project structure

3. ✅ **Test APIs**: Use Swagger UI to test all endpoints

4. ✅ **Modify and Experiment**: Make changes and see how they affect the system

5. ✅ **Ready for AWS?**: Follow the [AWS Deployment Tutorial](./AWS_DEPLOYMENT.md)

---

## 📚 Additional Resources

- [Backend Architecture Guide](../docs/BACKEND_ARCHITECTURE.md)
- [How It Works](../docs/HOW_IT_WORKS.md)
- [Development Guide](../docs/DEVELOPMENT.md)
- [Service READMEs](../services/)

---

**Congratulations! You now have the Crypto OMS running locally on Windows!** 🎉

*For macOS setup, see [LOCAL_SETUP_MACOS.md](./LOCAL_SETUP_MACOS.md)*
