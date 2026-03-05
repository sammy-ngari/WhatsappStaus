/**
 * InfoSection icon renderer.
 * Keeps instructional cards concise by using semantic icon labels.
 *
 * @param {{ name: string }} props - Icon identifier.
 * @returns {import("react").JSX.Element}
 */
const InfoIcon = ({ name }) => {
  const iconMap = {
    campaign: "M3 6h18v2H3V6Zm0 5h14v2H3v-2Zm0 5h18v2H3v-2Z",
    share: "M18 16a3 3 0 0 0-2.24 1.03L8.91 13.7a3.42 3.42 0 0 0 0-3.4l6.85-3.33A3 3 0 1 0 15 5a2.9 2.9 0 0 0 .06.58L8.2 8.92a3 3 0 1 0 0 6.16l6.86 3.34A2.91 2.91 0 0 0 15 19a3 3 0 1 0 3-3Z",
    users: "M16 11c1.66 0 2.99-1.57 2.99-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Zm-8 0c1.66 0 2.99-1.57 2.99-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.94 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z",
    earnings: "M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 15.93V19h-2v-1.1a4.12 4.12 0 0 1-3-1.7l1.54-1.26a2.25 2.25 0 0 0 1.88.9c1.12 0 1.88-.56 1.88-1.37s-.56-1.29-2.05-1.75c-1.91-.59-3.24-1.28-3.24-3.08a3.14 3.14 0 0 1 2.81-3.02V5h2v1.12a3.68 3.68 0 0 1 2.54 1.31l-1.47 1.25a2.18 2.18 0 0 0-1.63-.64c-.97 0-1.56.53-1.56 1.24 0 .77.65 1.13 2.17 1.63 2.07.66 3.14 1.57 3.14 3.2a3.24 3.24 0 0 1-2.71 3.22Z",
    company: "M3 21h18v-2H3v2Zm2-4h4V7H5v10Zm5 0h4V3h-4v14Zm5 0h4v-7h-4v7Z",
    brand: "m12 2 9 4-9 4-9-4 9-4Zm7 7.2V14c0 3-3.13 5.5-7 5.5S5 17 5 14V9.2l7 3.1 7-3.1Z",
    launch: "M5 19h14v2H5v-2Zm7-18 7 7-7 7-1.41-1.41L15.17 9H3V7h12.17l-4.58-4.59L12 1Z",
    analytics: "M5 9h3v10H5V9Zm5-4h3v14h-3V5Zm5 7h3v7h-3v-7Z",
  };

  return (
    <span className="dashboard-info-icon">
      <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
        <path d={iconMap[name] || iconMap.campaign} fill="currentColor" />
      </svg>
    </span>
  );
};

/**
 * InfoSection
 *
 * Educational explanation block for onboarding dashboards.
 *
 * Responsibilities:
 * - render process explanation cards with icon + title + body
 * - keep onboarding guidance modular and reusable
 *
 * @param {{
 *   title: string,
 *   items: Array<{
 *     icon: string,
 *     title: string,
 *     description: string
 *   }>
 * }} props - Section heading and explanatory card list.
 * @returns {import("react").JSX.Element}
 */
export default function InfoSection({ title, items }) {
  return (
    <section className="dashboard-card">
      <h3 className="dashboard-section-title">{title}</h3>

      <div className="dashboard-info-grid">
        {/* Each card teaches one concept so users can absorb onboarding progressively. */}
        {items.map((item) => (
          <article className="dashboard-card" key={item.title}>
            <InfoIcon name={item.icon} />
            <h4 className="dashboard-info-item-title">{item.title}</h4>
            <p className="dashboard-info-item-copy">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
