import { actions } from "../actions";

import asTask from "./tasks/as-task";
import { Watcher } from "./watcher";

import { DB } from "../db";

import { currentRuntime } from "../os/runtime";

import { isAborted } from "../types";

import { promisedModal } from "./modals";
import { t } from "../format/t";
import { modalWidgets } from "../components/modal-widgets/index";

import { performLaunch } from "./launch/perform-launch";

export default function(watcher: Watcher, db: DB) {
  watcher.on(actions.queueLaunch, async (store, action) => {
    const { cave } = action.payload;
    const { game } = cave;

    const runtime = currentRuntime();

    asTask({
      name: "launch",
      gameId: game.id,
      store,
      db,
      work: async (ctx, logger) => {
        return await performLaunch(ctx, logger, cave, game, runtime);
      },
      onError: async (e: any, log) => {
        if (isAborted(e)) {
          // just ignore it then
          return;
        }

        let title = game ? game.title : "<missing game>";
        const i18n = store.getState().i18n;

        let errorMessage = String(e);
        if (e.reason) {
          if (Array.isArray(e.reason)) {
            errorMessage = t(i18n, e.reason);
          } else {
            errorMessage = String(e.reason);
          }
        } else {
          // only show first line
          errorMessage = errorMessage.split("\n")[0];
        }

        await promisedModal(
          store,
          modalWidgets.showError.make({
            title: ["game.install.could_not_launch", { title }],
            message: [
              "game.install.could_not_launch.message",
              { title, errorMessage },
            ],
            detail: ["game.install.could_not_launch.detail"],
            widgetParams: {
              errorStack: e.stack,
              log,
            },
            buttons: [
              {
                label: ["prompt.action.ok"],
              },
              "cancel",
            ],
          })
        );
      },
    });
  });
}
