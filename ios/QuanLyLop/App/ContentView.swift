import SwiftUI

/// Màn khởi động của bản nền: tên app, môi trường đang build (Staging/Production)
/// và URL API đọc từ Info.plist. Chưa có màn nghiệp vụ nào.
struct ContentView: View {
    let configuration: Result<AppConfiguration, AppConfigurationError>

    var body: some View {
        // Design-system gallery for comparison screenshots. Off unless launched with
        // `SIMCTL_CHILD_QLH_DESIGN_GALLERY=1|sheet`; never reachable from normal app use.
        if ProcessInfo.processInfo.environment["QLH_DESIGN_GALLERY"] != nil {
            DesignSystemGallery()
        } else {
            AuthFlowView(configuration: configuration)
        }
    }

    private var launchScreen: some View {
        VStack(spacing: 0) {
            Spacer()
            badge
            Spacer()

            Text("app.name")
                .font(.largeTitle.bold())
                .multilineTextAlignment(.center)
                .padding(.bottom, 8)

            Text("launch.tagline")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.bottom, 32)

            environmentSection
            Spacer()
            footer
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }

    private var badge: some View {
        Image(systemName: "book.closed.fill")
            .font(.system(size: 52, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 112, height: 112)
            .background(Color.accentColor, in: .rect(cornerRadius: 26))
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private var environmentSection: some View {
        switch configuration {
        case .success(let config):
            VStack(spacing: 12) {
                HStack(spacing: 8) {
                    Text("launch.environment")
                        .foregroundStyle(.secondary)
                    Text(config.environment.rawValue)
                        .fontWeight(.semibold)
                }
                .font(.callout)

                Text(config.apiBaseURL.absoluteString)
                    .font(.footnote.monospaced())
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 20)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 16))
        case .failure:
            Text("launch.configError")
                .font(.callout)
                .foregroundStyle(.red)
                .multilineTextAlignment(.center)
                .padding(20)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 16))
        }
    }

    @ViewBuilder
    private var footer: some View {
        if case .success(let config) = configuration {
            Text(verbatim: "\(config.appVersion) (\(config.buildNumber)) · \(config.bundleIdentifier)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
    }
}

#Preview {
    ContentView(
        configuration: .success(
            AppConfiguration(
                environment: .staging,
                apiBaseURL: URL(string: "https://staging.invalid")!,
                bundleIdentifier: "vn.quanlylop.app",
                appVersion: "0.1.0",
                buildNumber: "1"
            )
        )
    )
}

#Preview("Thiếu cấu hình") {
    ContentView(configuration: .failure(.missingKey(AppConfiguration.InfoKey.environment)))
}
