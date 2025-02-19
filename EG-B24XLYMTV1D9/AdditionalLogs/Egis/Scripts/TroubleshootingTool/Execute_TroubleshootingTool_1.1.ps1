	Import-Module "$PsScriptRoot\DWE.psm1"

	## Standard variables
	$TempName = $MyInvocation.MyCommand.Name -replace '.ps1'
	$AppName = $TempName.split('_')[1]
	$AppVersion = $TempName.split('_')[2]

	############################################################################################################################################################
	#### This script can be used to repair the enrollment of a machine, to troubleshoot the HAADJ and install the Company Portal and Azure VPN if needed. : ####
	############################################################################################################################################################
	#### 												####	Release notes	####																		####
	####												############################																		####
	#### 1.1 : 																																				####
	#### 	StartAutoEnroll has been enhanced using https://call4cloud.nl/2020/05/intune-auto-mdm-enrollment-for-devices-already-azure-ad-joined/ 			####
	#### 	New option "Try to debug ZTD Mismatch"																											####
	#### 	New option "Open the ZTD file location"																											####
	#### 	New option "Check Intune certificates state" / https://call4cloud.nl/2021/04/alice-and-the-device-certificate/									####
	#### 	New option "Force enroll in Intune (Erasing certificates)"	 / https://call4cloud.nl/2021/04/alice-and-the-device-certificate/					####
	#### 	New option "Show last reboot time"																												####
	#### 	New option "Show Intune certificates state"																										####
	#### 	New option "Show Hostname"																														####
	############################################################################################################################################################
	
	
	Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Script has started."
	
	function DebugCompanyPortal(){
		$Folder = "$PsScriptRoot\Data\CompanyPortal"
		$Reg = "HKLM:\SOFTWARE\Microsoft\Active Setup\Installed Components\CompanyPortal"
		$Destination = "C:\ProgramData\Egis\Scripts\AutopilotCompanyPortal"
		
		Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
		Write-Host "This function will install the Company Portal on the device"
		$OptionCP = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		
		If($OptionCP -eq "yes"){
		
			If(!(Test-Path $Destination)){
			
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Copying the required files in C:\ProgramData\Egis\Scripts\AutopilotCompanyPortal."
				Copy-Item $Folder -Destination $Destination -Recurse -Force
				
				If((Test-Path "C:\ProgramData\Egis\Scripts\AutopilotCompanyPortal\AS_AutopilotCompanyPortal_1.2.ps1") -And (Test-Path "C:\ProgramData\Egis\Scripts\AutopilotCompanyPortal\Microsoft.CompanyPortal_11.2.119.0_neutral_~_8wekyb3d8bbwe.AppxBundle")){
					Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Done."
				}
				Else{
					Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Error copying the files."
					Exit 1
				}
					
					
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Creating the Active Setup registry keys"
					
				If(!(Test-Path $Reg)){	
					New-Item $Reg -Force -ErrorAction SilentlyContinue | Out-Null
					New-ItemProperty -LiteralPath $Reg -Name "Default" -Value "Install Company Portal" -PropertyType String -Force -ErrorAction SilentlyContinue | Out-Null
					New-ItemProperty -LiteralPath $Reg -Name "StubPath" -Value 'Powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile -WindowStyle Hidden -File "C:\ProgramData\Egis\Scripts\AutopilotCompanyPortal\AS_AutopilotCompanyPortal_1.2.ps1" -PropertyType String -Force -ErrorAction SilentlyContinue' | Out-Null
				}

				[Int]$CurrentVersion = (Get-ItemProperty -Path $Reg).Version
							
				If($CurrentVersion){
					Set-ItemProperty -LiteralPath $Reg -Name "Version" -Value $($CurrentVersion+1) -Force -ErrorAction SilentlyContinue | Out-Null
				}
				Else{
					New-ItemProperty -LiteralPath $Reg -Name "Version" -Value "1" -PropertyType String -Force -ErrorAction SilentlyContinue | Out-Null
				}
				
				
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "You can now close and reopen the user's Windows session which should trigger the automatic install process for the Company Portal. A shortcut desktop will be created."
			}
			Else{
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Company Portal should already be installed : Its files are already on the device. Let's make sure of it."
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Opening up the explorer, you can double click on Microsoft.CompanyPortal_11.2.119.0_neutral_~_8wekyb3d8bbwe.AppxBundle to start the installation."
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The installation program will tell you directly whether Company Portal is installed or not"
				explorer $Destination
			}
		}
		Else{
			Write-Host "Cancelling"
		}
	}
	
	function DebugIntuneEnrollment(){
		
		Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
		Write-Host "This function will tamper with Intune and Entra connectivity"
		$OptionIntune = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		If($OptionIntune -eq "yes"){
			Write-Host "Proceeding"
			$ID = (Get-ChildItem -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tree\Microsoft\Windows\EnterpriseMgmt").Name
			If($ID){
				$ID = $ID.Split('\')[11]
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Enrollment ID detected : $ID"
				
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Deleting the scheduled tasks linked to this ID"
				$Script = '
				$SubIDs = (Get-ChildItem -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tree\Microsoft\Windows\EnterpriseMgmt\$ID").Name
				Foreach($SubID in $SubIDs){
					$Temp = $SubID.Split("\")[12]
					Write-Host "Removing HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tree\Microsoft\Windows\EnterpriseMgmt\$ID\$Temp"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tree\Microsoft\Windows\EnterpriseMgmt\$ID\$Temp" -Recurse -Force -ErrorAction SilentlyContinue
				}
				
				Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tree\Microsoft\Windows\EnterpriseMgmt\$ID" -Recurse -Force -ErrorAction SilentlyContinue'
				
				RunAsSYSTEM($Script)
				
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Deleting the registry keys linked to this ID"
				If(Test-Path "HKLM:\SOFTWARE\Microsoft\Enrollments\$ID"){
					Write-Host "HKLM:\SOFTWARE\Microsoft\Enrollments\$ID"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\Enrollments\$ID" -Recurse -Force -ErrorAction SilentlyContinue
				}
				If(Test-Path "HKLM:\SOFTWARE\Microsoft\Enrollments\Status\$ID"){
					Write-Host "HKLM:\SOFTWARE\Microsoft\Enrollments\Status\$ID"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\Enrollments\Status\$ID" -Recurse -Force -ErrorAction SilentlyContinue
				}
				If(Test-Path "HKLM:\SOFTWARE\Microsoft\EnterpriseResourceManager\Tracked\$ID"){
					Write-Host "HKLM:\SOFTWARE\Microsoft\EnterpriseResourceManager\Tracked\$ID"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\EnterpriseResourceManager\Tracked\$ID" -Recurse -Force -ErrorAction SilentlyContinue
				}
				If(Test-Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\AdmxInstalled\$ID"){
					Write-Host "HKLM:\SOFTWARE\Microsoft\PolicyManager\AdmxInstalled\$ID"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\AdmxInstalled\$ID" -Recurse -Force -ErrorAction SilentlyContinue
				}
				If(Test-Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\Providers\$ID"){
					Write-Host "HKLM:\SOFTWARE\Microsoft\PolicyManager\Providers\$ID"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\Providers\$ID" -Recurse -Force -ErrorAction SilentlyContinue
				}
				If(Test-Path "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Accounts\$ID"){
					Write-Host "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Accounts\$ID"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Accounts\$ID" -Recurse -Force -ErrorAction SilentlyContinue
				}
				If(Test-Path "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Logger\$ID"){
					Write-Host "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Logger\$ID"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Logger\$ID" -Recurse -Force -ErrorAction SilentlyContinue
				}
				If(Test-Path "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Sessions\$ID"){
					Write-Host "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Sessions\$ID"
					Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Sessions\$ID" -Recurse -Force -ErrorAction SilentlyContinue
				}
				
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Deleting the Intune Enrollment Certificate"
				$Certs = Get-ChildItem Cert:\LocalMachine\My
				Foreach($Cert in $Certs){
					If($Cert.Issuer -like "*Microsoft Intune MDM Device CA*"){
						$IntuneEnrollmentCert = $Cert.Thumbprint
						Remove-Item "Cert:\LocalMachine\My\$IntuneEnrollmentCert" -DeleteKey -Force
					}
				}
			}
			Else{
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "No enrollment ID detected"
			}
			
			$key = 'SYSTEM\CurrentControlSet\Control\CloudDomainJoin\TenantInfo\*'
			try{
				$keyinfo = Get-Item "HKLM:\$key"
			}
			catch{
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Tenant ID is not found!" -Level Error
				Break
			}

			$url = $keyinfo.name
			$url = $url.Split("\")[-1]
			$path = "HKLM:\SYSTEM\CurrentControlSet\Control\CloudDomainJoin\TenantInfo\$url"
			if(!(Test-Path $path)){
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "KEY $path not found!" -Level Error
				Break
			}else{
				try{
					Get-ItemProperty $path -Name MdmEnrollmentUrl
				}
				catch{
					Write_Host "MDM Enrollment registry keys not found. Registering now..."
					New-ItemProperty -LiteralPath $path -Name 'MdmEnrollmentUrl' -Value 'https://enrollment.manage.microsoft.com/enrollmentserver/discovery.svc' -PropertyType String -Force -ea SilentlyContinue;
					New-ItemProperty -LiteralPath $path -Name 'MdmTermsOfUseUrl' -Value 'https://portal.manage.microsoft.com/TermsofUse.aspx' -PropertyType String -Force -ea SilentlyContinue;
					New-ItemProperty -LiteralPath $path -Name 'MdmComplianceUrl' -Value 'https://portal.manage.microsoft.com/?portalAction=Compliance' -PropertyType String -Force -ea SilentlyContinue;
				}
				finally{
					# Trigger AutoEnroll with the deviceenroller
					try{
						$Enroller = 'Start-Process "C:\Windows\System32\deviceenroller.exe" -ArgumentList "/c /AutoEnrollMDM" -NoNewWindow'
						RunAsSYSTEM($Enroller)
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "C:\Windows\System32\deviceenroller.exe /c /AutoEnrollMDM has been executed."
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "You can now check if the AutoEnroll process is successful looking at eventvwr : Microsoft > Windows > DeviceManagement-Enterprise-Diagnostics-Provider"
					}
					catch{
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Something went wrong (C:\Windows\system32\deviceenroller.exe)" -Level Error         
					}
				}
			}
		}	
		Else{
			Write-Host "Cancelling"
		}
			<# Notes :
			https://www.maximerastello.com/manually-re-enroll-a-co-managed-or-hybrid-azure-ad-join-windows-10-pc-to-microsoft-intune-without-loosing-current-configuration/
			/
			%windir%\system32\deviceenroller.exe /c /AutoEnrollMDM (SYSTEM)
			
			Here are the steps that you need to follow to make it work:
			Delete stale scheduled tasks
			Delete stale registry keys
			Delete the Intune enrollment certificate
			Restart the enrollment process

			--> schtasks\Microsoft\Windows\EnterpriseMgmt\ID
			--> Noter cet ID, et supprimer le dossier et son contenu
			--> Supprimer les clés suivantes si l'ID est présent dans le nom de la clé :
			HKLM:\SOFTWARE\Microsoft\Enrollments\ID
			HKLM:\SOFTWARE\Microsoft\Enrollments\Status\ID
			HKLM:\SOFTWARE\Microsoft\EnterpriseResourceManager\Tracked\ID
			HKLM:\SOFTWARE\Microsoft\PolicyManager\AdmxInstalled\ID
			HKLM:\SOFTWARE\Microsoft\PolicyManager\Providers\ID
			HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Accounts\ID
			HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Logger\ID
			HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Sessions\ID
			--> certlm.msc Supprimer le certificat délivré par Microsoft Intune MDM Device CA
			--> En SYSTEM, %windir%\system32\deviceenroller.exe /c /AutoEnrollMDM
			#>
	}
	
	function StartAutoEnroll(){
		Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
		Write-Host "This function will tamper with Intune connectivity"
		$OptionIntune = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		If($OptionIntune -eq "yes"){			
			$key = 'SYSTEM\CurrentControlSet\Control\CloudDomainJoin\TenantInfo\*'
			try{
				$keyinfo = Get-Item "HKLM:\$key"
			}
			catch{
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Tenant ID is not found!" -Level Error
				Break
			}

			$url = $keyinfo.name
			$url = $url.Split("\")[-1]
			$path = "HKLM:\SYSTEM\CurrentControlSet\Control\CloudDomainJoin\TenantInfo\$url"
			if(!(Test-Path $path)){
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "KEY $path not found!" -Level Error
				Break
			}else{
				try{
					Get-ItemProperty $path -Name MdmEnrollmentUrl
				}
				catch{
					Write_Host "MDM Enrollment registry keys not found. Registering now..."
					New-ItemProperty -LiteralPath $path -Name 'MdmEnrollmentUrl' -Value 'https://enrollment.manage.microsoft.com/enrollmentserver/discovery.svc' -PropertyType String -Force -ea SilentlyContinue;
					New-ItemProperty -LiteralPath $path -Name 'MdmTermsOfUseUrl' -Value 'https://portal.manage.microsoft.com/TermsofUse.aspx' -PropertyType String -Force -ea SilentlyContinue;
					New-ItemProperty -LiteralPath $path -Name 'MdmComplianceUrl' -Value 'https://portal.manage.microsoft.com/?portalAction=Compliance' -PropertyType String -Force -ea SilentlyContinue;
				}
				finally{
				# Trigger AutoEnroll with the deviceenroller
					try{
						$Enroller = 'Start-Process "C:\Windows\System32\deviceenroller.exe" -ArgumentList "/c /AutoEnrollMDM" -NoNewWindow'
						RunAsSYSTEM($Enroller)
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "C:\Windows\System32\deviceenroller.exe /c /AutoEnrollMDM has been executed."
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "You can now check if the AutoEnroll process is successful looking at eventvwr : Microsoft > Windows > DeviceManagement-Enterprise-Diagnostics-Provider"
					}
					catch{
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Something went wrong (C:\Windows\system32\deviceenroller.exe)" -Level Error         
					}

				}
			}
		}
		Else{
			Write-Host "Cancelling"
		}		
	}
	
	function OpenEventViewer(){
		Start-Process "eventvwr" -NoNewWindow
	}	
	
	function OpenScheduledTasks(){
		Start-Process "cmd.exe" -ArgumentList "/c control schedtasks" -NoNewWindow
	}
		
	function OpenCertLM(){
		Start-Process "certlm"
	}
	
	function AdvancedTroubleshooting(){
		$Script1 = "DSRegTool.ps1"
		$Script2 = "Test-DeviceRegConnectivity.ps1"
		$Folder = "$PsScriptRoot\Data\HAADJ"
		$Log1 = "C:\Windows\System32\DSRegTool.log"
		$Log2 = "C:\Windows\System32\Test-DeviceRegConnectivity.log"

		Write-Host "Which script do you want to execute ? "
		Write-Host "0. Cancel"
		Write-Host "1. Device Registration Troubleshooter Tool"
		Write-Host "2. Test Device Registration Connectivity"
		[Int]$SubOption = Read-Host "Please enter the number corresponding to your choice"
		
		Switch($SubOption){
			0 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Cancelling"
				Break
			}
			1 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Execution of Device Registration Troubleshooter Tool starting"
				Powershell.exe -file "$Folder\$Script1"
			}
			2 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Testing Device Registration Connectivityg"
				Powershell.exe -file "$Folder\$Script2"
			}
			Default {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The chosen option does not exists: $SubOption"
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "If this seems like an error to you, make sure not to include any space before and after the number."
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Cancelling"
				Break
			}
		}
		
		If(Test-Path $Log1){
			Copy-Item -Path $Log1 -Destination "C:\ProgramData\EGIS\Logs\TroubleshootingTool" -Force
		}
		
		If(Test-Path $Log2){
			Copy-Item -Path $Log2 -Destination "C:\ProgramData\EGIS\Logs\TroubleshootingTool" -Force
		}
		
		$ZipFiles = Get-ChildItem -Path "C:\Windows\System32" -Filter "DSRegTool*.zip" -ErrorAction SilentlyContinue
		If($ZipFiles){
			Foreach($ZipFile in $ZipFiles){
				Copy-Item -Path $ZipFile -Destination "C:\ProgramData\EGIS\Logs\TroubleshootingTool" -Force
			}
		}
		
	}
	
	function DSRegCmd(){
		cls
		Start-Process dsregcmd -ArgumentList "/status" -NoNewWindow | Out-File -FilePath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\Execute_TroubleshootingTool_1.1.log" -Append
	}
	
	function DebugAzureVPN(){
		
		Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
		Write-Host "This function will install Azure VPN on this device"
		$OptionAzureVPN = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		
		If($OptionAzureVPN -eq "yes"){
			$Folder = "$PsScriptRoot\Data\AzureVPN"
			$Reg = "HKLM:\SOFTWARE\Microsoft\Active Setup\Installed Components\AzureVPN"
			$Destination = "C:\ProgramData\Egis\Scripts\AzureVPN"
			
			If(!(Test-Path $Destination)){
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Copying the required files in C:\ProgramData\Egis\Scripts\AzureVPN."
				Copy-Item $Folder -Destination "C:\ProgramData\Egis\Scripts\AzureVPN" -Recurse -Force
				
				If((Test-Path "C:\ProgramData\Egis\Scripts\AzureVPN\AS_AzureVPN_3.1.3.0.ps1") -And (Test-Path "C:\ProgramData\Egis\Scripts\AzureVPN\AzVpnAppx_3.1.3.0_ARM64_x86_x64.msixbundle") -And (Test-Path "C:\ProgramData\Egis\Scripts\AzureVPN\rasphone.pbk")){
					Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Done."
				}
				Else{
					Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Error copying the files."
					Exit 1
				}
			
			
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Creating the Active Setup registry keys"
				
				If(!(Test-Path $Reg)){	
					New-Item $Reg -Force -ErrorAction SilentlyContinue | Out-Null
					New-ItemProperty -LiteralPath $Reg -Name "Default" -Value "Install Azure VPN" -PropertyType String -Force -ErrorAction SilentlyContinue | Out-Null
					New-ItemProperty -LiteralPath $Reg -Name "StubPath" -Value 'Powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile -WindowStyle Hidden -File "C:\ProgramData\Egis\Scripts\AzureVPN\AS_AzureVPN_3.1.3.0.ps1" -PropertyType String -Force -ErrorAction SilentlyContinue' | Out-Null
				}
				
				[Int]$CurrentVersion = (Get-ItemProperty -Path $Reg).Version
				If($CurrentVersion){
					Set-ItemProperty -LiteralPath $Reg -Name "Version" -Value $($CurrentVersion+1) -Force -ErrorAction SilentlyContinue | Out-Null
				}
				Else{
					New-ItemProperty -LiteralPath $Reg -Name "Version" -Value "1" -PropertyType String -Force -ErrorAction SilentlyContinue | Out-Null
				}
				
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "You can now close and reopen the user's Windows session which should trigger the automatic install process for Azure VPN. A shortcut desktop will be created."
			}
			Else{
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Azure VPN should already be installed : Its files are already on the device. Let's make sure of it."
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Opening up the explorer, you can double click on AzVpnAppx_3.1.3.0_ARM64_x86_x64.msixbundle to start the installation."
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The installation program will tell you directly whether Azure VPN is installed or not"
				explorer $Destination
			}
		}	
		Else{
			Write-Host "Cancelling"
		}
	}
	
	function DebugHAADJ(){
		## https://www.maximerastello.com/manually-re-register-a-windows-10-or-windows-server-machine-in-hybrid-azure-ad-join
		Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
		Write-Host "This function will tamper with Azure AD connectivity"
		$OptionHAADJ = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		
		If($OptionHAADJ -eq "yes"){
			Write-Host "Proceeding"
			Write-Host "Unregistering the device from Azure AD"
			Start-Process dsregcmd -ArgumentList "/leave" -NoNewWindow
			Write-Host "Playing the Automatic-Device-Join scheduled task to trigger the registration again."
			Start-scheduledtask -TaskPath "\Microsoft\Windows\Workplace Join\" -TaskName Automatic-Device-Join -ErrorAction SilentlyContinue
			Write-Host "You can now reboot this computer and wait for at least 30 min (The time it takes the Azure AD Connect delta synchronization to complete) before checking if the registration is working as intended"
			Write-Host "You can verify then if the registration is working by using the Show DSRegCMD /status option"
			Write-Host "You need to have :"
			Write-Host "AzureAdJoined : YES"
			Write-Host "DomainJoined : YES"
		}
		Else{
			Write-Host "Cancelling"
		}
	}
	
	function Reboot(){
		Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
		Write-Host "This function will reboot the device"
		$OptionReboot = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		If($OptionReboot -eq "yes"){
			shutdown -r -t 0
		}
		Else{
			Write-Host "Cancelling"
		}
	}
	
	function GetIntuneCertifExpiration(){
		Try {
			$isPresent = Get-ChildItem -Path cert: -Recurse | where { $_.issuer -like "CN=Microsoft Intune MDM Device CA" }  | select issuer
			$Result = Get-ChildItem -Path cert: -Recurse | where { $_.notafter -le (get-date).AddDays(30) -AND $_.notafter -gt (get-date) -and $_.issuer -like "CN=Microsoft Intune MDM Device CA" }  | select issuer, notafter
			$ID = $Result | measure-Object
			If(!($IsPresent)){
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Intune MDM certificate is not present on the device"
			}
			ElseIf($ID.Count -gt 0 -And $IsPresent) {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Intune MDM certificate is going to expire $result"
			}
			Else {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Intune MDM certificate is NOT going to expire"
			}
		}
		Catch {
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Value Missing"
		}
	}
	
	function ForceIntuneReEnrollment(){
		Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
		Write-Host "This function will tamper with Intune connectivity"
		$OptionIntune = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		If($OptionIntune -eq "yes"){
			$SystemScript = '		
			$RegistryKeys = "HKLM:\SOFTWARE\Microsoft\Enrollments", "HKLM:\SOFTWARE\Microsoft\Enrollments\Status","HKLM:\SOFTWARE\Microsoft\EnterpriseResourceManager\Tracked", "HKLM:\SOFTWARE\Microsoft\PolicyManager\AdmxInstalled", "HKLM:\SOFTWARE\Microsoft\PolicyManager\Providers","HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Accounts", "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Logger", "HKLM:\SOFTWARE\Microsoft\Provisioning\OMADM\Sessions"

			$EnrollmentID = Get-ScheduledTask -taskname "PushLaunch" -ErrorAction SilentlyContinue | Where-Object {$_.TaskPath -like "*Microsoft*Windows*EnterpriseMgmt*"} | Select-Object -ExpandProperty TaskPath -Unique | Where-Object {$_ -like "*-*-*"} | Split-Path -Leaf

			foreach ($Key in $RegistryKeys) {
				if (Test-Path -Path $Key) {
					get-ChildItem -Path $Key | Where-Object {$_.Name -match $EnrollmentID} | Remove-Item -Recurse -Force -Confirm:$false -ErrorAction SilentlyContinue
				}
			}
			$IntuneCert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {
					$_.Issuer -match "Intune MDM" 
				} | Remove-Item
				if ($EnrollmentID -ne $null) { 
					foreach ($enrollment in $enrollmentid){
							Get-ScheduledTask | Where-Object {$_.Taskpath -match $Enrollment} | Unregister-ScheduledTask -Confirm:$false
							$scheduleObject = New-Object -ComObject schedule.service
							$scheduleObject.connect()
							$rootFolder = $scheduleObject.GetFolder("\Microsoft\Windows\EnterpriseMgmt")
							$rootFolder.DeleteFolder($Enrollment,$null)
					} 
				} 
			Start-Sleep -Seconds 5
			$EnrollmentProcess = Start-Process -FilePath "C:\Windows\System32\DeviceEnroller.exe" -ArgumentList "/C /AutoenrollMDM" -NoNewWindow -Wait -PassThru'
			
			RunAsSYSTEM($SystemScript) 
			
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "You can now check if the AutoEnroll process is successful looking at eventvwr : Microsoft > Windows > DeviceManagement-Enterprise-Diagnostics-Provider"
		}
		Else{
			Write-Host "Cancelling"
		}
	}
	
	function DebugDeviceAlreadyManaged(){
		Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
		Write-Host 'This function will tamper with Intune connectivity. It is best used if you have the "Device is already being managed by an organization" error when opening the Company Portal'
		$OptionIntune = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		If($OptionIntune -eq "yes"){
			$EnrollmentsPath = "HKLM:\SOFTWARE\Microsoft\Enrollments\"
			$Enrollments = Get-ChildItem -Path $EnrollmentsPath 
			$DiscoveryServerFullUrls = @("https://wip.mam.manage.microsoft.com/Enroll")
			Foreach ($Enrollment in $Enrollments) {
				  $EnrollmentObject = Get-ItemProperty Registry::$Enrollment
				  if ($EnrollmentObject."DiscoveryServiceFullURL" -in $DiscoveryServerFullUrls ) {
						$EnrollmentPath = $EnrollmentsPath + $EnrollmentObject."PSChildName"
						Remove-Item -Path $EnrollmentPath -Recurse
						$Enroller = 'Start-Process "C:\Windows\System32\deviceenroller.exe" -ArgumentList "/c /AutoEnrollMDM" -NoNewWindow'
						RunAsSYSTEM($Enroller)
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "C:\Windows\System32\deviceenroller.exe /c /AutoEnrollMDM has been executed."
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "You can now check if the AutoEnroll process is successful looking at eventvwr : Microsoft > Windows > DeviceManagement-Enterprise-Diagnostics-Provider"
				  }
			}
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Every registry key has been parsed : If no message has showed up regarding the execution of deviceenroller.exe, then nothing has been done to the device by this command."
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "You should try another option, like the Repair Intune Enrollment."
		}
		Else{
			Write-Host "Cancelling"
		}	
	}

	function DebugZTDMismatch([bool]$Force=$false){
		If(!$Force){
			Write-Host "Are you sure you want to proceed ?" -ForegroundColor Red
			Write-Host 'This function will tamper with Intune connectivity.'
			$OptionMismatch = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
		}
		Else{
			$OptionMismatch = "yes"
		}

		If($OptionMismatch -eq "yes"){
			If((-NOT($env:COMPUTERNAME -like "EG*")) -AND (-NOT($env:COMPUTERNAME -like "AUTOPILOT-*")) -OR $Force){
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Hostname is $($env:COMPUTERNAME)"
				If(Test-Path "c:\windows\servicestate\wmansvc\AutopilotDDSZTDFile.json"){
					Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "c:\windows\servicestate\wmansvc\AutopilotDDSZTDFile.json detected, deleting ..."
					Remove-item "c:\windows\servicestate\wmansvc\AutopilotDDSZTDFile.json" -Force
					If(Test-Path "c:\windows\servicestate\wmansvc\AutopilotConciergeFile.json"){
						Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "c:\windows\servicestate\wmansvc\AutopilotConciergeFile.json detected, deleting ..."
						Remove-item "c:\windows\servicestate\wmansvc\AutopilotConciergeFile.json" -Force
					}
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "You can now start a new Intune Enrollment"
				}
				Else{
					Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "c:\windows\servicestate\wmansvc\AutopilotDDSZTDFile.json not found"
				}
			}
			Else{
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Device appears to be an Autopilot device, you should not mess with the ZTD file."
				Write-Host "Do you want to force delete this file anyway ?" -ForegroundColor Red
				$OptionForce = Read-Host 'Please enter "yes" to proceed, anything else to cancel' -ErrorAction SilentlyContinue
				If($OptionForce -eq "yes"){
					Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Forcing DebugZTDMismatch"
					DebugZTDMismatch $True
				}
			}
		}
		Else{
			Write-Host "Cancelling"
		}
	}
	
	function OpenZTDFileLocation(){
		& Explorer c:\windows\servicestate\wmansvc
	}	
	
	function ShowHostname(){
		Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Computer name : $($env:COMPUTERNAME)"
	}
	
	function GetLastRebootTime(){
		$LastReboot = (Get-CimInstance -ClassName CIM_OPeratingSystem -ErrorAction SilentlyContinue).LastBootUpTime
		If($LastReboot){
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Last reboot time : $LastReboot"
			$Delta = new-timespan -start $lastreboot -end $(Get-Date)
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The last time this device restarted was $($Delta.Days) days, $($Delta.Hours) hours and $($Delta.Minutes) minutes ago."
		}
		
	}

	function ShowDeviceCerts(){
		$Certs = @{} | Select Certificate,Expired, Issuer
        $Cert = Get-ChildItem Cert:\LocalMachine\My
        If($Cert){
            $Certs.Certificate = $Cert.subject
            $Certs.Expired = $Cert.NotAfter
			$Certs.Issuer = $Cert.Issuer
        }
        Else{
            $Certs.Certificate = " - "
            $Certs.Expired = " - "
			$Certs.Issuer = " - "
        }
    
		For($i=0; $i -lt $($Certs.Certificate.Count);$i++){
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "---------------------------------------------"
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Certificate : $($Certs.Certificate[$i])"
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Issuer : $($Certs.Issuer[$i])"
			Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Expiration : $($Certs.Expired[$i])"
		}
	}
	
	function Selector(){
		
		If(!([bool](([System.Security.Principal.WindowsIdentity]::GetCurrent()).groups -match "S-1-5-32-544"))){
			Write-Host "Please restart this script using your administrator account" -ForegroundColor Red
			Start-Sleep -s 5
			Exit 0
		}
		
		Write-Host ""
		Write-Host "What do you want to troubleshoot ? "
		Write-Host ""
		Write-Host "0. Exit script"
		Write-Host "--------------------------------- Shortcuts ---------------------------------"
		Write-Host "1. Open Event Viewer"
		Write-Host "2. Open Scheduled Tasks"
		Write-Host "3. Show DSRegCmd /Status"
		Write-Host "4. Show Hostname"
		Write-Host "-------- Trying to repair connectivity with Entra/Azure AD or Intune --------"
		Write-Host "5. Try to repair Hybrid AD join"
		Write-Host "6. Try to repair Intune Enrollment"
		Write-Host '7. Try to repair "This device hasnt been set up for corporate use yet" (Included in 6.)'
		Write-Host '8. Try to repair "Device is already being managed by an organization"'
		Write-Host "------------------ Trying to repair or install applications -----------------"
		Write-Host "9. Try to repair Autopilot Company Portal"
		Write-Host "10. Try to repair Autopilot Azure VPN"
		Write-Host "---------------------------------- Reboot -----------------------------------"
		Write-Host "11. Reboot Computer"
		Write-Host "12. Show last reboot time"
		Write-Host "---------------------------- For advanced IT only ---------------------------"
		Write-Host "13. Advanced Troubleshooting"
		Write-Host "14. Try to debug ZTD Mismatch"
		Write-Host "15. Open the ZTD file location"
		Write-Host "16. Open Local Computer Certificates Store"
		Write-Host "17. Check Intune certificates state"
		Write-Host "18. Show Intune certificates state"
		Write-Host "19. Force enroll in Intune (Erasing certificates)"
		Write-Host ""
		
		try{
			[Int]$Option = Read-Host "Please enter the number corresponding to your choice"
		}
		catch{
			[Int]$Option = 999
		}
		
		Switch($Option){
			0 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "Exiting the script."
				Exit 0
			}
			1 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Open Event Viewer option has been selected"
				OpenEventViewer
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			2 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Open Scheduled Tasks option has been selected"
				OpenScheduledTasks
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			3 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Show DSRegCmd /Status option has been selected"
				DSRegCmd
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			4 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Show Hostname option has been selected"
				ShowHostname
				Write-Host ""
				Start-Sleep -s 3
				Selector
			}
			5 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Try to Repair Hybrid AD join option has been selected"
				DebugHAADJ
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			6 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Try to Repair Intune Enrollment option has been selected"
				DebugIntuneEnrollment
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			7 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The 'Try to Repair This device hasn't been set up for corporate use yet' option has been selected"
				StartAutoEnroll
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			8 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The 'Try to Repair Device is already being managed by an organization' option has been selected"
				DebugDeviceAlreadyManaged
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			9 {	
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Try to Repair Autopilot Company Portal option has been selected"
				DebugCompanyPortal
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			10 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Try to Repair Autopilot Azure VPN option has been selected"
				DebugAzureVPN
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			11 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Restart Computer option has been selected"
				Reboot
			}
			12 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Show last reboot time option has been selected"
				GetLastRebootTime
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			13 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Advanced Troubleshooting option has been selected"
				AdvancedTroubleshooting
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			14 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Try to debug ZTD Mismatch option has been selected"
				DebugZTDMismatch
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			15 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Open the ZTD file location option has been selected"
				OpenZTDFileLocation
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			16 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Open Local Computer Certificates Store option has been selected"
				OpenCertLM
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			17 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Check Intune certificates state option has been selected"
				GetIntuneCertifExpiration
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			18 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Show Intune certificates state option has been selected"
				ShowDeviceCerts
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			19 {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The Force enroll in Intune (Erasing certificates) option has been selected"
				ForceIntuneReEnrollment
				Write-Host ""
				Start-Sleep -s 5
				Selector
			}
			Default {
				Write-Log -LogPath "C:\ProgramData\EGIS\Logs\TroubleshootingTool\" -Message "The chosen option does not exist"
				Write-Host ""
				Start-Sleep -s 2
				Selector
			}
		}
	}
	
	Selector