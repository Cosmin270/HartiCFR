using HartiCFR_BE.Data;
using HartiCFR_BE.Models;
using Microsoft.EntityFrameworkCore;

namespace HartiCFR_BE.Repositories;

public class StationRepository : IStationRepository
{
    private readonly AppDbContext _context;

    public StationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Station?> GetStationByIDAsync(int id)
    {
        return await _context.Stations.FindAsync(id);
    }

    public async Task<IEnumerable<Station>> ListStationsAsync()
    {
        return await _context.Stations.ToListAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}