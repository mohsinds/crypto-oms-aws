using Microsoft.AspNetCore.Mvc;
using MarketData.Models;
using MarketData.Services;
using Microsoft.AspNetCore.SignalR;
using MarketData.Hubs;

namespace MarketData.Controllers;

[ApiController]
[Route("api/market-data")]
public class MarketDataController : ControllerBase
{
    private readonly IPriceAggregationService _priceAggregationService;
    private readonly IOrderBookService _orderBookService;
    private readonly IHubContext<PriceHub> _hubContext;
    private readonly ILogger<MarketDataController> _logger;

    public MarketDataController(
        IPriceAggregationService priceAggregationService,
        IOrderBookService orderBookService,
        IHubContext<PriceHub> hubContext,
        ILogger<MarketDataController> logger)
    {
        _priceAggregationService = priceAggregationService;
        _orderBookService = orderBookService;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpGet("prices/{symbol}")]
    public async Task<IActionResult> GetPrice(string symbol)
    {
        try
        {
            var price = await _priceAggregationService.GetPriceAsync(symbol);
            
            if (price == null)
            {
                _logger.LogWarning("Price not found for symbol: {Symbol}", symbol);
                return NotFound(new { error = $"Price not found for symbol: {symbol}" });
            }

            return Ok(price);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving price for symbol: {Symbol}", symbol);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("prices")]
    public async Task<IActionResult> GetAllPrices()
    {
        try
        {
            var prices = await _priceAggregationService.GetAllPricesAsync();
            return Ok(prices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all prices");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("orderbook/{symbol}")]
    public async Task<IActionResult> GetOrderBook(string symbol)
    {
        try
        {
            var orderBook = await _orderBookService.GetOrderBookAsync(symbol);
            
            if (orderBook == null)
            {
                _logger.LogWarning("Order book not found for symbol: {Symbol}", symbol);
                return NotFound(new { error = $"Order book not found for symbol: {symbol}" });
            }

            return Ok(orderBook);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving order book for symbol: {Symbol}", symbol);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("candlestick/{symbol}")]
    public async Task<IActionResult> GetCandlestickData(
        string symbol,
        [FromQuery] string interval = "5m",
        [FromQuery] int limit = 100)
    {
        try
        {
            // TODO: Implement candlestick data retrieval from database or cache
            // For now, return not implemented
            _logger.LogInformation("GetCandlestickData called for Symbol: {Symbol}, Interval: {Interval}, Limit: {Limit}",
                symbol, interval, limit);
            return StatusCode(501, new { error = "Candlestick data retrieval not yet implemented" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving candlestick data for symbol: {Symbol}", symbol);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
