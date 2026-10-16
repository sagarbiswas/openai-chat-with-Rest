# Connect AI

This workspace contains a React client backed by a layered ASP.NET Core service.

## Architecture

- `frontend/` — React + TypeScript UI. Users can send chat requests over REST or SignalR WebSockets.
- `backend/Connect.Api/` — ASP.NET Core `net10.0` backend.
- `Services/LangChainChatOrchestrator` — creates a LangChain prompt/model chain using the configured OpenAI chat model.
- `Hubs/ChatHub` — SignalR request/response chat over WebSockets.
- `Mcp/ConnectTools` — MCP tools exposed over Streamable HTTP.

## Run locally

Requires .NET 10 SDK and Node.js 20.19+.

In one PowerShell terminal, configure the API key and start the backend:

```powershell
$env:OPENAI_API_KEY = "your-api-key"
dotnet run --project backend\Connect.Api\Connect.Api.csproj -- --urls https://localhost:44398
```

If the browser reports an untrusted HTTPS certificate, trust the .NET development certificate with `dotnet dev-certs https --trust`.

The service reads its defaults from `backend/Connect.Api/appsettings.json`:

```json
{
  "OpenAI": {
    "ApiKey": "YOUR API KEY HERE",
    "Model": "gpt-5.4-mini"
  }
}
```

For local use, replace the placeholder with your key or set `OPENAI_API_KEY`. Environment variables take precedence over the file. Never commit a real API key. The model defaults to `gpt-5.4-mini`; override it with `OPENAI_MODEL` or the `OpenAI:Model` configuration value. `OPENAI_MODEL` takes precedence over the model in `appsettings.json`.

## Configure API credentials in GitHub

For a GitHub Actions workflow:

1. Open the repository on GitHub and go to **Settings → Secrets and variables → Actions**.
2. Under **Secrets**, choose **New repository secret** and add `OPENAI_API_KEY` with your actual OpenAI API key as its value. Do not put the key in the README, source files, or a workflow YAML literal.
3. Under **Variables**, choose **New repository variable** and add `OPENAI_MODEL` with `gpt-5.4-mini` as its value. The model name is configuration, not a secret.
4. Make the values available to the workflow job or step that starts the backend:

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  OPENAI_MODEL: ${{ vars.OPENAI_MODEL }}
```

For production deployments, configure these as environment settings/secrets on the hosting service as well. GitHub Actions job environment values are only available to that workflow job; deployment platforms must receive them through their deployment configuration. The checked-in `appsettings.json` contains placeholders/defaults only and should never contain a real API key.

In another terminal:

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The frontend sends REST and SignalR requests to `https://localhost:44398` by default. Set `VITE_API_BASE_URL` if the backend uses a different origin.

## Start and debug in VS Code

1. Open this project root in VS Code and install the **C#** extension (`ms-dotnettools.csharp`) if it is not already installed.
2. Set `OPENAI_API_KEY` in the environment that starts VS Code. Do not add the key to `launch.json`.
3. Press `F5`, then choose **Connect AI: Full Stack**. VS Code builds and launches the API, starts Vite, and opens the React app in Chrome. Set breakpoints in `backend/Connect.Api/` or `frontend/src/`.

For terminal startup instead, run the backend and frontend commands above in separate terminals. `GET https://localhost:44398/health` confirms that the backend is running.

## Backend endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Backend liveness check |
| `POST /api/chat` | REST chat; JSON body `{ "prompt": "..." }`, response `{ "answer": "...", "model": "..." }` |
| `/hubs/chat` | SignalR hub using WebSockets; stream `Stream(prompt)` token updates, or invoke `Ask(prompt)` for a complete response |
| `/mcp` | MCP Streamable HTTP server exposing `get_utc_time` and `echo` tools |

Chat prompts must contain 1–20,000 characters. The OpenAI API key stays on the backend and is never sent to the browser.

The sample endpoints do not include user authentication or authorization. Keep the service on a trusted local network until an appropriate identity and access-control policy is added.
