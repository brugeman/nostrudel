import { MouseEventHandler, useCallback, useRef } from "react";
import {
  AvatarGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardProps,
  Flex,
  Heading,
  Link,
  LinkBox,
  Text,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import { kinds } from "nostr-tools";

import { NostrEvent, isETag } from "../../../types/nostr-event";
import { getEventCommunityPointer, getPostSubject } from "../../../helpers/nostr/communities";
import { useNavigateInDrawer } from "../../../providers/drawer-sub-view-provider";
import { getSharableEventAddress } from "../../../helpers/nip19";
import HoverLinkOverlay from "../../../components/hover-link-overlay";
import { CompactNoteContent } from "../../../components/compact-note-content";
import { useRegisterIntersectionEntity } from "../../../providers/local/intersection-observer";
import { getEventUID, parseHardcodedNoteContent } from "../../../helpers/nostr/events";
import UserLink from "../../../components/user-link";
import UserAvatarLink from "../../../components/user-avatar-link";
import useUserMuteFilter from "../../../hooks/use-user-mute-filter";
import { useReadRelays } from "../../../hooks/use-client-relays";
import useSingleEvent from "../../../hooks/use-single-event";
import CommunityPostMenu from "./community-post-menu";

export function ApprovalIcon({ approval }: { approval: NostrEvent }) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  useRegisterIntersectionEntity(ref, getEventUID(approval));

  return <UserAvatarLink pubkey={approval.pubkey} ref={ref} size="xs" />;
}

export type CommunityPostPropTypes = {
  event: NostrEvent;
  approvals: NostrEvent[];
  showCommunity?: boolean;
};

function PostSubject({ event }: { event: NostrEvent }) {
  const subject = getPostSubject(event);

  const navigate = useNavigateInDrawer();
  const to = `/n/${getSharableEventAddress(event)}`;
  const handleClick = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      navigate(to);
    },
    [navigate, to],
  );

  return subject ? (
    <CardHeader px="2" pt="4" pb="0" overflow="hidden">
      <Heading size="md" overflow="hidden" isTruncated>
        <HoverLinkOverlay as={RouterLink} to={to} onClick={handleClick}>
          {getPostSubject(event)}
        </HoverLinkOverlay>
      </Heading>
    </CardHeader>
  ) : (
    <HoverLinkOverlay as={RouterLink} to={to} onClick={handleClick} />
  );
}
function Approvals({ approvals }: { approvals: NostrEvent[] }) {
  return (
    <>
      <Text fontSize="sm">Approved by</Text>
      <AvatarGroup>
        {approvals.map((approval) => (
          <ApprovalIcon key={approval.id} approval={approval} />
        ))}
      </AvatarGroup>
    </>
  );
}

export function CommunityTextPost({
  event,
  approvals,
  showCommunity,
  ...props
}: Omit<CardProps, "children"> & CommunityPostPropTypes) {
  const ref = useRef<HTMLDivElement | null>(null);
  useRegisterIntersectionEntity(ref, getEventUID(event));

  const communityPointer = getEventCommunityPointer(event);

  return (
    <Card as={LinkBox} ref={ref} {...props}>
      <PostSubject event={event} />
      <CardBody p="2">
        <CompactNoteContent event={event} maxLength={96} />
      </CardBody>
      <CardFooter display="flex" gap="2" alignItems="center" p="2" flexWrap="wrap">
        <Text>
          Posted {dayjs.unix(event.created_at).fromNow()} by <UserLink pubkey={event.pubkey} fontWeight="bold" />
        </Text>
        {showCommunity && communityPointer && (
          <Text>
            to{" "}
            <Link as={RouterLink} to={`/c/${communityPointer.identifier}/${communityPointer.pubkey}`} fontWeight="bold">
              {communityPointer.identifier}
            </Link>
          </Text>
        )}
        <Flex gap="2" alignItems="center" ml="auto">
          {approvals.length > 0 && <Approvals approvals={approvals} />}
          <CommunityPostMenu event={event} approvals={approvals} aria-label="More Options" size="xs" variant="ghost" />
        </Flex>
      </CardFooter>
    </Card>
  );
}

export function CommunityRepostPost({
  event,
  approvals,
  showCommunity,
  ...props
}: Omit<CardProps, "children"> & CommunityPostPropTypes) {
  const encodedRepost = parseHardcodedNoteContent(event);

  const [_, eventId, relay] = event.tags.find(isETag) ?? [];
  const readRelays = useReadRelays(relay ? [relay] : []);

  const loadedRepost = useSingleEvent(eventId, readRelays);
  const repost = encodedRepost || loadedRepost;

  const ref = useRef<HTMLDivElement | null>(null);
  useRegisterIntersectionEntity(ref, repost && getEventUID(repost));

  const muteFilter = useUserMuteFilter();
  if (repost && muteFilter(repost)) return;

  const communityPointer = getEventCommunityPointer(event);

  return (
    <Card as={LinkBox} ref={ref} {...props}>
      {repost && (
        <>
          <PostSubject event={repost} />
          <CardBody p="2">
            <CompactNoteContent event={repost} maxLength={96} />
          </CardBody>
        </>
      )}
      <CardFooter display="flex" gap="2" alignItems="center" p="2" flexWrap="wrap">
        <Text>
          Shared {dayjs.unix(event.created_at).fromNow()} by <UserLink pubkey={event.pubkey} fontWeight="bold" />
        </Text>
        {showCommunity && communityPointer && (
          <Text>
            to{" "}
            <Link as={RouterLink} to={`/c/${communityPointer.identifier}/${communityPointer.pubkey}`} fontWeight="bold">
              {communityPointer.identifier}
            </Link>
          </Text>
        )}
        <Flex gap="2" alignItems="center" ml="auto">
          {approvals.length > 0 && <Approvals approvals={approvals} />}
          <CommunityPostMenu event={event} approvals={approvals} aria-label="More Options" size="xs" variant="ghost" />
        </Flex>
      </CardFooter>
    </Card>
  );
}

export default function CommunityPost({ event, ...props }: Omit<CardProps, "children"> & CommunityPostPropTypes) {
  switch (event.kind) {
    case kinds.ShortTextNote:
      return <CommunityTextPost event={event} {...props} />;
    case kinds.Repost:
      return <CommunityRepostPost event={event} {...props} />;
    case kinds.GenericRepost:
      return <CommunityRepostPost event={event} {...props} />;
  }
  return null;
}
