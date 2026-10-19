using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;

// Per-user Windows DPAPI only; input/output are private inherited process pipes.
internal static class McpCrypt {
  static int Main() {
    byte[] inputBytes = null, outputBytes = null;
    try {
      var json = new JavaScriptSerializer { MaxJsonLength = 32768 };
      string line = Console.ReadLine();
      if (line == null || line.Length > 32768) throw new Exception();
      var request = json.Deserialize<Dictionary<string, string>>(line);
      if (request.Count != 2) throw new Exception();
      bool protect = request["action"] == "protect";
      if (!protect && request["action"] != "unprotect") throw new Exception();
      inputBytes = protect ? Encoding.UTF8.GetBytes(request["value"]) : Convert.FromBase64String(request["value"]);
      if (inputBytes.Length > 16384) throw new Exception();
      outputBytes = protect ? ProtectedData.Protect(inputBytes, null, DataProtectionScope.CurrentUser) : ProtectedData.Unprotect(inputBytes, null, DataProtectionScope.CurrentUser);
      Console.WriteLine(json.Serialize(new { value = protect ? Convert.ToBase64String(outputBytes) : Encoding.UTF8.GetString(outputBytes) }));
      return 0;
    } catch { Console.WriteLine("{\"error\":\"SECURE_STORAGE_UNAVAILABLE\"}"); return 1; }
    finally { if (inputBytes != null) Array.Clear(inputBytes, 0, inputBytes.Length); if (outputBytes != null) Array.Clear(outputBytes, 0, outputBytes.Length); }
  }
}
