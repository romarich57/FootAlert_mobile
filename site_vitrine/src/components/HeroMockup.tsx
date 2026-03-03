import { motion } from 'framer-motion';

export function HeroMockup() {
  return (
    <motion.div
      className="phone-mockup"
      initial={{ rotate: -4, opacity: 0.6 }}
      animate={{ rotate: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.2, 0.9, 0.2, 1] }}
      aria-hidden="true"
    >
      <div className="phone-screen">
        <header>
          <span>Live Match</span>
          <span className="dot-live">•</span>
        </header>
        <div className="match-line">
          <span>PSG</span>
          <strong>2</strong>
        </div>
        <div className="match-line">
          <span>OM</span>
          <strong>1</strong>
        </div>
        <small>82&apos; - Ligue 1</small>
      </div>
    </motion.div>
  );
}
