// QR "Send to QR" Outlook ribbon button. Plain COM add-in (no VSTO, no macros, no admin), registered per-user under HKCU.
// Saves the open or selected e-mails as .msg into %TEMP%\qr-outlook\<stamp> and starts QR.exe --import <dir>.
// Safety rules (Outlook disables add-ins that crash it):
//  - Office's own interface definitions (Extensibility.IDTExtensibility2, Office.IRibbonExtensibility), no hand-made copies
//    (a hand-declared IDTExtensibility2 without the SAFEARRAY(VARIANT) marshaling crashed the CLR inside Outlook);
//  - every entry point catches everything and logs to %APPDATA%\QR\logs\outlook-addin.log, nothing ever throws into Outlook;
//  - nothing runs at startup: OnConnection only keeps a reference; work happens only when the button is clicked.
using System; using System.Diagnostics; using System.IO; using System.Runtime.InteropServices; using Microsoft.Win32;
using Extensibility; using Office = Microsoft.Office.Core;

namespace QR.OutlookAddin {
  [ComVisible(true), Guid("6C1D5E0A-3B7F-4E2A-9A51-0F4B2C7D8E91"), ProgId("QR.OutlookAddin"), ClassInterface(ClassInterfaceType.AutoDispatch)]
  public class Connect : IDTExtensibility2, Office.IRibbonExtensibility {
    object app;
    public void OnConnection(object a, ext_ConnectMode mode, object addin, ref Array custom) { try { app = a; Log("connect mode=" + mode + " clr=" + Environment.Version + " x64=" + Environment.Is64BitProcess); } catch { } }
    public void OnDisconnection(ext_DisconnectMode mode, ref Array custom) { try { app = null; Log("disconnect " + mode); } catch { } }
    public void OnAddInsUpdate(ref Array custom) { }
    public void OnStartupComplete(ref Array custom) { try { Log("startup complete"); } catch { } }
    public void OnBeginShutdown(ref Array custom) { }

    // One XML per ribbon id. Explorer: Home tab group + right-click menus for one or several mails. Read window: Message tab.
    // In the Simplified Ribbon, custom groups appear on Home (or in its "..." overflow); the context menu works in both layouts.
    public string GetCustomUI(string id) {
      try {
        string xml = UiFor(id);
        Log("ribbon " + id + (xml == null ? " (not ours, nothing added)" : " ok"));
        return xml;
      } catch (Exception e) { Log("ribbon error " + e); return null; }
    }
    internal static string UiFor(string id) {
      string tabs, menus = "";
      if (id == "Microsoft.Outlook.Explorer") {
        tabs = Group("qrExp", "TabMail", ""); // no insertBeforeMso: a wrong idMso there makes Office drop the whole XML silently
        menus = "<contextMenus>" + Menu("qrCtx1", "ContextMenuMailItem") + Menu("qrCtxN", "ContextMenuMultipleItems") + "</contextMenus>";
      } else if (id == "Microsoft.Outlook.Mail.Read") tabs = Group("qrRead", "TabReadMessage", "");
      else return null;
      return "<customUI xmlns='http://schemas.microsoft.com/office/2009/07/customui'><ribbon><tabs>" + tabs + "</tabs></ribbon>" + menus + "</customUI>";
    }
    const string Tip = " screentip='Send to QR' supertip='Import the open or selected e-mails with their attachments into QR. Starts QR if needed. Nothing is sent.'";
    static string Group(string gid, string tab, string pos) { return "<tab idMso='" + tab + "'><group id='" + gid + "' label='QR' imageMso='ImportOutlook'" + pos + ">" +
        "<button id='" + gid + "Btn' label='Send to QR' size='large' showLabel='true' showImage='true' imageMso='ImportOutlook' onAction='OnSend'" + Tip + "/></group></tab>"; }
    static string Menu(string bid, string menu) { return "<contextMenu idMso='" + menu + "'><menuSeparator id='" + bid + "Sep'/><button id='" + bid + "' label='Send to QR' imageMso='ImportOutlook' onAction='OnSend'" + Tip + "/></contextMenu>"; }
    public void OnSend(Office.IRibbonControl control) {
      try {
        Log("send clicked");
        dynamic ctx = control.Context;
        var dir = Path.Combine(Path.GetTempPath(), "qr-outlook", DateTime.Now.ToString("yyyyMMdd_HHmmss_fff"));
        Directory.CreateDirectory(dir);
        int n = 0;
        Action<dynamic> save = (m) => { try { if ((int)m.Class != 43) return; n++; string s = (string)(m.Subject ?? "mail");
          foreach (var c in Path.GetInvalidFileNameChars()) s = s.Replace(c, '_'); if (s.Length > 80) s = s.Substring(0, 80);
          m.SaveAs(Path.Combine(dir, n + " " + s + ".msg"), 9); } catch (Exception e) { Log("save error " + e.Message); } };
        dynamic sel = null; object one = null;
        try { if ((int)ctx.Class == 74) sel = ctx; } catch { }                       // 74 = olSelection (right-click menu)
        if (sel == null) { try { one = ctx.CurrentItem; } catch { } }               // Inspector (opened e-mail)
        if (sel == null && one == null) sel = ctx.Selection;                       // Explorer (Home tab)
        if (one != null) save(one); else for (int i = 1; i <= (int)sel.Count; i++) save(sel[i]);
        Log("saved " + n + " -> " + dir);
        if (n == 0) { Msg("Select one or more e-mails first."); return; }
        var exe = Registry.GetValue(@"HKEY_CURRENT_USER\Software\QR", "ExePath", null) as string;
        if (string.IsNullOrEmpty(exe) || !File.Exists(exe)) { Msg("QR is not installed for this user. Reinstall QR."); return; }
        Process.Start(new ProcessStartInfo(exe, "--import \"" + dir + "\"") { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(exe) });
        Log("started QR");
      } catch (Exception e) { Log("send error " + e); try { Msg("Send to QR failed: " + e.Message); } catch { } }
    }
    static void Msg(string s) { try { System.Windows.Forms.MessageBox.Show(s, "QR"); } catch { } }
    static void Log(string s) {
      try { var d = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "QR", "logs"); Directory.CreateDirectory(d);
        File.AppendAllText(Path.Combine(d, "outlook-addin.log"), DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + " " + s + Environment.NewLine); } catch { }
    }
  }
}