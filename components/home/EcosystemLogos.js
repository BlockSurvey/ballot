import React from 'react';
import styles from './EcosystemLogos.module.css';

const EcosystemLogos = () => {
  return (
    <div className={styles.ecosystem_logos}>
      <span className={styles.trustbar_text}>Trusted by the Stacks ecosystem</span>
      <div className={styles.logo_grid}>
        {/* Stacks Logo */}
        <div className={styles.logo_item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0L4 6V12L12 6L20 12V6L12 0Z" fill="#5546FF"/>
            <path d="M4 12V18L12 24L20 18V12L12 18L4 12Z" fill="#5546FF"/>
          </svg>
          <span>Stacks</span>
        </div>

        {/* Bitcoin Logo */}
        <div className={styles.logo_item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#F7931A"/>
            <path d="M16.7 10.3c.2-1.4-.9-2.2-2.4-2.7L15 5.4l-1.2-.3-.7 2.8c-.3-.1-.6-.1-.9-.2L12.9 5l-1.2-.3-.7 2.8c-.2 0-.5-.1-.7-.1l0 0-1.7-.4-.3 1.3s.9.2.9.2c.5.1.6.4.5.6l-1.3 5.2c-.1.2-.2.4-.5.3 0 0-.9-.2-.9-.2l-.6 1.4 1.6.4c.3.1.6.1.9.2l-.7 2.8 1.2.3.7-2.8c.3.1.7.1 1 .2l-.7 2.8 1.2.3.7-2.8c2.9.5 5.1.3 6-2.1 1.3-1.9-.7-3.1-1.9-3.8 1.4-.3 2.4-1.2 2.7-3.1zm-4.8 6.7c-.5 2.1-4.1.9-5.3.7l.9-3.7c1.2.3 4.9.9 4.4 3zm.5-6.8c-.5 1.9-3.5.9-4.5.7l.8-3.4c1 .2 4.1.6 3.7 2.7z" fill="white"/>
          </svg>
          <span>Bitcoin</span>
        </div>

        {/* Leather Wallet Logo */}
        <div className={styles.logo_item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="4" fill="#8B4513"/>
            <path d="M8 7h3v10H8V7zm5 0h3v4h-3V7zm0 6h3v4h-3v-4z" fill="white"/>
          </svg>
          <span>Leather</span>
        </div>

        {/* ALEX Logo */}
        <div className={styles.logo_item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#00D4AA"/>
            <path d="M8.5 6L12 10.5L15.5 6H18L12 13L6 6h2.5zM6 18h12v-2H6v2z" fill="white"/>
          </svg>
          <span>ALEX</span>
        </div>

        {/* MiamiCoin Logo */}
        <div className={styles.logo_item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#FF6B35"/>
            <path d="M7 8l5 8 5-8-2.5 0L12 12 9.5 8H7z" fill="white"/>
            <rect x="8" y="16" width="8" height="1" fill="white"/>
          </svg>
          <span>MIA</span>
        </div>

        {/* NYC Coin Logo */}
        <div className={styles.logo_item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="24" height="24" fill="#1E90FF"/>
            <path d="M6 6h3v12H6V6zm4 3h4v9h-4V9zm5-3h3v12h-3V6z" fill="white"/>
          </svg>
          <span>NYC</span>
        </div>

        {/* CrashPunks NFT */}
        <div className={styles.logo_item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="2" fill="#8B5CF6"/>
            <rect x="6" y="6" width="4" height="4" fill="white"/>
            <rect x="14" y="6" width="4" height="4" fill="white"/>
            <rect x="8" y="14" width="8" height="2" fill="white"/>
          </svg>
          <span>CrashPunks</span>
        </div>

        {/* Satoshibles NFT */}
        <div className={styles.logo_item}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#F59E0B"/>
            <circle cx="9" cy="9" r="2" fill="white"/>
            <circle cx="15" cy="9" r="2" fill="white"/>
            <ellipse cx="12" cy="15" rx="3" ry="1.5" fill="white"/>
          </svg>
          <span>Satoshibles</span>
        </div>
      </div>
    </div>
  );
};

export default EcosystemLogos;