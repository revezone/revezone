const { join } = require('node:path');
const { notarize } = require('@electron/notarize');

module.exports = async ({ appOutDir, electronPlatformName, packager }) => {
  if (electronPlatformName !== 'darwin') return;

  const {
    APPLE_ID: appleId,
    APPLE_APP_SPECIFIC_PASSWORD: appleIdPassword,
    APPLE_TEAM_ID: teamId
  } = process.env;
  if (!appleId && !appleIdPassword && !teamId) return;
  if (!appleId || !appleIdPassword || !teamId) {
    throw new Error(
      'Notarization requires APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID.'
    );
  }

  await notarize({
    appPath: join(appOutDir, `${packager.appInfo.productFilename}.app`),
    appleId,
    appleIdPassword,
    teamId
  });
};
