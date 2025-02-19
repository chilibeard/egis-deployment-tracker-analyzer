If ($ENV:PROCESSOR_ARCHITEW6432 -eq "AMD64") {
	Try {
		&"$ENV:WINDIR\SysNative\WindowsPowershell\v1.0\PowerShell.exe" -File $PSCOMMANDPATH
	}
	Catch {
		Throw "Failed to start $PSCOMMANDPATH"
	}
	Exit
}

$LogPath = "$($env:APPDATA)\EGIS\Logs\Set_7-Zip_Associations_1.0.log"

If(!(Test-Path $LogPath)){
    New-Item $LogPath -Force -ItemType File -ErrorAction SilentlyContinue | Out-Null
}

"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Active Setup start." | Out-File -FilePath $LogPath -Append
"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Set 7-Zip as the default app to use to open up .zip files..." | Out-File -FilePath $LogPath -Append

# Liste des extensions à associer à 7-Zip
$Extensions = @("7z","bz","bz2","cab","gz","lha","lz","lzh","rar","tar","tbz","tbz2","tgz","zip")

Try{
    Foreach ($Extension in $Extensions) 
    {
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Removing older associations for $Extension if it exist." | Out-File -FilePath $LogPath -Append
        Remove-Item -Path HKCU:\SOFTWARE\Classes\.$Extension -Recurse -Force -ErrorAction Ignore
        Remove-Item -Path HKCU:\SOFTWARE\Classes\7-Zip.$Extension -Recurse -Force -ErrorAction Ignore
    
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Adding HKCU:\SOFTWARE\Classes\.$Extension\(Default) = 7-Zip.$Extension" | Out-File -FilePath $LogPath -Append
        New-Item -Path HKCU:\SOFTWARE\Classes\.$Extension -Force -ErrorAction Stop
        New-ItemProperty -Path HKCU:\SOFTWARE\Classes\.$Extension -name "(Default)" -Value "7-Zip.$Extension" -Force -ErrorAction Stop
    
        # Crée les sous-clés de commande pour l'exécutable 7-Zip (icône et commande d'ouverture)
        New-Item -Path HKCU:\SOFTWARE\Classes\7-Zip.$Extension\shell\open\command -Force -ErrorAction Stop
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Adding HKCU:\SOFTWARE\Classes\7-Zip.$Extension\shell\open\command\(Default) = C:\Program Files\7-Zip\7zFM.exe %1" | Out-File -FilePath $LogPath -Append
        New-ItemProperty -Path HKCU:\SOFTWARE\Classes\7-Zip.$Extension\shell\open\command -name "(Default)" -Value '"C:\Program Files\7-Zip\7zFM.exe" "%1"' -Force -ErrorAction Stop
    
        # Définit l'icône du fichier
        New-Item -Path HKCU:\SOFTWARE\Classes\7-Zip.$Extension\DefaultIcon -Force -ErrorAction Stop
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Adding HKCU:\SOFTWARE\Classes\7-Zip.$Extension\DefaultIcon\(Default) = C:\Program Files\7-Zip\7z.dll,0" | Out-File -FilePath $LogPath -Append
        New-ItemProperty -Path HKCU:\SOFTWARE\Classes\7-Zip.$Extension\DefaultIcon -name "(Default)" -Value "C:\Program Files\7-Zip\7z.dll,0" -Force -ErrorAction Stop
    }
}
Catch{
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') An error occured while binding extensions." | Out-File -FilePath $LogPath -Append
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $($Error[0])" | Out-File -FilePath $LogPath -Append
    Exit 1
}
"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Extensions have been binded successfully." | Out-File -FilePath $LogPath -Append
