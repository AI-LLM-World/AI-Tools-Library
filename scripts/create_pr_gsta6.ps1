$owner = 'AI-LLM-World'
$repo = 'AI-Tools-Library'
$branch = 'gsta6/phase1-scaffold'

$token = $env:GITHUB_TOKEN
if (-not $token) {
  Write-Output "NO_GITHUB_TOKEN"
  exit 0
}

$headers = @{
  Authorization = "Bearer $token"
  'User-Agent'  = 'gstack-cto'
}

$checkUrl = "https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${branch}"
try {
  $existing = Invoke-RestMethod -Uri $checkUrl -Headers $headers -Method Get -ErrorAction Stop
} catch {
  $existing = @()
}

if ($existing -and $existing.Count -gt 0) {
  Write-Output "PR_EXISTS:$($existing[0].html_url)"
  exit 0
}

$bodyObj = @{
  title = 'GSTA-6: Phase 1 scaffold & architecture docs'
  head  = $branch
  base  = 'main'
  body  = 'Adds architecture docs and a minimal monorepo scaffold for GSTA-6 Phase 1. Deliverables: docs/ARCHITECTURE.md, docs/PHASE1_TASKS.md, packages/frontend, packages/backend, packages/worker, docker-compose.yml, CI skeleton.'
}

$json = $bodyObj | ConvertTo-Json -Depth 6

try {
  $resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pulls" -Method Post -Headers $headers -Body $json -ContentType 'application/json' -ErrorAction Stop
  Write-Output "PR_CREATED:$($resp.html_url)"
} catch {
  Write-Output "PR_CREATE_FAILED:$($_.Exception.Message)"
  exit 1
}
