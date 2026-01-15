using Microsoft.AspNetCore.Mvc;
using RiskEngine.Models;
using RiskEngine.Services;

namespace RiskEngine.Controllers;

[ApiController]
[Route("api/risk")]
public class RiskController : ControllerBase
{
    private readonly IRiskValidationService _riskValidationService;
    private readonly IPositionService _positionService;
    private readonly IKafkaRiskEventProducer _kafkaProducer;
    private readonly ILogger<RiskController> _logger;

    public RiskController(
        IRiskValidationService riskValidationService,
        IPositionService positionService,
        IKafkaRiskEventProducer kafkaProducer,
        ILogger<RiskController> logger)
    {
        _riskValidationService = riskValidationService;
        _positionService = positionService;
        _kafkaProducer = kafkaProducer;
        _logger = logger;
    }

    [HttpPost("validate")]
    public async Task<IActionResult> ValidateOrder([FromBody] RiskValidationRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.Symbol))
            {
                return BadRequest(new { error = "Invalid request. UserId and Symbol are required." });
            }

            _logger.LogInformation("Validating order: {OrderId}, UserId: {UserId}, Symbol: {Symbol}, Quantity: {Quantity}",
                request.OrderId, request.UserId, request.Symbol, request.Quantity);

            var result = await _riskValidationService.ValidateOrderAsync(request);

            // Publish risk validation event to Kafka
            try
            {
                await _kafkaProducer.PublishRiskValidationEventAsync(request.OrderId, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish risk validation event to Kafka. OrderId: {OrderId}", request.OrderId);
                // Don't fail the request if Kafka publish fails
            }

            if (!result.Approved)
            {
                _logger.LogWarning("Order validation failed: {OrderId}, Reason: {Reason}", request.OrderId, result.Reason);
                return Ok(result); // Return 200 with approved=false
            }

            _logger.LogInformation("Order validation successful: {OrderId}", request.OrderId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating order: {OrderId}", request.OrderId);
            return StatusCode(500, new { error = "Internal server error during risk validation" });
        }
    }

    [HttpGet("positions")]
    public async Task<IActionResult> GetPositions([FromQuery] string userId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest(new { error = "UserId is required" });
            }

            var positions = await _positionService.GetUserPositionsAsync(userId);
            return Ok(positions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving positions for user: {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("positions/{userId}/{symbol}")]
    public async Task<IActionResult> GetPosition(string userId, string symbol)
    {
        try
        {
            var position = await _positionService.GetPositionAsync(userId, symbol);
            
            if (position == null)
            {
                return NotFound(new { error = $"Position not found for user: {userId}, symbol: {symbol}" });
            }

            return Ok(position);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving position for user: {UserId}, symbol: {Symbol}", userId, symbol);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("limits")]
    public async Task<IActionResult> GetRiskLimits([FromQuery] string userId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest(new { error = "UserId is required" });
            }

            var limits = await _riskValidationService.GetRiskLimitsAsync(userId);
            return Ok(limits);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving risk limits for user: {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
