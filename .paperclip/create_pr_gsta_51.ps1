# Helper to create PR for GSTA-51 without embedding secrets
$body = @{ 
    title = 'chore(ci): add CI smoke tests for tools API and admin endpoints (GSTA-51)';
    head = 'release/gsta-51/ci-smoke-tests';
    base = 'main';
    body = 'Adds pytest smoke tests for the tools API and admin endpoints and a CI workflow to run them. Tests are skipped unless SMOKE_API_BASE is set in CI.'
} | ConvertTo-Json -Compress
$token = $env:GITHUB_TOKEN
if (-not $token) { $token = $env:GH_TOKEN }
$uri = 'https://api.github.com/repos/AI-LLM-World/AI-Tools-Library/pulls'
Invoke-RestMethod -Uri $uri -Method Post -Headers @{ Authorization = "token $token"; 'User-Agent' = 'paperclip-agent' } -Body $body -ContentType 'application/json'
