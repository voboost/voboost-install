import React, { useState } from 'react';
import { Button } from '@fluentui/react-components';
import {
    ChevronLeft24Regular,
    ChevronRight24Regular
} from '@fluentui/react-icons';
import './InstructionCarousel.css';

interface InstructionCarouselProps {
    instructions: string[];
}

export function InstructionCarousel({ instructions }: InstructionCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goNext = () => {
        setCurrentIndex((prev) =>
            prev < instructions.length - 1 ? prev + 1 : prev
        );
    };

    const goPrev = () => {
        setCurrentIndex((prev) => prev > 0 ? prev - 1 : prev);
    };

    if (!instructions || instructions.length === 0) return null;

    const current = instructions[currentIndex];

    return (
        <div className="instruction-carousel">
            <div
                className="instruction-carousel__content"
                dangerouslySetInnerHTML={{ __html: current }}
            />

            <div className="instruction-carousel__controls">
                <Button
                    appearance="subtle"
                    icon={<ChevronLeft24Regular />}
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    aria-label="Previous instruction"
                    className="instruction-carousel__arrow"
                    style={{ maxWidth: '50px', width: '50px', height: '50px', minWidth: '50px', minHeight: '50px' }}
                />

                <div className="instruction-carousel__dots">
                    {instructions.map((_, index) => (
                        <button
                            key={index}
                            className={`instruction-carousel__dot ${index === currentIndex ? 'instruction-carousel__dot_active' : ''}`}
                            onClick={() => setCurrentIndex(index)}
                            aria-label={`Go to instruction ${index + 1}`}
                        />
                    ))}
                </div>

                <Button
                    appearance="subtle"
                    icon={<ChevronRight24Regular />}
                    onClick={goNext}
                    disabled={currentIndex === instructions.length - 1}
                    aria-label="Next instruction"
                    className="instruction-carousel__arrow"
                    style={{ maxWidth: '50px', width: '50px', height: '50px', minWidth: '50px', minHeight: '50px' }}
                />
            </div>
        </div>
    );
}
