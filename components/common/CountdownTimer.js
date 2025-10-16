import { useState, useEffect } from 'react';
import { calculateDateFromBitcoinBlockHeight } from '../../services/utils';
import styles from '../../styles/CountdownTimer.module.css';

export default function CountdownTimer({ 
    endAtBlock, 
    currentBitcoinBlockHeight, 
    showTimer = true 
}) {
    const [timeRemaining, setTimeRemaining] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0
    });

    useEffect(() => {
        if (!endAtBlock || !currentBitcoinBlockHeight || !showTimer) {
            return;
        }

        // Calculate the target end date once
        const targetEndDate = calculateDateFromBitcoinBlockHeight(currentBitcoinBlockHeight, endAtBlock);

        const updateCountdown = () => {
            const now = new Date();
            const timeDifference = targetEndDate.getTime() - now.getTime();

            if (timeDifference <= 0) {
                setTimeRemaining({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    total: 0
                });
                return;
            }

            const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

            setTimeRemaining({
                days,
                hours,
                minutes,
                seconds,
                total: timeDifference
            });
        };

        // Update immediately
        updateCountdown();

        // Set up interval to update every second
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [endAtBlock, currentBitcoinBlockHeight, showTimer]);

    // Don't render if timer is disabled or poll has ended
    if (!showTimer || timeRemaining.total <= 0) {
        return null;
    }

    const formatNumber = (num) => {
        return num.toString().padStart(2, '0');
    };

    const formatTimeString = () => {
        const parts = [];
        
        if (timeRemaining.days > 0) {
            parts.push(`${formatNumber(timeRemaining.days)}d`);
        }
        
        if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
            parts.push(`${formatNumber(timeRemaining.hours)}h`);
        }
        
        parts.push(`${formatNumber(timeRemaining.minutes)}m`);
        parts.push(`${formatNumber(timeRemaining.seconds)}s`);
        
        return parts.join(' ');
    };

    return (
        <div className={styles.countdown_inline}>
            <span className={styles.countdown_icon}>⏰</span>
            <span className={styles.countdown_compact}>
                {formatTimeString()}
            </span>
        </div>
    );
}