import Foundation

/// Cấu hình đọc từ Info.plist, do xcconfig của từng môi trường điền vào
/// (`APP_ENVIRONMENT`, `API_BASE_URL`) — xem `Config/Staging.xcconfig`.
///
/// Không chứa secret: chỉ tên môi trường và URL công khai của API.
struct AppConfiguration: Sendable, Equatable {
    enum Environment: String, Sendable, Equatable {
        case staging = "Staging"
        case production = "Production"
    }

    let environment: Environment
    let apiBaseURL: URL
    let bundleIdentifier: String
    let appVersion: String
    let buildNumber: String
    /// Google Form that starts an account-deletion request; the single place to change it is
    /// `DELETE_ACCOUNT_FORM_URL` in `Config/Base.xcconfig`.
    var deleteAccountFormURL: URL? = nil
}

enum AppConfigurationError: Error, Sendable, Equatable {
    case missingKey(String)
    case invalidBaseURL(String)
    case unknownEnvironment(String)
}

extension AppConfiguration {
    /// Khoá Info.plist. Dùng hằng để tránh gõ sai chuỗi ở nhiều nơi.
    enum InfoKey {
        static let environment = "AppEnvironment"
        static let apiBaseURL = "APIBaseURL"
        static let bundleIdentifier = "CFBundleIdentifier"
        static let appVersion = "CFBundleShortVersionString"
        static let buildNumber = "CFBundleVersion"
        static let deleteAccountFormURL = "DeleteAccountFormURL"
    }

    /// Keychain service holding the session token. One per environment, so Staging and Production
    /// sessions never mix; shared by the auth flow and the app frame's push registration.
    var tokenStoreService: String { "\(bundleIdentifier).\(environment.rawValue)" }

    /// Prefix of every identifier the app owns (Keychain service, defaults key, queue and log labels):
    /// the bundle id the build was signed with, so no second identifier needs to be kept in sync.
    static var identifierPrefix: String { Bundle.main.bundleIdentifier ?? "com.study.teacherthu" }

    static func load(bundle: Bundle = .main) -> Result<AppConfiguration, AppConfigurationError> {
        do {
            return .success(try make(bundle: bundle))
        } catch let error as AppConfigurationError {
            return .failure(error)
        } catch {
            return .failure(.missingKey("unknown"))
        }
    }

    private static func make(bundle: Bundle) throws -> AppConfiguration {
        func string(_ key: String) throws -> String {
            guard let value = bundle.object(forInfoDictionaryKey: key) as? String,
                  !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            else {
                throw AppConfigurationError.missingKey(key)
            }
            return value
        }

        let rawEnvironment = try string(InfoKey.environment)
        guard let environment = Environment(rawValue: rawEnvironment) else {
            throw AppConfigurationError.unknownEnvironment(rawEnvironment)
        }

        let rawBaseURL = try string(InfoKey.apiBaseURL)
        guard let apiBaseURL = URL(string: rawBaseURL), apiBaseURL.host != nil else {
            throw AppConfigurationError.invalidBaseURL(rawBaseURL)
        }

        return AppConfiguration(
            environment: environment,
            apiBaseURL: apiBaseURL,
            bundleIdentifier: try string(InfoKey.bundleIdentifier),
            appVersion: try string(InfoKey.appVersion),
            buildNumber: try string(InfoKey.buildNumber),
            deleteAccountFormURL: (try? string(InfoKey.deleteAccountFormURL)).flatMap { URL(string: $0) }
        )
    }
}
