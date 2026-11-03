import SwiftUI
import WidgetKit

@main
struct VICAComplications: WidgetBundle {
  var body: some Widget {
    SaldoComplication()
  }
}

struct SaldoComplicationEntry: TimelineEntry {
  let date: Date
  let summary: GastosSummary?
}

// Mismo esquema que el widget del iPhone: pide el resumen cada ~30 min con el token
// que dejó la app del reloj en el App Group, y si falla usa el último guardado
struct SaldoComplicationProvider: TimelineProvider {
  func placeholder(in context: Context) -> SaldoComplicationEntry {
    SaldoComplicationEntry(date: Date(), summary: .placeholder)
  }

  func getSnapshot(in context: Context, completion: @escaping (SaldoComplicationEntry) -> Void) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }
    completion(SaldoComplicationEntry(date: Date(), summary: SaldoAPI.token == nil ? nil : SaldoAPI.cached()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SaldoComplicationEntry>) -> Void) {
    Task {
      let summary = SaldoAPI.token == nil ? nil : await SaldoAPI.fetch()
      let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
      completion(Timeline(entries: [SaldoComplicationEntry(date: Date(), summary: summary)], policy: .after(next)))
    }
  }
}

struct SaldoComplicationView: View {
  @Environment(\.widgetFamily) private var family
  let entry: SaldoComplicationEntry

  var body: some View {
    if let summary = entry.summary {
      switch family {
      case .accessoryCircular:
        Gauge(value: 1 - summary.spentRatio) {
          Image(systemName: "creditcard.fill")
        } currentValueLabel: {
          Text("\(Int(summary.companyRemaining.rounded()))")
        }
        .gaugeStyle(.accessoryCircular)
        .tint(stateColor(summary))

      case .accessoryCorner:
        Text("\(Int(summary.companyRemaining.rounded()))€")
          .font(.system(size: 18, weight: .semibold, design: .rounded))
          .widgetLabel {
            Gauge(value: 1 - summary.spentRatio) {
              Text("Saldo")
            }
            .tint(stateColor(summary))
          }

      case .accessoryInline:
        Text("💳 \(euros(summary.companyRemaining, decimals: 0)) · ≈\(euros(summary.allowancePerDay, decimals: 0))/día")

      default:
        VStack(alignment: .leading, spacing: 1) {
          Label("Saldo VICA", systemImage: "creditcard.fill")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(.secondary)
          Text(euros(summary.companyRemaining))
            .font(.system(size: 20, weight: .bold, design: .rounded))
            .widgetAccentable()
          Text("≈ \(euros(summary.allowancePerDay))/día · hoy \(euros(summary.spentToday ?? 0))")
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    } else {
      // Sin sesión: abre la app del reloj, que pide iniciar sesión en el iPhone
      Image(systemName: "creditcard")
        .foregroundStyle(.secondary)
    }
  }
}

struct SaldoComplication: Widget {
  let kind = "SaldoComplication"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SaldoComplicationProvider()) { entry in
      SaldoComplicationView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Saldo")
    .description("Lo que te queda del presupuesto de empresa.")
    .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryRectangular, .accessoryInline])
  }
}
