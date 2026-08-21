/* eslint-disable react-native/no-inline-styles */
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  trackCustomEvent,
  overrideCommunityAccess,
  trackCommunityAccess,
  type SDKEvent,
} from '@octopus-community/react-native';
import { formatSDKEvent } from '../utils/formatSDKEvent';

export type SDKEventWithTime = { event: SDKEvent; receivedAt: number };

function formatEventTime(epochMs: number): string {
  const d = new Date(epochMs);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}:${ms}`;
}

export interface SDKDataScreenProps {
  notSeenNotificationsCount: number;
  onRefreshNotifications: () => void;
  isUpdatingNotifications: boolean;
  hasAccessToCommunity: boolean | null;
  sdkEvents: SDKEventWithTime[];
  onClearEvents: () => void;
  pushToken: string | null;
  isDark: boolean;
  primaryColor: string;
}

/**
 * SDK Data tab: reactive data from the Octopus SDK (unseen count, access, event stream).
 */
export function SDKDataScreen({
  notSeenNotificationsCount,
  onRefreshNotifications,
  isUpdatingNotifications,
  hasAccessToCommunity,
  sdkEvents,
  onClearEvents,
  pushToken,
  isDark,
  primaryColor,
}: SDKDataScreenProps) {
  const textColor = isDark ? '#ffffff' : '#000000';
  const secondaryColor = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const borderColor = isDark ? '#444444' : '#e8e8e8';
  const inputBg = isDark ? '#1f1f1f' : '#ffffff';
  const placeholderColor = isDark ? '#666666' : '#999999';

  const [customEventName, setCustomEventName] = useState('');
  const [prop1Key, setProp1Key] = useState('');
  const [prop1Value, setProp1Value] = useState('');
  const [prop2Key, setProp2Key] = useState('');
  const [prop2Value, setProp2Value] = useState('');
  const [isSendingEvent, setIsSendingEvent] = useState(false);
  const [eventFeedback, setEventFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isOverridingAccess, setIsOverridingAccess] = useState(false);
  const [overrideAccessError, setOverrideAccessError] = useState<string | null>(
    null
  );
  const [isTrackingAccess, setIsTrackingAccess] = useState(false);
  const [trackAccessFeedback, setTrackAccessFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const sendCustomEvent = useCallback(async () => {
    const name = customEventName.trim();
    if (!name) {
      setEventFeedback({ type: 'error', message: 'Event name is required' });
      return;
    }
    const properties: Record<string, string> = {};
    if (prop1Key.trim()) properties[prop1Key.trim()] = prop1Value.trim();
    if (prop2Key.trim()) properties[prop2Key.trim()] = prop2Value.trim();
    setEventFeedback(null);
    setIsSendingEvent(true);
    try {
      await trackCustomEvent(
        name,
        Object.keys(properties).length > 0 ? properties : undefined
      );
      setEventFeedback({ type: 'success', message: 'Event sent' });
      setCustomEventName('');
      setProp1Key('');
      setProp1Value('');
      setProp2Key('');
      setProp2Value('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to track event';
      setEventFeedback({ type: 'error', message });
    } finally {
      setIsSendingEvent(false);
    }
  }, [customEventName, prop1Key, prop1Value, prop2Key, prop2Value]);

  const setBlockAccess = useCallback(async () => {
    setOverrideAccessError(null);
    setIsOverridingAccess(true);
    try {
      await overrideCommunityAccess(false);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to override access';
      setOverrideAccessError(message);
    } finally {
      setIsOverridingAccess(false);
    }
  }, []);

  const setGrantAccess = useCallback(async () => {
    setOverrideAccessError(null);
    setIsOverridingAccess(true);
    try {
      await overrideCommunityAccess(true);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to override access';
      setOverrideAccessError(message);
    } finally {
      setIsOverridingAccess(false);
    }
  }, []);

  const trackHasAccess = useCallback(async () => {
    setTrackAccessFeedback(null);
    setIsTrackingAccess(true);
    try {
      await trackCommunityAccess(true);
      setTrackAccessFeedback({ type: 'success', message: 'Access tracked' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to track access';
      setTrackAccessFeedback({ type: 'error', message });
    } finally {
      setIsTrackingAccess(false);
    }
  }, []);

  const trackNoAccess = useCallback(async () => {
    setTrackAccessFeedback(null);
    setIsTrackingAccess(true);
    try {
      await trackCommunityAccess(false);
      setTrackAccessFeedback({ type: 'success', message: 'Access tracked' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to track access';
      setTrackAccessFeedback({ type: 'error', message });
    } finally {
      setIsTrackingAccess(false);
    }
  }, []);

  const accessLabel =
    hasAccessToCommunity === null ? '—' : hasAccessToCommunity ? 'Yes' : 'No';

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      {/* Push token (APNs on iOS, FCM on Android) — debug aid to share with the backend */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.trackEventTitle, { color: textColor }]}>
          Push token
        </Text>
        <Text style={[styles.accessDescription, { color: secondaryColor }]}>
          Device push token (long-press to copy). Empty until permission is
          granted and the OS returns a token — physical device only.
        </Text>
        <View
          style={[
            styles.pushTokenBox,
            { backgroundColor: inputBg, borderColor },
          ]}
        >
          <Text style={[styles.pushTokenText, { color: textColor }]} selectable>
            {pushToken ?? '—'}
          </Text>
        </View>
      </View>

      {/* Unseen count: single row with button + badge (disabled when no community access) */}
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor },
          hasAccessToCommunity === false && styles.cardDisabled,
        ]}
      >
        <View style={[styles.row, styles.refreshRow]}>
          <View style={styles.buttonWithBadge}>
            <TouchableOpacity
              style={[
                styles.refreshButton,
                {
                  borderColor:
                    hasAccessToCommunity === false
                      ? secondaryColor
                      : primaryColor,
                },
                (isUpdatingNotifications || hasAccessToCommunity === false) &&
                  styles.refreshButtonLoading,
              ]}
              onPress={onRefreshNotifications}
              disabled={
                isUpdatingNotifications || hasAccessToCommunity === false
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.refreshButtonText,
                  {
                    color:
                      hasAccessToCommunity === false
                        ? secondaryColor
                        : primaryColor,
                  },
                ]}
              >
                Refresh unseen notifications count
              </Text>
            </TouchableOpacity>
            <View style={[styles.badge, isDark && styles.badgeDark]}>
              <Text style={styles.badgeText}>
                {notSeenNotificationsCount > 99
                  ? '99+'
                  : notSeenNotificationsCount}
              </Text>
            </View>
          </View>
          {isUpdatingNotifications && (
            <ActivityIndicator color={primaryColor} size="small" />
          )}
        </View>
        {hasAccessToCommunity === false && (
          <Text
            style={[styles.cardDisabledHint, { color: secondaryColor }]}
            numberOfLines={1}
          >
            Unavailable without community access
          </Text>
        )}
      </View>

      {/* Has access: A/B test cohort + override control */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.accessHeader}>
          <Text style={[styles.inlineLabel, { color: textColor }]}>
            Has access to community
          </Text>
          <View
            style={[
              styles.accessValueBadge,
              {
                backgroundColor:
                  hasAccessToCommunity === true
                    ? 'rgba(52, 199, 89, 0.2)'
                    : hasAccessToCommunity === false
                      ? 'rgba(255, 59, 48, 0.2)'
                      : isDark
                        ? 'rgba(136, 136, 136, 0.25)'
                        : 'rgba(102, 102, 102, 0.15)',
              },
            ]}
          >
            <Text
              style={[
                styles.accessValueHighlight,
                {
                  color:
                    hasAccessToCommunity === true
                      ? '#34C759'
                      : hasAccessToCommunity === false
                        ? '#FF3B30'
                        : secondaryColor,
                },
              ]}
            >
              {accessLabel}
            </Text>
          </View>
        </View>
        <Text style={[styles.accessDescription, { color: secondaryColor }]}>
          A/B test cohort when Octopus SDK manages the logic. Override it below:
        </Text>
        <View style={styles.overrideButtonRow}>
          {hasAccessToCommunity === true ? (
            <TouchableOpacity
              style={[
                styles.overrideButton,
                { borderColor: primaryColor },
                isOverridingAccess && styles.overrideButtonDisabled,
              ]}
              onPress={setBlockAccess}
              disabled={isOverridingAccess}
              activeOpacity={0.8}
            >
              {isOverridingAccess ? (
                <ActivityIndicator color={primaryColor} size="small" />
              ) : (
                <Text
                  style={[styles.overrideButtonText, { color: primaryColor }]}
                >
                  Block access
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.overrideButton,
                { borderColor: primaryColor },
                isOverridingAccess && styles.overrideButtonDisabled,
              ]}
              onPress={setGrantAccess}
              disabled={isOverridingAccess}
              activeOpacity={0.8}
            >
              {isOverridingAccess ? (
                <ActivityIndicator color={primaryColor} size="small" />
              ) : (
                <Text
                  style={[styles.overrideButtonText, { color: primaryColor }]}
                >
                  Grant access
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        {overrideAccessError ? (
          <Text
            style={[styles.overrideError, { color: '#FF3B30' }]}
            numberOfLines={2}
          >
            {overrideAccessError}
          </Text>
        ) : null}
      </View>

      {/* Track community access (analytics only, app-owned A/B logic) */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.trackAccessTitle, { color: textColor }]}>
          Track community access (analytics only)
        </Text>
        <Text style={[styles.accessDescription, { color: secondaryColor }]}>
          When your app manages its own A/B logic, report the access for
          analytics only. This does not change actual access.
        </Text>
        <View style={styles.overrideButtonRow}>
          <TouchableOpacity
            style={[
              styles.overrideButton,
              { borderColor: primaryColor },
              isTrackingAccess && styles.overrideButtonDisabled,
            ]}
            onPress={trackHasAccess}
            disabled={isTrackingAccess}
            activeOpacity={0.8}
          >
            <Text style={[styles.overrideButtonText, { color: primaryColor }]}>
              Track has access
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.overrideButton,
              { borderColor: primaryColor },
              isTrackingAccess && styles.overrideButtonDisabled,
            ]}
            onPress={trackNoAccess}
            disabled={isTrackingAccess}
            activeOpacity={0.8}
          >
            <Text style={[styles.overrideButtonText, { color: primaryColor }]}>
              Track no access
            </Text>
          </TouchableOpacity>
          {isTrackingAccess && (
            <ActivityIndicator color={primaryColor} size="small" />
          )}
        </View>
        {trackAccessFeedback && (
          <Text
            style={[
              styles.trackAccessFeedback,
              {
                color:
                  trackAccessFeedback.type === 'success'
                    ? '#34C759'
                    : '#FF3B30',
              },
            ]}
          >
            {trackAccessFeedback.type === 'success' ? '✓ ' : '✕ '}
            {trackAccessFeedback.message}
          </Text>
        )}
      </View>

      {/* Track custom event */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.trackEventTitle, { color: textColor }]}>
          Track custom event
        </Text>
        <TextInput
          style={[
            styles.trackEventInput,
            { backgroundColor: inputBg, borderColor, color: textColor },
          ]}
          placeholder="Event name"
          placeholderTextColor={placeholderColor}
          value={customEventName}
          onChangeText={setCustomEventName}
          editable={!isSendingEvent}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.trackEventPropsRow}>
          <TextInput
            style={[
              styles.trackEventPropInput,
              { backgroundColor: inputBg, borderColor, color: textColor },
            ]}
            placeholder="Key 1"
            placeholderTextColor={placeholderColor}
            value={prop1Key}
            onChangeText={setProp1Key}
            editable={!isSendingEvent}
            autoCapitalize="none"
          />
          <TextInput
            style={[
              styles.trackEventPropInput,
              { backgroundColor: inputBg, borderColor, color: textColor },
            ]}
            placeholder="Value 1"
            placeholderTextColor={placeholderColor}
            value={prop1Value}
            onChangeText={setProp1Value}
            editable={!isSendingEvent}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.trackEventPropsRow}>
          <TextInput
            style={[
              styles.trackEventPropInput,
              { backgroundColor: inputBg, borderColor, color: textColor },
            ]}
            placeholder="Key 2"
            placeholderTextColor={placeholderColor}
            value={prop2Key}
            onChangeText={setProp2Key}
            editable={!isSendingEvent}
            autoCapitalize="none"
          />
          <TextInput
            style={[
              styles.trackEventPropInput,
              { backgroundColor: inputBg, borderColor, color: textColor },
            ]}
            placeholder="Value 2"
            placeholderTextColor={placeholderColor}
            value={prop2Value}
            onChangeText={setProp2Value}
            editable={!isSendingEvent}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.trackEventFooter}>
          <TouchableOpacity
            style={[
              styles.trackEventButton,
              { borderColor: primaryColor },
              isSendingEvent && styles.trackEventButtonDisabled,
            ]}
            onPress={sendCustomEvent}
            disabled={isSendingEvent}
            activeOpacity={0.8}
          >
            {isSendingEvent ? (
              <ActivityIndicator color={primaryColor} size="small" />
            ) : (
              <Text
                style={[styles.trackEventButtonText, { color: primaryColor }]}
              >
                Send event
              </Text>
            )}
          </TouchableOpacity>
          {eventFeedback && (
            <Text
              style={[
                styles.trackEventFeedback,
                {
                  color:
                    eventFeedback.type === 'success' ? '#34C759' : '#FF3B30',
                },
              ]}
            >
              {eventFeedback.type === 'success' ? '✓ ' : '✕ '}
              {eventFeedback.message}
            </Text>
          )}
        </View>
      </View>

      {/* Event stream */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.eventHeader}>
          <Text style={[styles.eventTitle, { color: textColor }]}>
            Event stream ({sdkEvents.length})
          </Text>
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: primaryColor }]}
            onPress={onClearEvents}
            disabled={sdkEvents.length === 0}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.clearButtonText,
                { color: primaryColor },
                sdkEvents.length === 0 && styles.clearButtonTextDisabled,
              ]}
            >
              Clear
            </Text>
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.eventList,
            { backgroundColor: isDark ? '#1f1f1f' : '#fff' },
          ]}
        >
          {sdkEvents.length === 0 ? (
            <Text style={[styles.emptyList, { color: secondaryColor }]}>
              No events yet. Use Octopus UI to generate events.
            </Text>
          ) : (
            <ScrollView
              style={styles.eventListScroll}
              contentContainerStyle={styles.eventListScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {[...sdkEvents].reverse().map(({ event, receivedAt }, index) => {
                const { title, details } = formatSDKEvent(event);
                return (
                  <View
                    key={`event-${receivedAt}-${index}`}
                    style={[styles.eventItem, { borderColor }]}
                  >
                    <View style={styles.eventItemHeader}>
                      <Text
                        style={[styles.eventItemTitle, { color: textColor }]}
                      >
                        {title}
                      </Text>
                      <Text
                        style={[
                          styles.eventItemTime,
                          { color: secondaryColor },
                        ]}
                      >
                        {formatEventTime(receivedAt)}
                      </Text>
                    </View>
                    {details ? (
                      <Text
                        style={[
                          styles.eventItemDetails,
                          { color: secondaryColor },
                        ]}
                        numberOfLines={2}
                      >
                        {details}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardDisabled: {
    opacity: 0.7,
  },
  cardDisabledHint: {
    fontSize: 11,
    marginTop: 6,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshRow: {
    gap: 8,
  },
  buttonWithBadge: {
    position: 'relative',
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 40,
  },
  refreshButtonLoading: {
    opacity: 0.8,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeDark: {
    borderColor: '#1a1a1a',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  accessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  accessDescription: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 14,
  },
  overrideButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  overrideButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  overrideButtonDisabled: {
    opacity: 0.7,
  },
  overrideButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  overrideError: {
    fontSize: 11,
    marginTop: 6,
  },
  inlineLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  inlineValue: {
    fontSize: 13,
  },
  accessValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  accessValueHighlight: {
    fontSize: 15,
    fontWeight: '700',
  },
  trackAccessTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackAccessFeedback: {
    fontSize: 12,
    marginTop: 6,
  },
  trackEventTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  trackEventInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 6,
  },
  trackEventPropsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  trackEventPropInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  trackEventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  trackEventButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  trackEventButtonDisabled: {
    opacity: 0.7,
  },
  trackEventButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  trackEventFeedback: {
    fontSize: 12,
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearButtonTextDisabled: {
    opacity: 0.5,
  },
  eventList: {
    borderRadius: 8,
    padding: 10,
    maxHeight: 280,
  },
  eventListScroll: {
    maxHeight: 260,
  },
  eventListScrollContent: {
    paddingBottom: 4,
  },
  emptyList: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
  },
  eventItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  eventItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  eventItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  eventItemTime: {
    fontSize: 11,
  },
  eventItemDetails: {
    fontSize: 11,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 24,
  },
  pushTokenBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pushTokenText: {
    fontSize: 12,
    fontFamily: 'Courier',
  },
});
