import { Watcher } from "../watcher";
import { actions } from "../../actions";

import { DB } from "../../db";
import * as paths from "../../os/paths";

import rootLogger from "../../logger";
const logger = rootLogger.child({ name: "queue-game" });

import { IStore } from "../../types/index";
import {
  ensureUniqueInstallFolder,
  installFolderName,
} from "../downloads/install-folder-name";
import Context from "../../context/index";
import { ICaveLocation } from "../../db/models/cave";

import uuid from "../../util/uuid";
import { Game, Upload } from "../../buse/messages";

import { map, isEmpty } from "underscore";
import makeUploadButton from "../make-upload-button";
import { modalWidgets } from "../../components/modal-widgets/index";
import { withButlerClient, messages } from "../../buse";

export default function(watcher: Watcher, db: DB) {
  watcher.on(actions.queueGame, async (store, action) => {
    const { game } = action.payload;
    const { caves } = await withButlerClient(
      logger,
      async client =>
        await client.call(messages.FetchCavesByGameID({ gameId: game.id }))
    );

    if (isEmpty(caves)) {
      logger.info(
        `No cave for ${game.title} (#${game.id}), attempting install`
      );
      await queueInstall(store, db, game);
      return;
    }

    logger.info(
      `Have ${caves.length} caves for game ${game.title} (#${game.id})`
    );

    if (caves.length === 1) {
      const cave = caves[0];
      store.dispatch(actions.queueLaunch({ cave }));
      return;
    }

    store.dispatch(
      actions.openModal(
        modalWidgets.naked.make({
          title: ["prompt.launch.title", { title: game.title }],
          message: ["prompt.launch.message"],
          bigButtons: map(caves, cave => {
            return {
              ...makeUploadButton(cave.upload),
              action: actions.queueLaunch({ cave }),
            };
          }),
          buttons: ["cancel"],
          widgetParams: null,
        })
      )
    );
  });

  watcher.on(actions.queueGameInstall, async (store, action) => {
    const { game, upload } = action.payload;
    await queueInstall(store, db, game, upload);
  });
}

export async function queueInstall(
  store: IStore,
  db: DB,
  game: Game,
  upload?: Upload
) {
  const caveId = uuid();
  const installFolder = installFolderName(game);

  let caveLocation: ICaveLocation;
  caveLocation = {
    id: caveId,
    installLocation: defaultInstallLocation(store),
    installFolder,
    pathScheme: paths.PathScheme.MODERN_SHARED,
  };

  // FIXME: we only want that on first-time installs
  const ctx = new Context(store, db);
  await ensureUniqueInstallFolder(ctx, caveLocation);

  store.dispatch(
    actions.queueDownload({
      reason: "install",
      upload,
      caveId,
      installLocation: caveLocation.installLocation,
      installFolder: caveLocation.installFolder,
      game,
    })
  );
}

function defaultInstallLocation(store: IStore) {
  const { defaultInstallLocation } = store.getState().preferences;
  return defaultInstallLocation;
}
