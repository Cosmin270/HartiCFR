namespace HartiCFR_BE.Models;


public class Log
{
    public int Id { get; set; }
    public string SRCF { get; set; } = string.Empty;

    public string CT { get; set; } = string.Empty;

    public int TNPosition { get; set; }

    public LocationType LocationType { get; set; }

    public Location Location { get; set; } = new Location();

    public string MainLine { get; set; } = string.Empty;

    public ElectricType ElectricType { get; set; }

    public ConfigType ConfigType { get; set; }

    public Producer Producer { get; set; }

    public OperatingMode OperatingMode { get; set; }

    public Position Position { get; set; } = new Position();
}