import { test, expect } from '@playwright/test';

test.describe('Home page smoke', () => {
  test('loads the landing page with create/join controls', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'NYC GeoGuesser' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Join or Start Game' })).toBeVisible();
    await expect(page.getByLabel('Your Name')).toBeVisible();
    await expect(page.getByLabel('Lobby ID')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start New Game' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Join Game' })).toBeDisabled();
  });

  test('enables Start New Game after entering a name', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Your Name').fill('Alice');
    await expect(page.getByRole('button', { name: 'Start New Game' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Join Game' })).toBeDisabled();
  });

  test('creates a lobby and shows host waiting state', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Your Name').fill('HostPlayer');
    await page.getByRole('button', { name: 'Start New Game' }).click();

    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible();
    await expect(page.getByText('HostPlayer')).toBeVisible();
    await expect(page.getByText('Host', { exact: true })).toBeVisible();
    await expect(page.getByText('1/4 Players')).toBeVisible();
    await expect(page.getByText('Need at least 2 players to start')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeDisabled();
  });
});
