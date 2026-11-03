import ExpoModulesCore
import WatchConnectivity

// Mantiene la sesión de WatchConnectivity del iPhone. Si se pide enviar algo antes
// de que la sesión esté activa, lo guarda y lo manda al terminar de activarse.
final class WatchSessionManager: NSObject, WCSessionDelegate {
  static let shared = WatchSessionManager()

  private var pendingContext: [String: Any]?

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if session.delegate == nil {
      session.delegate = self
    }
    if session.activationState != .activated {
      session.activate()
    }
  }

  // applicationContext se queda guardado y le llega al reloj aunque ahora no esté
  // conectado; solo se conserva el último, que es justo lo que queremos
  func send(_ context: [String: Any]) {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    guard session.activationState == .activated else {
      pendingContext = context
      activate()
      return
    }
    guard session.isPaired, session.isWatchAppInstalled else { return }
    try? session.updateApplicationContext(context)
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if activationState == .activated, let pending = pendingContext {
      pendingContext = nil
      send(pending)
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  // Al cambiar de reloj hay que volver a activar la sesión
  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }
}

public class WatchSyncModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WatchSync")

    OnCreate {
      WatchSessionManager.shared.activate()
    }

    // token vacío = sesión cerrada; el reloj borra sus datos
    Function("updateSession") { (token: String, apiUrl: String) in
      WatchSessionManager.shared.send([
        "token": token,
        "apiUrl": apiUrl,
        "sentAt": Date().timeIntervalSince1970,
      ])
    }
  }
}
