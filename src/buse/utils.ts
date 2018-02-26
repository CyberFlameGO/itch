import { IGameCredentials } from "../types/index";
import { GameCredentials } from "../buse/messages";
import urls from "../constants/urls";
import { Client, Instance } from "node-buse";
import { Logger } from "../logger/index";
import { MinimalContext } from "../context/index";
import * as ospath from "path";
import { getBinPath } from "../util/ibrew";

import * as messages from "./messages";
import { butlerDbPath } from "../os/paths";

export async function makeButlerInstance(): Promise<Instance> {
  // TODO: respect global lock when we're updating butler
  return new Instance({
    butlerExecutable: ospath.join(getBinPath(), "butler"),
    args: ["--dbpath", butlerDbPath()],
  });
}

export type WithCB<T> = (client: Client) => Promise<T>;

export async function withButlerClient<T>(cb: WithCB<T>): Promise<T> {
  let res: T;
  const instance = await makeButlerInstance();

  try {
    instance.onClient(async client => {
      res = await cb(client);
    });
    await instance.promise();
  } finally {
    instance.cancel();
  }

  return res;
}

export function buseGameCredentials(
  credentials: IGameCredentials
): GameCredentials {
  return {
    apiKey: credentials.apiKey,
    downloadKey: credentials.downloadKey ? credentials.downloadKey.id : null,
    server: urls.itchioApi,
  };
}

export function setupClient(
  client: Client,
  parentLogger: Logger,
  ctx: MinimalContext
) {
  client.onNotification(messages.OperationProgress, ({ params }) => {
    ctx.emitProgress(params);
  });

  const logger = parentLogger.child({ name: "butler" });

  client.onNotification(messages.Log, ({ params }) => {
    switch (params.level) {
      case "debug":
        logger.debug(params.message);
        break;
      case "info":
        logger.info(params.message);
        break;
      case "warning":
        logger.warn(params.message);
        break;
      case "error":
        logger.error(params.message);
        break;
      default:
        logger.info(`[${params.level}] ${params.message}`);
        break;
    }
  });
}
