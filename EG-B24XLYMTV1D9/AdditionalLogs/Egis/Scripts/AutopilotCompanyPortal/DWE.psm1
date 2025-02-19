Function Write-Log() {
 
<# 
     .SYNOPSIS 
    Permet de créer des fichiers de log
 
     .PARAMETER Message
    Le message à ajouter au fichier de log. Ce paramètre est obligatoire.
 
     .PARAMETER Path
    Impose le chemin du fichier crée. Par défaut le chemin est C:\ProgramData\EGIS\Logs\ si ce paramètre n'est pas modifié

     .PARAMETER LogName
    Impose le nom du fichier crée. Par défaut se base sur le nom du fichier ps1 utilisé (Install_App_1.0.ps1 devient Install_App_1.0.log)

     .PARAMETER Level 
    Selection du pipeline de sortie, choix possibles Error, Warn et Info
 
     .EXAMPLE 
    # Exemple d'une utilisation standard :
	Write-Log -Message "Complete."

	# Exemple d'un log crée sans compte administrateur dans le profil utilisateur :
    Write-Log -Path "$($env:LocalAppData)\Logs\" -Message "Done"
#>


    [CmdletBinding()]
 
    param( 
        [Parameter(Mandatory=$true,ValueFromPipelineByPropertyName=$true)] 
        [ValidateNotNullOrEmpty()] 
        [Alias("LogContent")] 
        [string]$Message, 
        [Parameter(Mandatory=$false)] 
        [Alias('LogPath')] 
        [string]$Path = "C:\ProgramData\EGIS\Logs\", 
        [Parameter(Mandatory=$false)] 
        [string]$LogName, 
        [Parameter(Mandatory=$false)] 
        [ValidateSet("Error","Warn","Info")] 
        [string]$Level = "Info" 
    )
 
    Begin { 
        # Definition du verbose 
        $VerbosePreference = 'Continue' 
        ## Si aucun logName n'est renseigné, on défini le logname selon le nom du script appelant la fonctions
        If(!$LogName){
            [string]$LogName = (get-childitem $MyInvocation.PSCommandPath | Select-Object -Expand Name) -replace '.ps1','.log'
        }
    }
 
    Process { 
        $LogPath = $Path + $LogName
        if (Test-Path $LogPath) { 
            $LogSize = (Get-Item -Path $LogPath).Length/1MB 
            $MaxLogSize = 5 
        }
 
        # Rotation du fichier de log au-dela de 5 Mo 
        if ((Test-Path $LogPath) -AND $LogSize -gt $MaxLogSize) {
            Write-Error "The $LogPath log file already exists and is more than 5 MB in size. Deleting the file and creating a new one." 
            Remove-Item $LogPath -Force 
            New-Item $LogPath -Force -ItemType File -ErrorAction SilentlyContinue
        }
 
        # Creation du repertoire si il n'existe pas 
        elseif (-NOT(Test-Path $LogPath)) { 
            Write-Verbose "Creating $LogPath." 
            New-Item $LogPath -Force -ItemType File -ErrorAction SilentlyContinue
        }
 
        else{ 
            # rien ! 
        }
 
        # definition du format de date 
        $FormattedDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss" 
        # ecriture du message en error, warning, ou verbose pipeline et definition de $LevelText 
        switch ($Level) {
            'Error' { 
                Write-Error $Message 
                $LevelText = 'ERROR:' 
            }
            'Warn' { 
                Write-Warning $Message 
                $LevelText = 'WARNING:' 
            } 
            'Info' { 
                Write-Verbose $Message 
                $LevelText = 'INFO:' 
            } 
        }
 
        # Ecriture de la ligne de log dans $LogPath 
        "$FormattedDate $LevelText $Message" | Out-File -FilePath $LogPath -Append 
    }
    End { } 
}
 
Function Set-WallPaper {
 
<# 
     .SYNOPSIS 
    Install un Wallpaper pour l'utilisateur connecte
 
     .PARAMETER Image 
    Passer le chemin exacte de l'image
 
     .PARAMETER Style 
    Passer le type d'ajustement de l'image (Exemple: Fill, Fit, Stretch, Tile, Center, Span)
 
     .EXAMPLE 
    Set-WallPaper -Image "C:\Wallpaper\Default.jpg" 
    Set-WallPaper -Image "C:\Wallpaper\Background.jpg" -Style Fit 
#>
 
param ( 
    [parameter(Mandatory=$True)] 
    # le chemin exacte de l'image 
    [string]$Image,
 
    # type d'ajustement de l'image 
    [parameter(Mandatory=$False)] 
    [ValidateSet('Fill', 'Fit', 'Stretch', 'Tile', 'Center', 'Span')] 
    [string]$Style 
)
 
$WallpaperStyle = Switch ($Style) { 
    "Fill" {"10"} 
    "Fit" {"6"} 
    "Stretch" {"2"} 
    "Tile" {"0"} 
    "Center" {"0"} 
    "Span" {"22"} 
}
 
 
If($Style -eq "Tile") { 
    New-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name WallpaperStyle -PropertyType String -Value $WallpaperStyle -Force 
    New-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name TileWallpaper -PropertyType String -Value 1 -Force 
}
 
Else { 
    New-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name WallpaperStyle -PropertyType String -Value $WallpaperStyle -Force 
    New-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name TileWallpaper -PropertyType String -Value 0 -Force 
}
 
Add-Type -TypeDefinition @"  
 
using System;  
using System.Runtime.InteropServices; 
public class Params 
{  
    [DllImport("User32.dll",CharSet=CharSet.Unicode)]  
    public static extern int SystemParametersInfo (Int32 uAction,  
                                                   Int32 uParam,  
                                                   String lpvParam,  
                                                   Int32 fuWinIni); 
}
 
"@  
 
   
    $SPI_SETDESKWALLPAPER = 0x0014
 
    $UpdateIniFile = 0x01
 
    $SendChangeEvent = 0x02
 
    $fWinIni = $UpdateIniFile -bor $SendChangeEvent
 
    [Params]::SystemParametersInfo($SPI_SETDESKWALLPAPER, 0, $Image, $fWinIni)
 
}
 
function Test-PendingReboot {
 
    if (Get-ChildItem "HKLM:\Software\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending" -EA Ignore) { return $true } 
    if (Get-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired" -EA Ignore) { return $true } 
    if (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" -Name PendingFileRenameOperations -EA Ignore) { return $true }
 
    try {  
        $util = [wmiclass]"\\.\root\ccm\clientsdk:CCM_ClientUtilities" 
        $status = $util.DetermineIfRebootPending() 
        if(($null -ne $status) -and $status.RebootPending){ 
    return $true 
    } 
    }catch{}
 
    return $false
}
 
Function RunAsSYSTEM([String] $PSScript){
    $GUID=[guid]::NewGuid().Guid
 
    $Job = Register-ScheduledJob -Name $GUID -ScheduledJobOption (New-ScheduledJobOption -RunElevated) -ScriptBlock ([ScriptBlock]::Create($PSScript)) -ArgumentList ($PSScript) -ErrorAction Stop
 
    $Task = Register-ScheduledTask -TaskName $GUID -Action (New-ScheduledTaskAction -Execute $Job.PSExecutionPath -Argument $Job.PSExecutionArgs) -Principal (New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest) -ErrorAction Stop
 
    $Task | Start-ScheduledTask -AsJob -ErrorAction Stop | Wait-Job | Remove-Job -Force -Confirm:$False
 
    While (($Task | Get-ScheduledTaskInfo).LastTaskResult -eq 267009) {Start-Sleep -Milliseconds 150}
 
    $Job1 = Get-Job -Name $GUID -ErrorAction SilentlyContinue | Wait-Job
    $Job1 | Receive-Job -Wait -AutoRemoveJob
 
    Unregister-ScheduledJob -Id $Job.Id -Force -Confirm:$False
 
    Unregister-ScheduledTask -TaskName $GUID -Confirm:$false
}
 
Function Get-CurrentUser {
    $CurrentUser = ((get-process explorer -includeusername).UserName).Split('\')[1]
    Return $CurrentUser
}
 
Function Trace_Errors(){
    foreach ($x in $error)
    {
        Write-Log -Message "The encountered error: $x" -Level 'Error'  
    }
}
