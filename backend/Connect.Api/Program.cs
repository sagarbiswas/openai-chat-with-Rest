using Connect.Api.Contracts;
using Connect.Api.Hubs;
using Connect.Api.Mcp;
using Connect.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY")
    ?? builder.Configuration["OpenAI:ApiKey"];

if (string.IsNullOrWhiteSpace(apiKey))
{
    throw new InvalidOperationException(
        "Configure OpenAI:ApiKey or set the OPENAI_API_KEY environment variable.");
}

var model = Environment.GetEnvironmentVariable("OPENAI_MODEL")
    ?? builder.Configuration["OpenAI:Model"]
    ?? "gpt-5.4-mini";

builder.Services.AddSingleton<IChatOrchestrator>(
    new LangChainChatOrchestrator(apiKey, model));
builder.Services.AddSignalR();
/*builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});*/

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
builder.Services.AddMcpServer()
    .WithHttpTransport()
    .WithTools<ConnectTools>();

var app = builder.Build();

app.UseCors("Frontend");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/chat", async (
    ChatRequest request,
    IChatOrchestrator orchestrator,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Prompt) || request.Prompt.Length > 20_000)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["prompt"] = ["Prompt must contain 1 to 20,000 characters."]
        });
    }

    var answer = await orchestrator.GetResponseAsync(request.Prompt, cancellationToken);
    return Results.Ok(new ChatResponse(answer, orchestrator.Model));
});

app.MapHub<ChatHub>("/hubs/chat");
app.MapMcp("/mcp");

app.Run();
