import Foundation
import Security

protocol TokenStore: Sendable {
    func token() async throws -> String?
    func setToken(_ token: String) async throws
    func clear() async throws
}

actor InMemoryTokenStore: TokenStore {
    private var value: String?
    init(token: String? = nil) { value = token }
    func token() -> String? { value }
    func setToken(_ token: String) { value = token }
    func clear() { value = nil }
}

struct KeychainFailure: Error, Sendable { let status: OSStatus }

actor KeychainTokenStore: TokenStore {
    private let service: String
    private let account: String

    /// Include environment in service, user ID in account. No identity/token in logs.
    init(service: String, account: String = "session") {
        self.service = service; self.account = account
    }
    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service, kSecAttrAccount as String: account]
    }
    func token() throws -> String? {
        var query = query
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeychainFailure(status: status) }
        guard let data = result as? Data, let value = String(data: data, encoding: .utf8) else {
            throw KeychainFailure(status: errSecDecode)
        }
        return value
    }
    func setToken(_ token: String) throws {
        let attributes: [String: Any] = [kSecValueData as String: Data(token.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            let addStatus = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil)
            guard addStatus == errSecSuccess else { throw KeychainFailure(status: addStatus) }
        } else if status != errSecSuccess { throw KeychainFailure(status: status) }
    }
    func clear() throws {
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw KeychainFailure(status: status) }
    }
}
