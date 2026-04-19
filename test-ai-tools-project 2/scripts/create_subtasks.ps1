param(
  [string]$issueParentId = "GSTA-6"
)

$apiUrl = $env:PAPERCLIP_API_URL
$apiKey = $env:PAPERCLIP_API_KEY
$runId = $env:PAPERCLIP_RUN_ID
$companyId = $env:PAPERCLIP_COMPANY_ID

if ([string]::IsNullOrEmpty($apiUrl) -or [string]::IsNullOrEmpty($apiKey) -or [string]::IsNullOrEmpty($runId) -or [string]::IsNullOrEmpty($companyId)) {
  Write-Output "MISSING_ENV"
  Write-Output "PAPERCLIP_API_URL=$apiUrl"
  Write-Output "PAPERCLIP_API_KEY_PRESENT=$([string]::IsNullOrEmpty($apiKey) -eq $false)"
  Write-Output "PAPERCLIP_RUN_ID=$runId"
  Write-Output "PAPERCLIP_COMPANY_ID=$companyId"
  exit 1
}

$headers = @{
  Authorization = "Bearer $apiKey"
  'X-Paperclip-Run-Id' = $runId
  Accept = 'application/json'
}

$agentsUrl = "$apiUrl/api/companies/$companyId/agents"
try {
  $agentsResp = Invoke-RestMethod -Uri $agentsUrl -Headers $headers -Method Get -ErrorAction Stop
  if ($null -eq $agentsResp) { $agentList = @() } elseif ($agentsResp -is [System.Collections.IEnumerable]) { $agentList = $agentsResp } elseif ($agentsResp.items) { $agentList = $agentsResp.items } else { $agentList = @($agentsResp) }
} catch {
  Write-Output "GET_AGENTS_FAILED: $($_.Exception.Message)"
  exit 1
}

Write-Output ("Found agents count: " + ($agentList.Count))

$staff = $agentList | Where-Object { $_.urlKey -eq "staff-engineer" } | Select-Object -First 1
$release = $agentList | Where-Object { $_.urlKey -eq "release-engineer" } | Select-Object -First 1
$qa = $agentList | Where-Object { $_.urlKey -eq "qa-engineer" } | Select-Object -First 1

if (-not $staff -or -not $release -or -not $qa) {
  Write-Output "AGENTS_MISSING"
  Write-Output "Available urlKeys:"
  $agentList | ForEach-Object { Write-Output $_.urlKey }
  exit 1
}

$issuesUrl = "$apiUrl/api/companies/$companyId/issues"

$subtasks = @()

$subtasks += @{
  title = "Implement monorepo scaffold (frontend/backend/worker)"
  description = @"
Deliverables:
- packages/frontend: React + Vite + TypeScript minimal app
- packages/backend: Node + Express + TypeScript minimal API with /health and /api/hello
- packages/worker: bare worker that can connect to Redis
- dev scripts: npm/yarn workspace commands or simple makefile to start everything

Acceptance:
- developer runs `npm run dev` (or `make dev`) and reaches frontend at http://localhost:5173 and backend /health returns 200
- ESLint/Prettier configured and pre-commit hook present
"@
  parentId = $issueParentId
  assigneeAgentId = $staff.id
  status = "todo"
  priority = "high"
}

$subtasks += @{
  title = "CI & infra skeleton (GitHub Actions + Terraform)"
  description = @"
Deliverables:
- GitHub Actions workflow with lint -> test -> build -> docker build (push disabled behind secret)
- Terraform skeleton with provider config, remote state backend example, and module stubs for RDS and Redis

Acceptance:
- `terraform init` works and plan shows resources to create
- CI runs lint and unit-test steps on PRs
"@
  parentId = $issueParentId
  assigneeAgentId = $release.id
  status = "todo"
  priority = "high"
}

$subtasks += @{
  title = "E2E smoke tests & security checklist"
  description = @"
Deliverables:
- Playwright smoke test that hits frontend and backend path
- docs/SECURITY.md with dependency scanning step in CI

Acceptance:
- smoke test runs locally and passes against staging
- CI includes dependency scanning stage
"@
  parentId = $issueParentId
  assigneeAgentId = $qa.id
  status = "todo"
  priority = "high"
}

foreach ($st in $subtasks) {
  $json = $st | ConvertTo-Json -Depth 10
  try {
    $resp = Invoke-RestMethod -Uri $issuesUrl -Method Post -Headers $headers -Body $json -ContentType "application/json" -ErrorAction Stop
    Write-Output ("CREATED_ISSUE:" + ($resp | ConvertTo-Json -Depth 5))
  } catch {
    Write-Output "CREATE_ISSUE_FAILED: $($_.Exception.Message)"
  }
}

Write-Output "SUBTASKS_CREATION_DONE"
