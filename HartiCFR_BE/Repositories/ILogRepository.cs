using HartiCFR_BE.Models;

namespace HartiCFR_BE.Repositories;

public interface ILogRepository
{
    Task AddLogAsync(Log log);
    Task<Log?> GetLogByIDAsync(int id);
    Task<IEnumerable<Log>> ListLogsAsync();
    Task SaveChangesAsync();

}