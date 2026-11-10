import { test, expect } from '@playwright/test';
import {
  createLobbyAs,
  joinLobbyFromHome,
  joinLobbyViaShareLink,
} from './helpers/lobby';

test.describe('Multiplayer lobby', () => {
  test('second player joins by lobby code from home', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const joinerPage = await joinerContext.newPage();

    try {
      const lobbyCode = await createLobbyAs(hostPage, 'HostAlice');

      await joinLobbyFromHome(joinerPage, 'GuestBob', lobbyCode);

      await expect(hostPage.getByText('2/4 Players')).toBeVisible();
      await expect(hostPage.getByText('GuestBob')).toBeVisible();
      await expect(hostPage.getByText('Ready to start! Click "Start Game" to begin.')).toBeVisible();
      await expect(hostPage.getByRole('button', { name: 'Start Game' })).toBeEnabled();

      await expect(joinerPage.getByText('2/4 Players')).toBeVisible();
      await expect(joinerPage.getByText('HostAlice')).toBeVisible();
      await expect(joinerPage.getByText('Waiting for host to start the game...')).toBeVisible();
      await expect(joinerPage.getByRole('button', { name: 'Start Game' })).toHaveCount(0);
    } finally {
      await hostContext.close();
      await joinerContext.close();
    }
  });

  test('second player joins via share link route', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const joinerPage = await joinerContext.newPage();

    try {
      const lobbyCode = await createLobbyAs(hostPage, 'HostCarol');

      await joinLobbyViaShareLink(joinerPage, 'GuestDave', lobbyCode);

      await expect(hostPage.getByText('GuestDave')).toBeVisible();
      await expect(joinerPage.getByText('HostCarol')).toBeVisible();
      await expect(joinerPage.getByText(`Game Code:`)).toBeVisible();
      await expect(joinerPage.locator('.font-mono').filter({ hasText: lobbyCode })).toBeVisible();
    } finally {
      await hostContext.close();
      await joinerContext.close();
    }
  });

  test('host can start the game with two players', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const joinerPage = await joinerContext.newPage();

    try {
      const lobbyCode = await createLobbyAs(hostPage, 'HostEve');
      await joinLobbyFromHome(joinerPage, 'GuestFrank', lobbyCode);

      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      await expect(hostPage).toHaveURL(/\/game\//);
      await expect(joinerPage).toHaveURL(/\/game\//, { timeout: 20_000 });
    } finally {
      await hostContext.close();
      await joinerContext.close();
    }
  });
});
