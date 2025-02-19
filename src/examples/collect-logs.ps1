# Use $PSScriptRoot if available (script location), else fallback to current location
$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) { $scriptRoot = Get-Location }

# Get hostname for naming the output folder
$hostName = $env:COMPUTERNAME
$BaseOutputFolder = Join-Path -Path $scriptRoot -ChildPath $hostName

# Create the base output folder if it doesn't exist
if (!(Test-Path $BaseOutputFolder)) {
    New-Item -ItemType Directory -Path $BaseOutputFolder | Out-Null
}

# Define the path for the standard diagnostic zip file
$StandardDiagZip = Join-Path -Path $BaseOutputFolder -ChildPath "MDMDiagReport.zip"

# Step 1: Run MDMDiagnosticTool to collect standard diagnostics
$DiagCmd = "mdmdiagnosticstool.exe -area 'DeviceEnrollment;DeviceProvisioning;Autopilot' -zip `"$StandardDiagZip`""
Write-Output "Running MDMDiagnosticTool..."
Invoke-Expression $DiagCmd

# Wait for the diagnostic tool to complete (adjust time as needed)
Start-Sleep -Seconds 30

# Step 2: Extract the standard diagnostics
$StandardDiagnosticsFolder = Join-Path -Path $BaseOutputFolder -ChildPath "StandardDiagnostics"
if (Test-Path $StandardDiagnosticsFolder) { Remove-Item $StandardDiagnosticsFolder -Recurse -Force }
New-Item -ItemType Directory -Path $StandardDiagnosticsFolder | Out-Null

Write-Output "Extracting MDMDiagReport.zip to $StandardDiagnosticsFolder..."
Expand-Archive -Path $StandardDiagZip -DestinationPath $StandardDiagnosticsFolder -Force

# Optionally remove the zip file after extraction
Remove-Item $StandardDiagZip -Force

# Step 3: Create AdditionalLogs folder
$AdditionalLogsFolder = Join-Path -Path $BaseOutputFolder -ChildPath "AdditionalLogs"
if (Test-Path $AdditionalLogsFolder) { Remove-Item $AdditionalLogsFolder -Recurse -Force }
New-Item -ItemType Directory -Path $AdditionalLogsFolder | Out-Null

# Copy the Egis logs
$EgisSource = "C:\ProgramData\Egis"
$EgisDest = Join-Path -Path $AdditionalLogsFolder -ChildPath "Egis"
Write-Output "Copying Egis logs from $EgisSource to $EgisDest..."
Copy-Item -Path $EgisSource -Destination $EgisDest -Recurse -Force

# Copy the Intune Management Extension logs
$IntuneSource = "C:\ProgramData\Microsoft\IntuneManagementExtension\Logs"
$IntuneDest = Join-Path -Path $AdditionalLogsFolder -ChildPath "IntuneManagementExtensionLogs"
Write-Output "Copying Intune Management Extension logs from $IntuneSource to $IntuneDest..."
Copy-Item -Path $IntuneSource -Destination $IntuneDest -Recurse -Force

Write-Output "Diagnostic logs have been collected in: $BaseOutputFolder"

# Step 4: Create final zip file
$FinalZipPath = Join-Path -Path $scriptRoot -ChildPath "$hostName.zip"
Write-Output "Creating final zip file at $FinalZipPath..."
Compress-Archive -Path $BaseOutputFolder -DestinationPath $FinalZipPath -Force

# Clean up the base output folder
Remove-Item $BaseOutputFolder -Recurse -Force

Write-Output "Log collection complete. Final zip file: $FinalZipPath"
