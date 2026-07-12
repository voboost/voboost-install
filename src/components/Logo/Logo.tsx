import React from 'react';
import { useDarkMode } from '../../hooks/useDarkMode';

export function Logo({ className, style }: { className?: string; style?: React.CSSProperties }) {
    const isDarkMode = useDarkMode();

    return (
        <img
            src={isDarkMode ? "/logo-dark.svg" : "/logo.svg"}
            alt="Voboost Logo"
            className={className}
            style={{
                objectFit: 'contain',
                ...style
            }}
        />
    );
}
