import { ArrowLeft, Construction } from "lucide-react";
import { Link } from "react-router-dom";
import "../../pages/NavigationState.css";

type UpcomingPageProps = { title: string };

export function UpcomingPage({ title }: UpcomingPageProps) {
  return <section className="navigation-state" aria-labelledby="upcoming-title">
    <span className="navigation-state__icon"><Construction size={28} aria-hidden="true" /></span>
    <span className="navigation-state__eyebrow">Coming soon</span>
    <h1 id="upcoming-title">{title}</h1>
    <p>This section is planned for a future update. You can continue using the available pages from the navigation.</p>
    <Link to="/admin/dashboard"><ArrowLeft size={16} aria-hidden="true" />Back to dashboard</Link>
  </section>;
}
