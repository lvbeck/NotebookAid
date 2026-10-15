!define NotebookAidIncludeDir "${__FILEDIR__}"
!macro customHeader
  ManifestDPIAware true
  SetFont /LANG=2052 "Microsoft YaHei" 9
  SetFont /LANG=1028 "Microsoft JhengHei" 9
  SetFont /LANG=1041 "Meiryo" 9
  SetFont /LANG=1042 "Malgun Gothic" 9
  !ifndef BUILD_UNINSTALLER
  !include "${NotebookAidIncludeDir}\installer-strings.nsh"
  Var NotebookAidDesktopChoice
  Var NotebookAidMenuChoice
  Var NotebookAidDesktopControl
  Var NotebookAidMenuControl
  Var NotebookAidBackup
  Var NotebookAidPreparedRoot
  !insertmacro NotebookAidFunctions
  !endif
!macroend

!macro customInit
  StrCpy $NotebookAidDesktopChoice 0
  StrCpy $NotebookAidMenuChoice 1
  ClearErrors
  ReadRegDWORD $0 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" DesktopShortcutChoice
  ${IfNot} ${Errors}
    StrCpy $NotebookAidDesktopChoice $0
  ${EndIf}
  ClearErrors
  ReadRegDWORD $0 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" StartMenuShortcutChoice
  ${IfNot} ${Errors}
    StrCpy $NotebookAidMenuChoice $0
  ${EndIf}
  InitPluginsDir
  File /oname=$PLUGINSDIR\NotebookAid.SetupSupport.exe "${BUILD_RESOURCES_DIR}\NotebookAid.SetupSupport.exe"
  ${If} ${Silent}
    Call NotebookAidPrepare
  ${EndIf}
!macroend

!macro customPageAfterChangeDir
  Page custom NotebookAidShortcutPage NotebookAidShortcutLeave
  Page custom NotebookAidPreparePage
!macroend

!macro NotebookAidFunctions
!ifndef BUILD_UNINSTALLER
Function NotebookAidShortcutPage
  !insertmacro MUI_HEADER_TEXT "$(NotebookAidShortcutTitle)" "$(NotebookAidShortcutHint)"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateCheckbox} 0 24u 100% 18u "$(NotebookAidShortcutDesktop)"
  Pop $NotebookAidDesktopControl
  ${NSD_SetState} $NotebookAidDesktopControl $NotebookAidDesktopChoice
  ${NSD_CreateCheckbox} 0 58u 100% 18u "$(NotebookAidShortcutMenu)"
  Pop $NotebookAidMenuControl
  ${NSD_SetState} $NotebookAidMenuControl $NotebookAidMenuChoice
  nsDialogs::Show
FunctionEnd
Function NotebookAidShortcutLeave
  ${NSD_GetState} $NotebookAidDesktopControl $NotebookAidDesktopChoice
  ${NSD_GetState} $NotebookAidMenuControl $NotebookAidMenuChoice
FunctionEnd
Function NotebookAidPrepare
  StrCpy $0 "user"
  ${If} $installMode == "all"
    StrCpy $0 "machine"
  ${EndIf}
  nsExec::ExecToStack '"$PLUGINSDIR\NotebookAid.SetupSupport.exe" backup "$INSTDIR" "$0"'
  Pop $1
  Pop $NotebookAidBackup
  ${If} $1 != 0
    MessageBox MB_ICONSTOP|MB_OK "$NotebookAidBackup" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
  StrCpy $NotebookAidPreparedRoot "$INSTDIR"
  DetailPrint "Program rollback copy: $NotebookAidBackup"
FunctionEnd
Function NotebookAidPreparePage
  Call NotebookAidPrepare
  Abort
FunctionEnd
!endif
!macroend

!macro customCheckAppRunning
  !ifdef BUILD_UNINSTALLER
    nsExec::ExecToStack '"$INSTDIR\NotebookAid.SetupSupport.exe" check-root "$INSTDIR" "user"'
  !else
    ${If} $NotebookAidPreparedRoot != $INSTDIR
      Call NotebookAidPrepare
    ${EndIf}
    nsExec::ExecToStack '"$PLUGINSDIR\NotebookAid.SetupSupport.exe" check-root "$INSTDIR" "user"'
  !endif
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "$1" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
!macroend

!macro customInstall
  StrCpy $0 "user"
  ${If} $installMode == "all"
    StrCpy $0 "machine"
  ${EndIf}
  StrCpy $2 "en"
  ${Switch} $LANGUAGE
    ${Case} 1031
      StrCpy $2 "de"
      ${Break}
    ${Case} 1036
      StrCpy $2 "fr"
      ${Break}
    ${Case} 1040
      StrCpy $2 "it"
      ${Break}
    ${Case} 1034
    ${Case} 3082
      StrCpy $2 "es"
      ${Break}
    ${Case} 2070
      StrCpy $2 "pt-PT"
      ${Break}
    ${Case} 1041
      StrCpy $2 "ja"
      ${Break}
    ${Case} 1042
      StrCpy $2 "ko"
      ${Break}
    ${Case} 2052
      StrCpy $2 "zh-CN"
      ${Break}
    ${Case} 1028
      StrCpy $2 "zh-TW"
      ${Break}
  ${EndSwitch}
  nsExec::ExecToStack '"$INSTDIR\NotebookAid.SetupSupport.exe" finish "$INSTDIR" "$0" "$2" "$NotebookAidDesktopChoice" "$NotebookAidMenuChoice"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "$1$\r$\nRollback copy: $NotebookAidBackup" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
  WriteRegDWORD SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" DesktopShortcutChoice $NotebookAidDesktopChoice
  WriteRegDWORD SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" StartMenuShortcutChoice $NotebookAidMenuChoice
  DetailPrint "NotebookAid bridge registered. Notes and settings preserved."
!macroend

!macro customUnInstall
  StrCpy $0 "user"
  ${If} $installMode == "all"
    StrCpy $0 "machine"
  ${EndIf}
  nsExec::ExecToStack '"$INSTDIR\NotebookAid.SetupSupport.exe" remove "$INSTDIR" "$0"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "$1" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
!macroend

!macro customUnInit
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "--delete-app-data" $1
  ${IfNot} ${Errors}
    MessageBox MB_ICONSTOP|MB_OK "NotebookAid uninstall preserves user data. Data removal is not supported." /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
!macroend

!macro customRemoveFiles
  nsExec::ExecToStack '"$INSTDIR\NotebookAid.SetupSupport.exe" purge "$INSTDIR" "user"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "$1" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
  SetOutPath $TEMP
  Delete "$INSTDIR\NotebookAid.SetupSupport.exe"
  Delete "$INSTDIR\Uninstall NotebookAid.exe"
  Delete "$INSTDIR\uninstallerIcon.ico"
  RMDir "$INSTDIR"
!macroend
