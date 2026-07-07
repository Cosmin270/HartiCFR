public enum LocationType
{
    Statie,
    LC
}
public enum ElectricType
{
    BAT,
    SAT
}
public enum ConfigType
{
    Electronic,
    Relee,
    Necunoscut
}
public struct Location
{
    public string start { get; set; } = string.Empty;
    public string end { get; set; } = string.Empty;

    public Location(string start, string? end)
    {
        this.start = start;
        if (end != null)
        {
            this.end = end;
        }
    }
}

public enum Producer
{
    Aerofina,
    Electromagnetica,
    SPIACT_Cr,
    _
}
public enum OperatingMode
{
    Automat,
    Manual
}

public struct Position
{
    public double x { get; set; }
    public double y { get; set; }

    public Position(double x, double y)
    {
        this.x = x;
        this.y = y;
    }
}

