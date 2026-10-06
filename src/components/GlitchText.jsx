export default function GlitchText({ text }) {
  return <h2 className="glitch-text" aria-label={text}><span aria-hidden="true">{text}</span><span aria-hidden="true">{text}</span></h2>;
}
