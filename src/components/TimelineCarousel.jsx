import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
const milestones = [{year:1968,title:'The Classics',label:'Neon-noir era'}, {year:1999,title:'The Matrix',label:'Digital revolution'}, {year:2010,title:'Streaming Era',label:'At-home theatres'}];
export default function TimelineCarousel() {
  const [i,setI]=useState(0);
  return (
    <section className="timeline-section" aria-label="CineVerse milestones">
      <h3 className="section-title classic-title">Cinema Through Time</h3>
      <div className="timeline-card" role="region" aria-label={`${milestones[i].year} milestone`}>
        <button onClick={()=>setI((i-1+milestones.length)%milestones.length)} aria-label="Previous"><ChevronLeft/></button>
        <div className="timeline-year">{milestones[i].year}</div>
        <h4>{milestones[i].title}</h4><span>{milestones[i].label}</span>
        <button onClick={()=>setI((i+1)%milestones.length)} aria-label="Next"><ChevronRight/></button>
      </div>
    </section>
  );
}
