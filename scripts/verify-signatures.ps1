<#
.SYNOPSIS
    Ap Desktop - Code Signature Verification Utility
#>

param(
    [string]$TargetDir = "$PSScriptRoot\..\release"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Ap Desktop - Release Binary Signature Verification     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$Executables = Get-ChildItem -Path $TargetDir -Recurse -Filter "*.exe" -ErrorAction SilentlyContinue

if ($Executables.Count -eq 0) {
    Write-Warning "No executables found in $TargetDir."
    exit 0
}

$Results = @()
foreach ($exe in $Executables) {
    $sig = Get-AuthenticodeSignature $exe.FullName
    $relPath = $exe.FullName.Replace((Resolve-Path "$PSScriptRoot\..").Path, "").TrimStart("\")
    
    $Results += [PSCustomObject]@{
        File = $exe.Name
        Path = $relPath
        Status = $sig.Status
        Signer = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { "Unsigned" }
        Thumbprint = if ($sig.SignerCertificate) { $sig.SignerCertificate.Thumbprint } else { "N/A" }
        SizeMB = [math]::Round($exe.Length / 1MB, 2)
    }
}

$Results | Format-Table -AutoSize
Write-Host "Verification complete. Total binaries checked: $($Executables.Count)" -ForegroundColor Green
