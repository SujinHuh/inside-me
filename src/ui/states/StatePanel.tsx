import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borders, colors, spacing, typography, typeScale } from '../tokens';

type StateKind = 'loading' | 'empty' | 'error';

interface StatePanelProps {
  kind: StateKind;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const stateMarker: Record<StateKind, string> = {
  loading: '◐',
  empty: '□',
  error: '!',
};

const liveRegion: Record<StateKind, 'polite' | 'assertive'> = {
  loading: 'polite',
  empty: 'polite',
  error: 'assertive',
};

export function StatePanel({ kind, title, description, actionLabel, onAction }: StatePanelProps) {
  const hasAction = Boolean(actionLabel && onAction);

  return (
    <View
      accessibilityLabel={`${title}. ${description}`}
      accessibilityLiveRegion={liveRegion[kind]}
      accessibilityRole={kind === 'error' ? 'alert' : 'summary'}
      style={styles.screen}
      testID={`state-panel-${kind}`}
    >
      <View style={styles.panel}>
        <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.marker}>
          {stateMarker[kind]}
        </Text>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {hasAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  panel: {
    alignItems: 'center',
    backgroundColor: colors.window,
    borderBottomColor: colors.windowShadow,
    borderLeftColor: colors.windowHighlight,
    borderRightColor: colors.windowShadow,
    borderTopColor: colors.windowHighlight,
    borderWidth: borders.window,
    gap: spacing.lg,
    maxWidth: 480,
    padding: spacing.xxl,
    width: '100%',
  },
  marker: {
    color: colors.stateMarker,
    fontSize: typeScale.stateMarker,
    fontWeight: typography.titleWeight,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.heading,
    fontWeight: typography.headingWeight,
    lineHeight: typeScale.headingLineHeight,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: typeScale.body,
    lineHeight: typeScale.bodyLineHeight,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.button,
    borderBottomColor: colors.buttonShadow,
    borderLeftColor: colors.buttonHighlight,
    borderRightColor: colors.buttonShadow,
    borderTopColor: colors.buttonHighlight,
    borderWidth: borders.button,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonPressed: {
    borderBottomColor: colors.buttonHighlight,
    borderLeftColor: colors.buttonShadow,
    borderRightColor: colors.buttonHighlight,
    borderTopColor: colors.buttonShadow,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  buttonText: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: typography.statusWeight,
  },
});
