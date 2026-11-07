actor FirebaseTokenStore: DeviceTokenSource {
    private var token: String?

    func setToken(_ token: String?) {
        self.token = token
    }

    func currentToken() async -> String? { token }
}

enum FirebaseConfigurationGate {
    @discardableResult
    static func configureIfAvailable(configurationExists: Bool, configure: () -> Void) -> Bool {
        guard configurationExists else { return false }
        configure()
        return true
    }
}
