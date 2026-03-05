import { useNavigate } from "react-router-dom";
import InfoSection from "../../components/dashboard/InfoSection";
import OnboardingCard from "../../components/dashboard/OnboardingCard";
import StatCard from "../../components/dashboard/StatCard";
import StepList from "../../components/dashboard/StepList";

/**
 * AffiliateDashboard
 *
 * Role-specific onboarding dashboard for affiliate users.
 *
 * Responsibilities:
 * - welcome newly registered affiliates
 * - present setup checklist and starter metrics
 * - explain affiliate campaign monetization workflow
 *
 * @returns {import("react").JSX.Element}
 */
export default function AffiliateDashboard() {
  const navigate = useNavigate();

  // Affiliate onboarding sequence is intentionally explicit to reduce first-session drop-off.
  const onboardingSteps = [
    "Complete KYC verification",
    "Browse available campaigns",
    "Share campaigns on WhatsApp Status",
    "Track your earnings",
  ];

  const statCards = [
    { label: "Views", value: 0, note: "Status views recorded" },
    { label: "Clicks", value: 0, note: "Tracked link clicks" },
    { label: "Conversions", value: 0, note: "Qualified campaign actions" },
    { label: "Balance", value: "0.00", note: "Available earnings" },
  ];

  const infoItems = [
    {
      icon: "campaign",
      title: "Join a campaign",
      description: "Select approved campaigns aligned with your audience profile and reach goals.",
    },
    {
      icon: "share",
      title: "Share on WhatsApp Status",
      description: "Post campaign creatives and links from your dashboard toolkit directly to your status.",
    },
    {
      icon: "users",
      title: "Followers engage",
      description: "Real audience interactions are tracked through secure campaign attribution links.",
    },
    {
      icon: "earnings",
      title: "Earn commissions",
      description: "Verified interactions convert into earnings you can monitor in real time.",
    },
  ];

  return (
    <div>
      {/* Welcome card anchors the onboarding flow with immediate next actions. */}
      <OnboardingCard
        ctaButtons={[
          {
            label: "Complete Verification",
            onClick: () => navigate("/dashboard#verification"),
            variant: "primary",
          },
          {
            label: "Browse Campaigns",
            onClick: () => navigate("/dashboard#campaigns"),
            variant: "secondary",
          },
        ]}
        description="Start earning from your WhatsApp Status. Promote campaigns, track engagement, and earn commissions for real interactions."
        title="Welcome to WhatsApp Status Monetization"
      />

      <StepList steps={onboardingSteps} title="Get Started in 4 Steps" />

      {/* Zeroed starter metrics make the performance model visible before first campaign activity. */}
      <section className="dashboard-stat-grid">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            note={stat.note}
            value={stat.value}
          />
        ))}
      </section>

      <InfoSection items={infoItems} title="How It Works" />
    </div>
  );
}
