import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, Platform, Dimensions } from 'react-native';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

const TRACK_WIDTH = Dimensions.get('window').width - 80;

export default function Slider({ label, value, min, max, step, onValueChange, formatValue }: SliderProps) {
  const trackRef = useRef<View>(null);
  const trackXRef = useRef(0);

  const clamp = (v: number) => {
    const stepped = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const fraction = (value - min) / (max - min);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        trackRef.current?.measureInWindow((x) => {
          trackXRef.current = x;
          const touchX = e.nativeEvent.pageX - x;
          const frac = Math.max(0, Math.min(1, touchX / TRACK_WIDTH));
          onValueChange(clamp(min + frac * (max - min)));
        });
      },
      onPanResponderMove: (e) => {
        const touchX = e.nativeEvent.pageX - trackXRef.current;
        const frac = Math.max(0, Math.min(1, touchX / TRACK_WIDTH));
        onValueChange(clamp(min + frac * (max - min)));
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue ? formatValue(value) : value.toFixed(1)}</Text>
      </View>
      <View ref={trackRef} style={styles.track} {...panResponder.panHandlers}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
        <View style={[styles.thumb, { left: `${fraction * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#999' },
  value: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12, fontWeight: '700', color: '#FFD700',
  },
  track: {
    height: 28, justifyContent: 'center', borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  fill: {
    position: 'absolute', left: 0, top: 10, height: 8,
    borderRadius: 4, backgroundColor: 'rgba(255,215,0,0.35)',
  },
  thumb: {
    position: 'absolute', top: 6, width: 16, height: 16,
    borderRadius: 8, backgroundColor: '#FFD700', marginLeft: -8,
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 4,
  },
});
