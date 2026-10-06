import { useState } from 'react';
import { Sparkles } from 'lucide-react';
export default function CineverseAssistant({ movie, onSuggest }) {
  const [msg, setMsg] = useState('Ask me about this film…');
  return (
    <div className="assistant-card" role="region" aria-label="AI concierge">
      <button onClick={() => onSuggest(movie)} aria-label="Get AI recommendation"><Sparkles /> <span>AI Concierge</span></button>
      <p>{msg}</p>
    </div>
  );
}
