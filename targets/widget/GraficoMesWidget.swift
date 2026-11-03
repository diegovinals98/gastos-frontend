import Charts
import SwiftUI
import WidgetKit

// Datos del gráfico: gasto acumulado hasta hoy y lo que "deberías" llevar si
// repartieras el presupuesto de empresa por igual entre todos los días del mes
private struct DatosGrafico {
  struct Punto: Identifiable {
    let day: Int
    let value: Double
    var id: Int { day }
  }

  let acumulado: [Punto]
  let ideal: [Punto]
  let hoy: Int
  let llevas: Double
  let deberias: Double
  let maxY: Double

  init(summary: GastosSummary, now: Date = Date()) {
    let daily = summary.dailySpent ?? []
    let lastDay = max(daily.count, 1)

    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "Europe/Madrid")!
    let parts = calendar.dateComponents([.year, .month, .day], from: now)
    let isCurrentMonth = parts.year == summary.year && parts.month == summary.month
    hoy = isCurrentMonth ? min(parts.day ?? lastDay, lastDay) : lastDay

    var running = 0.0
    acumulado = (1...hoy).map { day in
      running += day <= daily.count ? daily[day - 1] : 0
      return Punto(day: day, value: running)
    }

    ideal = (1...lastDay).map { day in
      Punto(day: day, value: summary.companyBudget * Double(day) / Double(lastDay))
    }

    llevas = running
    deberias = ideal[hoy - 1].value
    maxY = max(summary.companyBudget, running) * 1.05
  }

  var diferencia: Double { llevas - deberias }
  var vasBien: Bool { diferencia <= 0 }
}

struct GraficoMesView: View {
  @Environment(\.widgetFamily) private var family
  let entry: SaldoEntry

  var body: some View {
    if let summary = entry.summary, summary.dailySpent != nil {
      let datos = DatosGrafico(summary: summary)
      VStack(alignment: .leading, spacing: family == .systemLarge ? 10 : 6) {
        header(datos)
        chart(datos, budget: summary.companyBudget)
      }
    } else if entry.summary != nil {
      // Backend antiguo sin dailySpent
      EmptyStateView(loggedIn: true)
    } else {
      EmptyStateView(loggedIn: entry.loggedIn)
    }
  }

  private func header(_ datos: DatosGrafico) -> some View {
    HStack(alignment: .firstTextBaseline) {
      VStack(alignment: .leading, spacing: 1) {
        Text("Llevas \(euros(datos.llevas))")
          .font(family == .systemLarge ? .title3.weight(.bold) : .headline)
          .monospacedDigit()
        Text("Deberías llevar \(euros(datos.deberias))")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      Spacer()
      Label(
        datos.vasBien
          ? "\(euros(-datos.diferencia, decimals: 0)) por debajo"
          : "\(euros(datos.diferencia, decimals: 0)) por encima",
        systemImage: datos.vasBien ? "arrow.down.right" : "arrow.up.right"
      )
      .font(.caption.weight(.semibold))
      .foregroundStyle(datos.vasBien ? .green : .red)
      .lineLimit(1)
      RefreshButton()
    }
  }

  private func chart(_ datos: DatosGrafico, budget: Double) -> some View {
    Chart {
      ForEach(datos.acumulado) { punto in
        BarMark(x: .value("Día", punto.day), y: .value("Gastado", punto.value), width: .fixed(6))
          .foregroundStyle(punto.value > datos.ideal[punto.day - 1].value ? Color.red.gradient : Color.green.gradient)
          .cornerRadius(2)
      }
      ForEach(datos.ideal) { punto in
        LineMark(x: .value("Día", punto.day), y: .value("Ideal", punto.value), series: .value("Serie", "Ideal"))
          .foregroundStyle(Color.gray)
          .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
          .interpolationMethod(.linear)
      }
      RuleMark(y: .value("Presupuesto", budget))
        .foregroundStyle(Color.gray.opacity(0.4))
        .lineStyle(StrokeStyle(lineWidth: 1))
    }
    .chartYScale(domain: 0...datos.maxY)
    .chartXScale(domain: 0.5...(Double(datos.ideal.count) + 0.5))
    .chartXAxis {
      AxisMarks(values: [1, 8, 15, 22, datos.ideal.count]) { _ in
        AxisValueLabel().font(.system(size: 9))
      }
    }
    .chartYAxis {
      AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { _ in
        AxisGridLine().foregroundStyle(Color.gray.opacity(0.2))
        AxisValueLabel().font(.system(size: 9))
      }
    }
  }
}

struct GraficoMesWidget: Widget {
  let kind = "GraficoMesWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SaldoProvider()) { entry in
      GraficoMesView(entry: entry)
        // Aquí el tinte sigue al ritmo (como el texto "por encima/por debajo"), no al saldo
        .containerBackground(for: .widget) {
          TintedBackground(tint: entry.summary.map { DatosGrafico(summary: $0).vasBien ? .green : .red })
        }
    }
    .configurationDisplayName("Gasto del mes")
    .description("Lo que llevas gastado frente al ritmo ideal para llegar a fin de mes.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}
