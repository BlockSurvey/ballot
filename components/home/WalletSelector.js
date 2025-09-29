import React from 'react';
import styles from './WalletSelector.module.css';

const WalletSelector = () => {
  return (
    <div className={styles.wallet_selector}>
      <div className={styles.wallet_header}>
        <h3 className={styles.wallet_title}>Connect with your preferred wallet</h3>
        <p className={styles.wallet_subtitle}>Choose from leading Stacks ecosystem wallets</p>
      </div>
      
      <div className={styles.wallet_grid}>
        {/* Hiro Wallet */}
        <div className={styles.wallet_card}>
          <div className={styles.wallet_icon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="#5546FF"/>
              <path d="M16 14h6v20h-6v-20zm10 0h6v8h-6v-8zm0 12h6v8h-6v-8z" fill="white"/>
            </svg>
          </div>
          <div className={styles.wallet_info}>
            <h4 className={styles.wallet_name}>Hiro Wallet</h4>
            <p className={styles.wallet_desc}>The original Stacks wallet with full ecosystem support</p>
            <div className={styles.wallet_features}>
              <span className={styles.feature_tag}>Web Extension</span>
              <span className={styles.feature_tag}>Desktop</span>
            </div>
          </div>
        </div>

        {/* Xverse Wallet */}
        <div className={styles.wallet_card}>
          <div className={styles.wallet_icon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="#EE7A30"/>
              <path d="M12 12l12 12-12 12h6l12-12L18 12h-6zm18 0v6l6 6-6 6v6h6l12-12L36 12h-6z" fill="white"/>
            </svg>
          </div>
          <div className={styles.wallet_info}>
            <h4 className={styles.wallet_name}>Xverse</h4>
            <p className={styles.wallet_desc}>Mobile-first wallet with Bitcoin and Stacks integration</p>
            <div className={styles.wallet_features}>
              <span className={styles.feature_tag}>Mobile</span>
              <span className={styles.feature_tag}>Bitcoin</span>
              <span className={styles.feature_tag}>NFTs</span>
            </div>
          </div>
        </div>

        {/* Asigna Wallet */}
        <div className={styles.wallet_card}>
          <div className={styles.wallet_icon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="#7C3AED"/>
              <circle cx="24" cy="18" r="6" fill="white"/>
              <path d="M14 34c0-6 4.5-10 10-10s10 4 10 10" stroke="white" strokeWidth="2" fill="none"/>
              <rect x="30" y="10" width="8" height="8" rx="2" fill="#10B981"/>
            </svg>
          </div>
          <div className={styles.wallet_info}>
            <h4 className={styles.wallet_name}>Asigna</h4>
            <p className={styles.wallet_desc}>Multi-signature wallet for DAOs and teams</p>
            <div className={styles.wallet_features}>
              <span className={styles.feature_tag}>Multi-sig</span>
              <span className={styles.feature_tag}>DAO</span>
              <span className={styles.feature_tag}>Team</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.wallet_footer}>
        <p className={styles.wallet_note}>
          Don't have a Stacks wallet? <a href="https://hiro.so/wallet" target="_blank" rel="noopener noreferrer">Get Hiro Wallet</a> or <a href="https://xverse.app" target="_blank" rel="noopener noreferrer">Download Xverse</a>
        </p>
      </div>
    </div>
  );
};

export default WalletSelector;