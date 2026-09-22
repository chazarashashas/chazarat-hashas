import common from "./common.json";
import shell from "./shell.json";
import home from "./home.json";
import guide from "./guide.json";
import dailyLimmud from "./dailyLimmud.json";
import explore from "./explore.json";
import siyumim from "./siyumim.json";
import groups from "./groups.json";
import account from "./account.json";
import games from "./games.json";
import share from "./share.json";
import print from "./print.json";

/** Hebrew drafts — Torah-world register (see ../../GLOSSARY.md). Any key
    still missing here falls back to English. */
export const he: Record<string, Record<string, unknown>> = { common, shell, home, guide, dailyLimmud, explore, siyumim, groups, account, games, share, print };
