import WidgetKit
import SwiftUI

// MARK: - App Group Data Models

struct GardenWidgetEntry: TimelineEntry {
    let date: Date
    let weather: String
    let tempC: Int
    let blooms: Int
    let pets: Int
    let stickyNote: String
    let tasks: [GardenTask]
}

struct GardenTask: Identifiable {
    let id: String
    let text: String
    let isDone: BooleanLiteralType
}

struct GardenWidgetDataProvider {
    static func fetchCurrentState(date: Date = Date()) -> GardenWidgetEntry {
        let defaults = UserDefaults(suiteName: "group.com.valois.lilosgarden")
        let weather = defaults?.string(forKey: "weather") ?? "SUNNY"
        let tempC = defaults?.integer(forKey: "tempC") ?? 24
        let blooms = defaults?.object(forKey: "blooms") != nil ? (defaults?.integer(forKey: "blooms") ?? 8) : 8
        let pets = defaults?.object(forKey: "pets") != nil ? (defaults?.integer(forKey: "pets") ?? 12) : 12
        let stickyNote = defaults?.string(forKey: "sticky_note") ?? "Take a deep breath and listen to the birds."

        var taskList: [GardenTask] = []
        if let tasksJsonStr = defaults?.string(forKey: "tasks_json"),
           let data = tasksJsonStr.data(using: .utf8),
           let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            for (idx, obj) in arr.enumerated() {
                let id = (obj["id"] as? String) ?? "\(idx)"
                let text = (obj["text"] as? String) ?? "Task"
                let isDone = (obj["done"] as? Bool) ?? false
                taskList.append(GardenTask(id: id, text: text, isDone: isDone))
            }
        }

        if taskList.isEmpty {
            taskList = [
                GardenTask(id: "1", text: "Pet Lilo & Cheeto", isDone: true),
                GardenTask(id: "2", text: "Relax on porch deck", isDone: false),
                GardenTask(id: "3", text: "Water forget-me-nots", isDone: false)
            ]
        }

        return GardenWidgetEntry(
            date: date,
            weather: weather,
            tempC: tempC == 0 ? 24 : tempC,
            blooms: blooms,
            pets: pets,
            stickyNote: stickyNote,
            tasks: taskList
        )
    }
}

// MARK: - Timeline Provider

struct GardenTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> GardenWidgetEntry {
        GardenWidgetDataProvider.fetchCurrentState()
    }

    func getSnapshot(in context: Context, completion: @escaping (GardenWidgetEntry) -> Void) {
        completion(GardenWidgetDataProvider.fetchCurrentState())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<GardenWidgetEntry>) -> Void) {
        let current = GardenWidgetDataProvider.fetchCurrentState()
        // Refresh every 15 minutes or when updated by App
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        let timeline = Timeline(entries: [current], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - WIDGET 1: Lilo Companion & Clock Widget

struct LiloCompanionClockWidgetView: View {
    var entry: GardenWidgetEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            // Stardew Wooden Frame & Velvet Mat
            Color(red: 0.17, green: 0.13, blue: 0.10)
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color(red: 0.55, green: 0.35, blue: 0.20), lineWidth: 4)
                .padding(2)

            HStack(spacing: 12) {
                // Pixel Cat Art (Lilo)
                VStack(spacing: 4) {
                    PixelCatView()
                    Text("Lilo & Cheeto")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(red: 0.98, green: 0.85, blue: 0.60))
                }
                .padding(.leading, 10)

                // Info & Clock
                VStack(alignment: .leading, spacing: 6) {
                    Text(entry.date, style: .time)
                        .font(.system(size: family == .systemSmall ? 18 : 24, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                        .shadow(color: .black.opacity(0.8), radius: 1, x: 1, y: 1)

                    HStack(spacing: 6) {
                        Text("🌸 \(entry.blooms) Blooms")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(red: 0.99, green: 0.70, blue: 0.80))
                    }

                    HStack(spacing: 6) {
                        Text("🌤 \(entry.tempC)°C \(entry.weather)")
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundColor(Color(red: 0.99, green: 0.90, blue: 0.65))
                    }
                }
                .padding(.trailing, 8)
                Spacer()
            }
            .padding(6)
        }
    }
}

struct LiloCompanionClockWidget: Widget {
    let kind: String = "LiloCompanionClockWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GardenTimelineProvider()) { entry in
            LiloCompanionClockWidgetView(entry: entry)
        }
        .configurationDisplayName("Cat Companion & Clock")
        .description("Features Lilo & Cheeto with live Stardew Valley clock, blooming status, and weather.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - WIDGET 2: Cozy Tasks & Notes Widget

struct LiloNotesWidgetView: View {
    var entry: GardenWidgetEntry

    var body: some View {
        ZStack {
            // Notice board parchment background
            Color(red: 0.99, green: 0.95, blue: 0.85)
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color(red: 0.45, green: 0.25, blue: 0.12), lineWidth: 4)
                .padding(2)

            VStack(alignment: .leading, spacing: 6) {
                // Header Bar
                HStack {
                    Text("SANCTUARY TASKS & NOTES")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(red: 0.45, green: 0.25, blue: 0.12))
                    Spacer()
                    Text("📌")
                        .font(.system(size: 10))
                }
                .padding(.bottom, 2)

                // Tasks list
                ForEach(entry.tasks.prefix(2)) { task in
                    HStack(spacing: 6) {
                        Image(systemName: task.isDone ? "checkmark.square.fill" : "square")
                            .font(.system(size: 11))
                            .foregroundColor(task.isDone ? .green : Color(red: 0.45, green: 0.25, blue: 0.12))
                        Text(task.text)
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .strikethrough(task.isDone, color: .gray)
                            .foregroundColor(task.isDone ? .gray : Color(red: 0.25, green: 0.15, blue: 0.08))
                            .lineLimit(1)
                    }
                }

                Spacer()

                // Pinned Sticky Note
                ZStack(alignment: .topLeading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(red: 0.99, green: 0.91, blue: 0.65))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color(red: 0.85, green: 0.65, blue: 0.25), lineWidth: 1)
                        )
                    VStack(alignment: .leading, spacing: 2) {
                        Text("📌 STICKY NOTE:")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(red: 0.65, green: 0.35, blue: 0.10))
                        Text(entry.stickyNote)
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundColor(Color(red: 0.35, green: 0.20, blue: 0.08))
                            .lineLimit(2)
                    }
                    .padding(6)
                }
                .frame(maxHeight: 52)
            }
            .padding(12)
        }
    }
}

struct LiloNotesWidget: Widget {
    let kind: String = "LiloNotesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GardenTimelineProvider()) { entry in
            LiloNotesWidgetView(entry: entry)
        }
        .configurationDisplayName("Cozy Tasks & Notes")
        .description("View your daily sanctuary tasks, check off completed habits, and keep sticky notes pinned.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - WIDGET 3: Cottage Window Sky Widget

struct LiloWindowSkyWidgetView: View {
    var entry: GardenWidgetEntry

    var skyGradient: LinearGradient {
        let hour = Calendar.current.component(.hour, from: entry.date)
        if hour >= 6 && hour < 9 {
            // Dawn / Sunrise
            return LinearGradient(colors: [Color(red: 0.98, green: 0.65, blue: 0.50), Color(red: 0.99, green: 0.85, blue: 0.65)], startPoint: .top, endPoint: .bottom)
        } else if hour >= 9 && hour < 17 {
            // Daytime Sky
            return LinearGradient(colors: [Color(red: 0.35, green: 0.65, blue: 0.95), Color(red: 0.65, green: 0.85, blue: 0.98)], startPoint: .top, endPoint: .bottom)
        } else if hour >= 17 && hour < 20 {
            // Sunset
            return LinearGradient(colors: [Color(red: 0.85, green: 0.35, blue: 0.30), Color(red: 0.98, green: 0.70, blue: 0.45)], startPoint: .top, endPoint: .bottom)
        } else {
            // Night
            return LinearGradient(colors: [Color(red: 0.08, green: 0.10, blue: 0.25), Color(red: 0.18, green: 0.20, blue: 0.40)], startPoint: .top, endPoint: .bottom)
        }
    }

    var body: some View {
        ZStack {
            // Window Sky Background
            skyGradient

            // Arched Cottage Window Frame
            VStack {
                Spacer()
                // Windowsill with peeking cat
                ZStack(alignment: .bottom) {
                    PixelCatHeadView()
                        .offset(y: -10)
                    Rectangle()
                        .fill(Color(red: 0.45, green: 0.25, blue: 0.12))
                        .frame(height: 14)
                }
            }

            // Window Pane Crossbars
            Rectangle()
                .fill(Color(red: 0.35, green: 0.18, blue: 0.08))
                .frame(width: 4)
            Rectangle()
                .fill(Color(red: 0.35, green: 0.18, blue: 0.08))
                .frame(height: 4)

            // Top Time overlay
            VStack {
                HStack {
                    Text(entry.date, style: .time)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.black.opacity(0.4))
                        .cornerRadius(4)
                    Spacer()
                }
                .padding(8)
                Spacer()
            }
        }
    }
}

struct LiloWindowSkyWidget: Widget {
    let kind: String = "LiloWindowSkyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GardenTimelineProvider()) { entry in
            LiloWindowSkyWidgetView(entry: entry)
        }
        .configurationDisplayName("Window Peek Sky Widget")
        .description("A cozy peek through the cottage window with dynamic sky lighting and peeking cat.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Pixel Cat SwiftUI Views

struct PixelCatView: View {
    var body: some View {
        VStack(spacing: 0) {
            // Ears
            HStack(spacing: 12) {
                Rectangle().fill(Color(red: 0.17, green: 0.11, blue: 0.07)).frame(width: 6, height: 6)
                Rectangle().fill(Color(red: 0.17, green: 0.11, blue: 0.07)).frame(width: 6, height: 6)
            }
            // Head
            ZStack {
                Rectangle().fill(Color(red: 1.0, green: 0.93, blue: 0.86)).frame(width: 28, height: 18)
                // Mask
                Rectangle().fill(Color(red: 0.26, green: 0.16, blue: 0.09)).frame(width: 14, height: 10)
                // Eyes
                HStack(spacing: 6) {
                    Rectangle().fill(Color(red: 0.22, green: 0.74, blue: 0.97)).frame(width: 3, height: 3)
                    Rectangle().fill(Color(red: 0.22, green: 0.74, blue: 0.97)).frame(width: 3, height: 3)
                }
            }
            // Body
            Rectangle().fill(Color(red: 1.0, green: 0.93, blue: 0.86)).frame(width: 24, height: 16)
        }
    }
}

struct PixelCatHeadView: View {
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Rectangle().fill(Color(red: 0.17, green: 0.11, blue: 0.07)).frame(width: 5, height: 5)
                Rectangle().fill(Color(red: 0.17, green: 0.11, blue: 0.07)).frame(width: 5, height: 5)
            }
            ZStack {
                Rectangle().fill(Color(red: 1.0, green: 0.93, blue: 0.86)).frame(width: 24, height: 14)
                Rectangle().fill(Color(red: 0.26, green: 0.16, blue: 0.09)).frame(width: 12, height: 8)
                HStack(spacing: 4) {
                    Rectangle().fill(Color(red: 0.22, green: 0.74, blue: 0.97)).frame(width: 2, height: 2)
                    Rectangle().fill(Color(red: 0.22, green: 0.74, blue: 0.97)).frame(width: 2, height: 2)
                }
            }
        }
    }
}

// MARK: - Widget Bundle

@main
struct LilosGardenWidgetBundle: WidgetBundle {
    var body: some Widget {
        LiloCompanionClockWidget()
        LiloNotesWidget()
        LiloWindowSkyWidget()
    }
}
