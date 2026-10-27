using System.Net.Mail;
using System.Security.Claims;
using HartiCFR_BE.Models;
using HartiCFR_BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HartiCFR_BE.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContactController : ControllerBase
{
    public const string RateLimitPolicy = "contact";
    public const int MaxMessageLength = 2000;
    private const string DefaultRecipient = "cosmin27.mocanu@gmail.com";
    private static readonly string[] Categories = ["Bug", "Sugestie"];

    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ContactController> _logger;

    public ContactController(IEmailSender emailSender, IConfiguration configuration, ILogger<ContactController> logger)
    {
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    // Mails a bug report or suggestion to the site owner. The sender's address
    // comes from their session, not the form, and is set as Reply-To so the
    // owner can answer straight from the inbox.
    [HttpPost]
    [EnableRateLimiting(RateLimitPolicy)]
    public async Task<IActionResult> Send([FromBody] ContactDto contactDto, CancellationToken cancellationToken)
    {
        var category = Categories.FirstOrDefault(c => c.Equals(contactDto.Category.Trim(), StringComparison.OrdinalIgnoreCase));
        var message = contactDto.Message.Trim();

        if (category == null)
        {
            return BadRequest("Alege o categorie: Bug sau Sugestie.");
        }
        if (message.Length == 0)
        {
            return BadRequest("Scrie un mesaj.");
        }
        if (message.Length > MaxMessageLength)
        {
            return BadRequest($"Mesajul poate avea cel mult {MaxMessageLength} de caractere.");
        }
        if (!_emailSender.IsConfigured)
        {
            _logger.LogError("Contact form used but Resend:ApiKey is not set.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Trimiterea mesajelor nu este configurată pe server.");
        }

        var email = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
        var username = User.FindFirst(ClaimTypes.Name)?.Value ?? string.Empty;
        var replyTo = MailAddress.TryCreate(email, out _) ? email : null;

        // Header values must stay on one line.
        var subject = $"[Harti CFR] {category} de la {email}".ReplaceLineEndings(" ");
        var text = string.Join("\n",
            $"Categorie: {category}",
            $"De la: {username} <{email}>",
            $"Trimis: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC",
            "",
            "Mesaj:",
            message,
            "",
            "--",
            "Răspunde la acest email pentru a-i scrie direct utilizatorului.");

        try
        {
            var to = _configuration["Contact:To"] ?? DefaultRecipient;
            await _emailSender.SendAsync(to, subject, text, replyTo, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogError(ex, "Could not send the contact message.");
            return StatusCode(StatusCodes.Status502BadGateway, "Nu am putut trimite mesajul. Încearcă din nou mai târziu.");
        }

        return Ok("Mesajul a fost trimis.");
    }
}
