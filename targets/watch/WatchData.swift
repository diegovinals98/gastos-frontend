// ⚠️ Copia idéntica en targets/watch/ y targets/watch-widget/: si cambias una, cambia la otra.
// (La carpeta targets/_shared de apple-targets enlazaría también la app del iPhone y el widget.)
import Foundation
import SwiftUI

// En el reloj el App Group es local al reloj: lo comparten la app y las complicaciones
let watchAppGroup = "group.com.factorial.gastos"

// Mismo formato que GET /gastos/summary del backend
struct GastosSummary: Codable {
  struct LastGasto: Codable {
    let merchant: String
    let amount: Double
    let date: String
  }

  struct RecentGasto: Codable, Hashable {
    let merchant: String
    let amount: Double
    let date: String
    let status: String
  }

  let year: Int
  let month: Int
  let totalSpent: Double
  let companyBudget: Double
  let payrollBudget: Double
  let companyRemaining: Double
  let payrollRemaining: Double
  let lastGasto: LastGasto?
  let recentGastos: [RecentGasto]?
  let dailySpent: [Double]?
  let updatedAt: String

  static let placeholder = GastosSummary(
    year: 2026, month: 11, totalSpent: 72.4, companyBudget: 200, payrollBudget: 20,
    companyRemaining: 127.6, payrollRemaining: 20,
    lastGasto: LastGasto(merchant: "Cafetería", amount: 3.2, date: ""),
    recentGastos: [
      RecentGasto(merchant: "Cafetería Central", amount: 3.2, date: "2026-11-03T08:41:00.000Z", status: "complete"),
      RecentGasto(merchant: "Glovo", amount: 14.9, date: "2026-11-02T13:12:00.000Z", status: "complete"),
      RecentGasto(merchant: "Uber", amount: 9.5, date: "2026-11-02T09:02:00.000Z", status: "decline"),
    ],
    dailySpent: [8.2, 12.5, 3.2] + Array(repeating: 0, count: 27),
    updatedAt: ""
  )

  var spentRatio: Double {
    companyBudget > 0 ? min(totalSpent / companyBudget, 1) : 0
  }

  var isCompanyMaxed: Bool { totalSpent >= companyBudget }

  private static var madrid: Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "Europe/Madrid")!
    return calendar
  }

  // Días naturales que quedan en el mes contando hoy
  var daysLeft: Int {
    let calendar = Self.madrid
    let now = Date()
    let parts = calendar.dateComponents([.year, .month, .day], from: now)
    guard parts.year == year, parts.month == month, let day = parts.day,
          let range = calendar.range(of: .day, in: .month, for: now) else { return 0 }
    return range.count - day + 1
  }

  var allowancePerDay: Double {
    daysLeft > 0 ? companyRemaining / Double(daysLeft) : 0
  }

  var spentToday: Double? {
    guard let dailySpent else { return nil }
    let parts = Self.madrid.dateComponents([.year, .month, .day], from: Date())
    guard parts.year == year, parts.month == month, let day = parts.day, day <= dailySpent.count else { return 0 }
    return dailySpent[day - 1]
  }
}

// Sesión (token + URL que manda el iPhone) y último resumen descargado
enum SaldoAPI {
  private static var defaults: UserDefaults? { UserDefaults(suiteName: watchAppGroup) }

  static var token: String? {
    let value = defaults?.string(forKey: "token")
    return (value?.isEmpty ?? true) ? nil : value
  }

  static func saveSession(token: String, apiUrl: String) {
    defaults?.set(token, forKey: "token")
    defaults?.set(apiUrl, forKey: "apiUrl")
    if token.isEmpty {
      defaults?.removeObject(forKey: "summary")
    }
  }

  static func cached() -> GastosSummary? {
    guard let data = defaults?.data(forKey: "summary") else { return nil }
    return try? JSONDecoder().decode(GastosSummary.self, from: data)
  }

  // Pide el resumen al backend; si falla devuelve el último guardado
  static func fetch() async -> GastosSummary? {
    guard
      let token,
      let apiUrl = defaults?.string(forKey: "apiUrl"),
      let url = URL(string: "\(apiUrl)/gastos/summary")
    else { return cached() }

    var request = URLRequest(url: url, timeoutInterval: 15)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200 else { return cached() }
      let summary = try JSONDecoder().decode(GastosSummary.self, from: data)
      defaults?.set(data, forKey: "summary")
      return summary
    } catch {
      return cached()
    }
  }
}

func euros(_ value: Double, decimals: Int = 2) -> String {
  value.formatted(.number.precision(.fractionLength(decimals)).locale(Locale(identifier: "es_ES"))) + " €"
}

// Verde si vas bien, naranja a partir del 80 %, rojo si se acabó el de empresa
func stateColor(_ summary: GastosSummary) -> Color {
  if summary.isCompanyMaxed { return .red }
  if summary.spentRatio > 0.8 { return .orange }
  return .green
}

// Cómo se pinta cada estado de Factorial
struct EstadoPago {
  let label: String
  let icon: String
  let color: Color
  let isIncome: Bool
  let isVoid: Bool

  init(_ status: String) {
    switch status {
    case "decline", "rejected":
      (label, icon, color, isIncome, isVoid) = ("Rechazado", "xmark.circle.fill", .red, false, true)
    case "refund":
      (label, icon, color, isIncome, isVoid) = ("Reembolso", "arrow.uturn.backward.circle.fill", .blue, true, false)
    case "reverse":
      (label, icon, color, isIncome, isVoid) = ("Revertido", "arrow.uturn.left.circle.fill", .gray, false, true)
    case "withhold":
      (label, icon, color, isIncome, isVoid) = ("Retenido", "clock.fill", .orange, false, false)
    default:
      (label, icon, color, isIncome, isVoid) = ("Aprobado", "checkmark.circle.fill", .green, false, false)
    }
  }
}

private let isoParser: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

func fechaCorta(_ iso: String) -> String {
  guard let date = isoParser.date(from: iso) else { return "" }
  if Calendar.current.isDateInToday(date) {
    return date.formatted(date: .omitted, time: .shortened)
  }
  if Calendar.current.isDateInYesterday(date) {
    return "Ayer"
  }
  return date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "es_ES")))
}
