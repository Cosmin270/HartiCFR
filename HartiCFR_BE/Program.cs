using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using HartiCFR_BE.Configuration;
using HartiCFR_BE.Data;
using HartiCFR_BE.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Hosts such as Render inject the database as DATABASE_URL; fall back to the
// configured connection string for local development.
var connectionString = DatabaseUrl.ToNpgsqlConnectionString(
    Environment.GetEnvironmentVariable("DATABASE_URL")
        ?? builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException(
            "No database configured. Set DATABASE_URL or ConnectionStrings:DefaultConnection."));

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ILogRepository, LogRepository>();
builder.Services.AddScoped<IStationRepository, StationRepository>();

var isDevelopment = builder.Environment.IsDevelopment();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "harticfr_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = isDevelopment ? SameSiteMode.Lax : SameSiteMode.None;
        options.Cookie.SecurePolicy = isDevelopment
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;

        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization();

// Comma-separated list, e.g. Cors__AllowedOrigins=https://harticfr.onrender.com
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(origin => origin.TrimEnd('/'))
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
        policy.SetIsOriginAllowed(origin =>
                  (isDevelopment && new Uri(origin).Host == "localhost")
                  || allowedOrigins.Contains(origin.TrimEnd('/'), StringComparer.OrdinalIgnoreCase))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// Managed hosts create an empty database; bring the schema up to date on boot.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// The platform terminates TLS in front of us and forwards plain HTTP, so honour
// X-Forwarded-Proto instead of redirecting (which would loop).
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor,
};
// The proxy address is not known ahead of time on managed hosts.
forwardedHeadersOptions.KnownIPNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();