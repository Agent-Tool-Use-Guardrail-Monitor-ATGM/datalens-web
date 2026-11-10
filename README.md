# DataLens Web

DataLens is the frontend application for the **Agent Tool-Use Guardrail Monitor (ATGM)** project. It provides the user interface for the platform, with a foundation for future authentication, dataset management, and agent-run monitoring.

## Tech Stack

- React 19
- TypeScript
- Vite
- Vitest
- React Testing Library
- Oxlint

## Getting Started

### Prerequisites

- Node.js compatible with Vite 8
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Agent-Tool-Use-Guardrail-Monitor-ATGM/datalens-web.git
cd datalens-web
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, you can use:

```powershell
Copy-Item .env.example .env.local
```

The example configuration is:

```env
VITE_USE_MOCK_DATA=false
```

To enable the development status previews, change it to:

```env
VITE_USE_MOCK_DATA=true
```

Mock mode is restricted to development builds. The setting does not enable mock data in production.

**Note:** The current mock functionality controls UI status previews only. It does not simulate backend API responses.

Local environment files such as `.env.local` are excluded from Git.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL printed in the terminal, usually:

```text
http://localhost:5173/
```

## Development Status Previews

When mock mode is enabled, the following UI states can be previewed using URL query parameters:

| URL parameter | Preview |
|---|---|
| `?status=loading` | Loading screen |
| `?status=signed-out` | Signed-out screen |
| `?status=access-denied` | Access-denied screen |
| `?status=unavailable` | Service-unavailable screen |

For example:

```text
http://localhost:5173/?status=loading
```

These previews are intended for local development and testing.

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Runs TypeScript checks and builds the production application |
| `npm run lint` | Runs Oxlint |
| `npm test` | Runs the test suite once |
| `npm run test:watch` | Runs tests in watch mode |
| `npm run preview` | Previews the production build locally |

## API Client

The frontend includes a shared typed HTTP client in `src/api/client.ts`.

Current client behavior includes:

- Relative API request URLs.
- Same-origin credentials.
- Disabled browser caching for requests.
- JSON request handling.
- Structured backend error handling.
- Request ID propagation through API errors.
- Network error handling.

The frontend uses a shared error envelope:

```json
{
  "code": "ERROR_CODE",
  "message": "Description of the error",
  "request_id": "request-id",
  "details": {}
}
```

Actual backend integration will follow the API contracts agreed with the backend team.

## Testing and Quality Checks

Before submitting changes, run:

```bash
npm test
npm run lint
npm run build
```

The project also includes a GitHub Actions workflow for automated checks on pull requests.

## Project Structure

```text
src/
├── api/
│   ├── client.ts
│   └── client.test.ts
├── App.tsx
├── App.css
├── AppStatus.tsx
├── AppStatus.test.tsx
├── config.ts
├── config.test.ts
└── ...
```

## Development Notes

- Keep API communication inside the shared API client.
- Do not store authentication tokens in browser local storage or session storage.
- Do not commit local environment files or secrets.
- Mock functionality must remain explicitly enabled for development and testing only.
- Follow the agreed backend API contracts when implementing real integration.
