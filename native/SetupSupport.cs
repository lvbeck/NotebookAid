using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Web.Script.Serialization;
using Microsoft.Win32;

internal static class SetupSupport
{
    private const string Owner = "NotebookAid.Installation.v1";
    private const string CurrentHost = "de.zub_systems.notebookaid";
    private const string LegacyHost = "de.zub_systems.notebookaid_t02";
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 4 * 1024 * 1024 };
    public sealed class Inventory { public string owner; public string version; public Dictionary<string, string> files; }
    public sealed class Installation { public string owner; public string locale; public string scope; public bool desktopShortcut; public bool startMenuShortcut; }
    public sealed class BackupRecord { public string owner; public string root; public string scope; public Dictionary<string, string> hashes; public Dictionary<string, string> hosts; }
    private static string Hash(string path) { using (var sha = SHA256.Create()) using (var input = File.OpenRead(path)) return BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "").ToLowerInvariant(); }
    private static void Plain(string path)
    {
        for (string current = Path.GetFullPath(path); current != null; current = Path.GetDirectoryName(current))
            if ((Directory.Exists(current) || File.Exists(current)) && (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0) throw new IOException("Linked path rejected: " + current);
    }
    private static string Child(string root, string relative)
    {
        string path = Path.GetFullPath(Path.Combine(root, relative));
        if (Path.IsPathRooted(relative) || !path.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new IOException("Unsafe inventory path.");
        Plain(path); return path;
    }
    private static Inventory ReadInventory(string root)
    {
        var file = Child(root, "installation-files.json");
        if (new FileInfo(file).Length > 4 * 1024 * 1024) throw new IOException("Inventory too large.");
        var value = Json.Deserialize<Inventory>(File.ReadAllText(file));
        if (value == null || value.owner != Owner || value.files == null || value.files.Count == 0 || value.files.Count > 10000) throw new IOException("Unowned installation directory.");
        foreach (var item in value.files) { Child(root, item.Key); if (item.Value == null || item.Value.Length != 64 || item.Value.Any(c => !Uri.IsHexDigit(c))) throw new IOException("Invalid inventory hash."); }
        return value;
    }
    private static void Idle()
    {
#if SETUP_TEST
        if (Environment.GetEnvironmentVariable("NOTEBOOKAID_SETUP_TEST_BUSY") == "1") throw new IOException("Simulated running application.");
#else
        foreach (string name in new[] { "NotebookAid", "NotebookAid.Bridge", "NotebookAid.Passkey", "NotebookAid.Print" })
            if (Process.GetProcessesByName(name).Length != 0) throw new IOException("Exit NotebookAid and its native helpers before installation or removal.");
#endif
    }
    private static void Check(string root)
    {
        Plain(root); Idle();
        if (!Directory.Exists(root) || !Directory.EnumerateFileSystemEntries(root).Any()) return;
        var inventory = ReadInventory(root);
        foreach (var path in Walk(root))
        {
            Plain(path);
            string relative = path.Substring(root.Length + 1).Replace('\\', '/');
            if (Directory.Exists(path)) {
                if (!inventory.files.Keys.Any(name => name.StartsWith(relative + "/", StringComparison.OrdinalIgnoreCase))) throw new IOException("Unknown directory; preserve user data: " + relative);
            } else if (!inventory.files.ContainsKey(relative) && !new[] { "installation-files.json", "installation.json", "native-host.json", "native-host-legacy.json", "Uninstall NotebookAid.exe", "uninstallerIcon.ico" }.Contains(relative))
                throw new IOException("Unknown file; preserve user data: " + relative);
        }
    }
    private static IEnumerable<string> Walk(string root)
    {
        foreach (string path in Directory.EnumerateFileSystemEntries(root)) {
            Plain(path); yield return path;
            if (Directory.Exists(path)) foreach (string child in Walk(path)) yield return child;
        }
    }
    private static RegistryKey RegistryRoot(string scope)
    {
#if SETUP_TEST
        return RegistryKey.OpenBaseKey(RegistryHive.CurrentUser, RegistryView.Registry64);
#else
        return RegistryKey.OpenBaseKey(scope == "machine" ? RegistryHive.LocalMachine : RegistryHive.CurrentUser, RegistryView.Registry64);
#endif
    }
    private static string Key(string host) {
#if SETUP_TEST
        string test = Environment.GetEnvironmentVariable("NOTEBOOKAID_SETUP_TEST_REGISTRY");
        if (String.IsNullOrEmpty(test) || !System.Text.RegularExpressions.Regex.IsMatch(test, @"^Software\\NotebookAid\\SetupTests\\[a-f0-9]{32}$")) throw new IOException("Missing isolated test registry.");
        return test + "\\" + host;
#else
        return "Software\\Mozilla\\NativeMessagingHosts\\" + host;
#endif
    }
    private static void CheckHosts(string root, string scope)
    {
        using (var registry = RegistryRoot(scope)) foreach (string host in new[] { CurrentHost, LegacyHost }) using (var key = registry.OpenSubKey(Key(host)))
        {
            if (key == null) continue;
            string path = key.GetValue("") as string;
            if (path == null && key.ValueCount == 0 && key.SubKeyCount == 0) continue;
            if (path == Path.Combine(root, host == CurrentHost ? "native-host.json" : "native-host-legacy.json")) continue;
            // Only migrate a manifest identifying the exact NotebookAid host and bridge.
            if (String.IsNullOrEmpty(path) || !File.Exists(path)) throw new IOException("Conflicting native host registration: " + host);
            Plain(path);
            if (new FileInfo(path).Length > 1024 * 1024) throw new IOException("Native manifest too large.");
            var document = Json.Deserialize<Dictionary<string, object>>(File.ReadAllText(path));
            if (!document.ContainsKey("name") || (string)document["name"] != host || !document.ContainsKey("path") || Path.GetFileName((string)document["path"]) != "NotebookAid.Bridge.exe" || !document.ContainsKey("type") || (string)document["type"] != "stdio") throw new IOException("Foreign native host registration rejected.");
        }
    }
    private static Dictionary<string, string> SnapshotHosts(string scope)
    {
        var values = new Dictionary<string, string>();
        using (var registry = RegistryRoot(scope)) foreach (string host in new[] { CurrentHost, LegacyHost }) using (var key = registry.OpenSubKey(Key(host))) values[host] = key == null ? null : key.GetValue("") as string;
        return values;
    }
    private static void RestoreHosts(string scope, Dictionary<string, string> values)
    {
        using (var registry = RegistryRoot(scope)) foreach (var item in values) {
            if (item.Value == null) registry.DeleteSubKey(Key(item.Key), false);
            else using (var key = registry.CreateSubKey(Key(item.Key))) key.SetValue("", item.Value, RegistryValueKind.String);
        }
    }
    private static string Backup(string root, string scope)
    {
        Check(root); CheckHosts(root, scope);
        string basePath = Environment.GetEnvironmentVariable("NOTEBOOKAID_SETUP_TEST_BACKUPS") ?? Path.Combine(Environment.GetFolderPath(scope == "machine" ? Environment.SpecialFolder.CommonApplicationData : Environment.SpecialFolder.LocalApplicationData), "NotebookAid", "installer-backups");
        Plain(basePath); Directory.CreateDirectory(basePath);
        string backup = Path.Combine(basePath, DateTime.UtcNow.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N"));
        if (scope == "machine") {
            var security = new DirectorySecurity(); security.SetAccessRuleProtection(true, false);
            foreach (var sid in new[] { WellKnownSidType.BuiltinAdministratorsSid, WellKnownSidType.LocalSystemSid })
                security.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(sid, null), FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
            Directory.CreateDirectory(backup, security);
        } else Directory.CreateDirectory(backup);
        var hashes = new Dictionary<string, string>();
        if (Directory.Exists(root)) foreach (var file in Walk(root).Where(File.Exists)) {
            string name = file.Substring(root.Length + 1); string destination = Child(backup, "files/" + name);
            Directory.CreateDirectory(Path.GetDirectoryName(destination)); File.Copy(file, destination); hashes[name] = Hash(file);
            if (Hash(destination) != hashes[name]) throw new IOException("Backup hash mismatch.");
        }
        File.WriteAllText(Path.Combine(backup, "backup.json"), Json.Serialize(new { owner = Owner, root = root, scope = scope, hashes = hashes, hosts = SnapshotHosts(scope) }));
        Console.WriteLine(backup); return backup;
    }
    private static string[] ShortcutPaths(string scope)
    {
#if SETUP_TEST
        string test = Environment.GetEnvironmentVariable("NOTEBOOKAID_SETUP_TEST_LINKS");
        if (String.IsNullOrEmpty(test)) return new string[0];
        Plain(test); return new[] { Path.Combine(test, "Desktop", "NotebookAid.lnk"), Path.Combine(test, "Programs", "NotebookAid.lnk") };
#else
        string desktop = Environment.GetFolderPath(scope == "machine" ? Environment.SpecialFolder.CommonDesktopDirectory : Environment.SpecialFolder.DesktopDirectory);
        string menu = Environment.GetFolderPath(scope == "machine" ? Environment.SpecialFolder.CommonPrograms : Environment.SpecialFolder.Programs);
        if (String.IsNullOrEmpty(desktop) || String.IsNullOrEmpty(menu) || !Path.IsPathRooted(desktop) || !Path.IsPathRooted(menu)) throw new IOException("Windows shortcut folders are unavailable.");
        return new[] { Path.Combine(desktop, "NotebookAid.lnk"), Path.Combine(menu, "NotebookAid.lnk") };
#endif
    }
    private static void Shortcut(string path, string executable, bool enabled)
    {
        Plain(path); object shell = null, link = null;
        try {
            shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
            link = shell.GetType().InvokeMember("CreateShortcut", System.Reflection.BindingFlags.InvokeMethod, null, shell, new object[] { path });
            string existing = link.GetType().InvokeMember("TargetPath", System.Reflection.BindingFlags.GetProperty, null, link, null) as string;
            if (File.Exists(path) && !String.Equals(existing, executable, StringComparison.OrdinalIgnoreCase)) {
                if (enabled) throw new IOException("A different application owns this shortcut: " + path);
                return;
            }
            if (!enabled) { if (File.Exists(path)) File.Delete(path); return; }
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            link.GetType().InvokeMember("TargetPath", System.Reflection.BindingFlags.SetProperty, null, link, new object[] { executable });
            link.GetType().InvokeMember("WorkingDirectory", System.Reflection.BindingFlags.SetProperty, null, link, new object[] { Path.GetDirectoryName(executable) });
            link.GetType().InvokeMember("IconLocation", System.Reflection.BindingFlags.SetProperty, null, link, new object[] { executable + ",0" });
            link.GetType().InvokeMember("Save", System.Reflection.BindingFlags.InvokeMethod, null, link, null);
        } finally {
            if (link != null) System.Runtime.InteropServices.Marshal.FinalReleaseComObject(link);
            if (shell != null) System.Runtime.InteropServices.Marshal.FinalReleaseComObject(shell);
        }
    }
    private static void Finish(string root, string scope, string locale, bool desktop, bool menu)
    {
        CheckHosts(root, scope); var inventory = ReadInventory(root);
        foreach (var item in inventory.files) if (Hash(Child(root, item.Key)) != item.Value) throw new IOException("Installed file verification failed: " + item.Key);
        var previous = SnapshotHosts(scope);
        try {
            foreach (string host in new[] { CurrentHost, LegacyHost }) {
                string file = Path.Combine(root, host == CurrentHost ? "native-host.json" : "native-host-legacy.json");
                File.WriteAllText(file, Json.Serialize(new { name = host, description = "NotebookAid bridge", path = Path.Combine(root, "NotebookAid.Bridge.exe"), type = "stdio", allowed_extensions = new[] { host == CurrentHost ? "notebookaid@zub-systems.de" : "notebookaid-t02@zub-systems.de" } }));
                using (var registry = RegistryRoot(scope)) using (var key = registry.CreateSubKey(Key(host))) key.SetValue("", file, RegistryValueKind.String);
            }
            var links = ShortcutPaths(scope); string executable = Path.Combine(root, "NotebookAid.exe");
            if (links.Length == 2) { Shortcut(links[0], executable, desktop); Shortcut(links[1], executable, menu); }
            File.WriteAllText(Path.Combine(root, "installation.json"), Json.Serialize(new Installation { owner = Owner, scope = scope, locale = locale, desktopShortcut = desktop, startMenuShortcut = menu }));
        } catch { RestoreHosts(scope, previous); throw; }
    }
    private static void Remove(string root, string scope)
    {
        Check(root);
        foreach (string link in ShortcutPaths(scope)) Shortcut(link, Path.Combine(root, "NotebookAid.exe"), false);
        using (var registry = RegistryRoot(scope)) foreach (string host in new[] { CurrentHost, LegacyHost }) using (var key = registry.OpenSubKey(Key(host))) {
            string expected = Path.Combine(root, host == CurrentHost ? "native-host.json" : "native-host-legacy.json");
            if (key != null && String.Equals(key.GetValue("") as string, expected, StringComparison.OrdinalIgnoreCase)) { key.Close(); registry.DeleteSubKey(Key(host), false); }
        }
    }
    private static void Purge(string root)
    {
        Check(root); var inventory = ReadInventory(root);
        foreach (string name in inventory.files.Keys) if (name != "NotebookAid.SetupSupport.exe") File.Delete(Child(root, name));
        foreach (string name in new[] { "installation.json", "installation-files.json", "native-host.json", "native-host-legacy.json" }) File.Delete(Child(root, name));
        foreach (string directory in Directory.GetDirectories(root, "*", SearchOption.AllDirectories).OrderByDescending(p => p.Length)) Directory.Delete(directory, false);
    }
    private static void Restore(string root, string scope, string backup)
    {
        backup = Path.GetFullPath(backup).TrimEnd(Path.DirectorySeparatorChar); Plain(backup); Check(root);
        var record = Json.Deserialize<BackupRecord>(File.ReadAllText(Child(backup, "backup.json")));
        if (record.owner != Owner || !String.Equals(record.root, root, StringComparison.OrdinalIgnoreCase) || record.scope != scope || record.hashes == null || record.hashes.Count == 0) throw new IOException("Backup does not match this installation.");
        if (record.hosts == null || record.hosts.Count != 2 || !record.hosts.ContainsKey(CurrentHost) || !record.hosts.ContainsKey(LegacyHost)) throw new IOException("Invalid bridge rollback snapshot.");
        foreach (var item in record.hashes) if (Hash(Child(backup, "files/" + item.Key)) != item.Value) throw new IOException("Backup file verification failed.");
        // Preserve a copy of the failed installation before replacing program files.
        Backup(root, scope);
        foreach (var item in record.hashes) {
            string destination = Child(root, item.Key); Directory.CreateDirectory(Path.GetDirectoryName(destination));
            File.Copy(Child(backup, "files/" + item.Key), destination, true);
            if (Hash(destination) != item.Value) throw new IOException("Restored file verification failed.");
        }
        RestoreHosts(scope, record.hosts);
    }
    private static int Main(string[] args)
    {
        try {
#if MSI_UPDATE
            if (args.Length > 0 && args[0].StartsWith("msi-", StringComparison.Ordinal)) return MsiUpdate.Run(args);
#endif
            if (args.Length < 3 || (args[2] != "user" && args[2] != "machine")) throw new IOException("Invalid setup arguments.");
            string operation = args[0], root = Path.GetFullPath(args[1]).TrimEnd(Path.DirectorySeparatorChar), scope = args[2];
            if (root == Path.GetPathRoot(root).TrimEnd(Path.DirectorySeparatorChar)) throw new IOException("Drive root rejected.");
#if !SETUP_TEST
            if (scope == "machine" && !root.StartsWith(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new IOException("All-users installation must use a subfolder of Program Files.");
#endif
            if (operation == "check") { Check(root); CheckHosts(root, scope); }
            else if (operation == "check-root") Check(root);
            else if (operation == "backup") Backup(root, scope);
            else if (operation == "finish" && (args.Length == 4 || (args.Length == 6 && new[] { "0", "1" }.Contains(args[4]) && new[] { "0", "1" }.Contains(args[5]))) && new[] { "en", "de", "fr", "it", "es", "pt-PT", "ja", "ko", "zh-CN", "zh-TW" }.Contains(args[3])) Finish(root, scope, args[3], args.Length == 6 && args[4] == "1", args.Length == 4 || args[5] == "1");
            else if (operation == "remove") Remove(root, scope);
            else if (operation == "purge") Purge(root);
            else if (operation == "restore" && args.Length == 4) Restore(root, scope, args[3]);
            else throw new IOException("Unsupported setup operation.");
            return 0;
        } catch (Exception error) { Console.Error.WriteLine(error.Message); return 1; }
    }
}
