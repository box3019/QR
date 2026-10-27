; Per-user (HKCU) registration of QR's location and the Outlook "Send to QR" COM add-in. No admin rights.
!define QR_CLSID "{6C1D5E0A-3B7F-4E2A-9A51-0F4B2C7D8E91}"
!define QR_ASM "QR.OutlookAddin, Version=0.0.0.0, Culture=neutral, PublicKeyToken=null"
!macro QrAddinKeys
  WriteRegStr HKCU "Software\Classes\CLSID\${QR_CLSID}" "" "QR.OutlookAddin.Connect"
  WriteRegStr HKCU "Software\Classes\CLSID\${QR_CLSID}\ProgId" "" "QR.OutlookAddin"
  WriteRegStr HKCU "Software\Classes\CLSID\${QR_CLSID}\InprocServer32" "" "mscoree.dll"
  WriteRegStr HKCU "Software\Classes\CLSID\${QR_CLSID}\InprocServer32" "ThreadingModel" "Both"
  WriteRegStr HKCU "Software\Classes\CLSID\${QR_CLSID}\InprocServer32" "Class" "QR.OutlookAddin.Connect"
  WriteRegStr HKCU "Software\Classes\CLSID\${QR_CLSID}\InprocServer32" "Assembly" "${QR_ASM}"
  WriteRegStr HKCU "Software\Classes\CLSID\${QR_CLSID}\InprocServer32" "RuntimeVersion" "v4.0.30319"
  WriteRegStr HKCU "Software\Classes\CLSID\${QR_CLSID}\InprocServer32" "CodeBase" "file:///$INSTDIR\resources\outlook-addin\QR.OutlookAddin.dll"
  WriteRegStr HKCU "Software\Classes\QR.OutlookAddin\CLSID" "" "${QR_CLSID}"
  WriteRegStr HKCU "Software\Microsoft\Office\Outlook\Addins\QR.OutlookAddin" "FriendlyName" "Send to QR"
  WriteRegStr HKCU "Software\Microsoft\Office\Outlook\Addins\QR.OutlookAddin" "Description" "Import the open or selected e-mails into QR"
  WriteRegDWORD HKCU "Software\Microsoft\Office\Outlook\Addins\QR.OutlookAddin" "LoadBehavior" 3
!macroend
!macro customInstall
  WriteRegStr HKCU "Software\QR" "ExePath" "$INSTDIR\QR.exe"
  WriteRegStr HKCU "Software\QR" "InstallDir" "$INSTDIR"
  SetRegView 64
  !insertmacro QrAddinKeys
  SetRegView 32
  !insertmacro QrAddinKeys
  SetRegView lastused
!macroend
!macro QrAddinDel
  DeleteRegKey HKCU "Software\Classes\CLSID\${QR_CLSID}"
  DeleteRegKey HKCU "Software\Classes\QR.OutlookAddin"
  DeleteRegKey HKCU "Software\Microsoft\Office\Outlook\Addins\QR.OutlookAddin"
!macroend
!macro customUnInstall
  SetRegView 64
  !insertmacro QrAddinDel
  SetRegView 32
  !insertmacro QrAddinDel
  DeleteRegKey HKCU "Software\QR"
!macroend
