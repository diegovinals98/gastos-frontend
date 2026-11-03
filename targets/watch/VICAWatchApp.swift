import SwiftUI
import WatchConnectivity
import WidgetKit

@main
struct VICAWatchApp: App {
  @StateObject private var store = SaldoStore()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(store)
    }
  }
}

// Recibe la sesión del iPhone por WatchConnectivity y descarga el resumen
@MainActor
final class SaldoStore: NSObject, ObservableObject {
  @Published var summary: GastosSummary? = SaldoAPI.cached()
  @Published var loggedIn = SaldoAPI.token != nil
  @Published var loading = false

  // Solo en el simulador: `defaults write com.factorial.gastos.watchkitapp demoMode -bool YES`
  // enseña datos de ejemplo sin iPhone ni sesión. En un reloj real esto no se compila.
  private var isDemo: Bool {
    #if targetEnvironment(simulator)
    return UserDefaults.standard.bool(forKey: "demoMode")
    #else
    return false
    #endif
  }

  override init() {
    super.init()
    if isDemo {
      summary = .placeholder
      loggedIn = true
      return
    }
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }

  func refresh() async {
    guard loggedIn, !loading, !isDemo else { return }
    loading = true
    if let fresh = await SaldoAPI.fetch() {
      summary = fresh
    }
    loading = false
    // Las complicaciones leen el mismo App Group
    WidgetCenter.shared.reloadAllTimelines()
  }

  fileprivate func apply(_ context: [String: Any]) {
    guard let token = context["token"] as? String, let apiUrl = context["apiUrl"] as? String else { return }
    SaldoAPI.saveSession(token: token, apiUrl: apiUrl)
    loggedIn = !token.isEmpty
    if !loggedIn {
      summary = nil
      WidgetCenter.shared.reloadAllTimelines()
      return
    }
    Task { await refresh() }
  }
}

extension SaldoStore: WCSessionDelegate {
  // Al activarse, recoge el último contexto que mandó el iPhone aunque llegara con la app cerrada
  nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    let context = session.receivedApplicationContext
    Task { @MainActor in self.apply(context) }
  }

  nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    Task { @MainActor in self.apply(applicationContext) }
  }
}

struct ContentView: View {
  @EnvironmentObject private var store: SaldoStore

  var body: some View {
    NavigationStack {
      Group {
        if !store.loggedIn {
          LoginHintView()
        } else if let summary = store.summary {
          TabView {
            SaldoPage(summary: summary)
            PagosPage(summary: summary)
          }
          .tabViewStyle(.verticalPage)
        } else {
          ProgressView()
        }
      }
      .toolbar {
        if store.loggedIn {
          ToolbarItem(placement: .topBarTrailing) {
            Button {
              Task { await store.refresh() }
            } label: {
              if store.loading {
                ProgressView()
              } else {
                Image(systemName: "arrow.clockwise")
              }
            }
          }
        }
      }
    }
    .task { await store.refresh() }
  }
}
