# PowerShell script to update purple/violet colors to dark purple throughout the app

$files = Get-ChildItem -Path . -Include "*.tsx","*.ts","*.css" -Recurse -File | Where-Object { $_.DirectoryName -notmatch "node_modules|\.next|\.git" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    # Update violet colors to dark purple
    $content = $content -replace 'violet-50', 'purple-50'
    $content = $content -replace 'violet-100', 'purple-100'
    $content = $content -replace 'violet-200', 'purple-200'
    $content = $content -replace 'violet-300', 'purple-300'
    $content = $content -replace 'violet-400', 'purple-500'
    $content = $content -replace 'violet-500', 'purple-600'
    $content = $content -replace 'violet-600', 'purple-700'
    $content = $content -replace 'violet-700', 'purple-800'
    $content = $content -replace 'violet-800', 'purple-900'
    $content = $content -replace 'violet-900', 'purple-950'
    $content = $content -replace 'violet-950', 'purple-950'

    # Update light purple to darker shades
    $content = $content -replace 'from-purple-50', 'from-purple-100'
    $content = $content -replace 'to-purple-50', 'to-purple-100'
    $content = $content -replace 'from-purple-100', 'from-purple-200'
    $content = $content -replace 'to-purple-100', 'to-purple-200'

    # Update hover states to be darker
    $content = $content -replace 'hover:bg-violet-100', 'hover:bg-purple-200'
    $content = $content -replace 'hover:bg-violet-50', 'hover:bg-purple-100'
    $content = $content -replace 'hover:border-violet-200', 'hover:border-purple-300'
    $content = $content -replace 'hover:text-violet-600', 'hover:text-purple-700'

    # Update gradient colors
    $content = $content -replace 'from-violet-', 'from-purple-'
    $content = $content -replace 'to-violet-', 'to-purple-'
    $content = $content -replace 'via-violet-', 'via-purple-'

    # Only write if content changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "Color update complete!" -ForegroundColor Cyan