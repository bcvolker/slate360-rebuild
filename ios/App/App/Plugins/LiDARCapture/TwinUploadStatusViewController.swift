import UIKit

/// Post-capture status for a Twin scan. Four states, one screen:
/// saved on the phone, uploading (percent), failed with Retry, or done.
/// UIKit only — this replaces the WebView upload spinner and the review funnel.
final class TwinUploadStatusViewController: UIViewController {

    enum Phase: Equatable {
        case savedLocally
        case uploading(percent: Int)
        case failed(message: String)
        case done
    }

    /// True once a project id is known (selected, or created for this scan).
    var projectAttached = false
    /// True only when this scan created the quick-scan project because none was selected.
    var projectCreated = false
    /// Relaunch screen for an upload that outlived the process. Close does not end a capture.
    var isResume = false
    var onRetry: (() -> Void)?
    var onClose: (() -> Void)?

    private var phase: Phase = .savedLocally
    private var lastPercent = 0
    private var stepNote = ""
    private let titleLabel = UILabel()
    private let detailLabel = UILabel()
    private let percentLabel = UILabel()
    private let retryButton = UIButton(type: .system)
    private let closeButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        isModalInPresentation = true
        view.backgroundColor = UIColor(red: 0x0B / 255, green: 0x0F / 255, blue: 0x15 / 255, alpha: 1)

        titleLabel.font = .systemFont(ofSize: 28, weight: .semibold)
        titleLabel.textColor = .white
        titleLabel.numberOfLines = 0

        detailLabel.font = .systemFont(ofSize: 17, weight: .regular)
        detailLabel.textColor = UIColor(red: 0xF8 / 255, green: 0xFA / 255, blue: 0xFC / 255, alpha: 1)
        detailLabel.numberOfLines = 0

        percentLabel.font = .monospacedDigitSystemFont(ofSize: 44, weight: .semibold)
        percentLabel.textColor = .white

        configure(retryButton, title: "Retry", filled: true)
        configure(closeButton, title: "Close", filled: false)
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [titleLabel, percentLabel, detailLabel, retryButton, closeButton])
        stack.axis = .vertical
        stack.alignment = .fill
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            stack.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor),
            retryButton.heightAnchor.constraint(equalToConstant: 52),
            closeButton.heightAnchor.constraint(equalToConstant: 52),
        ])
        render()
    }

    func apply(_ phase: Phase) {
        switch phase {
        case let .uploading(percent):
            lastPercent = max(0, min(100, percent))
            self.phase = .uploading(percent: lastPercent)
        default:
            stepNote = ""
            self.phase = phase
        }
        guard isViewLoaded else { return }
        render()
    }

    /// Percent and step label update independently so a new file name does not reset the bar.
    func updateUpload(percent: Int?, note: String?) {
        if let percent { lastPercent = max(0, min(100, percent)) }
        if let note, !note.isEmpty { stepNote = note }
        phase = .uploading(percent: lastPercent)
        guard isViewLoaded else { return }
        render()
    }

    func noteDestination(attached: Bool, createdProject: Bool) {
        projectAttached = attached
        projectCreated = createdProject
        guard isViewLoaded else { return }
        render()
    }

    private func render() {
        switch phase {
        case .savedLocally:
            titleLabel.text = "Saved locally"
            percentLabel.isHidden = true
            detailLabel.text = projectLine + " Upload starts now and keeps going with the screen off."
            retryButton.isHidden = true
            closeButton.isHidden = true
        case let .uploading(percent):
            titleLabel.text = "Uploading"
            percentLabel.isHidden = false
            percentLabel.text = "\(max(0, min(100, percent)))%"
            percentLabel.accessibilityLabel = "Uploading \(max(0, min(100, percent))) percent"
            let pocket = "You can lock the phone or put it in a pocket. This upload continues."
            detailLabel.text = stepNote.isEmpty ? pocket : "\(stepNote) \(pocket)"
            retryButton.isHidden = true
            // A relaunch can sit here while parts are still on disk. Close leaves the
            // background upload running. The live capture screen stays up until Done or Failed.
            closeButton.isHidden = !isResume
        case let .failed(message):
            titleLabel.text = "Couldn't upload"
            percentLabel.isHidden = true
            detailLabel.text = message
            retryButton.isHidden = onRetry == nil
            retryButton.isEnabled = true
            closeButton.isHidden = false
        case .done:
            titleLabel.text = "Done"
            percentLabel.isHidden = true
            detailLabel.text = doneLine
            retryButton.isHidden = true
            closeButton.isHidden = false
        }
    }

    private var projectLine: String {
        if projectAttached && !projectCreated {
            return "Saving into the project you selected."
        }
        return "No project was selected, so one is created for this scan."
    }

    private var doneLine: String {
        if isResume { return "The scan finished uploading." }
        if projectAttached && !projectCreated { return "The scan is in the selected project." }
        return "The scan is in a new project."
    }

    private func configure(_ button: UIButton, title: String, filled: Bool) {
        var config = UIButton.Configuration.filled()
        config.title = title
        config.baseForegroundColor = .white
        config.baseBackgroundColor = filled
            ? UIColor(red: 0x3D / 255, green: 0x8E / 255, blue: 0xFF / 255, alpha: 1)
            : UIColor(white: 1, alpha: 0.12)
        config.cornerStyle = .fixed
        config.background.cornerRadius = 12
        config.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 18, bottom: 14, trailing: 18)
        button.configuration = config
    }

    @objc private func retryTapped() {
        retryButton.isEnabled = false
        onRetry?()
    }

    @objc private func closeTapped() { onClose?() }
}
