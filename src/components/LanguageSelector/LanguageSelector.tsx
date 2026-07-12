import React from 'react';
import {
    Menu,
    MenuTrigger,
    MenuPopover,
    MenuList,
    MenuItem,
    MenuButton,
    makeStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';

import { ChevronDownRegular } from '@fluentui/react-icons';

const languages = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
];

const useStyles = makeStyles({
    menuButton: {
        minWidth: '120px',
        // Arrow rotation
        '& .fui-MenuButton__menuIcon': {
            transition: 'transform 0.2s ease',
        },
    },
    menuButtonOpen: {
        '& .fui-MenuButton__menuIcon': {
            transform: 'rotate(180deg)',
        },
    },
    menuItem: {
        fontSize: '18px',
        fontWeight: tokens.fontWeightRegular,
    }
});

export function LanguageSelector({ className }: { className?: string }) {
    const styles = useStyles();
    const { i18n } = useTranslation();
    const { language, setLanguage } = useAppStore();
    const [open, setOpen] = React.useState(false);

    const handleChange = (value: string) => {
        setLanguage(value as 'en' | 'ru');
        i18n.changeLanguage(value);
        setOpen(false);
    };

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <Menu open={open} onOpenChange={(_, data) => setOpen(data.open)}>
            <MenuTrigger disableButtonEnhancement>
                <MenuButton
                    className={mergeClasses(
                        styles.menuButton,
                        open && styles.menuButtonOpen,
                        className
                    )}
                    size="large"
                    menuIcon={<ChevronDownRegular />}
                >
                    {currentLang.label}
                </MenuButton>
            </MenuTrigger>

            <MenuPopover>
                <MenuList>
                    {languages.map((lang) => (
                        <MenuItem
                            key={lang.code}
                            onClick={() => handleChange(lang.code)}
                            className={styles.menuItem}
                        >
                            {lang.label}
                        </MenuItem>
                    ))}
                </MenuList>
            </MenuPopover>
        </Menu>
    );
}
