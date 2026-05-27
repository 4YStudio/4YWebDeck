import { FileText } from "lucide-react";
import { useStore } from "../store";
import { t } from "../i18n";

export function WelcomeScreen() {
  const { newProject } = useStore();

  return (
    <div className="welcome">
      <div className="welcome-content">
        <div className="welcome-icon">
          <FileText size={48} strokeWidth={1.5} />
        </div>
        <h1 className="welcome-title">{t("welcome.title")}</h1>
        <p className="welcome-subtitle">{t("welcome.subtitle")}</p>
        <button className="welcome-btn" onClick={() => newProject("Untitled Presentation")}>
          {t("welcome.newBtn")}
        </button>
      </div>

      <style>{`
        .welcome {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 400ms ease;
        }
        .welcome-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-lg);
          text-align: center;
        }
        .welcome-icon {
          color: var(--color-cta);
          animation: slideUp 400ms ease 100ms both;
        }
        .welcome-title {
          font-family: var(--font-display);
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--color-text);
          letter-spacing: -0.03em;
          animation: slideUp 400ms ease 150ms both;
        }
        .welcome-subtitle {
          font-size: 1.1rem;
          color: var(--color-text-secondary);
          max-width: 400px;
          line-height: 1.6;
          animation: slideUp 400ms ease 200ms both;
        }
        .welcome-btn {
          padding: 12px 32px;
          border: none;
          border-radius: var(--radius-md);
          background: var(--color-cta);
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-normal);
          animation: slideUp 400ms ease 250ms both;
        }
        .welcome-btn:hover {
          background: var(--color-cta-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
        }
      `}</style>
    </div>
  );
}
