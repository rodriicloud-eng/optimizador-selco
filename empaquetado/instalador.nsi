Unicode true
!include "MUI2.nsh"

!define APP_NAME "Optimizador Selco"
!ifndef APP_VERSION
!define APP_VERSION "1.0.0"
!endif
!define APP_PUBLISHER "Optimizador Selco"

Name "${APP_NAME} ${APP_VERSION}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\OptimizadorSelco"
RequestExecutionLevel user
ShowInstDetails show
ShowUninstDetails show

!define MUI_ABORTWARNING
!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_WELCOMEPAGE_TITLE "Optimizador de melamina Selco"
!define MUI_WELCOMEPAGE_TEXT "Este asistente instala el optimizador de placas para la seccionadora Biesse Selco WNT 600.$\r$\n$\r$\nNo hace falta instalar otros programas. Al terminar queda un acceso en el escritorio."
!define MUI_FINISHPAGE_TITLE "Listo para usar"
!define MUI_FINISHPAGE_TEXT "El Optimizador Selco quedó instalado.$\r$\n$\r$\nPodés abrirlo desde el escritorio o desde el menú Inicio."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Abrir el Optimizador ahora"
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchApp

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Spanish"

Function LaunchApp
    Exec '"$SYSDIR\wscript.exe" "$INSTDIR\iniciar.vbs"'
FunctionEnd

Section "Optimizador Selco"
    SetOutPath "$INSTDIR"
    File /r "${STAGING}\*.*"
    WriteUninstaller "$INSTDIR\Desinstalar.exe"

    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$SYSDIR\wscript.exe" '"$INSTDIR\iniciar.vbs"' "$INSTDIR\icono.ico" 0
    CreateShortCut "$SMPROGRAMS\${APP_NAME}\Desinstalar.lnk" "$INSTDIR\Desinstalar.exe" "" "$INSTDIR\icono.ico" 0
    CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$SYSDIR\wscript.exe" '"$INSTDIR\iniciar.vbs"' "$INSTDIR\icono.ico" 0

    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OptimizadorSelco" "DisplayName" "${APP_NAME}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OptimizadorSelco" "DisplayVersion" "${APP_VERSION}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OptimizadorSelco" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OptimizadorSelco" "UninstallString" "$INSTDIR\Desinstalar.exe"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OptimizadorSelco" "InstallLocation" "$INSTDIR"
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OptimizadorSelco" "NoModify" 1
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OptimizadorSelco" "NoRepair" 1
SectionEnd

Section "Uninstall"
    Delete "$DESKTOP\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\Desinstalar.lnk"
    RMDir "$SMPROGRAMS\${APP_NAME}"
    RMDir /r "$INSTDIR"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OptimizadorSelco"
SectionEnd
