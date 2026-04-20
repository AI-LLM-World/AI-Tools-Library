param()

$owner = 'AI-LLM-World'
$repo = 'AI-Tools-Library'

$token = $env:GITHUB_TOKEN
if (-not $token) {
  Write-Output "NO_GITHUB_TOKEN"
  exit 1
}

$ghHeaders = @{
  Authorization = "Bearer $token"
  Accept = 'application/vnd.github+json'
  'User-Agent' = 'gstack-cto'
}

function Get-PR($num) {
  try {
    return Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pulls/$num" -Headers $ghHeaders -Method Get -ErrorAction Stop
  } catch {
    $msg = $_.Exception.Message -replace '"','\"'
    Write-Output ("GET_PR_FAILED:$num:" + $msg)
    return $null
  }
}

function Merge-PR($num) {
  $pr = Get-PR $num
  if (-not $pr) { Write-Output "Cannot fetch PR $num"; return $false }
  if ($pr.state -ne 'open') { Write-Output "PR $num not open (state=$($pr.state))"; return $false }
  $tries = 0
  while ($null -eq $pr.mergeable -and $tries -lt 10) {
    Start-Sleep -Seconds 2
    $pr = Get-PR $num
    $tries++
  }
  Write-Output "PR $num mergeable = $($pr.mergeable) mergeable_state=$($pr.mergeable_state)"
  if ($pr.mergeable -ne $true) { Write-Output "PR $num not mergeable; cannot merge automatically"; return $false }
  $commitTitle = "Merge PR #$num: " + ($pr.title -replace '"','\"')
  $body = @{ commit_title = $commitTitle; merge_method = "merge" } | ConvertTo-Json
  try {
    $resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pulls/$num/merge" -Method Put -Headers $ghHeaders -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Output ("MERGED:$num:" + $resp.html_url)
    return $true
  } catch {
    $m = $_.Exception.Message -replace '"','\"'
    Write-Output ("MERGE_FAILED:$num:" + $m)
    return $false
  }
}

function Close-PR($num) {
  $pr = Get-PR $num
  if (-not $pr) { Write-Output "Cannot fetch PR $num"; return $false }
  if ($pr.state -ne 'open') { Write-Output "PR $num not open (state=$($pr.state))"; return $false }
  $body = @{ state = 'closed' } | ConvertTo-Json
  try {
    $resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pulls/$num" -Method Patch -Headers $ghHeaders -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Output ("CLOSED:$num")
    return $true
  } catch {
    $m = $_.Exception.Message -replace '"','\"'
    Write-Output ("CLOSE_FAILED:$num:" + $m)
    return $false
  }
}

# Sequence: merge PR 1, close PR 3, merge PR 2
$ops = @(
  @{ num = 1; action = 'merge' },
  @{ num = 3; action = 'close' },
  @{ num = 2; action = 'merge' }
)

$results = @{}
foreach ($op in $ops) {
  $n = $op.num
  $a = $op.action
  if ($a -eq 'merge') {
    Write-Output "Attempting to merge PR #$n..."
    $ok = Merge-PR $n
    $results["pr$n"] = @{ action = 'merge'; success = $ok }
    if (-not $ok) { Write-Output "Stopping sequence due to failure on PR #$n"; break }
  } elseif ($a -eq 'close') {
    Write-Output "Attempting to close PR #$n..."
    $ok = Close-PR $n
    $results["pr$n"] = @{ action = 'close'; success = $ok }
    if (-not $ok) { Write-Output "Warning: failed to close PR #$n; continuing" }
  }
}

Write-Output "GitHub operations complete. Summary:"; $results | ConvertTo-Json -Depth 5 | Write-Output

# If PR #2 was merged, update Paperclip issue GSTA-6 to done
if ($results.pr2 -and $results.pr2.success) {
  $pcApi = $env:PAPERCLIP_API_URL
  $pcKey = $env:PAPERCLIP_API_KEY
  $pcRunId = $env:PAPERCLIP_RUN_ID
  $pcCompany = $env:PAPERCLIP_COMPANY_ID
  if (-not ($pcApi -and $pcKey -and $pcRunId -and $pcCompany)) {
    Write-Output "Paperclip creds not fully present; cannot update issue status"
    exit 0
  }
  $pcHeaders = @{ Authorization = "Bearer $pcKey"; 'X-Paperclip-Run-Id' = $pcRunId; Accept = 'application/json' }

  # Find the parent issue by title
  try {
    $issues = Invoke-RestMethod -Uri "$pcApi/api/companies/$pcCompany/issues" -Method Get -Headers $pcHeaders -ErrorAction Stop
  } catch {
    Write-Output "Failed to list Paperclip issues: $($_.Exception.Message)"
    exit 0
  }
  $issueList = @()
  if ($issues -is [System.Collections.IEnumerable]) { $issueList = $issues } elseif ($issues.items) { $issueList = $issues.items } else { $issueList = @($issues) }
  $parent = $issueList | Where-Object { ($_.title -and $_.title -eq 'Phase 1: Project setup & architecture') -or ($_.key -and $_.key -eq 'GSTA-6') } | Select-Object -First 1
  if (-not $parent) { Write-Output "Parent issue GSTA-6 not found in Paperclip; cannot update status"; exit 0 }

  # Add a comment about merges
  $commentBody = @{ body = "Automated update: Merged PRs per board instruction. PRs 1 and 2 merged, PR 3 closed. Marking GSTA-6 done." } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri "$pcApi/api/issues/$($parent.id)/comments" -Method Post -Headers $pcHeaders -Body $commentBody -ContentType 'application/json' -ErrorAction Stop
    Write-Output "Posted Paperclip comment on issue $($parent.id)"
  } catch {
    Write-Output "Failed to post comment: $($_.Exception.Message)"
  }

  # Patch issue status to done
  $patchBody = @{ status = 'done' } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri "$pcApi/api/issues/$($parent.id)" -Method Patch -Headers $pcHeaders -Body $patchBody -ContentType 'application/json' -ErrorAction Stop
    Write-Output "Patched Paperclip issue $($parent.id) to done"
  } catch {
    Write-Output "Failed to patch issue status: $($_.Exception.Message)"
  }
}

Write-Output "Script finished"
