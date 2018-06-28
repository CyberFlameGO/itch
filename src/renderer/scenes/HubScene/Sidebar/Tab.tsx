import { actions } from "common/actions";
import { Game } from "common/butlerd/messages";
import { formatDurationAsMessage } from "common/format/datetime";
import { Space } from "common/helpers/space";
import {
  Dispatch,
  DownloadsState,
  LocalizedString,
  TabInstance,
} from "common/types";
import { ambientWind, ambientWindState } from "common/util/navigation";
import {
  getActiveDownload,
  getPendingDownloads,
} from "main/reactors/downloads/getters";
import React from "react";
import { InjectedIntl } from "react-intl";
import { SortableElement } from "react-sortable-hoc";
import { hookWithProps } from "renderer/hocs/hook";
import { withIntl } from "renderer/hocs/withIntl";
import { modals } from "common/modals";
import { size } from "underscore";
import Item from "./Item";

interface SortableHubSidebarItemProps {
  props: any & {
    tab: string;
  };
}

const SortableItem = SortableElement((props: SortableHubSidebarItemProps) => {
  return <Item {...props.props} />;
});

class Tab extends React.PureComponent<Props> {
  onClick = () => {
    const { tab, dispatch } = this.props;
    dispatch(actions.focusTab({ wind: ambientWind(), tab }));
  };

  onClose = () => {
    const { tab, dispatch } = this.props;
    dispatch(actions.closeTab({ wind: ambientWind(), tab }));
  };

  render() {
    const { tab, index, sortable, tabInstance, active } = this.props;
    const { onExplore } = this;

    const space = Space.fromInstance(tab, tabInstance);
    let loading = this.props.loading || space.web().loading;

    const url = space.url();
    const resource = space.resource();
    const label = space.label();
    let icon = space.icon();
    let count = 0;
    let progress: number = null;
    let sublabel: LocalizedString = null;

    if (tab === "itch://downloads") {
      const { downloads } = this.props;
      count = size(getPendingDownloads(downloads));
      const activeDownload = getActiveDownload(downloads);
      if (activeDownload) {
        const downloadProgress = downloads.progresses[activeDownload.id];
        if (downloads.paused) {
          icon = "stopwatch";
          sublabel = ["grid.item.downloads_paused"];
        } else if (downloadProgress && downloadProgress.eta) {
          progress = downloadProgress.progress;
          const title = activeDownload.game.title;
          const { intl } = this.props;
          const formatted = formatDurationAsMessage(downloadProgress.eta);
          const humanDuration = intl.formatMessage(
            {
              id: formatted.id,
            },
            formatted.values
          );
          sublabel = `${title} — ${humanDuration}`;
        }
      }
    }

    let gameOverride: Game = null;
    let { onClick, onClose } = this;
    if (!sortable) {
      onClose = null;
    }

    const props = {
      tab,
      url,
      resource,
      tabInstance,
      label,
      icon,
      active,
      onClick,
      count,
      progress,
      onClose,
      onExplore,
      sublabel,
      gameOverride,
      loading,
    };

    if (sortable) {
      return <SortableItem key={tab} index={index} props={props} />;
    } else {
      return <Item key={tab} {...props} />;
    }
  }

  onExplore = (tab: string) => {
    const { dispatch, tabInstance } = this.props;

    dispatch(
      actions.openModal(
        modals.exploreJson.make({
          wind: ambientWind(),
          title: "Tab information",
          message: "",
          widgetParams: {
            data: { tab, tabInstance },
          },
          fullscreen: true,
        })
      )
    );
  };
}

interface Props {
  tab: string;
  index?: number;
  active: boolean;
  sortable?: boolean;

  tabInstance: TabInstance;
  loading: boolean;
  downloads: DownloadsState | null;
  dispatch: Dispatch;

  intl: InjectedIntl;
}

export default withIntl(
  hookWithProps(Tab)(map => ({
    tabInstance: map((rs, p) => ambientWindState(rs).tabInstances[p.tab]),
    loading: map(
      (rs, p) => !!ambientWindState(rs).navigation.loadingTabs[p.tab]
    ),
    downloads: map(
      (rs, p) => (p.tab === "itch://downloads" ? rs.downloads : null)
    ),
  }))(Tab)
);
