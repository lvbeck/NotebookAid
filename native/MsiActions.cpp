#define UNICODE
#define _UNICODE
#include <windows.h>
#include <msiquery.h>
#include <tlhelp32.h>
#include <shlobj.h>
#include <shlwapi.h>
#include <string>
#include <vector>
#include <stdexcept>
#include <algorithm>
#include <iterator>

// Only installer-owned metadata and Native Messaging registrations are changed here.
// Windows Installer owns all application files, shortcuts, and their rollback.
static const wchar_t* Hosts[] = { L"de.zub_systems.notebookaid", L"de.zub_systems.notebookaid_t02" };
static const wchar_t* Names[] = { L"installation.json", L"native-host.json", L"native-host-legacy.json" };
static std::wstring Get(MSIHANDLE h, const wchar_t* key) {
    DWORD size = 0; MsiGetPropertyW(h, key, L"", &size);
    std::vector<wchar_t> text(size + 1); ++size;
    if (MsiGetPropertyW(h, key, text.data(), &size) != ERROR_SUCCESS) throw std::runtime_error("Cannot read installer property.");
    return std::wstring(text.data(), size);
}
static void Set(MSIHANDLE h, const wchar_t* key, const std::wstring& value) {
    if (MsiSetPropertyW(h, key, value.c_str()) != ERROR_SUCCESS) throw std::runtime_error("Cannot set installer property.");
}
static std::wstring ExistingLocale(MSIHANDLE h);
#include "MsiLocalization.h"

static bool Exists(const std::wstring& path) { return GetFileAttributesW(path.c_str()) != INVALID_FILE_ATTRIBUTES; }
static void Plain(std::wstring path) {
    while (path.size() > 3) {
        DWORD flags = GetFileAttributesW(path.c_str());
        if (flags != INVALID_FILE_ATTRIBUTES && (flags & FILE_ATTRIBUTE_REPARSE_POINT)) throw std::runtime_error("Linked installation paths are not allowed.");
        size_t pos = path.find_last_of(L"\\/"); if (pos == std::wstring::npos) break; path.resize(pos);
    }
}
static std::wstring Root(std::wstring path, bool machine) {
    while (!path.empty() && (path.back() == L'\\' || path.back() == L'/')) path.pop_back();
    if (path.size() < 4 || path[1] != L':' || path[2] != L'\\' || path.find(L"..") != std::wstring::npos || path.substr(2).find_first_of(L"<>:*?|\"") != std::wstring::npos) throw std::runtime_error("Choose an absolute local installation folder.");
    Plain(path);
    if (machine) {
        PWSTR value = nullptr;
        if (SHGetKnownFolderPath(FOLDERID_ProgramFilesX64, 0, nullptr, &value) != S_OK) throw std::runtime_error("Program Files is unavailable.");
        std::wstring base(value); CoTaskMemFree(value); base += L"\\";
        if (_wcsnicmp(path.c_str(), base.c_str(), base.size()) != 0) throw std::runtime_error("All-users installation must be inside Program Files.");
    }
    return path;
}
static void Idle() {
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) throw std::runtime_error("Cannot check running applications.");
    PROCESSENTRY32W item = {}; item.dwSize = sizeof(item);
    bool busy = false;
    if (Process32FirstW(snapshot, &item)) do {
        if (!_wcsicmp(item.szExeFile, L"NotebookAid.exe") || !_wcsicmp(item.szExeFile, L"NotebookAid.Bridge.exe") || !_wcsicmp(item.szExeFile, L"NotebookAid.Passkey.exe") || !_wcsicmp(item.szExeFile, L"NotebookAid.Print.exe")) busy = true;
    } while (Process32NextW(snapshot, &item));
    CloseHandle(snapshot);
    if (busy) throw std::runtime_error("Exit NotebookAid and its native helpers before installation, repair or removal.");
}
static void PlainTree(const std::wstring& root, int depth = 0) {
    if (depth > 64) throw std::runtime_error("Installation folder nesting is too deep.");
    WIN32_FIND_DATAW entry; HANDLE find = FindFirstFileW((root + L"\\*").c_str(), &entry);
    if (find == INVALID_HANDLE_VALUE) return;
    try {
        do {
            if (!wcscmp(entry.cFileName, L".") || !wcscmp(entry.cFileName, L"..")) continue;
            if (entry.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) throw std::runtime_error("Linked files or folders in the installation directory are not allowed.");
            if (entry.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) PlainTree(root + L"\\" + entry.cFileName, depth + 1);
        } while (FindNextFileW(find, &entry));
    } catch (...) { FindClose(find); throw; }
    FindClose(find);
}
static std::wstring Read(const std::wstring& path) {
    Plain(path); HANDLE file = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, 0, nullptr);
    if (file == INVALID_HANDLE_VALUE) { if (GetLastError() == ERROR_FILE_NOT_FOUND || GetLastError() == ERROR_PATH_NOT_FOUND) return L"-"; throw std::runtime_error("Cannot read installer metadata."); }
    DWORD size = GetFileSize(file, nullptr), got = 0;
    if (size > 32768) { CloseHandle(file); throw std::runtime_error("Installer metadata is too large."); }
    std::string text(size, '\0'); bool ok = ReadFile(file, text.data(), size, &got, nullptr) && got == size; CloseHandle(file);
    if (!ok) throw std::runtime_error("Cannot read installer metadata.");
    int count = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text.data(), size, nullptr, 0);
    if (size && !count) throw std::runtime_error("Invalid installer metadata encoding.");
    std::wstring value(count, L'\0'); MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text.data(), size, value.data(), count); return value;
}
static void Write(const std::wstring& path, const std::wstring& value) {
    Plain(path);
    if (value == L"-") { if (!DeleteFileW(path.c_str()) && GetLastError() != ERROR_FILE_NOT_FOUND && GetLastError() != ERROR_PATH_NOT_FOUND) throw std::runtime_error("Cannot remove installer metadata."); return; }
    int count = WideCharToMultiByte(CP_UTF8, 0, value.data(), (int)value.size(), nullptr, 0, nullptr, nullptr);
    std::string text(count, '\0'); WideCharToMultiByte(CP_UTF8, 0, value.data(), (int)value.size(), text.data(), count, nullptr, nullptr);
    HANDLE file = CreateFileW(path.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (file == INVALID_HANDLE_VALUE) throw std::runtime_error("Cannot write installer metadata.");
    DWORD written = 0; bool ok = WriteFile(file, text.data(), count, &written, nullptr) && written == (DWORD)count; CloseHandle(file);
    if (!ok) throw std::runtime_error("Cannot write installer metadata.");
}
static std::wstring Reg(bool machine, const std::wstring& key) {
    HKEY handle; LONG error = RegOpenKeyExW(machine ? HKEY_LOCAL_MACHINE : HKEY_CURRENT_USER, key.c_str(), 0, KEY_READ | KEY_WOW64_64KEY, &handle);
    if (error == ERROR_FILE_NOT_FOUND) return L"-";
    if (error != ERROR_SUCCESS) throw std::runtime_error("Cannot inspect installer registration.");
    DWORD type = 0, size = 0; error = RegQueryValueExW(handle, nullptr, nullptr, &type, nullptr, &size);
    if (error == ERROR_FILE_NOT_FOUND) { RegCloseKey(handle); return L"-"; }
    if (error != ERROR_SUCCESS || type != REG_SZ || size > 32768) { RegCloseKey(handle); throw std::runtime_error("Invalid installer registration."); }
    std::vector<wchar_t> data(size / sizeof(wchar_t) + 1, 0); error = RegQueryValueExW(handle, nullptr, nullptr, &type, (BYTE*)data.data(), &size); RegCloseKey(handle);
    if (error != ERROR_SUCCESS) throw std::runtime_error("Cannot read installer registration."); return data.data();
}
static std::wstring HostKey(int n) { return std::wstring(L"Software\\Mozilla\\NativeMessagingHosts\\") + Hosts[n]; }
static void PutReg(bool machine, const std::wstring& key, const std::wstring& value) {
    HKEY handle; LONG error = RegCreateKeyExW(machine ? HKEY_LOCAL_MACHINE : HKEY_CURRENT_USER, key.c_str(), 0, nullptr, 0, KEY_SET_VALUE | KEY_WOW64_64KEY, nullptr, &handle, nullptr);
    if (error != ERROR_SUCCESS) throw std::runtime_error("Cannot write native bridge registration.");
    error = value == L"-" ? RegDeleteValueW(handle, nullptr) : RegSetValueExW(handle, nullptr, 0, REG_SZ, (const BYTE*)value.c_str(), (DWORD)((value.size() + 1) * sizeof(wchar_t)));
    RegCloseKey(handle);
    if (error != ERROR_SUCCESS && error != ERROR_FILE_NOT_FOUND) throw std::runtime_error("Cannot update native bridge registration.");
    // Preserve any foreign values or subkeys while removing empty registration shells.
    if (value == L"-") SHDeleteEmptyKeyW(machine ? HKEY_LOCAL_MACHINE : HKEY_CURRENT_USER, key.c_str());
}
static std::wstring Hex(const std::wstring& value) {
    const wchar_t* digits = L"0123456789abcdef"; std::wstring result;
    for (wchar_t c : value) for (int shift = 12; shift >= 0; shift -= 4) result += digits[(c >> shift) & 15];
    return result;
}
static std::vector<std::wstring> Decode(const std::wstring& data) {
    std::vector<std::wstring> values; std::wstring value;
    for (size_t pos = 0; pos <= data.size();) {
        if (pos == data.size() || data[pos] == L'|') { values.push_back(value); value.clear(); ++pos; continue; }
        if (pos + 4 > data.size()) throw std::runtime_error("Invalid action data.");
        unsigned int c = 0;
        for (int n = 0; n < 4; ++n) { wchar_t x = data[pos++]; if (!((x >= L'0' && x <= L'9') || (x >= L'a' && x <= L'f'))) throw std::runtime_error("Invalid action data."); c = c * 16 + (x <= L'9' ? x - L'0' : x - L'a' + 10); }
        if (!c) throw std::runtime_error("Invalid action data."); value += (wchar_t)c;
    }
    if (values.size() != 9) throw std::runtime_error("Incomplete action data."); return values;
}
static std::wstring Escape(const std::wstring& value) { std::wstring result; for (wchar_t c : value) { if (c < 32) throw std::runtime_error("Invalid path."); if (c == L'\\' || c == L'"') result += L'\\'; result += c; } return result; }
static std::wstring Content(const std::wstring& root, bool machine, int n, const std::wstring& locale = L"en") {
    if (n == 0) return L"{\"owner\":\"NotebookAid.Installation.v1\",\"installer\":\"msi\",\"scope\":\"" + std::wstring(machine ? L"machine" : L"user") + L"\",\"locale\":\"" + locale + L"\"}";
    return L"{\"name\":\"" + std::wstring(Hosts[n - 1]) + L"\",\"description\":\"NotebookAid bridge\",\"path\":\"" + Escape(root + L"\\NotebookAid.Bridge.exe") + L"\",\"type\":\"stdio\",\"allowed_extensions\":[\"" + std::wstring(n == 1 ? L"notebookaid@zub-systems.de" : L"notebookaid-t02@zub-systems.de") + L"\"]}";
}
// Cached packages also run during upgrade rollback without command-line language properties.
static std::wstring ExistingLocale(MSIHANDLE h) {
    try {
        auto root = Get(h,L"INSTALLFOLDER");
        if (root.empty()) return L"";
        root = Root(root,false);
        auto previous = Read(root + L"\\installation.json");
        bool machine = Get(h,L"ALLUSERS") == L"1";
        for (auto locale : InstallerLocales) if (previous == Content(root,machine,0,locale)) return locale;
    } catch (...) { }
    return L"";
}
static bool Owned(const std::wstring& value, const std::wstring& root, bool machine, int n) {
    if(n != 0) return value == Content(root,machine,n);
    for(auto locale : InstallerLocales) if(value == Content(root,machine,n,locale)) return true;
    return false;
}
static UINT Error(MSIHANDLE h, const char* message) {
    MSIHANDLE record = MsiCreateRecord(1); MsiRecordSetStringA(record, 0, "NotebookAid: [1]"); MsiRecordSetStringA(record, 1, message); MsiProcessMessage(h, INSTALLMESSAGE_ERROR, record); MsiCloseHandle(record); return ERROR_INSTALL_FAILURE;
}
extern "C" __declspec(dllexport) UINT __stdcall Prepare(MSIHANDLE h) {
    try {
        HKEY system; DWORD major = 0, size = sizeof(major), type = 0;
        if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, L"Software\\Microsoft\\Windows NT\\CurrentVersion", 0, KEY_READ | KEY_WOW64_64KEY, &system) != ERROR_SUCCESS) throw std::runtime_error("Cannot inspect the Windows version.");
        LONG result = RegQueryValueExW(system, L"CurrentMajorVersionNumber", nullptr, &type, (BYTE*)&major, &size); RegCloseKey(system);
        if (result != ERROR_SUCCESS || type != REG_DWORD || major < 10) throw std::runtime_error("NotebookAid requires Windows 10 or later.");
        Idle(); bool machine = Get(h, L"ALLUSERS") == L"1"; std::wstring root = Root(Get(h, L"INSTALLFOLDER"), machine); PlainTree(root);
        bool removing = Get(h, L"REMOVE") == L"ALL";
        if (!removing) {
            auto requested = Get(h, L"REQUESTEDINSTALLFOLDER");
            if (!requested.empty() && _wcsicmp(Root(requested, false).c_str(), root.c_str())) throw std::runtime_error("Keep the original MSI installation folder and scope. Uninstall first to change them.");
            if (machine) for (int n = 0; n < 2; ++n) {
                auto local = Reg(false, HostKey(n)), expected = root + L"\\" + Names[n + 1];
                if (local != L"-" && _wcsicmp(local.c_str(), expected.c_str())) throw std::runtime_error("A current-user Thunderbird bridge would override the all-users bridge. Unregister that bridge first.");
            }
            for (bool scope : { false, true }) {
                HKEY key; if (RegOpenKeyExW(scope ? HKEY_LOCAL_MACHINE : HKEY_CURRENT_USER, L"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\1585ae4a-41ea-4f85-aa30-75cf234c17ac", 0, KEY_READ | KEY_WOW64_64KEY, &key) == ERROR_SUCCESS) { RegCloseKey(key); throw std::runtime_error("Uninstall the NSIS edition before installing MSI. Notebook data will be retained."); }
                auto existing = Reg(scope, L"Software\\NotebookAid\\MSI");
                while (existing.size() > 3 && existing.back() == L'\\') existing.pop_back();
                if (existing != L"-" && (scope != machine || _wcsicmp(existing.c_str(), root.c_str()))) throw std::runtime_error("An MSI installation already exists in another scope or directory. Keep its scope and directory when upgrading.");
            }
            if (Exists(root)) {
                WIN32_FIND_DATAW entry; HANDLE find = FindFirstFileW((root + L"\\*").c_str(), &entry); bool nonempty = false;
                if (find != INVALID_HANDLE_VALUE) { do { if (wcscmp(entry.cFileName, L".") && wcscmp(entry.cFileName, L"..")) nonempty = true; } while (FindNextFileW(find, &entry)); FindClose(find); }
                if (nonempty && Read(root + L"\\msi-owner.txt") != L"NotebookAid.MSI.v1\n") throw std::runtime_error("The target folder is not an owned MSI installation. Choose an empty folder.");
            }
        }
        std::vector<std::wstring> values = {root, machine ? L"machine" : L"user", removing ? L"remove" : L"install"};
        for (int n = 0; n < 2; ++n) {
            auto previous = Reg(machine, HostKey(n)); auto expected = root + L"\\" + Names[n + 1];
            if (!removing && previous != L"-" && _wcsicmp(previous.c_str(), expected.c_str())) throw std::runtime_error("Another directory owns the Thunderbird bridge. Unregister that bridge before MSI installation.");
            values.push_back(previous);
        }
        for (int n = 0; n < 3; ++n) {
            auto previous = Read(root + L"\\" + Names[n]);
            if (!removing && previous != L"-" && !Owned(previous, root, machine, n)) throw std::runtime_error("Installer metadata has changed. Preserve it before reinstalling.");
            values.push_back(previous);
        }
        auto locale = Get(h,L"NA_LANGUAGE");
        for (auto existing : InstallerLocales) if (values[5] == Content(root,machine,0,existing)) { locale=existing; break; }
        if (std::find(std::begin(InstallerLocales), std::end(InstallerLocales), locale) == std::end(InstallerLocales)) throw std::runtime_error("Invalid installer language.");
        values.push_back(locale);
        std::wstring data; for (auto& value : values) { if (!data.empty()) data += L'|'; data += Hex(value); }
        Set(h, L"ApplyMetadata", data); Set(h, L"RollbackMetadata", data); Set(h, L"ApplyUserMetadata", data); Set(h, L"RollbackUserMetadata", data); return ERROR_SUCCESS;
    } catch (const std::exception& error) { return Error(h, error.what()); }
}
static UINT Change(MSIHANDLE h, bool rollback) {
    try {
        auto values = Decode(Get(h, L"CustomActionData")); bool machine = values[1] == L"machine", removing = values[2] == L"remove";
        std::wstring root = Root(values[0], machine);
        if (!rollback) Idle();
        for (int n = 0; n < 3; ++n) {
            auto file = root + L"\\" + Names[n]; auto current = Read(file), owned = Content(root, machine, n, values[8]);
            if (rollback) { if (Owned(current, root, machine, n) || current == L"-") Write(file, values[5 + n]); }
            else if (!removing) Write(file, owned);
            else if (Owned(current, root, machine, n)) Write(file, L"-");
        }
        for (int n = 0; n < 2; ++n) {
            auto current = Reg(machine, HostKey(n)); auto expected = root + L"\\" + Names[n + 1];
            if (rollback) { if (current == expected || current == L"-") PutReg(machine, HostKey(n), values[3 + n]); }
            else if (!removing) { if (current != values[3 + n]) throw std::runtime_error("Bridge ownership changed during installation."); PutReg(machine, HostKey(n), expected); }
            else if (current == expected) PutReg(machine, HostKey(n), L"-");
        }
        return ERROR_SUCCESS;
    } catch (const std::exception& error) { return Error(h, error.what()); }
}
extern "C" __declspec(dllexport) UINT __stdcall Apply(MSIHANDLE h) { return Change(h, false); }
extern "C" __declspec(dllexport) UINT __stdcall Rollback(MSIHANDLE h) { return Change(h, true); }
