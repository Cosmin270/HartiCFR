using HartiCFR_BE.Models;

namespace HartiCFR_BE.Repositories;

public interface IStationRepository
{
    Task<Station?> GetStationByIDAsync(int id);
    Task<IEnumerable<Station>> ListStationsAsync();
    Task SaveChangesAsync();
}