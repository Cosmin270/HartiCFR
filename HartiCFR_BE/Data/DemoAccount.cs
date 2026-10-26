using HartiCFR_BE.Models;

namespace HartiCFR_BE.Data;

// A shared account so reviewers can try the app without
// registering. Credentials are overridable through Demo__Email / Demo__Password.
public static class DemoAccount
{
    public static string Email(IConfiguration config) => config["Demo:Email"] ?? "demo@harticfr.ro";

    public static string Password(IConfiguration config) => config["Demo:Password"] ?? "demo1234";

    public static void Seed(AppDbContext db, IConfiguration config)
    {
        var email = Email(config);
        if (db.Users.Any(u => u.Email == email))
        {
            return;
        }

        db.Users.Add(new User
        {
            Username = "Cont demo",
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password(config))
        });
        db.SaveChanges();
    }
}
