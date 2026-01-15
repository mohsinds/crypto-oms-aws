using Microsoft.AspNetCore.SignalR;

namespace MarketData.Hubs;

public class PriceHub : Hub
{
    private readonly ILogger<PriceHub> _logger;

    public PriceHub(ILogger<PriceHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        if (exception != null)
        {
            _logger.LogError(exception, "Client disconnected with error: {ConnectionId}", Context.ConnectionId);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SubscribeToSymbol(string symbol)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, symbol.ToUpper());
        _logger.LogDebug("Client {ConnectionId} subscribed to symbol: {Symbol}", Context.ConnectionId, symbol);
    }

    public async Task UnsubscribeFromSymbol(string symbol)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, symbol.ToUpper());
        _logger.LogDebug("Client {ConnectionId} unsubscribed from symbol: {Symbol}", Context.ConnectionId, symbol);
    }
}
