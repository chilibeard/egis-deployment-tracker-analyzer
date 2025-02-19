	Import-Module "$PsScriptRoot\Module.psm1"

	## Standard variables
	$TempName = $MyInvocation.MyCommand.Name -replace '.ps1'
	$AppName = $TempName.split('_')[1]
	$AppVersion = $TempName.split('_')[2]

	####################################################################################################################################
	#### Ce script permet d'installer une version de base du portail d'entreprise sur une machine au premier login post Autopilot : ####
	####################################################################################################################################

	If(-Not(Test-Path "$env:LOCALAPPDATA\Autopilot_CompanyPortal_Flag.txt")){
		$AppxBundle = "C:\ProgramData\EGIS\Scripts\AutopilotCompanyPortal\Microsoft.CompanyPortal_11.2.119.0_neutral_~_8wekyb3d8bbwe.AppxBundle"
        $Dependencies = @( "C:\ProgramData\EGIS\Scripts\AutopilotCompanyPortal\Microsoft.NET.Native.Framework.2.2_2.2.29512.0_x64__8wekyb3d8bbwe.Appx",
                           "C:\ProgramData\EGIS\Scripts\AutopilotCompanyPortal\Microsoft.NET.Native.Runtime.2.2_2.2.28604.0_x64__8wekyb3d8bbwe.Appx",
                           "C:\ProgramData\EGIS\Scripts\AutopilotCompanyPortal\Microsoft.Services.Store.Engagement_10.0.23012.0_x64__8wekyb3d8bbwe.Appx",
                           "C:\ProgramData\EGIS\Scripts\AutopilotCompanyPortal\Microsoft.UI.Xaml.2.7_7.2208.15002.0_x64__8wekyb3d8bbwe.Appx",
                           "C:\ProgramData\EGIS\Scripts\AutopilotCompanyPortal\Microsoft.VCLibs.140.00_14.0.32530.0_x64__8wekyb3d8bbwe.Appx"
                            )
							
		Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Installing Company Portal for user $($env:USERNAME)"
		Add-AppxPackage -Path $AppxBundle -DependencyPath $Dependencies -ErrorAction SilentlyContinue
        
		
		If ($error.count -eq 0){
			Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Company Portal has been installed successfully"	
			
			$shortcutName = "Company Portal"
			$AppProtocol = "shell:AppsFolder\Microsoft.CompanyPortal_8wekyb3d8bbwe!App"
			$UserDesktopPath = "$env:UserProfile\Desktop"
			$localIconPath = "$PsScriptRoot\CompanyPortalApp.ico"
			$wshShell = New-Object -ComObject WScript.Shell
			$shortcut = $wshShell.CreateShortcut("$UserDesktopPath\$shortcutName.lnk")
			$shortcut.TargetPath = $appProtocol
			$shortcut.IconLocation = "$localIconPath,0"
			$shortcut.Save()

			Write-Host "Shortcut created on the user desktop for Company Portal app."
			
			Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Adding a flag for user $($env:USERNAME)"
			New-Item -Name "Autopilot_CompanyPortal_Flag.txt" -ItemType "file" -Path $env:LOCALAPPDATA
			Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Done"
			
			
		}
		Else{ 
			Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Company Portal has failed to install"
			Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Error(s) : "
			foreach ($x in $error){
				Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "$x" 
			}
			Exit 1001
		}
	}