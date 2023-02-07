import React, { useState } from "react";
import { SkeletonText } from "@chakra-ui/react";
import settingsService from "../../services/settings";
import { useSignal } from "../../hooks/use-signal";
import { useSubscription } from "../../helpers/use-subscription";
import { Post } from "../../components/post";

const relayUrls = await settingsService.getRelays();

export const UserPostsTab = ({ pubkey }) => {
  const [events, setEvents] = useState({});

  const sub = useSubscription(relayUrls, { authors: [pubkey] }, [pubkey]);

  useSignal(
    sub?.onEvent,
    (event) => {
      if (event.kind === 1) {
        setEvents((dir) => ({ [event.id]: event, ...dir }));
      }
    },
    [setEvents]
  );

  const timeline = Object.values(events).sort(
    (a, b) => a.created_at - b.created_at
  );

  if (timeline.length === 0) {
    return <SkeletonText />;
  }

  return timeline.map((event) => <Post key={event.id} event={event} />);
};
