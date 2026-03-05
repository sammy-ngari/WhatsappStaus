/**
 * StepList
 *
 * Numbered onboarding checklist.
 *
 * Responsibilities:
 * - render ordered setup steps in a scannable format
 * - keep onboarding sequence structure consistent between roles
 *
 * @param {{
 *   title: string,
 *   steps: string[]
 * }} props - Section heading and ordered step text values.
 * @returns {import("react").JSX.Element}
 */
export default function StepList({ title, steps }) {
  return (
    <section className="dashboard-card dashboard-step-list">
      <h3 className="dashboard-section-title">{title}</h3>

      {/* Number chips make the onboarding sequence easier to scan quickly. */}
      {steps.map((step, index) => (
        <div className="dashboard-step-row" key={`${step}-${index}`}>
          <span className="dashboard-step-index">{index + 1}</span>
          <p className="dashboard-step-text">{step}</p>
        </div>
      ))}
    </section>
  );
}
