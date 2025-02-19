	Import-Module "$PsScriptRoot\Module.psm1"

	## Standard variables
	$TempName = $MyInvocation.MyCommand.Name -replace '.ps1'
	$AppName = $TempName.split('_')[1]
	$AppVersion = $TempName.split('_')[2]

	#########################################################################################################################
	#### Ce script permet d'installer une version de base du VPN Azure sur une machine au premier login post Autopilot : ####
	#########################################################################################################################

	$MsixBundle = "C:\ProgramData\EGIS\Scripts\AzureVPN\AzVpnAppx_3.1.3.0_ARM64_x86_x64.msixbundle"
    $Dependencies = @( 	"C:\ProgramData\EGIS\Scripts\AzureVPN\Microsoft.UI.Xaml.2.1.appx",
						"C:\ProgramData\EGIS\Scripts\AzureVPN\Microsoft.VCLibs.x64.14.00.appx"
                    )
	$PBKFilePath = "$PsScriptRoot\rasphone.pbk"
	$Path = "$($env:LocalAppData)\Packages\Microsoft.AzureVpn_8wekyb3d8bbwe\LocalState"				
	
	If(!(Test-Path $Path)){
		Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "$Path does not exist, creating the directory."	
		New-Item -Path "$($env:LocalAppData)\Packages\Microsoft.AzureVpn_8wekyb3d8bbwe" -Name "LocalState" -ItemType Directory -Force -ErrorAction SilentlyContinue
		Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Done."	
	}
	
	Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Copying the PBK file to $Path."
	Copy-Item -Path $PBKFilePath -Destination $Path -Force

	If(Test-Path "$Path\rasphone.pbk"){
		Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Done."
	}
	Else{
		Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Error copying the file."
		Exit 1
	}
	
	Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Installing Azure VPN for user $($env:USERNAME)"
	Add-AppxPackage -Path $MsixBundle -DependencyPath $Dependencies -ErrorAction SilentlyContinue
        
		
	If ($error.count -eq 0){
		Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Azure VPN has been installed successfully"	
		
		$shortcutName = "Azure VPN"
		$AppProtocol = "shell:AppsFolder\Microsoft.AzureVpn_8wekyb3d8bbwe!App"
		$UserDesktopPath = "$env:UserProfile\Desktop"
		$localIconPath = "$PsScriptRoot\AzureVPN.ico"
		$wshShell = New-Object -ComObject WScript.Shell
		$shortcut = $wshShell.CreateShortcut("$UserDesktopPath\$shortcutName.lnk")
		$shortcut.TargetPath = $appProtocol
		$shortcut.IconLocation = "$localIconPath,0"
		$shortcut.Save()

		Write-Host "Shortcut created on the user desktop for Azure VPN app."
	}
	Else{ 
		Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Azure VPN has failed to install"
		Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Error(s) : "
		foreach ($x in $error){
			Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "$x" 
		}
		Exit 1001
	}