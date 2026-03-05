import { useNavigate } from "react-router-dom";
import InfoSection from "../../components/dashboard/InfoSection";
import OnboardingCard from "../../components/dashboard/OnboardingCard";
import StepList from "../../components/dashboard/StepList";

/**
 * AdvertiserDashboard
 *
 * Role-specific onboarding dashboard for advertiser users.
 *
 * Responsibilities:
 * - welcome business users into campaign workspace
 * - guide organization/brand setup sequence
 * - explain campaign launch lifecycle with affiliates
 *
 * @returns {import("react").JSX.Element}
 */
export default function AdvertiserDashboard() {
  const navigate = useNavigate();

  const onboardingSteps = [
    "Create your organization",
    "Add your brand",
    "Launch your first campaign",
    "Track campaign performance",
  ];

  const infoItems = [
    {
      icon: "company",
      title: "Set up your organization",
      description: "Create your company workspace to centralize teams, billing, and campaign ownership.",
    },
    {
      icon: "brand",
      title: "Register your brand",
      description: "Add brand assets and messaging guidelines to keep campaign creatives consistent.",
    },
    {
      icon: "launch",
      title: "Launch targeted campaigns",
      description: "Distribute campaign content through verified affiliates that match your audience.",
    },
    {
      icon: "analytics",
      title: "Optimize with analytics",
      description: "Monitor views, clicks, and conversions to improve return on advertising spend.",
    },
  ];

  return (
    <div>
      {/* Initial CTA points advertisers to organization setup, the required first milestone. */}
      <OnboardingCard
        ctaButtons={[
          {
            label: "Create Organization",
            onClick: () => navigate("/dashboard#organization"),
            variant: "primary",
          },
        ]}
        description="Launch targeted campaigns through WhatsApp. Reach thousands of engaged audiences through verified affiliates."
        title="Welcome to WhatsApp Campaign Manager"
      />

      <StepList steps={onboardingSteps} title="Launch Your Campaign Engine" />

      {/* Campaign state block keeps empty-state messaging explicit for first-time users. */}
      <section className="dashboard-card mb-4">
        <h3 className="dashboard-section-title">Campaign Overview</h3>
        <p className="dashboard-empty-state">
          You have not created any campaigns yet. Start by creating your organization.
        </p>
      </section>

      <InfoSection items={infoItems} title="How Campaigns Work" />
    </div>
  );
}
