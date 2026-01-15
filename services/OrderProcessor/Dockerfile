# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["OrderProcessor.csproj", "./"]
RUN dotnet restore "OrderProcessor.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src"
RUN dotnet build "OrderProcessor.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "OrderProcessor.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS final
WORKDIR /app

# Copy published app
COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "OrderProcessor.dll"]
