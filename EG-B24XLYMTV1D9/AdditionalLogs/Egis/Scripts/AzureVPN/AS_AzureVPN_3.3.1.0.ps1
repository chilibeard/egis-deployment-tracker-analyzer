Import-Module "$PsScriptRoot\DWE.psm1"

#########################################################################################################################
####################################### Ce script permet d'installer le VPN Azure #######################################
#########################################################################################################################

Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Installation start"

$Dependencies = @( 	"$PSScriptRoot\Microsoft.UI.Xaml.2.1.appx",
			"$PSScriptRoot\Microsoft.VCLibs.x64.14.00.appx"
				)
$MsiX = "$PSScriptRoot\AzVpnAppx_3.3.1.0_ARM64_x86_x64.msixbundle"			
$PBKFilePath = "$PsScriptRoot\rasphone.pbk"
$Path = "$($env:LocalAppData)\Packages\Microsoft.AzureVpn_8wekyb3d8bbwe\LocalState"			

If(!(Test-Path $Path)){
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "$Path does not exist, creating the directory."	
	New-Item -Path "$($env:LocalAppData)\Packages\Microsoft.AzureVpn_8wekyb3d8bbwe" -Name "LocalState" -ItemType Directory -Force -ErrorAction SilentlyContinue
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Done."	
}

If(!(Test-Path "$($env:AppData)\EGIS\Logo")){
	New-Item -Path "$($env:AppData)\EGIS" -Name "Logo" -ItemType Directory -Force -ErrorAction SilentlyContinue
}

Copy-Item -Path "$PsScriptRoot\AzureVPN.ico" -Destination "$($env:AppData)\EGIS\Logo\AzureVPN.ico" -Force

Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Copying the PBK file to $Path."
Copy-Item -Path $PBKFilePath -Destination $Path -Force

If(Test-Path "$Path\rasphone.pbk"){
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Done."
}
Else{
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Error copying the file."
	Exit 1
}


Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Installing Azure VPN and its dependencies for user $($env:USERNAME)"
Foreach($Dependency in $Dependencies){
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Installing $Dependency"
	Add-AppxPackage -Path $Dependency -ErrorAction Ignore
}

Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Installing $MsiX"

Add-AppxPackage -Path $MsiX -DependencyPath $Dependencies -ErrorAction Stop

If ($error.count -eq 0){
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Azure VPN has been installed successfully"	
	
	$shortcutName = "Azure VPN"
	$AppProtocol = "shell:AppsFolder\Microsoft.AzureVpn_8wekyb3d8bbwe!App"
	
	$UserDesktopPath = (get-itemproperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders").Desktop
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "User Desktop found : $UserDesktopPath"
	
	If(!(Test-Path "$UserDesktopPath\$shortcutName.lnk")){
		$localIconPath = "$($env:AppData)\EGIS\Logo\AzureVPN.ico"
		$wshShell = New-Object -ComObject WScript.Shell
		$shortcut = $wshShell.CreateShortcut("$UserDesktopPath\$shortcutName.lnk")
		$shortcut.TargetPath = $appProtocol
		$shortcut.IconLocation = "$localIconPath,0"
		$shortcut.Save()
		Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Shortcut created on the user desktop for Azure VPN app."
	}
	Else{
		Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Shortcut for Azure VPN already exists on the user desktop."
	}
}
Else{ 
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Azure VPN has failed to install."
	Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Error(s) : "
	foreach ($x in $error)
	{
		Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "The encountered error: $x" 
	}
	Move-Item "$($env:AppData)\EGIS\Logs\Install_AzureVPN_3.3.1.0.log" -Destination "$($env:AppData)\EGIS\Logs\Install_AzureVPN_3.3.1.0_Error_$(get-date -Format ddMMyy_HHmm).log"
	Exit 1
}

Write-Log -Path "$($env:AppData)\EGIS\Logs\" -Message "Installation finished."