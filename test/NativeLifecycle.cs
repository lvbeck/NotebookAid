using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

internal static class NativeLifecycle
{
    private static int Main(string[] args)
    {
        IntPtr job = IntPtr.Zero;
        Process bridge = null;
        Process desktop = null;
        var json = new JavaScriptSerializer();
        try
        {
            job = CreateJobObject(IntPtr.Zero, null);
            if (job == IntPtr.Zero) throw new Exception("CreateJobObject failed");
            var limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            limits.BasicLimitInformation.LimitFlags = 0x00002000 | 0x00000800;
            int size = Marshal.SizeOf(limits);
            IntPtr pointer = Marshal.AllocHGlobal(size);
            try
            {
                Marshal.StructureToPtr(limits, pointer, false);
                if (!SetInformationJobObject(job, 9, pointer, (uint)size)) throw new Exception("SetInformationJobObject failed: " + Marshal.GetLastWin32Error());
            }
            finally { Marshal.FreeHGlobal(pointer); }
            bridge = Process.Start(new ProcessStartInfo(args[0]) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true });
            if (!AssignProcessToJobObject(job, bridge.Handle)) throw new Exception("AssignProcessToJobObject failed: " + Marshal.GetLastWin32Error());
            byte[] request = Encoding.UTF8.GetBytes("{\"method\":\"start\"}");
            bridge.StandardInput.BaseStream.Write(BitConverter.GetBytes(request.Length), 0, 4);
            bridge.StandardInput.BaseStream.Write(request, 0, request.Length);
            bridge.StandardInput.BaseStream.Flush();
            byte[] header = Read(bridge.StandardOutput.BaseStream, 4);
            int length = BitConverter.ToInt32(header, 0);
            if (length <= 0 || length > 65536) throw new Exception("Invalid response length");
            string response = Encoding.UTF8.GetString(Read(bridge.StandardOutput.BaseStream, length));
            var result = json.Deserialize<Dictionary<string, object>>(response);
            if (!(bool)result["ok"]) throw new Exception(response);
            int desktopPid = Convert.ToInt32(result["pid"]);
            desktop = Process.GetProcessById(desktopPid);
            bool inJob;
            if (!IsProcessInJob(desktop.Handle, job, out inJob)) throw new Exception("IsProcessInJob failed");
            if (inJob) throw new Exception("Desktop remains attached to bridge job");
            CloseHandle(job); job = IntPtr.Zero;
            bridge.WaitForExit(5000);
            Thread.Sleep(800);
            desktop.Refresh();
            if (!bridge.HasExited || desktop.HasExited) throw new Exception("Background lifecycle failed");
            Console.WriteLine(json.Serialize(new { ok = true, desktopPid = desktopPid, bridgeTerminatedWithJob = bridge.HasExited, desktopOutsideBridgeJob = !inJob, desktopSurvived = !desktop.HasExited, simulatedJob = true }));
            return 0;
        }
        catch (Exception error) { Console.Error.WriteLine(error.Message); return 1; }
        finally
        {
            if (job != IntPtr.Zero) CloseHandle(job);
            if (bridge != null) { try { if (!bridge.HasExited) bridge.Kill(); } catch { } bridge.Dispose(); }
            if (desktop != null) { try { if (!desktop.HasExited) { desktop.Kill(); desktop.WaitForExit(5000); } } catch { } desktop.Dispose(); }
        }
    }
    private static byte[] Read(Stream stream, int count)
    {
        byte[] data = new byte[count]; int offset = 0;
        while (offset < count) { int size = stream.Read(data, offset, count - offset); if (size == 0) throw new EndOfStreamException(); offset += size; }
        return data;
    }
    [StructLayout(LayoutKind.Sequential)] private struct IO_COUNTERS { public ulong a, b, c, d, e, f; }
    [StructLayout(LayoutKind.Sequential)] private struct JOBOBJECT_BASIC_LIMIT_INFORMATION { public long PerProcessUserTimeLimit, PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass, SchedulingClass; }
    [StructLayout(LayoutKind.Sequential)] private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION { public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation; public IO_COUNTERS IoInfo; public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed; }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] private static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError=true)] private static extern bool SetInformationJobObject(IntPtr job, int informationClass, IntPtr information, uint length);
    [DllImport("kernel32.dll", SetLastError=true)] private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError=true)] private static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
}
