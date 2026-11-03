import SwiftUI
import WidgetKit

// Cómo se pinta cada estado de Factorial (mismos valores que guarda el backend)
private struct EstadoPago {
  let label: String
  let icon: String
  let color: Color
  let isIncome: Bool

  init(_ status: String) {
    switch status {
    case "decline", "rejected":
      self.init(label: "Rechazado", icon: "xmark.circle.fill", color: .red, isIncome: false)
    case "refund":
      self.init(label: "Reembolso", icon: "arrow.uturn.backward.circle.fill", color: .blue, isIncome: true)
    case "reverse":
      self.init(label: "Revertido", icon: "arrow.uturn.left.circle.fill", color: .gray, isIncome: false)
    case "withhold":
      self.init(label: "Retenido", icon: "clock.fill", color: .orange, isIncome: false)
    default:
      self.init(label: "Aprobado", icon: "checkmark.circle.fill", color: .green, isIncome: false)
    }
  }

  private init(label: String, icon: String, color: Color, isIncome: Bool) {
    self.label = label
    self.icon = icon
    self.color = color
    self.isIncome = isIncome
  }
}

private let isoParser: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

private func fechaCorta(_ iso: String) -> String {
  guard let date = isoParser.date(from: iso) else { return "" }
  if Calendar.current.isDateInToday(date) {
    return "Hoy, " + date.formatted(date: .omitted, time: .shortened)
  }
  if Calendar.current.isDateInYesterday(date) {
    return "Ayer, " + date.formatted(date: .omitted, time: .shortened)
  }
  return date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "es_ES")))
}

private struct PagoRow: View {
  let gasto: GastosSummary.RecentGasto

  var body: some View {
    let estado = EstadoPago(gasto.status)
    HStack(spacing: 10) {
      Image(systemName: estado.icon)
        .font(.title3)
        .foregroundStyle(estado.color)
        .widgetAccentable()

      VStack(alignment: .leading, spacing: 1) {
        Text(gasto.merchant)
          .font(.subheadline.weight(.medium))
          .lineLimit(1)
        Text("\(fechaCorta(gasto.date)) · \(estado.label)")
          .font(.caption2)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }

      Spacer(minLength: 4)

      Text((estado.isIncome ? "+" : "") + euros(gasto.amount))
        .font(.subheadline.weight(.semibold))
        .monospacedDigit()
        .foregroundStyle(estado.isIncome ? Color.blue : Color.primary)
        .strikethrough(estado.label == "Rechazado" || estado.label == "Revertido", color: .secondary)
    }
  }
}

struct UltimosPagosView: View {
  let entry: SaldoEntry

  var body: some View {
    // Sin recentGastos = backend antiguo; mejor el estado vacío que "no hay pagos"
    if let summary = entry.summary, summary.recentGastos != nil {
      VStack(alignment: .leading, spacing: 10) {
        HStack {
          Label("Últimos pagos", systemImage: "list.bullet.rectangle.fill")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
          Spacer()
          Text("Quedan \(euros(summary.companyRemaining))")
            .font(.caption.weight(.semibold))
            .foregroundStyle(summary.isCompanyMaxed ? .red : .green)
        }

        let pagos = summary.recentGastos!
        if pagos.isEmpty {
          Spacer()
          Text("Aún no hay pagos este mes")
            .font(.callout)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
          Spacer()
        } else {
          // Las filas se reparten el alto del widget en vez de dejar hueco abajo
          ForEach(pagos.prefix(5), id: \.self) { gasto in
            PagoRow(gasto: gasto)
              .frame(maxHeight: .infinity)
          }
        }
      }
    } else {
      EmptyStateView(loggedIn: entry.loggedIn)
    }
  }
}

struct UltimosPagosWidget: Widget {
  let kind = "UltimosPagosWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SaldoProvider()) { entry in
      UltimosPagosView(entry: entry)
        .containerBackground(.background, for: .widget)
    }
    .configurationDisplayName("Últimos pagos")
    .description("Los últimos pagos con la tarjeta y su estado.")
    .supportedFamilies([.systemLarge])
  }
}
