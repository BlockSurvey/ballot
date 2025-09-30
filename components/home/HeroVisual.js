import React from 'react';
import styles from './HeroVisual.module.css';

const HeroVisual = () => {
  return (
    <div className={styles.hero_visual_container}>
      <div className={styles.hero_visual_content}>
        {/* Main Voting Illustration */}
        <svg 
          width="450" 
          height="350" 
          viewBox="0 0 450 350" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={styles.hero_svg}
        >
          {/* Enhanced gradients and filters */}
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#764ba2" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#5546ff" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="ballotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="100%" stopColor="#f3f4f6" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.1)"/>
            </filter>
          </defs>

          {/* Background with enhanced styling */}
          <rect width="450" height="350" fill="url(#bgGradient)" rx="24"/>
          
          {/* Subtle grid pattern */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(79, 70, 229, 0.03)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="450" height="350" fill="url(#grid)" rx="24"/>

          {/* Enhanced Blockchain Network */}
          <g className={styles.network_lines}>
            {/* Main connection lines with glow effect */}
            <line x1="100" y1="175" x2="225" y2="120" stroke="url(#chainGradient)" strokeWidth="3" strokeDasharray="8,4" filter="url(#glow)">
              <animate attributeName="stroke-dashoffset" values="0;12" dur="3s" repeatCount="indefinite"/>
            </line>
            <line x1="225" y1="120" x2="350" y2="175" stroke="url(#chainGradient)" strokeWidth="3" strokeDasharray="8,4" filter="url(#glow)">
              <animate attributeName="stroke-dashoffset" values="0;12" dur="3s" repeatCount="indefinite"/>
            </line>
            <line x1="100" y1="175" x2="225" y2="230" stroke="url(#chainGradient)" strokeWidth="3" strokeDasharray="8,4" filter="url(#glow)">
              <animate attributeName="stroke-dashoffset" values="0;12" dur="3s" repeatCount="indefinite"/>
            </line>
            <line x1="225" y1="230" x2="350" y2="175" stroke="url(#chainGradient)" strokeWidth="3" strokeDasharray="8,4" filter="url(#glow)">
              <animate attributeName="stroke-dashoffset" values="0;12" dur="3s" repeatCount="indefinite"/>
            </line>
            
            {/* Additional network connections */}
            <line x1="100" y1="175" x2="350" y2="175" stroke="rgba(79, 70, 229, 0.2)" strokeWidth="1" strokeDasharray="3,3">
              <animate attributeName="stroke-dashoffset" values="0;6" dur="4s" repeatCount="indefinite"/>
            </line>
          </g>

          {/* Enhanced Central Ballot Box */}
          <g className={styles.central_ballot} filter="url(#shadow)">
            {/* Main ballot container */}
            <rect x="190" y="90" width="70" height="70" fill="url(#ballotGradient)" rx="12"/>
            <rect x="192" y="92" width="66" height="66" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="11"/>
            
            {/* Ballot content lines */}
            <rect x="200" y="110" width="50" height="3" fill="white" opacity="0.9" rx="1.5"/>
            <rect x="200" y="118" width="40" height="2" fill="white" opacity="0.7" rx="1"/>
            <rect x="200" y="125" width="30" height="2" fill="white" opacity="0.5" rx="1"/>
            <rect x="200" y="132" width="35" height="2" fill="white" opacity="0.6" rx="1"/>
            
            {/* Ballot slot */}
            <rect x="220" y="85" width="10" height="6" fill="rgba(0,0,0,0.3)" rx="1"/>
            
            {/* Enhanced vote animation */}
            <g className={styles.vote_animation}>
              <circle r="4" fill="#10b981" filter="url(#glow)">
                <animateMotion dur="4s" repeatCount="indefinite" path="M225,50 Q225,30 225,10 Q225,30 225,70 Q225,85 225,90"/>
                <animate attributeName="opacity" values="0;1;1;1;0" dur="4s" repeatCount="indefinite"/>
              </circle>
              <circle r="2" fill="#34d399">
                <animateMotion dur="4s" repeatCount="indefinite" path="M225,50 Q225,30 225,10 Q225,30 225,70 Q225,85 225,90"/>
                <animate attributeName="opacity" values="0;0.8;0.8;0.8;0" dur="4s" repeatCount="indefinite"/>
              </circle>
            </g>
          </g>

          {/* Enhanced Left Voter Node */}
          <g className={styles.voter_node} filter="url(#shadow)">
            <circle cx="100" cy="175" r="30" fill="url(#nodeGradient)" stroke="#4f46e5" strokeWidth="2"/>
            <circle cx="100" cy="175" r="28" fill="none" stroke="rgba(79, 70, 229, 0.1)" strokeWidth="1"/>
            
            {/* Voter avatar */}
            <circle cx="100" cy="165" r="10" fill="#4f46e5"/>
            <path d="M85 185 Q100 195 115 185" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round"/>
            
            {/* Multiple wallet indicators */}
            <g className={styles.wallet_indicators}>
              {/* Leather Wallet */}
              <rect x="120" y="155" width="12" height="8" fill="#5546FF" rx="1"/>
              <rect x="121" y="156" width="10" height="6" fill="white" rx="0.5"/>
              
              {/* Xverse Wallet */}
              <rect x="120" y="165" width="12" height="8" fill="#EE7A30" rx="1"/>
              <path d="M122 167l4 2-4 2h2l4-2-2-2h-4z" fill="white"/>
              
              {/* Asigna indicator */}
              <circle cx="138" cy="162" r="6" fill="#7C3AED"/>
              <circle cx="138" cy="160" r="2" fill="white"/>
              <path d="M133 167c0-2 2-3 5-3s5 1 5 3" stroke="white" strokeWidth="1" fill="none"/>
            </g>
            
            <text x="100" y="220" textAnchor="middle" fill="#4f46e5" fontSize="12" fontWeight="600">Community</text>
            <text x="100" y="235" textAnchor="middle" fill="#6b7280" fontSize="10">Member</text>
          </g>

          {/* Enhanced Right Voter Node */}
          <g className={styles.voter_node} filter="url(#shadow)">
            <circle cx="350" cy="175" r="30" fill="url(#nodeGradient)" stroke="#7c3aed" strokeWidth="2"/>
            <circle cx="350" cy="175" r="28" fill="none" stroke="rgba(124, 58, 237, 0.1)" strokeWidth="1"/>
            
            {/* DAO avatar */}
            <circle cx="350" cy="165" r="10" fill="#7c3aed"/>
            <path d="M335 185 Q350 195 365 185" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round"/>
            
            {/* Token indicator */}
            <circle cx="375" cy="165" r="8" fill="#f59e0b"/>
            <text x="375" y="170" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">₿</text>
            
            <text x="350" y="220" textAnchor="middle" fill="#7c3aed" fontSize="12" fontWeight="600">DAO</text>
            <text x="350" y="235" textAnchor="middle" fill="#6b7280" fontSize="10">Governance</text>
          </g>

          {/* Enhanced Result Dashboard */}
          <g className={styles.result_node} filter="url(#shadow)">
            <rect x="190" y="280" width="70" height="40" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" rx="8"/>
            <rect x="192" y="282" width="66" height="36" fill="rgba(16, 185, 129, 0.05)" rx="7"/>
            
            {/* Chart bars */}
            <rect x="200" y="295" width="8" height="15" fill="#10b981" rx="2"/>
            <rect x="212" y="290" width="8" height="20" fill="#34d399" rx="2"/>
            <rect x="224" y="298" width="8" height="12" fill="#6ee7b7" rx="2"/>
            <rect x="236" y="292" width="8" height="18" fill="#10b981" rx="2"/>
            
            {/* Result indicator */}
            <circle cx="250" cy="295" r="3" fill="#10b981">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
            </circle>
            
            <text x="225" y="340" textAnchor="middle" fill="#059669" fontSize="12" fontWeight="600">Live Results</text>
          </g>

          {/* Enhanced Security Badge */}
          <g className={styles.security_badge}>
            <circle cx="375" cy="60" r="25" fill="#f59e0b" className={styles.pulse} filter="url(#glow)"/>
            <circle cx="375" cy="60" r="23" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
            <text x="375" y="67" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">₿</text>
            
            {/* Stacks logo overlay */}
            <g transform="translate(390, 45)">
              <rect width="20" height="20" fill="#5546ff" rx="3"/>
              <path d="M10 2L4 6V10L10 6L16 10V6L10 2Z" fill="white"/>
              <path d="M4 10V14L10 18L16 14V10L10 14L4 10Z" fill="white"/>
            </g>
            
            <text x="375" y="95" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="600">Bitcoin Secured</text>
          </g>

          {/* Enhanced Token Based */}
          <g className={styles.token_gate}>
            <rect x="50" y="50" width="40" height="40" fill="#8b5cf6" rx="8" filter="url(#shadow)"/>
            <rect x="52" y="52" width="36" height="36" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="7"/>
            
            {/* Lock mechanism */}
            <rect x="62" y="65" width="16" height="12" fill="white" rx="2"/>
            <circle cx="70" cy="60" r="6" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="70" cy="71" r="2" fill="#8b5cf6"/>
            
            {/* Token symbols */}
            <circle cx="40" cy="40" r="6" fill="#10b981">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="100" cy="45" r="5" fill="#f59e0b">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin="1s" repeatCount="indefinite"/>
            </circle>
            
            <text x="70" y="110" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="600">Token Based</text>
          </g>

          {/* Floating Vote Particles */}
          <g className={styles.vote_particles}>
            <circle r="2" fill="#10b981" opacity="0.8">
              <animateMotion dur="4s" repeatCount="indefinite" path="M50,100 Q150,50 250,100 Q150,150 50,100"/>
              <animate attributeName="opacity" values="0;0.8;0" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle r="1.5" fill="#3b82f6" opacity="0.6">
              <animateMotion dur="5s" repeatCount="indefinite" path="M100,250 Q200,200 300,250 Q200,280 100,250"/>
              <animate attributeName="opacity" values="0;0.6;0" dur="5s" repeatCount="indefinite"/>
            </circle>
            <circle r="2.5" fill="#f59e0b" opacity="0.7">
              <animateMotion dur="6s" repeatCount="indefinite" path="M350,200 Q250,150 150,200 Q250,230 350,200"/>
              <animate attributeName="opacity" values="0;0.7;0" dur="6s" repeatCount="indefinite"/>
            </circle>
          </g>
        </svg>

        {/* Floating Stats */}
        <div className={styles.floating_stats}>
          <div className={styles.stat_bubble + ' ' + styles.stat_1}>
            <div className={styles.stat_icon}>💼</div>
            <div className={styles.stat_text}>3 Wallets</div>
          </div>
          <div className={styles.stat_bubble + ' ' + styles.stat_2}>
            <div className={styles.stat_icon}>🔐</div>
            <div className={styles.stat_text}>Token Based</div>
          </div>
          <div className={styles.stat_bubble + ' ' + styles.stat_3}>
            <div className={styles.stat_icon}>⛓️</div>
            <div className={styles.stat_text}>On-Chain</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroVisual;