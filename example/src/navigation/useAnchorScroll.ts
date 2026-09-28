import { useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

import { anchorScrollOffset } from './anchors';
import type { NavRequest } from './anchors';

/**
 * Scrolls a `ScrollView` to the section a {@link NavRequest} names, once per request.
 *
 * Sections report where they sit through `onSectionLayout(key)`, which must be attached to a
 * DIRECT child of the scroll content: `layout.y` is relative to the parent, so only there is
 * it a scroll offset. The request is served as soon as both halves are known — the section's
 * position and the request itself — in whichever order they arrive, and never twice, so a
 * later re-layout (a section expanding, a result panel growing) does not yank the list back.
 */
export function useAnchorScroll<K extends string>(
  request: NavRequest<K> | null | undefined
) {
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Partial<Record<K, number>>>({});
  const servedNonce = useRef<number | null>(null);

  const serve = useCallback(() => {
    if (request == null || servedNonce.current === request.nonce) return;
    const y = positions.current[request.target];
    if (y === undefined) return;
    servedNonce.current = request.nonce;
    scrollRef.current?.scrollTo({ y: anchorScrollOffset(y), animated: true });
  }, [request]);

  useEffect(() => {
    serve();
  }, [serve]);

  const onSectionLayout = useCallback(
    (key: K) => (event: LayoutChangeEvent) => {
      positions.current[key] = event.nativeEvent.layout.y;
      serve();
    },
    [serve]
  );

  return { scrollRef, onSectionLayout };
}
