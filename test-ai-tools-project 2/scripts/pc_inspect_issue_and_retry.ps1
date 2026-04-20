param(
  [string]$issueKeyMatch = "GSTA-6"
)

$apiUrl = $env:PAPERCLIP_API_URL
$apiKey = $env:PAPERCLIP_API_KEY
$runId = $env:PAPERCLIP_RUN_ID
$companyId = $env:PAPERCLIP_COMPANY_ID

if ([string]::IsNullOrEmpty($apiUrl) -or [string]::IsNullOrEmpty($apiKey) -or [string]::IsNullOrEmpty($runId) -or [string]::IsNullOrEmpty($companyId)) {
  Write-Output "MISSING_ENV"
  exit 1
}

$headers = @{
  Authorization = "Bearer $apiKey"
  'X-Paperclip-Run-Id' = $runId
  'User-Agent' = 'gstack-cto'
}

Write-Output "Checking agents..."
$agentsUrl = "$apiUrl/api/companies/$companyId/agents"
try {
  $agentsResp = Invoke-RestMethod -Uri $agentsUrl -Headers $headers -Method Get -ErrorAction Stop
} catch {
  Write-Output "GET_AGENTS_FAILED: $($_.Exception.Message)"
  exit 1
}

Write-Output ("Agents returned: " + ($agentsResp | Measure-Object).Count)

Write-Output "Searching for parent issue matching key '$issueKeyMatch'..."
$issuesUrl = "$apiUrl/api/companies/$companyId/issues"
try {
  $issuesResp = Invoke-RestMethod -Uri $issuesUrl -Headers $headers -Method Get -ErrorAction Stop
} catch {
  Write-Output "GET_ISSUES_FAILED: $($_.Exception.Message)"
  exit 1
}

# Normalize issues list
if ($issuesResp -is [System.Collections.IEnumerable]) { $issueList = $issuesResp } elseif ($issuesResp.items) { $issueList = $issuesResp.items } else { $issueList = @($issuesResp) }

$parent = $issueList | Where-Object { ($_.title -and $_.title -like "*$issueKeyMatch*") -or ($_.key -and $_.key -eq $issueKeyMatch) } | Select-Object -First 1

if (-not $parent) {
  Write-Output "PARENT_NOT_FOUND"
  Write-Output "Available issues (top 20):"
  $issueList | Select-Object -First 20 | ForEach-Object { Write-Output ("- key:" + ($_.key) + " id:" + ($_.id) + " title:" + ($_.title)) }
  exit 1
}

Write-Output ("Found parent issue: id=" + $parent.id + " key=" + ($parent.key) + " title=" + $parent.title)

# Find agents for assignment
$staff = $agentsResp | Where-Object { $_.urlKey -eq 'staff-engineer' } | Select-Object -First 1
$release = $agentsResp | Where-Object { $_.urlKey -eq 'release-engineer' } | Select-Object -First 1
$qa = $agentsResp | Where-Object { $_.urlKey -eq 'qa-engineer' } | Select-Object -First 1

Write-Output ("Staff agent id: " + $staff.id)
Write-Output ("Release agent id: " + $release.id)
Write-Output ("QA agent id: " + $qa.id)

if (-not $staff -or -not $release -or -not $qa) {
  Write-Output "ONE_OR_MORE_AGENTS_MISSING"
  exit 1
}

# Prepare subtasks payloads
$subtasks = @(
  @{ title = 'Implement monorepo scaffold (frontend/backend/worker)'; description = "See docs/PHASE1_TASKS.md for deliverables and acceptance."; parentId = $parent.id; assigneeAgentId = $staff.id; status = 'todo'; priority = 'high' },
  @{ title = 'CI & infra skeleton (GitHub Actions + Terraform)'; description = "See docs/PHASE1_TASKS.md for deliverables and acceptance."; parentId = $parent.id; assigneeAgentId = $release.id; status = 'todo'; priority = 'high' },
  @{ title = 'E2E smoke tests & security checklist'; description = "See docs/PHASE1_TASKS.md for deliverables and acceptance."; parentId = $parent.id; assigneeAgentId = $qa.id; status = 'todo'; priority = 'high' }
)

foreach ($p in $subtasks) {
  $json = $p | ConvertTo-Json -Depth 8
  Write-Output "Posting subtask: $($p.title) -> payload: $json"
  try {
    $response = Invoke-WebRequest -Uri $issuesUrl -Method Post -Headers $headers -Body $json -ContentType 'application/json' -ErrorAction Stop
    $content = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    Write-Output "CREATED: " + ($content | ConvertTo-Json -Depth 5)
  } catch {
    $err = $_.Exception
    Write-Output "REQUEST_FAILED: $($err.Message)"
    if ($err.Response -ne $null) {
      try { $body = (New-Object System.IO.StreamReader($err.Response.GetResponseStream())).ReadToEnd(); Write-Output "RESPONSE_BODY: $body" } catch { Write-Output "FAILED_TO_READ_RESPONSE_BODY" }
    }
  }
}

Write-Output "DONE"
