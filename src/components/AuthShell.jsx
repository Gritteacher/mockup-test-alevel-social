import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuthShell({ title, description, children }) {
  return <div className="auth-page auth-page-new">
    <Link to="/" className="back-home"><ArrowLeft />กลับสู่หน้าหลัก</Link>
    <main className="auth-card-new">
      <header className="auth-brand-new">
        <span className="big-brand">M</span>
        <div><b>Mock Exam</b><small>A-Level สังคม By ครูไต๋</small></div>
      </header>
      <section className="auth-card-heading"><h1>{title}</h1><p>{description}</p></section>
      {children}
    </main>
  </div>;
}
