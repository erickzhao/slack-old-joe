import { wait } from '../utils/wait';
import { getWindowHandle, GetWindowResult } from './get-window-handle';

/**
 * Get the currently active BrowserView
 *
 * @export
 * @param {BrowserObject} client
 * @param {number} [waitForMsBefore=0]
 * @param {string} [teamUrl='']
 * @returns {Promise<GetWindowResult | null>}
 */
export async function getBrowserViewHandle(
  client: BrowserObject,
  waitForMsBefore = 0,
  teamUrl = ''
): Promise<GetWindowResult | null> {
  if (wait) await wait(waitForMsBefore);

  return getWindowHandle(client, async (url, title) => {
    const isRemote =
      url.startsWith(`https://${teamUrl}`) && url.includes('slack.com');
    const isSelectedTest = `return window.desktop.store.getState().appTeams.selectedTeamId === window.teamId`;

    if (title.endsWith('Slack') && isRemote) {
      let isSelected = false;

      try {
        isSelected = await client.executeScript(isSelectedTest, []);
      } catch (error) {
        console.log(`Could not run script to find selected team`, error);
      }

      return isSelected && isRemote;
    }

    return false;
  });
}
