namespace Connect.Api.Contracts;

public sealed record ChatResponse(string Answer, string Model);

public sealed record ChatStreamUpdate(string Text, string Model);
