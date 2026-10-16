using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Connect.Api.Mcp;

[McpServerToolType]
public sealed class ConnectTools
{
    [McpServerTool(Name = "get_utc_time"), Description("Returns the current UTC time in ISO 8601 format.")]
    public static string GetUtcTime() => DateTimeOffset.UtcNow.ToString("O");

    [McpServerTool(Name = "echo"), Description("Returns the supplied text unchanged.")]
    public static string Echo([Description("Text to return")] string text) => text;
}
