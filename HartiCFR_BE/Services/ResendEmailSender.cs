using System.Net.Http.Headers;
using System.Text.Json.Serialization;

namespace HartiCFR_BE.Services;

// Sends mail through Resend's HTTP API. Render's free plan blocks outbound
// SMTP ports, so a mail provider reached over HTTPS is the only way out.
// Without a verified domain Resend only delivers from onboarding@resend.dev
// to the address that owns the Resend account, which is all the contact form
// needs. Configured through Resend__ApiKey (and optionally Resend__From).
public class ResendEmailSender : IEmailSender
{
    private const string DefaultFrom = "Harti CFR <onboarding@resend.dev>";

    private readonly HttpClient _http;
    private readonly string? _apiKey;
    private readonly string _from;

    public ResendEmailSender(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        _http.BaseAddress = new Uri("https://api.resend.com/");
        _apiKey = configuration["Resend:ApiKey"];
        _from = configuration["Resend:From"] ?? DefaultFrom;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    public async Task SendAsync(string to, string subject, string text, string? replyTo, CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("Resend:ApiKey is not set.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
        {
            Content = JsonContent.Create(new ResendEmail(_from, [to], subject, text, replyTo)),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        using var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException($"Resend answered {(int)response.StatusCode}: {body}");
        }
    }

    private record ResendEmail(
        [property: JsonPropertyName("from")] string From,
        [property: JsonPropertyName("to")] string[] To,
        [property: JsonPropertyName("subject")] string Subject,
        [property: JsonPropertyName("text")] string Text,
        [property: JsonPropertyName("reply_to"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ReplyTo);
}
