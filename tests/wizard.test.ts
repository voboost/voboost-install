describe('Voboost Installer Wizard', () => {
    it('should successfully load the Welcome screen', async () => {
        await browser.url('/');

        // Mock Tauri API so it doesn't break in standard Chrome
        await browser.execute(() => {
            (window as any).__TAURI_INTERNALS__ = {
                invoke: async (cmd: string, args: any) => {
                    console.log('Mock invoke:', cmd, args);
                    if (cmd === 'fetch_releases') {
                        return { schemaVersion: 1, releases: [] };
                    }
                    return null;
                },
                installPlugin: () => { },
            };
        });

        // The title should be visible
        const headerTitle = await browser.$('h1');
        await headerTitle.waitForExist();
        const text = await headerTitle.getText();
        expect(text).toContain('Install');
    });

    it('should navigate to Download screen and show new action buttons', async () => {
        // From Welcome
        const startButton = await browser.$('button=Start Installation');
        await startButton.waitForClickable();
        await startButton.click();

        // On EULA, check the checkbox (we need to find it by input, then click the parent or label)
        const checkbox = await browser.$('input[type="checkbox"]');
        await checkbox.click();

        const nextButton = await browser.$('button=Next');
        await nextButton.waitForClickable();
        await nextButton.click();

        // On Download
        const jsonBtn = await browser.$('button*=manifest.json');
        await expect(jsonBtn).toBeExisting();

        const apkBtn = await browser.$('button*=local APK');
        await expect(apkBtn).toBeExisting();

        const uninstallBtn = await browser.$('button=Uninstall');
        await expect(uninstallBtn).toBeExisting();
    });
});
