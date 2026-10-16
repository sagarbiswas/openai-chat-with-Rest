namespace Connect.Api.Services;

public interface IChatOrchestrator
{
    string Model { get; }

    Task<string> GetResponseAsync(string prompt, CancellationToken cancellationToken);

    IAsyncEnumerable<string> StreamResponseAsync(string prompt, CancellationToken cancellationToken);
}
