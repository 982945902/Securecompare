import { chromium } from 'playwright-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const appUrl = process.env.APP_URL ?? 'http://localhost:5173/';
const hostResolverRules = process.env.CHROME_HOST_RESOLVER_RULES;

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: hostResolverRules ? [`--host-resolver-rules=${hostResolverRules}`] : [],
});

try {
  const context = await browser.newContext();
  const challenger = await context.newPage();
  await challenger.goto(appUrl);

  await challenger.getByRole('button', { name: /邀请PK/ }).click();
  await challenger.getByRole('button', { name: /身高/ }).click();
  await challenger.locator('input[type="number"]').fill('170');
  await challenger.getByRole('button', { name: '开始匿名比较' }).click();

  const linkLocator = challenger.locator('p').filter({ hasText: '#challenge=' });
  await linkLocator.waitFor({ state: 'visible', timeout: 10000 });
  const challengeLink = await linkLocator.textContent();
  if (!challengeLink) {
    throw new Error('Challenge link was not rendered');
  }

  const accepter = await context.newPage();
  await accepter.goto(challengeLink);
  await accepter.locator('input[type="number"]').fill('165');
  await accepter.getByRole('button', { name: '接受挑战 ⚔️' }).click();

  await accepter.getByRole('heading', { name: '挑战失败' }).waitFor({ timeout: 20000 });
  await challenger.getByText('你赢了！你的数值更大。').waitFor({ timeout: 20000 });

  console.log(
    JSON.stringify(
      {
        ok: true,
        challengeLink,
        challenger: 'win',
        accepter: 'lose',
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
