import { ArrowLeft, MapPinOff } from "lucide-react";
import { Link } from "react-router-dom";
import "./NavigationState.css";

export function NotFoundPage({ admin = false }: { admin?: boolean }) {
  return <section className={`navigation-state${admin ? "" : " navigation-state--public"}`} aria-labelledby="not-found-title">
    <span className="navigation-state__icon"><MapPinOff size={28} aria-hidden="true" /></span>
    <span className="navigation-state__eyebrow">Page not found</span>
    <h1 id="not-found-title">Let’s get you back on track.</h1>
    <p>This address doesn’t match an available page. Use the link below to continue.</p>
    <Link to={admin ? "/admin/dashboard" : "/"}><ArrowLeft size={16} aria-hidden="true" />{admin ? "Back to dashboard" : "Back to Learners"}</Link>
  </section>;
}
