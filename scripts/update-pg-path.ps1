# Update PATH to use PostgreSQL 18 instead of 16
# Run this script after installing PostgreSQL 18

$pg18Path = "C:\Program Files\PostgreSQL\18\bin"
$pg16Path = "C:\Program Files\PostgreSQL\16\bin"

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Remove PostgreSQL 16 from PATH if it exists
$newPath = $currentPath -replace [regex]::Escape($pg16Path + ";"), ""
$newPath = $newPath -replace [regex]::Escape(";" + $pg16Path), ""
$newPath = $newPath -replace [regex]::Escape($pg16Path), ""

# Add PostgreSQL 18 to the beginning of PATH if not already there
if ($newPath -notlike "*$pg18Path*") {
    $newPath = "$pg18Path;$newPath"
}

# Set the updated PATH
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")

Write-Host "PATH updated successfully!" -ForegroundColor Green
Write-Host "Please restart your terminal or VS Code for changes to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "Current PATH:" -ForegroundColor Cyan
Write-Host $newPath
