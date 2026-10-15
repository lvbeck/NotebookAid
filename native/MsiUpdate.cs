using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Web.Script.Serialization;
using System.Collections.Generic;

internal static class MsiUpdate
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] private struct FileInfo { public uint size; public string file; public IntPtr handle; public IntPtr subject; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] private struct TrustData { public uint size; public IntPtr policy; public IntPtr sip; public uint ui; public uint revocation; public uint choice; public IntPtr file; public uint action; public IntPtr state; public string url; public uint flags; public uint context; }
    [DllImport("wintrust.dll", ExactSpelling = true, SetLastError = true)] private static extern int WinVerifyTrust(IntPtr window, [In] ref Guid action, ref TrustData data);
    [DllImport("wintrust.dll")] private static extern IntPtr WTHelperProvDataFromStateData(IntPtr state);
    [DllImport("wintrust.dll")] private static extern IntPtr WTHelperGetProvSignerFromChain(IntPtr data, uint index, bool countersigner, uint counterIndex);
    [DllImport("wintrust.dll")] private static extern IntPtr WTHelperGetProvCertFromChain(IntPtr signer, uint index);
    [DllImport("msi.dll", CharSet = CharSet.Unicode)] private static extern uint MsiOpenDatabase(string path, IntPtr mode, out uint database);
    [DllImport("msi.dll", CharSet = CharSet.Unicode)] private static extern uint MsiDatabaseOpenView(uint database, string query, out uint view);
    [DllImport("msi.dll")] private static extern uint MsiViewExecute(uint view, uint record);
    [DllImport("msi.dll")] private static extern uint MsiViewFetch(uint view, out uint record);
    [DllImport("msi.dll", CharSet = CharSet.Unicode)] private static extern uint MsiRecordGetString(uint record, uint field, StringBuilder value, ref uint length);
    [DllImport("msi.dll")] private static extern uint MsiCloseHandle(uint handle);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int MessageBox(IntPtr window, string text, string title, uint type);
    private static string Hash(string path) { using (var sha = SHA256.Create()) using (var stream = File.OpenRead(path)) return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant(); }
    private static void Plain(string path) { for (string current = path; current != null; current = Path.GetDirectoryName(current)) if ((File.Exists(current) || Directory.Exists(current)) && (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0) throw new IOException("Linked update paths are not allowed."); }
    private static Dictionary<string, object> Json(string file) { if (new System.IO.FileInfo(file).Length > 32768) throw new IOException("Update configuration too large."); return new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(file)); }
    private static void VerifySignature(string file, string publisher)
    {
        var info = new FileInfo { size = (uint)Marshal.SizeOf(typeof(FileInfo)), file = file };
        IntPtr memory = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(FileInfo))); Marshal.StructureToPtr(info, memory, false);
        Guid action = new Guid("00AAC56B-CD44-11D0-8CC2-00C04FC295EE");
        var data = new TrustData { size = (uint)Marshal.SizeOf(typeof(TrustData)), ui = 2, revocation = 1, choice = 1, file = memory, action = 1, flags = 0x80 };
        try {
            if (WinVerifyTrust(new IntPtr(-1), ref action, ref data) != 0) throw new IOException("The MSI Authenticode signature is not trusted.");
            IntPtr provider = WTHelperProvDataFromStateData(data.state);
            IntPtr signer = provider == IntPtr.Zero ? IntPtr.Zero : WTHelperGetProvSignerFromChain(provider, 0, false, 0);
            IntPtr certificate = signer == IntPtr.Zero ? IntPtr.Zero : WTHelperGetProvCertFromChain(signer, 0);
            if (certificate == IntPtr.Zero) throw new IOException("Missing MSI signer certificate.");
            using (var cert = new X509Certificate2(Marshal.ReadIntPtr(certificate, IntPtr.Size == 8 ? 8 : 4)))
                if (!String.Equals(cert.GetNameInfo(X509NameType.SimpleName, false), publisher, StringComparison.Ordinal)) throw new IOException("The MSI publisher does not match the configured publisher.");
        } finally { data.action = 2; WinVerifyTrust(new IntPtr(-1), ref action, ref data); Marshal.DestroyStructure(memory, typeof(FileInfo)); Marshal.FreeHGlobal(memory); }
    }
    private static string Property(uint database, string name)
    {
        uint view = 0, record = 0;
        try {
            if (MsiDatabaseOpenView(database, "SELECT `Value` FROM `Property` WHERE `Property`='" + name + "'", out view) != 0 || MsiViewExecute(view, 0) != 0 || MsiViewFetch(view, out record) != 0) throw new IOException("Cannot read MSI product identity.");
            uint length = 1024; var value = new StringBuilder((int)length);
            if (MsiRecordGetString(record, 1, value, ref length) != 0) throw new IOException("Invalid MSI product identity."); return value.ToString();
        } finally { if (record != 0) MsiCloseHandle(record); if (view != 0) MsiCloseHandle(view); }
    }
    public static int Run(string[] args)
    {
        bool apply = args.Length > 0 && args[0] == "msi-apply";
        try {
            if (args.Length != (apply ? 7 : 6) || (!apply && args[0] != "msi-verify")) throw new IOException("Invalid MSI update arguments.");
            string file = Path.GetFullPath(args[1]), version = args[2], publisher = args[3], hash = args[4], root = Path.GetFullPath(args[5]).TrimEnd(Path.DirectorySeparatorChar);
            if (!System.Text.RegularExpressions.Regex.IsMatch(version, @"^\d+\.\d+\.\d+$") || !System.Text.RegularExpressions.Regex.IsMatch(hash, @"^[a-f0-9]{64}$") || String.IsNullOrWhiteSpace(publisher) || publisher.Length > 256 || Path.GetFileName(file) != "NotebookAid-" + version + "-Setup-x64.msi") throw new IOException("Invalid MSI update identity.");
            Plain(root); Plain(file);
            if (root.Contains("\"") || file.Contains("\"")) throw new IOException("Invalid update path.");
            string executable = Path.Combine(root, "NotebookAid.SetupSupport.exe"); Plain(executable);
            // A detached copy keeps the installed helper free for Windows Installer replacement.
            if (Hash(Assembly.GetExecutingAssembly().Location) != Hash(executable)) throw new IOException("The update worker differs from the installed helper.");
            var installation = Json(Path.Combine(root, "installation.json"));
            if (!installation.ContainsKey("owner") || (string)installation["owner"] != "NotebookAid.Installation.v1" || !installation.ContainsKey("installer") || (string)installation["installer"] != "msi" || !installation.ContainsKey("scope") || ((string)installation["scope"] != "user" && (string)installation["scope"] != "machine")) throw new IOException("The installed application is not an MSI installation.");
            using (var locked = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                if (Hash(file) != hash) throw new IOException("MSI checksum mismatch.");
                VerifySignature(file, publisher);
                uint database;
                if (MsiOpenDatabase(file, IntPtr.Zero, out database) != 0) throw new IOException("Cannot inspect the MSI database.");
                try {
                    if (Property(database, "ProductName") != "NotebookAid" || Property(database, "ProductVersion") != version || Property(database, "UpgradeCode") != "{2A38E827-A9E4-4B31-A9D5-ED345CB44129}") throw new IOException("The MSI product identity does not match NotebookAid.");
                } finally { MsiCloseHandle(database); }
                if (!apply) { Console.WriteLine("NotebookAid MSI update verified."); return 0; }
                if (new Version(version) <= new Version(Assembly.GetExecutingAssembly().GetName().Version.ToString(3))) throw new IOException("MSI update is not newer than the installed version.");
                int parentId; if (!Int32.TryParse(args[6], out parentId) || parentId <= 0) throw new IOException("Missing parent application process.");
                try { using (var parent = Process.GetProcessById(parentId)) if (!parent.WaitForExit(60000)) throw new IOException("NotebookAid did not exit; update was not started."); } catch (ArgumentException) { }
                string arguments = "/i \"" + file + "\" /norestart INSTALLFOLDER=\"" + root + "\"" + ((string)installation["scope"] == "machine" ? " ALLUSERS=1" : " ALLUSERS=2 MSIINSTALLPERUSER=1");
                var start = new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "msiexec.exe"), arguments) { UseShellExecute = true };
                if ((string)installation["scope"] == "machine") start.Verb = "runas";
                using (var process = Process.Start(start)) { process.WaitForExit(); if (process.ExitCode != 0 && process.ExitCode != 1602 && process.ExitCode != 3010) throw new IOException("Windows Installer returned " + process.ExitCode + "."); }
            }
            return 0;
        } catch (Exception error) { if (apply) MessageBox(IntPtr.Zero, error.Message, "NotebookAid update", 16); else Console.Error.WriteLine(error.Message); return 1; }
    }
}
