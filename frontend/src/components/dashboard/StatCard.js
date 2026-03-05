/**
 * StatCard
 *
 * Compact metric card used across dashboard onboarding pages.
 *
 * Responsibilities:
 * - render a labeled metric value
 * - optionally display helper note and icon
 * - keep statistics styling consistent across roles
 *
 * @param {{
 *   label: string,
 *   value: string | number,
 *   note?: string,
 *   icon?: import("react").ReactNode
 * }} props - Metric display payload.
 * @returns {import("react").JSX.Element}
 */
export default function StatCard({ label, value, note, icon }) {
  return (
    <article className="dashboard-card dashboard-stat-card">
      <div className="dashboard-stat-head">
        <p className="dashboard-stat-label">{label}</p>
        {/* Optional icon slot keeps component reusable for richer metric variants. */}
        {icon || null}
      </div>
      <p className="dashboard-stat-value">{value}</p>
      {note ? <span className="dashboard-stat-note">{note}</span> : null}
    </article>
  );
}
