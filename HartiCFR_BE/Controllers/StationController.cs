using HartiCFR_BE.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HartiCFR_BE.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StationController : ControllerBase
{
    private readonly IStationRepository _stationRepository;

    public StationController(IStationRepository stationRepository)
    {
        _stationRepository = stationRepository;
    }

    [HttpGet("stations/{id}")]
    public async Task<IActionResult> GetStation(int id)
    {
        var station = await _stationRepository.GetStationByIDAsync(id);
        if (station == null)
        {
            return NotFound();
        }
        return Ok(station);
    }

    [HttpGet("stations")]
    public async Task<IActionResult> ListStations()
    {
        var stations = await _stationRepository.ListStationsAsync();
        return Ok(stations);
    }
}