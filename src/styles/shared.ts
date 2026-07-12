import { makeStyles } from '@fluentui/react-components';

export const useSharedStyles = makeStyles({
    // Primary action button (e.g., Next, Start Installation, Finish)
    primaryButton: {
        minWidth: '200px',
    },
    // Secondary action button (e.g., Back, Exit)
    secondaryButton: {
        // Standard appearance (bordered) is default for Button without appearance="primary" or "subtle"
        // We just ensure it matches the size
    },
    // Generic layout for footer actions
    footerActions: {
        display: 'flex',
        gap: '12px',
        marginLeft: 'auto',
    }
});
