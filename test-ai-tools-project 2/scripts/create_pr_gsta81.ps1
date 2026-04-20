$owner = 'AI-LLM-World'
$repo = 'AI-Tools-Library'
$branch = 'gsta-81/ci-infra-skeleton'

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
  title = 'GSTA-81: CI & infra skeleton (GitHub Actions + Terraform)'
  head  = $branch
  base  = 'main'
  body  = 'Adds a minimal GitHub Actions CI workflow and a placeholder Terraform skeleton for Phase 1. This PR intentionally contains minimal infra so the team can iterate on provider and remote state choices.'
}

$json = $bodyObj | ConvertTo-Json -Depth 6

try {
  $resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pulls" -Method Post -Headers $headers -Body $json -ContentType 'application/json' -ErrorAction Stop
  Write-Output "PR_CREATED:$($resp.html_url)"
} catch {
  Write-Output "PR_CREATE_FAILED:$($_.Exception.Message)"
  exit 1
}
