# 🍎 Local Development Setup - macOS

Complete step-by-step guide to run the Crypto OMS project on your local macOS machine.

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] macOS 10.15 (Catalina) or later
- [ ] Administrator access
- [ ] At least 8GB RAM (16GB recommended)
- [ ] 20GB free disk space
- [ ] Internet connection

## ⏱️ Estimated Time

- **Initial Setup**: 1-2 hours
- **Subsequent Runs**: 5-10 minutes

---

## Step 1: Install Homebrew (Package Manager)

Homebrew is the easiest way to install development tools on macOS.

### Check if Homebrew is installed

```bash
brew --version
```

If you see a version number, skip to Step 2. Otherwise, install Homebrew:

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Follow the on-screen instructions
# You may need to add Homebrew to your PATH (instructions will be shown)
```

### Verify Installation

```bash
brew --version
# Expected: Homebrew 4.x.x or later
```

---

## Step 2: Install Git

```bash
# Install Git
brew install git

# Verify installation
git --version
# Expected: git version 2.x.x or later

# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Step 3: Install Docker Desktop

Docker Desktop is required to run Redis, Kafka, MongoDB, and other services locally.

### Download and Install

1. **Download Docker Desktop**:
   - Visit: https://www.docker.com/products/docker-desktop
   - Click "Download for Mac"
   - Choose "Mac with Intel chip" or "Mac with Apple chip" based on your Mac

2. **Install Docker Desktop**:
   - Open the downloaded `.dmg` file
   - Drag Docker to Applications folder
   - Open Docker from Applications
   - Follow the setup wizard
   - **Important**: Grant necessary permissions when prompted

3. **Start Docker Desktop**:
   - Launch Docker Desktop from Applications
   - Wait for Docker to start (whale icon in menu bar should be steady)
   - Click "Accept" on the terms of service

### Verify Installation

```bash
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
2. Go to **Settings** (gear icon) → **Resources**
3. Set:
   - **CPUs**: 4 (or at least 2)
   - **Memory**: 4GB (or at least 2GB)
   - **Disk**: 20GB
4. Click **Apply & Restart**

---

## Step 4: Install .NET 8 SDK

The backend services are built with .NET Core 8.

### Install via Homebrew

```bash
# Install .NET 8 SDK
brew install --cask dotnet-sdk

# Verify installation
dotnet --version
# Expected: 8.0.x or later

# Verify SDK is installed
dotnet --list-sdks
# Should show: 8.0.x [/usr/local/share/dotnet/sdk]
```

### Alternative: Direct Download

If Homebrew doesn't work:

1. Visit: https://dotnet.microsoft.com/download/dotnet/8.0
2. Download ".NET 8.0 SDK" for macOS
3. Run the installer
4. Follow the installation wizard

### Verify Installation

```bash
dotnet --version
dotnet --list-sdks
```

---

## Step 5: Install Node.js and npm

Required for the React frontend.

### Install via Homebrew

```bash
# Install Node.js (includes npm)
brew install node@18

# Verify installation
node --version
# Expected: v18.x.x or later

npm --version
# Expected: 9.x.x or later
```

### Alternative: Install via nvm (Node Version Manager)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js 18
nvm install 18
nvm use 18

# Verify
node --version
npm --version
```

---

## Step 6: Install VS Code (Recommended Editor)

While any editor works, VS Code is recommended for the best experience.

### Install via Homebrew

```bash
brew install --cask visual-studio-code
```

### Alternative: Direct Download

1. Visit: https://code.visualstudio.com/
2. Download for macOS
3. Install the `.zip` file

### Recommended VS Code Extensions

After installing VS Code, install these extensions:

1. **C#** (by Microsoft) - .NET development
2. **ES7+ React/Redux/React-Native snippets** - React development
3. **Docker** - Docker support
4. **Kubernetes** - Kubernetes support
5. **YAML** - YAML file support

---

## Step 7: Clone the Repository

```bash
# Navigate to your projects directory
cd ~/Projects  # or wherever you keep projects

# Clone the repository
git clone <your-repo-url> crypto-oms-aws
# OR if you have the project locally, navigate to it:
cd crypto-oms-aws

# Verify you're in the right directory
ls -la
# Should see: docs/, services/, frontend/, terraform/, k8s/
```

---

## Step 8: Set Up Local Infrastructure (Docker Compose)

We'll use Docker Compose to run Redis, Kafka, Zookeeper, and MongoDB locally.

### Create Docker Compose File

Create `docker-compose.yml` in the project root:

```bash
cd crypto-oms-aws
touch docker-compose.yml
```

Add the following content to `docker-compose.yml`:

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

```bash
# Start all services
docker compose up -d

# Verify services are running
docker compose ps
# Expected: All services should show "Up" status

# Check logs
docker compose logs
```

### Verify Services

```bash
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

```bash
# Enter Kafka container
docker exec -it crypto-oms-kafka bash

# Create orders topic
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 1

# Create executions topic
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic executions \
  --partitions 3 \
  --replication-factor 1

# Create prices topic
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic prices \
  --partitions 3 \
  --replication-factor 1

# Create risk-events topic
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic risk-events \
  --partitions 3 \
  --replication-factor 1

# List all topics
kafka-topics.sh --list --bootstrap-server localhost:9092

# Exit container
exit
```

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

```bash
cd services/OrderIngestion

# Restore dependencies
dotnet restore

# Verify project builds
dotnet build

# Run the service
dotnet run

# Service will start on http://localhost:5000
# Swagger UI: http://localhost:5000/swagger
```

**Keep this terminal open** - the service needs to keep running.

### Step 10.2: Risk Engine (New Terminal)

Open a new terminal window:

```bash
cd services/RiskEngine

# Restore dependencies
dotnet restore

# Build
dotnet build

# Run the service
dotnet run

# Service will start on http://localhost:5001
# Swagger UI: http://localhost:5001/swagger
```

**Keep this terminal open**.

### Step 10.3: Market Data Service (New Terminal)

Open another new terminal window:

```bash
cd services/MarketData

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

**Keep this terminal open**.

### Step 10.4: Order Processor (New Terminal)

Open another new terminal window:

```bash
cd services/OrderProcessor

# Restore dependencies
dotnet restore

# Build
dotnet build

# Run the service
dotnet run

# This is a background service - no HTTP endpoints
# Check logs for "Kafka consumer started" message
```

**Keep this terminal open**.

---

## Step 11: Set Up Frontend

### Step 11.1: Install Dependencies

Open a new terminal window:

```bash
cd frontend

# Install npm packages
npm install

# This may take 2-5 minutes
```

### Step 11.2: Configure Environment Variables

Create `.env` file in `frontend/` directory:

```bash
cd frontend
touch .env
```

Add the following to `.env`:

```bash
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5002/ws/market-data
```

### Step 11.3: Run Frontend

```bash
# Start development server
npm run dev

# Application will be available at http://localhost:3000
```

---

## Step 12: Verify Everything Works

### Test Order Ingestion API

```bash
# Test health endpoint
curl http://localhost:5000/health

# Place a test order
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -d '{
    "symbol": "BTC/USD",
    "side": "BUY",
    "orderType": "LIMIT",
    "quantity": 0.1,
    "price": 45000
  }'
```

**Expected**: JSON response with `orderId` and `status: "ACCEPTED"`

### Test Risk Engine

```bash
# Test health endpoint
curl http://localhost:5001/health

# Test risk validation
curl -X POST http://localhost:5001/api/risk/validate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "userId": "user123",
    "symbol": "BTC/USD",
    "side": "BUY",
    "orderType": "LIMIT",
    "quantity": 0.1,
    "price": 45000,
    "currentPrice": 45000
  }'
```

**Expected**: JSON response with `approved: true`

### Test Market Data Service

```bash
# Test health endpoint
curl http://localhost:5002/health

# Test price endpoint
curl http://localhost:5002/api/market-data/prices/BTC%2FUSD
```

### Verify Kafka Messages

```bash
# Check if order was published to Kafka
docker exec -it crypto-oms-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning \
  --max-messages 1
```

**Expected**: JSON message with order details

### Verify Order in MongoDB

```bash
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
1. Check if Docker Desktop is running (whale icon in menu bar)
2. Restart Docker Desktop
3. Check Docker resources in Settings → Resources
4. Restart your Mac if needed

### Issue: Port already in use

**Symptoms**: Error like "port 5000 is already in use"

**Solution**:
```bash
# Find process using the port
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change port in appsettings.Development.json
```

### Issue: Kafka topics not created

**Solution**:
```bash
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
```bash
# Reinstall .NET SDK
brew reinstall --cask dotnet-sdk

# Or add to PATH manually
export PATH="$PATH:/usr/local/share/dotnet"
```

### Issue: npm install fails

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

## 📝 Daily Development Workflow

Once everything is set up, your daily workflow:

### Start Infrastructure

```bash
# Start Docker services
docker compose up -d

# Verify services
docker compose ps
```

### Start Backend Services

Open 4 terminal windows:

**Terminal 1 - Order Ingestion**:
```bash
cd services/OrderIngestion
dotnet run
```

**Terminal 2 - Risk Engine**:
```bash
cd services/RiskEngine
dotnet run
```

**Terminal 3 - Market Data**:
```bash
cd services/MarketData
dotnet run
```

**Terminal 4 - Order Processor**:
```bash
cd services/OrderProcessor
dotnet run
```

### Start Frontend

**Terminal 5 - Frontend**:
```bash
cd frontend
npm run dev
```

### Stop Everything

```bash
# Stop backend services: Press Ctrl+C in each terminal

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

**Congratulations! You now have the Crypto OMS running locally on macOS!** 🎉

*For Windows setup, see [LOCAL_SETUP_WINDOWS.md](./LOCAL_SETUP_WINDOWS.md)*
