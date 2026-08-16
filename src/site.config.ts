/**
 * The settings that are not decided in code.
 *
 * Each one is empty until somebody who owns the account fills it in. Nothing
 * here can be guessed, and a wrong value is worse than none: an analytics tag
 * pointed at the wrong site quietly measures nothing while looking installed.
 */

export const site = {
  /**
   * Cloudflare Web Analytics.
   *
   * Cookieless, free, and it needs no consent banner, which is why version 1
   * can measure anything at all without asking a visitor for permission first.
   *
   * To turn it on: make a site at
   * https://dash.cloudflare.com/?to=/:account/web-analytics, take the token
   * out of the snippet it gives you, and paste it here. The token is not a
   * secret. It is visible in the page of every site that uses one.
   */
  cloudflareAnalyticsToken: "ce6030a180d746a9b3d58e4a443ec4db",

  /**
   * GoatCounter, as the alternative.
   *
   * Also cookieless. Use this one instead if you would rather not have a
   * Cloudflare account. Put the code from the address of your dashboard here,
   * so `bitsmith` for `bitsmith.goatcounter.com`.
   *
   * Set one of these two, not both. Two counters measure the same visits twice
   * and agree with each other about nothing.
   */
  goatCounterCode: "",
} as const;
