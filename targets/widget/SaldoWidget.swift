import SwiftUI
import WidgetKit

// Debe coincidir con APP_GROUP en src/services/widget.ts y con app.json
private let appGroup = "group.com.factorial.gastos"

// Mismo formato que GET /gastos/summary del backend
struct GastosSummary: Codable {
  struct LastGasto: Codable {
    let merchant: String
    let amount: Double
    let date: String
  }

  let year: Int
  let month: Int
  let totalSpent: Double
  let companyBudget: Double
  let payrollBudget: Double
  let companyRemaining: Double
  let payrollRemaining: Double
  let workdaysLeft: Int
  let dailyAllowance: Double
  let lastGasto: LastGasto?
  let updatedAt: String

  static let placeholder = GastosSummary(
    year: 2026, month: 11, totalSpent: 72.4, companyBudget: 200, payrollBudget: 20,
    companyRemaining: 127.6, payrollRemaining: 20, workdaysLeft: 19, dailyAllowance: 6.72,
    lastGasto: LastGasto(merchant: "Cafetería", amount: 3.2, date: ""), updatedAt: ""
  )

  var spentRatio: Double {
    companyBudget > 0 ? min(totalSpent / companyBudget, 1) : 0
  }

  var isCompanyMaxed: Bool { totalSpent >= companyBudget }
}

struct SaldoEntry: TimelineEntry {
  let date: Date
  let summary: GastosSummary?
  let loggedIn: Bool
}

struct SaldoProvider: TimelineProvider {
  private var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  func placeholder(in context: Context) -> SaldoEntry {
    SaldoEntry(date: Date(), summary: .placeholder, loggedIn: true)
  }

  func getSnapshot(in context: Context, completion: @escaping (SaldoEntry) -> Void) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }
    completion(cachedEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SaldoEntry>) -> Void) {
    let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!

    guard
      let defaults,
      let token = defaults.string(forKey: "token"), !token.isEmpty,
      let apiUrl = defaults.string(forKey: "apiUrl"),
      let url = URL(string: "\(apiUrl)/gastos/summary")
    else {
      completion(Timeline(entries: [cachedEntry()], policy: .after(nextRefresh)))
      return
    }

    var request = URLRequest(url: url, timeoutInterval: 15)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    // Pide el resumen al backend; si falla, se queda con el último que guardó la app
    URLSession.shared.dataTask(with: request) { data, response, _ in
      if let data,
         (response as? HTTPURLResponse)?.statusCode == 200,
         let summary = try? JSONDecoder().decode(GastosSummary.self, from: data) {
        defaults.set(String(data: data, encoding: .utf8), forKey: "summary")
        let entry = SaldoEntry(date: Date(), summary: summary, loggedIn: true)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
      } else {
        completion(Timeline(entries: [cachedEntry()], policy: .after(nextRefresh)))
      }
    }.resume()
  }

  private func cachedEntry() -> SaldoEntry {
    let loggedIn = !(defaults?.string(forKey: "token") ?? "").isEmpty
    guard
      loggedIn,
      let json = defaults?.string(forKey: "summary"),
      let data = json.data(using: .utf8),
      let summary = try? JSONDecoder().decode(GastosSummary.self, from: data)
    else {
      return SaldoEntry(date: Date(), summary: nil, loggedIn: loggedIn)
    }
    return SaldoEntry(date: Date(), summary: summary, loggedIn: true)
  }
}

// MARK: - Vistas

private func euros(_ value: Double, decimals: Int = 2) -> String {
  value.formatted(.number.precision(.fractionLength(decimals)).locale(Locale(identifier: "es_ES"))) + " €"
}

private func barColor(_ summary: GastosSummary) -> Color {
  if summary.isCompanyMaxed { return .red }
  if summary.spentRatio > 0.8 { return .orange }
  return .green
}

struct SaldoWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: SaldoEntry

  var body: some View {
    if let summary = entry.summary {
      switch family {
      case .accessoryCircular: CircularView(summary: summary)
      case .accessoryRectangular: RectangularView(summary: summary)
      case .accessoryInline: Text("💳 \(euros(summary.companyRemaining, decimals: 0)) restantes")
      case .systemMedium: MediumView(summary: summary)
      default: SmallView(summary: summary)
      }
    } else {
      EmptyStateView(loggedIn: entry.loggedIn)
    }
  }
}

private struct SmallView: View {
  let summary: GastosSummary

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Label("SALDO", systemImage: "creditcard.fill")
        .font(.caption2.weight(.semibold))
        .foregroundStyle(.secondary)

      Spacer(minLength: 0)

      Text(euros(summary.companyRemaining))
        .font(.system(size: 28, weight: .bold, design: .rounded))
        .foregroundStyle(summary.isCompanyMaxed ? .red : .primary)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
        .contentTransition(.numericText())

      ProgressView(value: summary.spentRatio)
        .tint(barColor(summary))

      Text(summary.workdaysLeft > 0
           ? "≈ \(euros(summary.dailyAllowance))/día"
           : "de \(euros(summary.companyBudget, decimals: 0))")
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }
}

private struct MediumView: View {
  let summary: GastosSummary

  var body: some View {
    HStack(spacing: 16) {
      SmallView(summary: summary)

      VStack(alignment: .leading, spacing: 8) {
        StatRow(title: "Gastado", value: euros(summary.totalSpent))
        StatRow(title: "Días laborables", value: "\(summary.workdaysLeft)")
        if summary.isCompanyMaxed {
          StatRow(title: "Nómina", value: euros(summary.payrollRemaining))
        }
        if let last = summary.lastGasto {
          Divider()
          VStack(alignment: .leading, spacing: 2) {
            Text("Último pago")
              .font(.caption2)
              .foregroundStyle(.secondary)
            Text("\(last.merchant) · \(euros(last.amount))")
              .font(.caption.weight(.medium))
              .lineLimit(1)
          }
        }
        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

private struct StatRow: View {
  let title: String
  let value: String

  var body: some View {
    HStack {
      Text(title).font(.caption).foregroundStyle(.secondary)
      Spacer()
      Text(value).font(.caption.weight(.semibold)).monospacedDigit()
    }
  }
}

private struct CircularView: View {
  let summary: GastosSummary

  var body: some View {
    Gauge(value: 1 - summary.spentRatio) {
      Image(systemName: "creditcard.fill")
    } currentValueLabel: {
      Text("\(Int(summary.companyRemaining.rounded()))")
    }
    .gaugeStyle(.accessoryCircular)
  }
}

private struct RectangularView: View {
  let summary: GastosSummary

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Label("Saldo", systemImage: "creditcard.fill")
        .font(.caption2.weight(.semibold))
      Text(euros(summary.companyRemaining))
        .font(.headline)
        .widgetAccentable()
      ProgressView(value: summary.spentRatio)
    }
  }
}

private struct EmptyStateView: View {
  let loggedIn: Bool

  var body: some View {
    VStack(spacing: 6) {
      Image(systemName: "creditcard")
        .font(.title2)
        .foregroundStyle(.secondary)
      Text(loggedIn ? "Abre VICA para cargar tu saldo" : "Inicia sesión en VICA")
        .font(.caption)
        .multilineTextAlignment(.center)
        .foregroundStyle(.secondary)
    }
  }
}

// MARK: - Widget

struct SaldoWidget: Widget {
  let kind = "SaldoWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SaldoProvider()) { entry in
      SaldoWidgetView(entry: entry)
        .containerBackground(.background, for: .widget)
    }
    .configurationDisplayName("Saldo del mes")
    .description("Lo que te queda del presupuesto de empresa.")
    .supportedFamilies([
      .systemSmall, .systemMedium,
      .accessoryCircular, .accessoryRectangular, .accessoryInline,
    ])
  }
}
