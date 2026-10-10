import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import "./Header.css";

const navItems = [
  { label: "Courses", href: "#courses" },
  { label: "Our approach", href: "#about" },
  { label: "FAQs", href: "#faq" },
  { label: "Contact", href: "#contact" },
];
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header" onKeyDown={event => { if (event.key === "Escape") setMenuOpen(false); }}>
    <div className="container site-header__inner">
      <a className="site-header__brand" href="#home" aria-label="Learners Commercial Institute home" onClick={() => setMenuOpen(false)}><span className="site-header__brand-text"><strong>Learners</strong><span>Commercial Institute</span></span></a>
      <nav className="site-header__nav" aria-label="Primary navigation">{navItems.map(item => <a key={item.href} href={item.href} className="site-header__nav-link">{item.label}</a>)}</nav>
      <div className="site-header__actions"><ThemeToggle /><a className="site-header__cta" href="#enquiry">Course enquiry<ArrowUpRight size={16} aria-hidden="true" /></a><button className="site-header__menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
    </div>
    <nav id="mobile-navigation" className="site-header__mobile-nav" aria-label="Mobile navigation" hidden={!menuOpen}>{navItems.map(item => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}<ArrowUpRight size={16} aria-hidden="true" /></a>)}</nav>
  </header>;
}
