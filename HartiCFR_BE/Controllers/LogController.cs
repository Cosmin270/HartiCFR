using HartiCFR_BE.Models;
using HartiCFR_BE.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HartiCFR_BE.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LogController : ControllerBase
{
    private readonly ILogRepository _logRepository;

    public LogController(ILogRepository logRepository)
    {
        _logRepository = logRepository;
    }

    [HttpPost("logs")]
    public async Task<IActionResult> AddLog([FromBody] Log log)
    {
        await _logRepository.AddLogAsync(log);
        await _logRepository.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("logs/{id}")]
    public async Task<IActionResult> GetLogByID(int id)
    {
        var log = await _logRepository.GetLogByIDAsync(id);
        if (log == null)
        {
            return NotFound();
        }
        return Ok(log);
    }

    [HttpGet("logs")]
    public async Task<IActionResult> ListLogs()
    {
        var logs = await _logRepository.ListLogsAsync();
        return Ok(logs);
    }
}