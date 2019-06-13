import { getWindowHandle, GetWindowResult } from './get-window-handle';

import { BrowserObject } from 'webdriverio';

/**
 * Get the main window handle
 *
 * @export
 * @param {BrowserObject} client
 * @returns {(Promise<GetWindowResult | null>)}
 */
export async function getSonicWindow(
  client: BrowserObject
): Promise<GetWindowResult | null> {
  return getWindowHandle(client, url => {
    return url.startsWith('https://') && url.includes('app.slack.com/client');
  });
}
