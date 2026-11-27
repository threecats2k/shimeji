// Edit these before publishing. Every store / Discord button on the page reads from here.
window.MOOSHI_CONFIG = {
  packageId: "com.androidapp.mooshi.ah_shimeji.my_screen_pet",
  // UTM lets Play Console attribute installs to the website instead of ads.
  playUrl:
    "https://play.google.com/store/apps/details?id=com.androidapp.mooshi.ah_shimeji.my_screen_pet" +
    "&referrer=utm_source%3Dwebsite%26utm_medium%3Dlanding",
  iosUrl: "https://apps.apple.com/us/app/mooshi-ah-shimeji-pets/id6746576406",
  // TODO: replace with the real invite (same value as Remote Config `discord_invite_url`).
  discordUrl: "https://discord.gg/mooshi",
  // Must match the intent-filter on SplashActivity (mooshi://redeem?code=XXX).
  redeemScheme: "mooshi",
  // Meta Dataset ID (same number as the Facebook app id). The noscript image in index.html must use this id too.
  pixelId: "1317464923124459",
};
