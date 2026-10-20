import SwiftUI

/// Điểm vào của app. Chưa có màn nghiệp vụ: mở thẳng màn khởi động.
@main
struct QuanLyLopApp: App {
    private let configuration = AppConfiguration.load()

    var body: some Scene {
        WindowGroup {
            ContentView(configuration: configuration)
        }
    }
}
