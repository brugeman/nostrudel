import { useMemo } from "react";
import { Card, CardBody, CardHeader, CardProps, Heading, Image, LinkBox, LinkOverlay } from "@chakra-ui/react";

import { useReadRelays } from "../../../hooks/use-client-relays";
import replaceableEventLoaderService from "../../../services/replaceable-event-requester";
import useSubject from "../../../hooks/use-subject";
import { NoteContents } from "../../../components/note/text-note-contents";
import { isATag } from "../../../types/nostr-event";
import useReplaceableEvent from "../../../hooks/use-replaceable-event";
import OpenGraphCard from "../../../components/open-graph-card";
import { useAdditionalRelayContext } from "../../../providers/local/additional-relay-context";

export const STREAMER_CARDS_TYPE = 17777;
export const STREAMER_CARD_TYPE = 37777;

function useStreamerCardsCords(pubkey: string, relays: Iterable<string>) {
  const sub = useMemo(
    () => replaceableEventLoaderService.requestEvent(relays, STREAMER_CARDS_TYPE, pubkey),
    [pubkey, relays],
  );
  const streamerCards = useSubject(sub);

  return streamerCards?.tags.filter(isATag) ?? [];
}

function StreamerCard({ cord, relay, ...props }: { cord: string; relay?: string } & CardProps) {
  const contextRelays = useAdditionalRelayContext();
  const readRelays = useReadRelays(relay ? [...contextRelays, relay] : contextRelays);

  const card = useReplaceableEvent(cord, readRelays);
  if (!card || card.kind !== STREAMER_CARD_TYPE) return null;

  const title = card.tags.find((t) => t[0] === "title")?.[1];
  const image = card.tags.find((t) => t[0] === "image")?.[1];
  const link = card.tags.find((t) => t[0] === "r")?.[1];

  if (!card.content && !image && link) {
    return <OpenGraphCard url={new URL(link)} />;
  }

  return (
    <Card as={LinkBox} variant="outline" {...props}>
      {image && <Image src={image} />}
      {title && (
        <CardHeader p="2">
          <Heading size="md">{title}</Heading>
        </CardHeader>
      )}
      {card.content && (
        <CardBody p="2">
          <NoteContents event={card} />
        </CardBody>
      )}
      {link && (
        <LinkOverlay isExternal href={link} color="blue.500">
          {!image && link}
        </LinkOverlay>
      )}
    </Card>
  );
}

export default function StreamerCards({ pubkey, ...props }: Omit<CardProps, "children"> & { pubkey: string }) {
  const contextRelays = useAdditionalRelayContext();
  const readRelays = useReadRelays(contextRelays);

  const cardCords = useStreamerCardsCords(pubkey, readRelays);

  return (
    <>
      {cardCords.map(([_, cord, relay]) => (
        <StreamerCard key={cord} cord={cord} relay={relay} {...props} />
      ))}
    </>
  );
}
