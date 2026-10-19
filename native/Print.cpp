#define NOMINMAX
#include <windows.h>
#include <wrl.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Storage.Streams.h>
#include <winrt/Windows.Data.Pdf.h>
#include <winrt/Windows.Graphics.Printing.h>
#include <windows.graphics.printing.h>
#include <PrintManagerInterop.h>
#include <DocumentSource.h>
#include <PrintPreview.h>
#include <windows.data.pdf.interop.h>
#include <d3d11.h>
#include <d2d1_1.h>
#include <wincodec.h>
#include <algorithm>
#include <atomic>
#include <future>
#include <mutex>
#include <vector>
#include <cstdio>
#include <fcntl.h>
#include <io.h>

using namespace winrt;
using winrt::Windows::Foundation::IAsyncOperation;

using namespace winrt::Windows::Storage::Streams;
using namespace winrt::Windows::Data::Pdf;
using namespace winrt::Windows::Graphics::Printing;
using Microsoft::WRL::ComPtr;
constexpr UINT FinishedMessage = WM_APP + 1;

// The PDF stays in memory. Both preview and spool output use the same page renderer.
class PrintSource final : public Microsoft::WRL::RuntimeClass<
    Microsoft::WRL::RuntimeClassFlags<Microsoft::WRL::WinRtClassicComMix>,
    ABI::Windows::Graphics::Printing::IPrintDocumentSource,
    IPrintDocumentPageSource, IPrintPreviewPageCollection> {
    InspectableClass(L"NotebookAid.PrintSource", BaseTrust);
    PdfDocument document_{nullptr};
    ComPtr<ID3D11Device> gpu_;
    ComPtr<ID2D1Device> device_;
    ComPtr<ID2D1DeviceContext> context_;
    ComPtr<IPdfRendererNative> renderer_;
    ComPtr<IPrintPreviewDxgiPackageTarget> preview_;
    PrintTaskOptions options_{nullptr};
    std::mutex mutex_;

    PrintPageDescription Description(UINT index) {
        if (options_) return options_.GetPageDescription(index);
        PrintPageDescription value{};
        value.PageSize = {793.7008f, 1122.5197f};
        value.ImageableRect = {0, 0, value.PageSize.Width, value.PageSize.Height};
        value.DpiX = value.DpiY = 300;
        return value;
    }
    void Draw(UINT index, PrintPageDescription const& description, float dpi) {
        auto page = document_.GetPage(index);
        auto size = page.Size();
        auto area = description.ImageableRect;
        const float scale = std::min(area.Width / size.Width, area.Height / size.Height);
        const float left = area.X + (area.Width - size.Width * scale) / 2;
        const float top = area.Y + (area.Height - size.Height * scale) / 2;
        auto params = PdfRenderParams({}, static_cast<UINT>(size.Width * scale * dpi / 96),
            static_cast<UINT>(size.Height * scale * dpi / 96));
        context_->SetTransform(D2D1::Matrix3x2F::Scale(96 / dpi, 96 / dpi) * D2D1::Matrix3x2F::Translation(left, top));
        // Printer rendering resolution is independent of screen preview size.
        check_hresult(renderer_->RenderPageToDeviceContext(page.as<::IUnknown>().get(), context_.Get(), &params));
        context_->SetTransform(D2D1::Matrix3x2F::Identity());
        page.Close();
    }
public:
    void Initialize(PdfDocument const& document) {
        document_ = document;
        check_hresult(D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_WARP, nullptr,
            D3D11_CREATE_DEVICE_BGRA_SUPPORT, nullptr, 0, D3D11_SDK_VERSION,
            &gpu_, nullptr, nullptr));
        ComPtr<IDXGIDevice> dxgi;
        check_hresult(gpu_.As(&dxgi));
        ComPtr<ID2D1Factory1> factory;
        check_hresult(D2D1CreateFactory(D2D1_FACTORY_TYPE_MULTI_THREADED, IID_PPV_ARGS(&factory)));
        check_hresult(factory->CreateDevice(dxgi.Get(), &device_));
        check_hresult(device_->CreateDeviceContext(D2D1_DEVICE_CONTEXT_OPTIONS_NONE, &context_));
        check_hresult(PdfCreateRenderer(dxgi.Get(), &renderer_));
    }
    UINT Count() const { return document_.PageCount(); }
    HRESULT STDMETHODCALLTYPE GetPreviewPageCollection(IPrintDocumentPackageTarget* target,
        IPrintPreviewPageCollection** collection) noexcept override {
        try {
            std::lock_guard lock(mutex_);
            check_hresult(target->GetPackageTarget(__uuidof(IPrintPreviewDxgiPackageTarget),
                IID_PPV_ARGS(preview_.ReleaseAndGetAddressOf())));
            check_hresult(QueryInterface(IID_PPV_ARGS(collection)));
            return S_OK;
        } catch (...) { return to_hresult(); }
    }
    HRESULT STDMETHODCALLTYPE Paginate(UINT32, ::IInspectable* options) noexcept override {
        try {
            std::lock_guard lock(mutex_);
            copy_from_abi(options_, options);
            check_hresult(preview_->SetJobPageCount(PageCountType::FinalPageCount, Count()));
            check_hresult(preview_->InvalidatePreview());
            return S_OK;
        } catch (...) { return to_hresult(); }
    }
    HRESULT STDMETHODCALLTYPE MakePage(UINT32 number, FLOAT width, FLOAT height) noexcept override {
        try {
            std::lock_guard lock(mutex_);
            if (number == JOB_PAGE_APPLICATION_DEFINED) number = 1;
            if (!number || number > Count() || width <= 0 || height <= 0) return E_INVALIDARG;
            auto description = Description(number - 1);
            const float scale = std::min({width / description.PageSize.Width,
                height / description.PageSize.Height, 4096.f / description.PageSize.Width,
                4096.f / description.PageSize.Height});
            D3D11_TEXTURE2D_DESC texture{};
            texture.Width = std::max(1U, static_cast<UINT>(description.PageSize.Width * scale));
            texture.Height = std::max(1U, static_cast<UINT>(description.PageSize.Height * scale));
            texture.MipLevels = texture.ArraySize = texture.SampleDesc.Count = 1;
            texture.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
            texture.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;
            ComPtr<ID3D11Texture2D> image;
            check_hresult(gpu_->CreateTexture2D(&texture, nullptr, &image));
            ComPtr<IDXGISurface> surface;
            check_hresult(image.As(&surface));
            ComPtr<ID2D1Bitmap1> bitmap;
            auto properties = D2D1::BitmapProperties1(D2D1_BITMAP_OPTIONS_TARGET,
                D2D1::PixelFormat(texture.Format, D2D1_ALPHA_MODE_PREMULTIPLIED), 96 * scale, 96 * scale);
            check_hresult(context_->CreateBitmapFromDxgiSurface(surface.Get(), &properties, &bitmap));
            context_->SetTarget(bitmap.Get());
            context_->SetDpi(96 * scale, 96 * scale);
            context_->BeginDraw();
            context_->Clear(D2D1::ColorF(D2D1::ColorF::White));
            Draw(number - 1, description, 96 * scale);
            check_hresult(context_->EndDraw());
            context_->SetTarget(nullptr);
            check_hresult(preview_->DrawPage(number, surface.Get(), 96 * scale, 96 * scale));
            return S_OK;
        } catch (...) { context_->SetTarget(nullptr); return to_hresult(); }
    }
    HRESULT STDMETHODCALLTYPE MakeDocument(::IInspectable* options, IPrintDocumentPackageTarget* target) noexcept override {
        try {
            std::lock_guard lock(mutex_);
            copy_from_abi(options_, options);
            ComPtr<IWICImagingFactory> wic;
            check_hresult(CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&wic)));
            ComPtr<ID2D1PrintControl> control;
            auto properties = D2D1::PrintControlProperties(D2D1_PRINT_FONT_SUBSET_MODE_DEFAULT, 300);
            check_hresult(device_->CreatePrintControl(wic.Get(), target, properties, &control));
            std::vector<UINT> selected;
            for (auto range : options_.CustomPageRanges()) {
                for (int page = std::max(1, range.FirstPageNumber()); page <= range.LastPageNumber() && page <= static_cast<int>(Count()); ++page)
                    selected.push_back(static_cast<UINT>(page - 1));
            }
            if (selected.empty()) for (UINT page = 0; page < Count(); ++page) selected.push_back(page);
            for (UINT index : selected) {
                auto description = Description(index);
                ComPtr<ID2D1CommandList> commands;
                check_hresult(context_->CreateCommandList(&commands));
                context_->SetTarget(commands.Get());
                context_->SetDpi(96, 96);
                context_->BeginDraw();
                context_->Clear(D2D1::ColorF(D2D1::ColorF::White));
                Draw(index, description, 300);
                check_hresult(context_->EndDraw());
                context_->SetTarget(nullptr);
                check_hresult(commands->Close());
                check_hresult(control->AddPage(commands.Get(), {description.PageSize.Width, description.PageSize.Height}, nullptr));
            }
            check_hresult(control->Close());
            return S_OK;
        } catch (...) { context_->SetTarget(nullptr); return to_hresult(); }
    }
};

PdfDocument ReadDocument() {
    _setmode(_fileno(stdin), _O_BINARY);
    std::vector<uint8_t> bytes;
    uint8_t block[65536];
    size_t count;
    while ((count = fread(block, 1, sizeof(block), stdin)) != 0) {
        if (bytes.size() + count > 128 * 1024 * 1024) throw hresult_invalid_argument();
        bytes.insert(bytes.end(), block, block + count);
    }
    if (bytes.size() < 5 || memcmp(bytes.data(), "%PDF-", 5)) throw hresult_invalid_argument();
    InMemoryRandomAccessStream stream;
    DataWriter writer(stream);
    writer.WriteBytes(bytes);
    SecureZeroMemory(bytes.data(), bytes.size());
    writer.StoreAsync().get();
    writer.DetachStream();
    stream.Seek(0);
    return PdfDocument::LoadFromStreamAsync(stream).get();
}

LRESULT CALLBACK WindowProcedure(HWND window, UINT message, WPARAM value, LPARAM detail) {
    if (message == FinishedMessage) { PostQuitMessage(static_cast<int>(value)); return 0; }
    if (message == WM_CLOSE) { PostQuitMessage(2); return 0; }
    return DefWindowProcW(window, message, value, detail);
}

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR command, int) {
    try {
        init_apartment(apartment_type::single_threaded);
        auto document = std::async(std::launch::async, [] {
            init_apartment(apartment_type::multi_threaded);
            return ReadDocument();
        }).get();
        auto source = Microsoft::WRL::Make<PrintSource>();
        source->Initialize(document);
        WNDCLASSW type{}; type.lpfnWndProc = WindowProcedure; type.hInstance = instance;
        type.lpszClassName = L"NotebookAid.Print";
        if (!RegisterClassW(&type)) throw_last_error();
        auto owner = reinterpret_cast<HWND>(_wcstoui64(command, nullptr, 16));
        if (owner && !IsWindow(owner)) throw hresult_invalid_argument();
        RECT area{}; if (owner) GetWindowRect(owner, &area);
        HWND window = CreateWindowExW(WS_EX_TOOLWINDOW, type.lpszClassName, L"NotebookAid - Print",
            WS_POPUP, area.left, area.top, 1, 1, owner, nullptr, instance, nullptr);
        if (!window) throw_last_error();
        ShowWindow(window, SW_SHOW);
        SetForegroundWindow(window);
        auto interop = get_activation_factory<PrintManager, IPrintManagerInterop>();
        PrintManager manager{nullptr};
        check_hresult(interop->GetForWindow(window, guid_of<PrintManager>(), put_abi(manager)));
        auto requested = manager.PrintTaskRequested([source, window](auto const&, PrintTaskRequestedEventArgs const& args) {
            auto task = args.Request().CreatePrintTask(L"NotebookAid", [source](PrintTaskSourceRequestedArgs const& request) {
                IPrintDocumentSource projected{nullptr};
                copy_from_abi(projected, static_cast<ABI::Windows::Graphics::Printing::IPrintDocumentSource*>(source.Get()));
                request.SetSource(projected);
            });
            task.Options().PageRangeOptions().AllowAllPages(true);
            task.Options().PageRangeOptions().AllowCustomSetOfPages(true);
            task.Options().DisplayedOptions().Append(StandardPrintTaskOptions::CustomPageRanges());
            task.Completed([window](auto const&, PrintTaskCompletedEventArgs const& result) {
                const auto status = result.Completion();
                PostMessageW(window, FinishedMessage, status == PrintTaskCompletion::Submitted ? 0 : status == PrintTaskCompletion::Canceled ? 2 : 1, 0);
            });
        });
        IAsyncOperation<bool> operation{nullptr};
        check_hresult(interop->ShowPrintUIForWindowAsync(window, guid_of<IAsyncOperation<bool>>(), put_abi(operation)));
        operation.Completed([window](auto const& result, winrt::Windows::Foundation::AsyncStatus state) {
            try { if (state != winrt::Windows::Foundation::AsyncStatus::Completed || !result.GetResults()) PostMessageW(window, FinishedMessage, 1, 0); }
            catch (...) { PostMessageW(window, FinishedMessage, 1, 0); }
        });
        MSG message{};
        while (GetMessageW(&message, nullptr, 0, 0) > 0) { TranslateMessage(&message); DispatchMessageW(&message); }
        manager.PrintTaskRequested(requested);
        DestroyWindow(window);
        return static_cast<int>(message.wParam);
    } catch (hresult_error const& error) {
        fprintf(stderr, "Print helper failed: 0x%08lx\n", static_cast<unsigned long>(error.code().value));
        return 1;
    } catch (...) { return 1; }
}
