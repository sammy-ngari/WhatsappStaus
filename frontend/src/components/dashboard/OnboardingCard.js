/**
 * OnboardingCard
 *
 * Primary welcome banner for role-specific dashboard onboarding.
 *
 * Responsibilities:
 * - render onboarding headline and supporting copy
 * - expose one or more call-to-action buttons
 * - keep CTA style usage centralized across dashboards
 *
 * @param {{
 *   title: string,
 *   description: string,
 *   ctaButtons: Array<{
 *     label: string,
 *     variant?: "primary" | "secondary" | "outline",
 *     onClick?: () => void,
 *     disabled?: boolean
 *   }>
 * }} props - Welcome content and CTA config.
 * @returns {import("react").JSX.Element}
 */
export default function OnboardingCard({ title, description, ctaButtons }) {
  /**
   * Maps abstract button variants into existing bootstrap classes.
   *
   * @param {"primary" | "secondary" | "outline" | undefined} variant - CTA style variant.
   * @returns {string}
   */
  const resolveButtonClassName = (variant) => {
    if (variant === "secondary") {
      return "btn btn-secondary";
    }

    if (variant === "outline") {
      return "btn btn-outline-light";
    }

    return "btn btn-primary";
  };

  return (
    <section className="dashboard-card dashboard-onboarding">
      <h2 className="dashboard-onboarding-title">{title}</h2>
      <p className="dashboard-onboarding-copy">{description}</p>

      <div className="dashboard-onboarding-actions">
        {/* CTA config stays data-driven so role pages define intent while this component controls style. */}
        {ctaButtons.map((button) => (
          <button
            className={resolveButtonClassName(button.variant)}
            disabled={button.disabled}
            key={button.label}
            onClick={button.onClick}
            type="button"
          >
            {button.label}
          </button>
        ))}
      </div>
    </section>
  );
}
