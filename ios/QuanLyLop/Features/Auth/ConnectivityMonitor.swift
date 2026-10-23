import Foundation
import Network
import Observation

/// Network reachability for the sign-out block copy, which differs online and offline
/// (`SettingsPage.tsx` `LogoutBlocked`). `NWPathMonitor` is iOS' native equivalent of
/// the prototype's `navigator.onLine`; it never triggers a network request.
@MainActor
@Observable
final class ConnectivityMonitor {
    static let shared = ConnectivityMonitor()

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "vn.quanlylop.connectivity")

    private(set) var isOnline = false

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            Task { @MainActor [weak self] in self?.isOnline = online }
        }
        monitor.start(queue: queue)
    }
}
