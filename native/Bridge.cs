using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

internal static class Bridge
{
    private const int MaxFrameSize = 65536;
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    private static string DataDirectory {
        get {
            string test = Environment.GetEnvironmentVariable("NOTEBOOKAID_TEST_HOME"); if (test != null) return test;
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string current = Path.Combine(appData, "NotebookAid", "state");
            string legacy = Path.Combine(appData, "NotebookAid-T02");
            return File.Exists(Path.Combine(current, "bridge-runtime.json")) ? current : File.Exists(Path.Combine(legacy, "bridge-runtime.json")) ? legacy : current;
        }
    }

    private static int Main()
    {
        Stream input = Console.OpenStandardInput();
        Stream output = Console.OpenStandardOutput();
        try
        {
            while (true)
            {
                string message = ReadFrame(input, true);
                if (message == null) return 0;
                object response;
                try
                {
                    var request = Json.Deserialize<Dictionary<string, object>>(message);
                    string method = request != null && request.ContainsKey("method") ? request["method"] as string : null;
                    if (method != "status" && method != "open" && method != "start" && method != "handshake" && method != "query" && method != "organization" && method != "preview" && method != "trash" && method != "openNote" && method != "mapTags" && method != "changes" && method != "image") throw new InvalidDataException("Unsupported operation");
                    if (method == "start" || method == "status" || method == "open") response = Handle(method);
                    else response = CallCore(request);
                }
                catch (Exception error)
                {
                    response = new { ok = false, error = error is InvalidDataException ? "INVALID_REQUEST" : "BACKGROUND_UNAVAILABLE", detail = error.Message };
                }
                WriteFrame(output, Json.Serialize(response));
            }
        }
        catch (Exception) { return 1; }
    }

    private static object Handle(string method)
    {
        if (method == "start" || method == "open")
        {
            string action = method == "open" ? "open" : "status";
            try { return CallCore(action); }
            catch { LaunchIndependent(); }
            for (int attempt = 0; attempt < 100; attempt++)
            {
                Thread.Sleep(150);
                try { return CallCore(action); } catch { }
            }
            throw new IOException("Background did not become ready within 15 seconds.");
        }
        return CallCore(method);
    }

    private static object CallCore(string method) { return CallCore(new Dictionary<string, object> { { "method", method } }); }
    private static object CallCore(Dictionary<string, object> request)
    {
        string runtimePath = Path.Combine(DataDirectory, "bridge-runtime.json");
        if (!File.Exists(runtimePath)) throw new IOException("Open NotebookAid or choose Start background first.");
        var runtime = Json.Deserialize<Dictionary<string, object>>(File.ReadAllText(runtimePath));
        string pipeName = runtime["pipe"] as string;
        if (pipeName == null || !pipeName.StartsWith("NotebookAid-", StringComparison.Ordinal)) throw new InvalidDataException("Invalid endpoint");
        using (var pipe = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut))
        {
            pipe.Connect(300);
            request["token"] = runtime["token"];
            WriteFrame(pipe, Json.Serialize(request));
            return Json.DeserializeObject(ReadFrame(pipe, false));
        }
    }

    private static string ReadFrame(Stream stream, bool allowEnd)
    {
        byte[] header = new byte[4];
        int first = stream.ReadByte();
        if (first < 0)
        {
            if (allowEnd) return null;
            throw new EndOfStreamException();
        }
        header[0] = (byte)first;
        ReadExact(stream, header, 1, 3);
        int length = BitConverter.ToInt32(header, 0);
        if (length < 2 || length > MaxFrameSize) throw new InvalidDataException("Invalid frame size");
        byte[] payload = new byte[length];
        ReadExact(stream, payload, 0, length);
        return new UTF8Encoding(false, true).GetString(payload);
    }

    private static void ReadExact(Stream stream, byte[] bytes, int offset, int count)
    {
        while (count > 0)
        {
            int read = stream.Read(bytes, offset, count);
            if (read == 0) throw new EndOfStreamException();
            offset += read;
            count -= read;
        }
    }

    private static void WriteFrame(Stream stream, string message)
    {
        byte[] payload = Encoding.UTF8.GetBytes(message);
        if (payload.Length > MaxFrameSize) throw new InvalidDataException("Response too large");
        byte[] length = BitConverter.GetBytes(payload.Length);
        stream.Write(length, 0, length.Length);
        stream.Write(payload, 0, payload.Length);
        stream.Flush();
    }

    private static void LaunchIndependent()
    {
        string executable = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "NotebookAid.exe");
        if (!File.Exists(executable)) throw new FileNotFoundException("NotebookAid.exe is missing. Keep the bridge beside the application.");
        STARTUPINFO startup = new STARTUPINFO();
        startup.cb = Marshal.SizeOf(typeof(STARTUPINFO));
        startup.dwFlags = 1;
        startup.wShowWindow = 0;
        PROCESS_INFORMATION process;
        const uint flags = 0x01000000 | 0x00000008;
        if (!CreateProcess(executable, new StringBuilder("\"" + executable + "\" --background"), IntPtr.Zero, IntPtr.Zero, false, flags, IntPtr.Zero, AppDomain.CurrentDomain.BaseDirectory, ref startup, out process))
        {
            throw new IOException("Independent launch failed (Windows error " + Marshal.GetLastWin32Error() + "). Open NotebookAid manually; the bridge will not fall back to an attached child process.");
        }
        CloseHandle(process.hThread);
        CloseHandle(process.hProcess);
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
        public int dwX; public int dwY; public int dwXSize; public int dwYSize; public int dwXCountChars; public int dwYCountChars;
        public int dwFillAttribute; public int dwFlags; public short wShowWindow; public short cbReserved2;
        public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError;
    }
    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcess(string application, StringBuilder command, IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint flags, IntPtr environment, string directory, ref STARTUPINFO startup, out PROCESS_INFORMATION process);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
}
