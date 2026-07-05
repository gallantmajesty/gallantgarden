$projectRoot = "C:\Users\taksh\studyforest"
$allFiles = Get-Content "$projectRoot\all_files.txt"
$allSet = @{}
foreach ($f in $allFiles) { $allSet[$f] = $true }

$queue = New-Object System.Collections.Queue
$reachable = @{}

$entries = @(
    "$projectRoot\index.html"
    "$projectRoot\src\main.tsx"
    "$projectRoot\src\App.tsx"
)
foreach ($e in $entries) { if (Test-Path $e) { $queue.Enqueue($e) } }

function Resolve-Specifier($spec, $importingFile, $allSet, $projectRoot) {
    if ($spec -match '^[a-z0-9]+://' -or $spec -match '^data:') { return $null }
    if ($spec -notmatch '^\.\.?/' -and $spec -notmatch '^/') { return $null }
    $importDir = [System.IO.Path]::GetDirectoryName($importingFile)
    if ($spec.StartsWith('/')) {
        $candidate = Join-Path $projectRoot $spec.TrimStart('/')
    } else {
        $candidate = Join-Path $importDir $spec
    }
    try { $resolvedPath = [System.IO.Path]::GetFullPath($candidate) } catch { return $null }
    if ($allSet.ContainsKey($resolvedPath)) { return $resolvedPath }
    $extensions = @('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css')
    foreach ($ext in $extensions) {
        $candidateExt = $resolvedPath + $ext
        if ($allSet.ContainsKey($candidateExt)) { return $candidateExt }
    }
    if (Test-Path $resolvedPath -PathType Container) {
        foreach ($index in @('index.ts','index.tsx','index.js','index.jsx','index.mjs','index.cjs','index.json')) {
            $candidateIndex = Join-Path $resolvedPath $index
            if ($allSet.ContainsKey($candidateIndex)) { return $candidateIndex }
        }
    }
    return $null
}

function Resolve-Url($url, $baseFile, $allSet, $projectRoot) {
    if ($url -match '^[a-z0-9]+://' -or $url -match '^data:') { return $null }
    $baseDir = [System.IO.Path]::GetDirectoryName($baseFile)
    if ($url.StartsWith('/')) {
        # try both directly under projectRoot and under public/
        $candidate1 = Join-Path $projectRoot $url.TrimStart('/')
        try { $resolved1 = [System.IO.Path]::GetFullPath($candidate1) } catch { $resolved1 = $null }
        if ($resolved1 -and $allSet.ContainsKey($resolved1)) { return $resolved1 }
        $publicDir = Join-Path $projectRoot "public"
        $candidate2 = Join-Path $publicDir $url.TrimStart('/')
        try { $resolved2 = [System.IO.Path]::GetFullPath($candidate2) } catch { $resolved2 = $null }
        if ($resolved2 -and $allSet.ContainsKey($resolved2)) { return $resolved2 }
        return $null
    } else {
        $candidate = Join-Path $baseDir $url
        try { $resolvedPath = [System.IO.Path]::GetFullPath($candidate) } catch { return $null }
        if ($allSet.ContainsKey($resolvedPath)) { return $resolvedPath }
        return $null
    }
}

$codeExt = @('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs')
$cssExt = @('.css')
$htmlExt = @('.html')

while ($queue.Count -gt 0) {
    $file = $queue.Dequeue()
    if ($reachable.ContainsKey($file)) { continue }
    if (-not $allSet.ContainsKey($file)) { continue }
    $reachable[$file] = $true
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    try {
        $content = Get-Content $file -Raw -ErrorAction Stop
    } catch {
        Write-Warning "Cannot read $file"
        continue
    }
    if ($codeExt -contains $ext) {
        $imports = @()
        $staticPattern = "import\s+(?:type\s+)?(?:[^'`"<>]*\s+from\s+)?['`"]([^'`"]+)['`"]"
        $staticMatches = [regex]::Matches($content, $staticPattern)
        foreach ($m in $staticMatches) { $imports += $m.Groups[1].Value }
        $dynamicPattern = "import\s*\(\s*['`"]([^'`"]+)['`"]"
        $dynamicMatches = [regex]::Matches($content, $dynamicPattern)
        foreach ($m in $dynamicMatches) { $imports += $m.Groups[1].Value }
        $requirePattern = "require\s*\(\s*['`"]([^'`"]+)['`"]"
        $requireMatches = [regex]::Matches($content, $requirePattern)
        foreach ($m in $requireMatches) { $imports += $m.Groups[1].Value }
        foreach ($spec in $imports) {
            $resolved = Resolve-Specifier $spec $file $allSet $projectRoot
            if ($resolved -and -not $reachable.ContainsKey($resolved)) {
                $queue.Enqueue($resolved)
            }
        }
    } elseif ($cssExt -contains $ext) {
        $urlPattern = "url\(\s*['`"]?([^'`"\)]+)['`"]?\s*\)"
        $urlMatches = [regex]::Matches($content, $urlPattern)
        foreach ($m in $urlMatches) {
            $url = $m.Groups[1].Value
            $resolved = Resolve-Url $url $file $allSet $projectRoot
            if ($resolved -and -not $reachable.ContainsKey($resolved)) {
                $queue.Enqueue($resolved)
            }
        }
        $importPattern = "@import\s+(?:url\()?['`"]?([^'`"\)]+)['`"]?\)?"
        $importMatches = [regex]::Matches($content, $importPattern)
        foreach ($m in $importMatches) {
            $url = $m.Groups[1].Value
            $resolved = Resolve-Url $url $file $allSet $projectRoot
            if ($resolved -and -not $reachable.ContainsKey($resolved)) {
                $queue.Enqueue($resolved)
            }
        }
    } elseif ($htmlExt -contains $ext) {
        $tagPattern = "<(script|link|img|source|video|audio)\s+[^>]*(?:src|href)\s*=\s*['`"]([^'`"]+)['`"]"
        $tagMatches = [regex]::Matches($content, $tagPattern, 'IgnoreCase')
        foreach ($m in $tagMatches) {
            $url = $m.Groups[2].Value
            $resolved = Resolve-Url $url $file $allSet $projectRoot
            if ($resolved -and -not $reachable.ContainsKey($resolved)) {
                $queue.Enqueue($resolved)
            }
        }
    }
}

$reachable.Keys | Sort-Object | Out-File "$projectRoot\reachable_files.txt"
$unreachable = @()
foreach ($f in $allFiles) {
    if (-not $reachable.ContainsKey($f)) {
        $unreachable += $f }
}
$unreachable | Sort-Object | Out-File "$projectRoot\unreachable_files.txt"
$total = $allFiles.Count
$reachCount = $reachable.Count
$unreachCount = $unreachable.Count
Write-Output "Total: $total, Reachable: $reachCount, Unreachable: $unreachCount"
