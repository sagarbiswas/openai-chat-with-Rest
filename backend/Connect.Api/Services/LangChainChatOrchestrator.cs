using LangChain.Chains;
using Microsoft.Extensions.AI;
using OpenAI;
using System.Runtime.CompilerServices;
using static LangChain.Chains.Chain;

namespace Connect.Api.Services;

public sealed class LangChainChatOrchestrator : IChatOrchestrator
{
    private readonly IChatClient _chatClient;

    public LangChainChatOrchestrator(string apiKey, string model)
    {
        Model = model;
        _chatClient = new OpenAIClient(apiKey)
            .GetChatClient(model)
            .AsIChatClient();
    }

    public string Model { get; }

    public async Task<string> GetResponseAsync(string prompt, CancellationToken cancellationToken)
    {
        var chain = Set(prompt, "input")
            | Template(
                "You are a helpful assistant. Answer the user's request clearly and accurately.\n\nUser: {input}",
                outputKey: "text")
            | LLM(_chatClient, inputKey: "text", outputKey: "text");

        return await chain.RunAsync("text", cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("The LLM orchestrator returned no response.");
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(
        string prompt,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var messages = new[]
        {
            new ChatMessage(ChatRole.System, "You are a helpful assistant. Answer clearly and accurately."),
            new ChatMessage(ChatRole.User, prompt)
        };

        await foreach (var update in _chatClient
            .GetStreamingResponseAsync(messages, cancellationToken: cancellationToken)
            .WithCancellation(cancellationToken))
        {
            if (!string.IsNullOrEmpty(update.Text))
            {
                yield return update.Text;
            }
        }
    }
}
