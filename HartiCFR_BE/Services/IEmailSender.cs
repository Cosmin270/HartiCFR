namespace HartiCFR_BE.Services;

public interface IEmailSender
{
    // False when sending is not configured on this server (no API key).
    bool IsConfigured { get; }

    // Throws when the mail provider refuses or cannot be reached.
    Task SendAsync(string to, string subject, string text, string? replyTo, CancellationToken cancellationToken);
}
