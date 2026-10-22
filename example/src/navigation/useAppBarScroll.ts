import { useCallback, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Collapse after a short scroll; expand at the top without flickering at the threshold. */
export function useAppBarScroll() {
  const [collapsed, setCollapsed] = useState(false);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setCollapsed((previous) => y > 48 || (previous && y > 0));
    },
    []
  );
  return { collapsed, onScroll };
}
