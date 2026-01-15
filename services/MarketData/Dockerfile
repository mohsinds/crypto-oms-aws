# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["MarketData.csproj", "./"]
RUN dotnet restore "MarketData.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src"
RUN dotnet build "MarketData.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "MarketData.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Copy published app
COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "MarketData.dll"]
