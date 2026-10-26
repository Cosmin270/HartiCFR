using System.Net.Mail;
using System.Security.Claims;
using HartiCFR_BE.Data;
using HartiCFR_BE.Models;
using HartiCFR_BE.Repositories;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HartiCFR_BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const int MinPasswordLength = 6;

    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;

    public AuthController(IUserRepository userRepository, IConfiguration configuration)
    {
        _userRepository = userRepository;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        var username = registerDto.Username.Trim();
        var email = registerDto.Email.Trim();

        if (username.Length == 0)
        {
            return BadRequest("Introdu un nume.");
        }
        if (!MailAddress.TryCreate(email, out _))
        {
            return BadRequest("Adresa de email nu este validă.");
        }
        if (registerDto.Password.Length < MinPasswordLength)
        {
            return BadRequest($"Parola trebuie să aibă cel puțin {MinPasswordLength} caractere.");
        }
        if (await _userRepository.EmailExistsAsync(email))
        {
            return BadRequest("Există deja un cont cu acest email.");
        }

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password)
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        // Start the session right away so the new user lands on the dashboard
        // instead of being bounced back to the login form.
        await SignInAsync(user);
        return Ok(new { user.Id, user.Username, user.Email });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        var user = await _userRepository.GetByEmailAsync(loginDto.Email.Trim());
        if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
        {
            return Unauthorized("Email sau parolă greșită.");
        }

        await SignInAsync(user);
        return Ok(new { user.Id, user.Username, user.Email });
    }

    [HttpPost("demo")]
    public async Task<IActionResult> Demo()
    {
        var user = await _userRepository.GetByEmailAsync(DemoAccount.Email(_configuration));
        if (user == null)
        {
            return NotFound("Contul demo nu este disponibil.");
        }

        await SignInAsync(user);
        return Ok(new { user.Id, user.Username, user.Email });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var username = User.FindFirst(ClaimTypes.Name)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        return Ok(new { userId, username, email });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok("Te-ai deconectat.");
    }

    private Task SignInAsync(User user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Username)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    }
}
