using Connect.Api.Contracts;
using Connect.Api.Services;
using Microsoft.AspNetCore.SignalR;
using System.Runtime.CompilerServices;

namespace Connect.Api.Hubs;

public sealed class ChatHub(IChatOrchestrator orchestrator) : Hub
{
    public async Task<ChatResponse> Ask(string prompt, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(prompt) || prompt.Length > 20_000)
        {
            throw new HubException("Prompt must contain 1 to 20,000 characters.");
        }

        var answer = await orchestrator.GetResponseAsync(prompt, cancellationToken);
        return new ChatResponse(answer, orchestrator.Model);
    }

    public async IAsyncEnumerable<ChatStreamUpdate> Stream(
        string prompt,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(prompt) || prompt.Length > 20_000)
        {
            throw new HubException("Prompt must contain 1 to 20,000 characters.");
        }

        await foreach (var text in orchestrator.StreamResponseAsync(prompt, cancellationToken))
        {
            yield return new ChatStreamUpdate(text, orchestrator.Model);
        }
    }
}
