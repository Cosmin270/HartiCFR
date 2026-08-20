namespace HartiCFR_BE.Models;

public class Station
{
    public int Id { get; set; }
    public int Cod { get; set; }
    public string Name { get; set; } = string.Empty;
    public Position Position { get; set; } = new Position();
}