# Log Files Inventory

This document provides a comprehensive inventory of all log files found in the sample deployment folder `EG-B24XLYMTV1D9`. This will serve as a reference for Phase 2 parsing implementation.

## File Type Distribution

Total unique file types found in the deployment logs:

| Extension    | Count | Description |
|-------------|--------|-------------|
| .log        | 131    | Various log files including installation, Intune management, and system logs |
| .evtx       | 19     | Windows Event Log files |
| .Appx       | 14     | Windows App Package files |
| .ps1        | 10     | PowerShell scripts |
| .etl        | 8      | Event Trace Log files |
| .psm1       | 5      | PowerShell module files |
| .ico        | 4      | Icon files |
| .txt        | 4      | Text files containing various outputs |
| .xml        | 4      | XML configuration and report files |
| .json       | 3      | JSON configuration and metadata files |
| .AppxBundle | 2      | Windows App Bundle packages |
| .msixbundle | 2      | MSIX App Bundle packages |
| .pbk        | 2      | Phone Book files (VPN/network configurations) |
| .cab        | 1      | Cabinet file (compressed archive) |
| .csv        | 1      | Comma-separated values file |
| .html       | 1      | HTML report file |
| .ini        | 1      | Configuration file |
| .reg        | 1      | Registry export file |
| .bat        | 1      | Batch script file |

## Directory Structure

```
EG-B24XLYMTV1D9/
├── AdditionalLogs/
│   ├── Egis/
│   │   ├── Logs/                 # Installation and configuration logs
│   │   │   ├── Install_*.log     # Software installation logs
│   │   │   ├── Uninstall_*.log   # Software removal logs
│   │   │   └── Task_*.log        # Task execution logs
│   │   └── Scripts/              # Installation scripts and resources
│   │       ├── 7-Zip/
│   │       ├── AutopilotCompanyPortal/
│   │       └── AzureVPN/
└── StandardDiagnostics/          # System and deployment diagnostics
    ├── *.log                     # Various system logs
    ├── *.evtx                    # Windows Event logs
    ├── *.etl                     # Event Trace logs
    ├── *.json                    # Configuration and metadata
    └── *.xml                     # Diagnostic reports
```

## Log File Categories and Formats

### 1. Installation Logs
**Location:** `AdditionalLogs/Egis/Logs/` and `StandardDiagnostics/`
**Format Example:**
```
2025-02-18 19:45:21 INFO: Starting install script...
2025-02-18 19:45:32 INFO: Application has been installed successfully.
2025-02-18 19:45:32 INFO: Install script ended.
```
**Parser Notes:**
- Simple timestamp-based format
- ISO-like date format
- Log level indicated after timestamp
- Consistent message format

### 2. System Setup Logs
**Location:** `StandardDiagnostics/setupact.log`
**Format Example:**
```
2025-02-18 17:30:09, Info                         [windeploy.exe] ------------------------------------------------
2025-02-18 17:30:09, Info                         [windeploy.exe] WinDeploy.exe launched with command-line []...
```
**Parser Notes:**
- Timestamp with comma separator
- Fixed-width columns
- Component in square brackets
- Detailed process information

### 3. Intune Management Logs
**Location:** `StandardDiagnostics/`
**Format Example:**
```
<![LOG[message]LOG]!><time="17:42:26.0027347" date="2-18-2025" component="IntuneManagementExtension" context="" type="1" thread="4" file="">
```
**Parser Notes:**
- XML-like structure
- Multiple metadata fields
- Millisecond precision timestamps
- Component and thread tracking

### 4. Configuration Files
**Location:** `StandardDiagnostics/`
**Format Example (JSON):**
```json
{
  "MdmDiagVersion": "1.0",
  "AreaName": "deviceenrollment;deviceprovisioning;autopilot;",
  "BaseBuildRevisionNumber": 1,
  "BuildBranch": "ge_release"
}
```
**Parser Notes:**
- Standard JSON format
- Contains system metadata
- Version information
- Configuration settings

### 5. Windows Event Logs
**Location:** `StandardDiagnostics/*.evtx`
**Format:** Binary Windows Event Log format
**Components:**
- AAD operational logs
- Device management logs
- Deployment diagnostics
- System configuration logs

### 6. Event Trace Logs
**Location:** `StandardDiagnostics/*.etl`
**Format:** Binary Event Trace Log format
**Types:**
- Cloud experience host logs
- Diagnostic collector logs
- WiFi configuration logs

## Special Considerations

### File Naming Patterns
1. **Installation Logs:**
   - Format: `Install_[Software]_[Version].log`
   - Example: `Install_7-Zip_24.08.log`

2. **Windows Event Logs:**
   - Format: `microsoft-windows-[component]-[type].evtx`
   - Example: `microsoft-windows-aad-operational.evtx`

3. **Diagnostic Files:**
   - Format: `DiagnosticLogCSP_Collector_[Component]_[Timestamp].etl`
   - Example: `DiagnosticLogCSP_Collector_Autopilot_2025_2_18_19_27_6.etl`

### Processing Requirements

1. **Large Files:**
   - MDMDiagReport.xml (too large for standard viewing)
   - Event trace logs (.etl files)
   - Windows event logs (.evtx files)

2. **Binary Formats:**
   - .evtx files require Windows Event Log API
   - .etl files require Event Tracing for Windows (ETW) API
   - Consider using PowerShell's Get-WinEvent for .evtx files

3. **Character Encodings:**
   - Most text logs use UTF-8
   - Some configuration files may use UTF-16
   - Binary files have specific format requirements

4. **Timestamp Formats:**
   - ISO-like: `YYYY-MM-DD HH:MM:SS`
   - Windows-specific: `MM/DD/YYYY HH:MM:SS`
   - Unix timestamps in some JSON configs
   - Millisecond precision in some logs

5. **File Relationships:**
   - Installation logs have corresponding scripts
   - Diagnostic files have associated metadata
   - Event logs may reference each other

## Detailed Log Examples

### 1. Installation Log Patterns

#### Success Pattern
```
2025-02-18 18:01:54 INFO: Starting install script...
2025-02-18 18:01:54 INFO: Installing the application...
2025-02-18 18:03:14 INFO: Installation successful!
2025-02-18 18:03:14 INFO: Install script ended.
```

#### Configuration Pattern
```
2025-02-18 18:17:48 INFO: ForticlientVPN 7.4.0.1658 - Installation start
2025-02-18 18:17:48 INFO: Configuring the registry keys : 
2025-02-18 18:17:48 INFO: Adding HKLM:\SOFTWARE\Fortinet\FortiClient\Sslvpn\Tunnels\AutopilotVPN
2025-02-18 18:17:48 INFO: Adding HKLM:\SOFTWARE\Fortinet\FortiClient\Sslvpn\Tunnels\AutopilotVPN\Description = VPN for Autopilot
```

### 2. Windows Event Log Structure
From `microsoft-windows-devicemanagement-enterprise-diagnostics-provider-admin.evtx`:

```
TimeCreated  : 2/18/2025 7:51:43 PM
ProviderName : Microsoft-Windows-DeviceManagement-Enterprise-Diagnostics-Provider
Id           : 813
Message      : MDM PolicyManager: Set policy int, Policy: (AllowTelemetry)...

TimeCreated  : 2/18/2025 7:45:02 PM
ProviderName : Microsoft-Windows-DeviceManagement-Enterprise-Diagnostics-Provider
Id           : 209
Message      : MDM Session: OMA-DM session ended with status: (The operation completed successfully.)
```

## Critical Log Files for Deployment Tracking

### 1. Initial Setup Phase
- `setupact.log`: Primary Windows setup actions
- `AutopilotDDSZTDFile.json`: Initial deployment configuration
- `microsoft-windows-moderndeployment-diagnostics-provider-autopilot.evtx`: Autopilot initialization

### 2. Device Enrollment Phase
- `microsoft-windows-devicemanagement-enterprise-diagnostics-provider-admin.evtx`: MDM enrollment
- `microsoft-windows-user device registration-admin.evtx`: Device registration
- `IntuneManagementExtension.log`: Intune setup and configuration

### 3. Software Deployment Phase
- `Win32AppInventory.log`: Application inventory
- `AppWorkload.log`: Application installation status
- Installation logs (in order of deployment):
  1. `Logs-Install_Autopilot-Baseline_*.log`
  2. `Logs-Install_Office-365-apps_*.log`
  3. `Logs-Install_FortiClientVPN_*.log`
  4. Other application installations

### 4. Configuration Phase
- `Logs-CreateTask_*.log`: Task creation
- `Logs-Add_Lockscreen&WallpaperFiles_*.log`: UI customization
- Configuration-specific logs for each application

### 5. Validation Phase
- `MDMDiagReport.xml`: Complete diagnostic report
- `MdmDiagLogMetadata.json`: Deployment metadata
- Error logs and remediation logs

## Log Processing Priority

1. **High Priority (Real-time Processing)**
   - `setupact.log`
   - `IntuneManagementExtension.log`
   - Installation logs
   - Windows Event Logs related to device enrollment

2. **Medium Priority (Batch Processing)**
   - Configuration logs
   - Application inventory logs
   - Task creation logs

3. **Low Priority (Background Processing)**
   - Diagnostic reports
   - Trace logs (.etl files)
   - Backup and archive logs

## Error Patterns to Monitor

1. **Installation Failures**
   ```
   YYYY-MM-DD HH:MM:SS ERROR: Installation failed with error code 0x8007xxxx
   ```

2. **Configuration Issues**
   ```
   YYYY-MM-DD HH:MM:SS WARNING: Registry key not found
   YYYY-MM-DD HH:MM:SS ERROR: Failed to apply configuration
   ```

3. **Network-Related Issues**
   ```
   YYYY-MM-DD HH:MM:SS ERROR: Failed to contact management point
   YYYY-MM-DD HH:MM:SS WARNING: Download failed, retrying...
   ```

## Implementation Recommendations

1. **Real-time Monitoring**
   - Watch `setupact.log` and `IntuneManagementExtension.log` for deployment progress
   - Monitor installation logs for immediate failure detection
   - Track enrollment status through event logs

2. **Batch Processing**
   - Process configuration logs every 5-10 minutes
   - Update application inventory status periodically
   - Generate deployment status reports

3. **Error Handling**
   - Implement retry logic for network-related failures
   - Create error categories based on common patterns
   - Track error frequency and correlation

4. **Performance Optimization**
   - Stream large log files instead of loading entirely
   - Process binary logs (.evtx, .etl) using native Windows APIs
   - Implement caching for frequently accessed log patterns
