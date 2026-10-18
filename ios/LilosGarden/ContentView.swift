import SwiftUI
import WebKit
import WidgetKit

struct ContentView: View {
    var body: some View {
        LiloWebView()
            .edgesIgnoringSafeArea(.all)
    }
}

struct LiloWebView: UIViewRepresentable {

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()

        // Inject AndroidBridge compatibility polyfill so existing web calls work out of the box
        let bridgeScriptSource = """
        window.AndroidBridge = {
            syncGardenToWidget: function(json) {
                window.webkit.messageHandlers.syncGardenToWidget.postMessage(json);
            },
            openWallpaperPicker: function() {
                window.webkit.messageHandlers.openWallpaperPicker.postMessage('');
            },
            pinWidget: function() {
                window.webkit.messageHandlers.pinWidget.postMessage('');
            },
            setCompanionWidgetCat: function(catId, catName) {
                window.webkit.messageHandlers.setCompanionWidgetCat.postMessage({catId: catId, catName: catName});
            },
            getWidgetBlooms: function() {
                return 8;
            },
            isNativeApp: function() {
                return true;
            }
        };
        """
        let userScript = WKUserScript(source: bridgeScriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        contentController.addUserScript(userScript)

        contentController.add(context.coordinator, name: "syncGardenToWidget")
        contentController.add(context.coordinator, name: "openWallpaperPicker")
        contentController.add(context.coordinator, name: "pinWidget")
        contentController.add(context.coordinator, name: "setCompanionWidgetCat")

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.12, green: 0.16, blue: 0.11, alpha: 1.0)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false

        // Load bundled www/index.html
        if let wwwUrl = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            let wwwDir = wwwUrl.deletingLastPathComponent()
            webView.loadFileURL(wwwUrl, allowingReadAccessTo: wwwDir)
        } else if let altUrl = Bundle.main.url(forResource: "index", withExtension: "html") {
            let altDir = altUrl.deletingLastPathComponent()
            webView.loadFileURL(altUrl, allowingReadAccessTo: altDir)
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: LiloWebView

        init(_ parent: LiloWebView) {
            self.parent = parent
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "syncGardenToWidget" {
                guard let jsonString = message.body as? String,
                      let data = jsonString.data(using: .utf8),
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    return
                }

                let defaults = UserDefaults(suiteName: "group.com.valois.lilosgarden")
                defaults?.set(jsonString, forKey: "garden_json")

                if let weather = json["weather"] as? String {
                    defaults?.set(weather, forKey: "weather")
                }
                if let tempC = json["tempC"] as? Int {
                    defaults?.set(tempC, forKey: "tempC")
                }
                if let blooms = json["blooms"] as? Int {
                    defaults?.set(blooms, forKey: "blooms")
                }
                if let stickyNote = json["stickyNote"] as? String {
                    defaults?.set(stickyNote, forKey: "sticky_note")
                }
                if let tasks = json["tasks"] as? [[String: Any]] {
                    if let tasksData = try? JSONSerialization.data(withJSONObject: tasks) {
                        defaults?.set(String(data: tasksData, encoding: .utf8), forKey: "tasks_json")
                    }
                }
                if let stats = json["stats"] as? [String: Any], let pets = stats["pets"] as? Int {
                    defaults?.set(pets, forKey: "pets")
                }

                defaults?.synchronize()
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
    }
}
