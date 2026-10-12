using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;

// Native Windows WebAuthn client. Verification and persistence belong to the core.
internal static class Passkey {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct Rp { public uint Version; public string Id, Name, Icon; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct User { public uint Version, Length; public IntPtr Id; public string Name, Icon, Display; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct Client { public uint Version, Length; public IntPtr Json; public string Hash; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct Parameter { public uint Version; public string Type; public int Algorithm; }
  [StructLayout(LayoutKind.Sequential)] struct List { public uint Count; public IntPtr Items; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct Credential { public uint Version, Length; public IntPtr Id; public string Type; }
  [StructLayout(LayoutKind.Sequential)] struct MakeOptions {
    public uint Version, Timeout; public List Credentials, Extensions; public uint Attachment; public int Resident;
    public uint Verification, Attestation, Flags; public IntPtr Cancellation, Exclude;
    public uint Enterprise, LargeBlob; public int PreferResident, Private, Prf;
  }
  [StructLayout(LayoutKind.Sequential)] struct GetOptions {
    public uint Version, Timeout; public List Credentials, Extensions; public uint Attachment, Verification, Flags;
    public IntPtr AppId, UsedAppId, Cancellation, Allow; public uint BlobOperation, BlobLength; public IntPtr Blob, Hmac; public int Private;
  }
  [StructLayout(LayoutKind.Sequential)] struct Attestation {
    public uint Version; public IntPtr Format; public uint AuthLength; public IntPtr Auth;
    public uint AttLength; public IntPtr Att; public uint DecodeType; public IntPtr Decode;
    public uint ObjectLength; public IntPtr Object; public uint IdLength; public IntPtr Id;
  }
  [StructLayout(LayoutKind.Sequential)] struct Assertion {
    public uint Version, AuthLength; public IntPtr Auth; public uint SignatureLength; public IntPtr Signature;
    public Credential Credential; public uint UserLength; public IntPtr User;
  }
  [DllImport("webauthn.dll", ExactSpelling=true)] static extern uint WebAuthNGetApiVersionNumber();
  [DllImport("webauthn.dll", ExactSpelling=true)] static extern int WebAuthNAuthenticatorMakeCredential(IntPtr window, ref Rp rp, ref User user, ref List parameters, ref Client client, ref MakeOptions options, out IntPtr result);
  [DllImport("webauthn.dll", ExactSpelling=true, CharSet=CharSet.Unicode)] static extern int WebAuthNAuthenticatorGetAssertion(IntPtr window, string rp, ref Client client, ref GetOptions options, out IntPtr result);
  [DllImport("webauthn.dll", ExactSpelling=true)] static extern void WebAuthNFreeCredentialAttestation(IntPtr result);
  [DllImport("webauthn.dll", ExactSpelling=true)] static extern void WebAuthNFreeAssertion(IntPtr result);
  static readonly List<IntPtr> allocations = new List<IntPtr>();
  static IntPtr Bytes(byte[] bytes) { IntPtr p=Marshal.AllocHGlobal(bytes.Length); Marshal.Copy(bytes,0,p,bytes.Length); allocations.Add(p); return p; }
  static IntPtr Structure<T>(T value) { IntPtr p=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(T))); Marshal.StructureToPtr(value,p,false); allocations.Add(p); return p; }
  static byte[] Decode(string text) { text=text.Replace('-','+').Replace('_','/'); return Convert.FromBase64String(text.PadRight((text.Length+3)/4*4,'=')); }
  static string Encode(IntPtr pointer, uint length) { if(length>65536)throw new Exception(); byte[] bytes=new byte[length]; if(length>0)Marshal.Copy(pointer,bytes,0,(int)length); return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+','-').Replace('/','_'); }
  static int Main() {
    var serializer=new JavaScriptSerializer { MaxJsonLength=65536 };
    try {
      string line=Console.ReadLine(); if(line==null || line.Length>65536)throw new Exception();
      var input=serializer.Deserialize<Dictionary<string,object>>(line); uint version=WebAuthNGetApiVersionNumber();
      string action=(string)input["action"];
      if(action=="probe") { Console.WriteLine(serializer.Serialize(new { apiVersion=version, supported=version>=6 })); return 0; }
      if(version<6)throw new Exception("UNSUPPORTED");
      string rpId=(string)input["rpId"], json=(string)input["clientDataJSON"];
      byte[] clientBytes=Encoding.UTF8.GetBytes(json); var client=new Client { Version=1,Length=(uint)clientBytes.Length,Json=Bytes(clientBytes),Hash="SHA-256" };
      IntPtr window=new IntPtr(long.Parse((string)input["window"])), result;
      if(action=="create") {
        var rp=new Rp { Version=1,Id=rpId,Name="NotebookAid" }; byte[] userId=Decode((string)input["userId"]);
        var user=new User { Version=1,Length=(uint)userId.Length,Id=Bytes(userId),Name="NotebookAid local application",Display="NotebookAid" };
        var parameters=new List { Count=1, Items=Structure(new Parameter { Version=1,Type="public-key",Algorithm=-7 }) };
        var options=new MakeOptions { Version=6,Timeout=120000,Resident=1,Verification=1,Attestation=1 };
        int error=WebAuthNAuthenticatorMakeCredential(window,ref rp,ref user,ref parameters,ref client,ref options,out result);
        if(error!=0)throw new Exception("0x"+error.ToString("X8"));
        try { var value=(Attestation)Marshal.PtrToStructure(result,typeof(Attestation)); string id=Encode(value.Id,value.IdLength);
          Console.WriteLine(serializer.Serialize(new { id=id,rawId=id,type="public-key",response=new {clientDataJSON=Encode(client.Json,client.Length),attestationObject=Encode(value.Object,value.ObjectLength)},clientExtensionResults=new {} }));
        } finally { WebAuthNFreeCredentialAttestation(result); }
      } else if(action=="get") {
        // A discoverable credential lets Windows offer the phone/QR workflow.
        var options=new GetOptions { Version=6,Timeout=120000,Verification=1 };
        int error=WebAuthNAuthenticatorGetAssertion(window,rpId,ref client,ref options,out result);
        if(error!=0)throw new Exception("0x"+error.ToString("X8"));
        try { var value=(Assertion)Marshal.PtrToStructure(result,typeof(Assertion)); string id=Encode(value.Credential.Id,value.Credential.Length);
          Console.WriteLine(serializer.Serialize(new {id=id,rawId=id,type="public-key",response=new {clientDataJSON=Encode(client.Json,client.Length),authenticatorData=Encode(value.Auth,value.AuthLength),signature=Encode(value.Signature,value.SignatureLength),userHandle=Encode(value.User,value.UserLength)},clientExtensionResults=new {} }));
        } finally { WebAuthNFreeAssertion(result); }
      } else throw new Exception();
      return 0;
    } catch(Exception error) { Console.WriteLine(serializer.Serialize(new { error=error is DllNotFoundException || error is EntryPointNotFoundException ? "UNSUPPORTED" : error.Message.StartsWith("0x") ? error.Message : "PASSKEY_FAILED" })); return 1; }
    finally { foreach(IntPtr pointer in allocations)Marshal.FreeHGlobal(pointer); }
  }
}
