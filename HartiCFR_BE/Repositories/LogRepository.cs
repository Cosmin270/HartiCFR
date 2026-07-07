using HartiCFR_BE.Data;
using HartiCFR_BE.Models;
using Microsoft.EntityFrameworkCore;

namespace HartiCFR_BE.Repositories;

public class LogRepository : ILogRepository
{
    private readonly AppDbContext _context;

    public LogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddLogAsync(Log log)
    {
        await _context.Logs.AddAsync(log);
    }

    public async Task<Log?> GetLogByIDAsync(int id)
    {
        return await _context.Logs.FindAsync(id);
    }

    public async Task<IEnumerable<Log>> ListLogsAsync()
    {
        return await _context.Logs.ToListAsync();
    }
    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}