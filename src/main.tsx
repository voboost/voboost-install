import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import { initLanguage } from "./i18n";
import { useAppStore } from "./store";
import './components/Reset/Reset.css';
import './components/Scrollbar/Scrollbar.css';

async function bootstrap() {
    const lang = await initLanguage();
    useAppStore.getState().setLanguage(lang as 'en' | 'ru');

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
        <App />
    );
}

bootstrap();
