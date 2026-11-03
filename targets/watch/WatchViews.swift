import SwiftUI

// Pantallas de la app del reloj; el estado y WatchConnectivity están en VICAWatchApp.swift

struct LoginHintView: View {
  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "iphone")
        .font(.title2)
        .foregroundStyle(.secondary)
      Text("Abre VICA en el iPhone e inicia sesión")
        .font(.footnote)
        .multilineTextAlignment(.center)
        .foregroundStyle(.secondary)
    }
    .padding()
  }
}

// MARK: - Página 1: saldo

struct SaldoPage: View {
  let summary: GastosSummary

  var body: some View {
    VStack(spacing: 6) {
      ZStack {
        Circle()
          .stroke(Color.gray.opacity(0.25), lineWidth: 8)
        Circle()
          .trim(from: 0, to: 1 - summary.spentRatio)
          .stroke(stateColor(summary), style: StrokeStyle(lineWidth: 8, lineCap: .round))
          .rotationEffect(.degrees(-90))
        VStack(spacing: 0) {
          Text(euros(summary.companyRemaining))
            .font(.system(size: 24, weight: .bold, design: .rounded))
            .minimumScaleFactor(0.6)
            .lineLimit(1)
          Text("de \(euros(summary.companyBudget, decimals: 0))")
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 14)
      }
      .frame(maxWidth: 120, maxHeight: 120)

      HStack {
        MiniStat(title: "AL DÍA", value: "≈ \(euros(summary.allowancePerDay))")
        Spacer()
        if let today = summary.spentToday {
          MiniStat(title: "HOY", value: euros(today), alignment: .trailing)
        }
      }
    }
    .padding(.horizontal, 4)
    .containerBackground(stateColor(summary).gradient.opacity(0.25), for: .tabView)
    .navigationTitle("Saldo")
  }
}

struct MiniStat: View {
  let title: String
  let value: String
  var alignment: HorizontalAlignment = .leading

  var body: some View {
    VStack(alignment: alignment, spacing: 0) {
      Text(title)
        .font(.system(size: 9, weight: .semibold))
        .foregroundStyle(.secondary)
      Text(value)
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .monospacedDigit()
    }
  }
}

// MARK: - Página 2: últimos pagos

struct PagosPage: View {
  let summary: GastosSummary

  var body: some View {
    let pagos = summary.recentGastos ?? []
    List {
      if pagos.isEmpty {
        Text("Aún no hay pagos este mes")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
      ForEach(pagos, id: \.self) { gasto in
        PagoRow(gasto: gasto)
      }
    }
    .navigationTitle("Pagos")
  }
}

struct PagoRow: View {
  let gasto: GastosSummary.RecentGasto

  var body: some View {
    let estado = EstadoPago(gasto.status)
    HStack(spacing: 8) {
      Image(systemName: estado.icon)
        .foregroundStyle(estado.color)
      VStack(alignment: .leading, spacing: 0) {
        Text(gasto.merchant)
          .font(.system(size: 14, weight: .medium))
          .lineLimit(1)
        Text("\(fechaCorta(gasto.date)) · \(estado.label)")
          .font(.system(size: 11))
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
      Spacer(minLength: 2)
      Text((estado.isIncome ? "+" : "") + euros(gasto.amount))
        .font(.system(size: 13, weight: .semibold))
        .monospacedDigit()
        .foregroundStyle(estado.isIncome ? Color.blue : Color.primary)
        .strikethrough(estado.isVoid, color: .secondary)
    }
  }
}
