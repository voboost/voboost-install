import type { Config } from 'testplane';

export default {
    gridUrl: 'http://localhost:4444/wd/hub',
    baseUrl: 'http://localhost:1420',
    pageLoadTimeout: 0,
    httpTimeout: 60000,
    testTimeout: 90000,
    resetCursor: false,
    sets: {
        desktop: {
            files: [
                'test/**/*.test.ts'
            ],
            browsers: [
                'chrome'
            ]
        }
    },
    browsers: {
        chrome: {
            automationProtocol: 'devtools',
            desiredCapabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {
                    args: ['--headless']
                }
            }
        }
    }
} as Config;
