import { type Page, expect } from '@playwright/test';

/** Create a new lobby from the home page as the given player. */
export async function createLobbyAs(page: Page, playerName: string): Promise<string> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NYC GeoGuesser' })).toBeVisible();

  await page.getByLabel('Your Name').fill(playerName);
  await page.getByRole('button', { name: 'Start New Game' }).click();

  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  await expect(page.getByText(playerName)).toBeVisible();

  const codeText = await page.locator('text=Game Code:').locator('..').locator('.font-mono').textContent();
  if (!codeText?.trim()) {
    throw new Error('Lobby code not found after creating lobby');
  }

  return codeText.trim();
}

/** Join an existing lobby from the home page with a lobby code. */
export async function joinLobbyFromHome(
  page: Page,
  playerName: string,
  lobbyCode: string,
): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Your Name').fill(playerName);
  await page.getByLabel('Lobby ID').fill(lobbyCode);
  await page.getByRole('button', { name: 'Join Game' }).click();

  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  await expect(page.getByText(playerName)).toBeVisible();
}

/** Join via the share-link route `/join/:lobbyCode`. */
export async function joinLobbyViaShareLink(
  page: Page,
  playerName: string,
  lobbyCode: string,
): Promise<void> {
  await page.goto(`/join/${lobbyCode}`);
  await expect(page.getByRole('heading', { name: 'Join Game' })).toBeVisible();

  await page.getByLabel('Your Name').fill(playerName);
  await page.getByRole('button', { name: 'Join Lobby' }).click();

  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
  await expect(page.getByText(playerName)).toBeVisible();
}
