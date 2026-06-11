import posthog from "posthog-js";
import {fetchPostHogConfig} from "./api";

export async function initializePostHog() {
    try {
        const config = await fetchPostHogConfig();

        if (!config?.enabled || !config?.projectToken || !config?.apiHost) {
            return;
        }

        posthog.init(config.projectToken, {
            api_host: config.apiHost,
            ui_host: config.uiHost,
            defaults: config.defaults,
        });
    } catch (error) {
        console.warn("PostHog initialization skipped", error);
    }
}

export {posthog};
