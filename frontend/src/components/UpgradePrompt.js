import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './UpgradePrompt.css';

function UpgradePrompt({ feature, compact = false }) {
  const { entitlements } = useAuth();
  const info = entitlements?.features?.[feature];

  if (!info) return null;
  if (info.allowed && (info.limit === null || info.remaining > 0)) return null;

  const isLimit = info.allowed;
  const title = isLimit
    ? `${info.label} limit reached`
    : `${info.label} is a paid feature`;
  const message = isLimit
    ? `You have used ${info.used} of ${info.limit} this month on ${entitlements.plan.name}.`
    : `${info.label} is included on ${info.min_plan === 'plus' ? 'SkillBridge Plus' : 'SkillBridge Premium'} and above. You are on ${entitlements.plan.name}.`;

  return (
    <div className={`upgrade-prompt ${compact ? 'upgrade-prompt--compact' : ''}`}>
      <span className="upgrade-prompt__icon" aria-hidden="true">
        {isLimit ? <Sparkles size={20} /> : <LockKeyhole size={20} />}
      </span>
      <div className="upgrade-prompt__text">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      <Link to="/pricing" className="btn btn-primary btn-sm">
        View plans <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export default UpgradePrompt;
