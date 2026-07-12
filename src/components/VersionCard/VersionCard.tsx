import React from 'react';
import {
    Card,
    CardHeader,
    Badge,
    Text
} from '@fluentui/react-components';
import { Checkmark24Regular } from '@fluentui/react-icons';
import type { Release } from '../../types/releases';
import { formatFileSize, formatDate } from '../../services/releases';
import './VersionCard.css';

interface VersionCardProps {
    release: Release;
    isSelected: boolean;
    onSelect: () => void;
    language: 'en' | 'ru';
}

export function VersionCard({
    release,
    isSelected,
    onSelect,
    language
}: VersionCardProps) {
    const changelog = release.changelog?.[language] || release.changelog?.en || '';

    return (
        <Card
            className={`version-card ${isSelected ? 'version-card_selected' : ''}`}
            onClick={onSelect}
            role="radio"
            aria-checked={isSelected}
        >
            <CardHeader
                header={
                    <div className="version-card__header">
                        <Text weight="semibold" className="version-card__version-text">
                            v{release.version}
                        </Text>
                        <Badge
                            appearance={release.track === 'production' ? 'filled' : 'outline'}
                            color={release.track === 'production' ? 'success' : 'warning'}
                        >
                            {release.track}
                        </Badge>
                    </div>
                }
                description={
                    <Text className="version-card__description-text">
                        {formatDate(release.releaseDate, language)} • {formatFileSize(release.size)}
                    </Text>
                }
            />

            {changelog && (
                <div className="version-card__changelog">
                    <Text className="version-card__changelog-text">
                        {changelog}
                    </Text>
                </div>
            )}

            {isSelected && (
                <div className="version-card__selected-indicator">
                    <Checkmark24Regular />
                </div>
            )}
        </Card>
    );
}
