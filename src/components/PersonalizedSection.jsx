import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Target } from 'lucide-react';
import './PersonalizedSection.css';

const recommendations = [
  { title: 'Interstellar', reason: 'Because you liked Sci-Fi epics', score: 98 },
  { title: 'The Godfather', reason: 'Because you enjoy classic drama', score: 96 },
  { title: 'Pride & Prejudice', reason: 'Because you watch romance', score: 94 },
  { title: 'Blade Runner 2049', reason: 'Because you like cyberpunk visuals', score: 92 },
];

const PersonalizedSection = () => (
  <section id="for-you" className="section personalized-section">
    <h2 className="section-title"><Brain size={36} style={{display:'inline',marginRight:'12px',verticalAlign:'middle'}} /> Based on Your Taste</h2>
    <div className="personalized-row">
      {recommendations.map((r, i) => (
        <motion.div key={r.title} className="personal-card" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:i*0.1}}>
          <h3>{r.title}</h3>
          <div className="personal-score"><Target size={16} /> Match: {r.score}%</div>
          <p className="personal-reason">{r.reason}</p>
        </motion.div>
      ))}
    </div>
  </section>
);
export default PersonalizedSection;
