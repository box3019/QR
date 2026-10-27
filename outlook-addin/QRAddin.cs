// QR "Send to QR" Outlook ribbon button. Plain COM add-in (no VSTO, no macros, no admin):
// registered per-user under HKCU by the QR installer. Saves the open or selected e-mails as .msg
// into %TEMP%\qr-outlook\<stamp> and starts QR.exe --import <dir> (QR's path from HKCU\Software\QR\ExePath).
using System; using System.Diagnostics; using System.IO; using System.Runtime.InteropServices; using Microsoft.Win32;

namespace QR.OutlookAddin {
  [ComImport, Guid("B65AD801-ABAF-11D0-BB8B-00A0C90F2744"), InterfaceType(ComInterfaceType.InterfaceIsDual)]
  public interface IDTExtensibility2 {
    [DispId(1)] void OnConnection([MarshalAs(UnmanagedType.IDispatch)] object app, int mode, [MarshalAs(UnmanagedType.IDispatch)] object addin, ref Array custom);
    [DispId(2)] void OnDisconnection(int mode, ref Array custom);
    [DispId(3)] void OnAddInsUpdate(ref Array custom);
    [DispId(4)] void OnStartupComplete(ref Array custom);
    [DispId(5)] void OnBeginShutdown(ref Array custom);
  }
  [ComImport, Guid("000C0396-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsDual)]
  public interface IRibbonExtensibility { [DispId(1)] string GetCustomUI(string ribbonId); }

  [ComVisible(true), Guid("6C1D5E0A-3B7F-4E2A-9A51-0F4B2C7D8E91"), ProgId("QR.OutlookAddin"), ClassInterface(ClassInterfaceType.AutoDispatch)]
  public class Connect : IDTExtensibility2, IRibbonExtensibility {
    object app;
    public void OnConnection(object a, int mode, object addin, ref Array custom) { app = a; }
    public void OnDisconnection(int mode, ref Array custom) { app = null; }
    public void OnAddInsUpdate(ref Array custom) { }
    public void OnStartupComplete(ref Array custom) { }
    public void OnBeginShutdown(ref Array custom) { }

    public string GetCustomUI(string id) {
      string tabs = id == "Microsoft.Outlook.Explorer" ? Btn("qrExp", "TabMail")
        : id == "Microsoft.Outlook.Mail.Read" ? Btn("qrRead", "TabReadMessage").Replace(" insertBeforeMso='GroupMoveActions'", "") : null;
      if (tabs == null) return null;
      return "<customUI xmlns='http://schemas.microsoft.com/office/2009/07/customui'><ribbon><tabs>" + tabs + "</tabs></ribbon></customUI>";
    }
    static string Btn(string gid, string tab) { return "<tab idMso='" + tab + "'><group id='" + gid + "' label='QR' insertBeforeMso='GroupMoveActions'>" +
        "<button id='" + gid + "Btn' label='Send to QR' size='large' imageMso='ImportOutlook' onAction='OnSend' screentip='Send to QR' supertip='Import the open or selected e-mails with their attachments into QR. Starts QR if needed. Nothing is sent.'/></group></tab>"; }

    public void OnSend(object control) {
      try {
        dynamic ctx = ((dynamic)control).Context;
        var dir = Path.Combine(Path.GetTempPath(), "qr-outlook", DateTime.Now.ToString("yyyyMMdd_HHmmss_fff"));
        Directory.CreateDirectory(dir);
        int n = 0;
        Action<dynamic> save = (m) => { if ((int)m.Class != 43) return; n++; string s = (string)(m.Subject ?? "mail");
          foreach (var c in Path.GetInvalidFileNameChars()) s = s.Replace(c, '_'); if (s.Length > 80) s = s.Substring(0, 80);
          m.SaveAs(Path.Combine(dir, n + " " + s + ".msg"), 9); };
        bool isInspector = false; try { object probe = ctx.CurrentItem; isInspector = probe != null; } catch { }
        if (isInspector) save(ctx.CurrentItem); else { dynamic sel = ctx.Selection; for (int i = 1; i <= (int)sel.Count; i++) save(sel[i]); }
        if (n == 0) { Msg("Select one or more e-mails first."); return; }
        var exe = Registry.GetValue(@"HKEY_CURRENT_USER\Software\QR", "ExePath", null) as string;
        if (string.IsNullOrEmpty(exe) || !File.Exists(exe)) { Msg("QR is not installed for this user (HKCU\\Software\\QR\\ExePath missing). Reinstall QR."); return; }
        Process.Start(new ProcessStartInfo(exe, "--import \"" + dir + "\"") { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(exe) });
      } catch (Exception e) { Msg("Send to QR failed: " + e.Message); }
    }
    static void Msg(string s) { System.Windows.Forms.MessageBox.Show(s, "QR"); }
  }
}
