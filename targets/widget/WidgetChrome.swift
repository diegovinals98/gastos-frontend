import AppIntents
import SwiftUI
import WidgetKit

// Tocar el botón ejecuta este intent; al terminar, WidgetKit vuelve a pedir el
// timeline, así que no hace falta hacer nada en perform()
struct RefreshSaldoIntent: AppIntent {
  static var title: LocalizedStringResource = "Actualizar saldo"
  static var description = IntentDescription("Vuelve a cargar el saldo y los pagos de VICA.")

  func perform() async throws -> some IntentResult {
    .result()
  }
}

// Con `updated` muestra también la hora de la última carga ("12:40 ⟳")
struct RefreshButton: View {
  var updated: String? = nil

  var body: some View {
    Button(intent: RefreshSaldoIntent()) {
      HStack(spacing: 4) {
        if let updated {
          Text(updated)
            .font(.system(size: 10, weight: .medium))
            .monospacedDigit()
        }
        Image(systemName: "arrow.clockwise")
          .font(.system(size: 11, weight: .semibold))
      }
      .foregroundStyle(.secondary)
      .padding(.horizontal, updated == nil ? 0 : 7)
      .frame(minWidth: 22, minHeight: 22)
      .background(Capsule().fill(Color.gray.opacity(0.15)))
    }
    .buttonStyle(.plain)
  }
}

private let updatedParser: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

// "12:40" a partir del updatedAt del backend; vacío en el placeholder
func horaActualizacion(_ summary: GastosSummary) -> String? {
  guard let date = updatedParser.date(from: summary.updatedAt) else { return nil }
  return date.formatted(date: .omitted, time: .shortened)
}

// Verde si vas bien, naranja si has gastado más del 80 %, rojo si se acabó el de empresa
func stateColor(_ summary: GastosSummary) -> Color {
  if summary.isCompanyMaxed { return .red }
  if summary.spentRatio > 0.8 { return .orange }
  return .green
}

// Fondo con un tinte suave del color de estado en la esquina superior
struct TintedBackground: View {
  let tint: Color?

  init(summary: GastosSummary?) {
    tint = summary.map(stateColor)
  }

  init(tint: Color?) {
    self.tint = tint
  }

  var body: some View {
    ZStack {
      Color(uiColor: .systemBackground)
      if let tint {
        LinearGradient(
          colors: [tint.opacity(0.16), .clear],
          startPoint: .topTrailing,
          endPoint: .bottomLeading
        )
      }
    }
  }
}
