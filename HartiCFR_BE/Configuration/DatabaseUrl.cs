namespace HartiCFR_BE.Configuration;

public static class DatabaseUrl
{
    /// <summary>
    /// Hosting providers (Render, Railway, Heroku) hand out the database as a
    /// postgres://user:pass@host:port/db URL. Npgsql needs a keyword connection
    /// string, so translate when we are given a URL and pass anything else through.
    /// </summary>
    public static string ToNpgsqlConnectionString(string value)
    {
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);

        var builder = new Npgsql.NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
            // Require encrypts without validating the chain, which is what
            // managed Postgres instances with self-signed certs need.
            SslMode = Npgsql.SslMode.Require,
        };

        return builder.ConnectionString;
    }
}
