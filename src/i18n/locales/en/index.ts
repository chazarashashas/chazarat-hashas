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

/** English is the source: every key starts here. One namespace per area
    of the app, so each area's strings sit in their own file. */
export const en = { common, shell, home, guide, dailyLimmud, explore, siyumim, groups, account, games, share, print } as const;
