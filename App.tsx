import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useKeepAwake } from 'expo-keep-awake';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  ScrollView,
} from 'react-native';
import * as Device from 'expo-device';
import * as TiksCam from './modules/tikscam-native';
import { CameraPreview } from './modules/tikscam-native';

const PORT = 4747;

type ControlTab = 'main' | 'image' | 'lens';

// Simple inline slider component
function CSlider({ label, value, min, max, step, onValueChange, formatValue }: {
  label: string; value: number; min: number; max: number; step: number;
  onValueChange: (v: number) => void; formatValue?: (v: number) => string;
}) {
  const trackRef = useRef<View>(null);
  const trackXRef = useRef(0);
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step));
  const fraction = (value - min) / (max - min);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        trackRef.current?.measureInWindow((x: number) => {
          trackXRef.current = x;
          const w = Dimensions.get('window').width - 80;
          const touchX = e.nativeEvent.pageX - x;
          const frac = Math.max(0, Math.min(1, touchX / w));
          onValueChange(clamp(min + frac * (max - min)));
        });
      },
      onPanResponderMove: (e) => {
        const w = Dimensions.get('window').width - 80;
        const touchX = e.nativeEvent.pageX - trackXRef.current;
        const frac = Math.max(0, Math.min(1, touchX / w));
        onValueChange(clamp(min + frac * (max - min)));
      },
    })
  ).current;

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#999' }}>{label}</Text>
        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, fontWeight: '700', color: '#FFD700' }}>
          {formatValue ? formatValue(value) : value.toFixed(1)}
        </Text>
      </View>
      <View ref={trackRef} style={{ height: 28, justifyContent: 'center', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' }} {...panResponder.panHandlers}>
        <View style={{ position: 'absolute', left: 0, top: 10, height: 8, width: `${fraction * 100}%`, borderRadius: 4, backgroundColor: 'rgba(255,215,0,0.35)' }} />
        <View style={{ position: 'absolute', top: 6, left: `${fraction * 100}%`, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFD700', marginLeft: -8 }} />
      </View>
    </View>
  );
}

export default function App() {
  useKeepAwake();
  const [isStreaming, setIsStreaming] = useState(false);
  const [localIP, setLocalIP] = useState('...');
  const [wifiIP, setWifiIP] = useState<string|null>(null);
  const [usbIP, setUsbIP] = useState<string|null>(null);
  const [connectedClients, setConnectedClients] = useState(0);
  const [tallyActive, setTallyActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [maxZoom, setMaxZoom] = useState(10.0);
  const [exposure, setExposure] = useState(0.0);
  const [whiteBalance, setWhiteBalance] = useState(5500);
  const [contrast, setContrast] = useState(1.0);
  const [saturation, setSaturation] = useState(1.0);
  const [flashOn, setFlashOn] = useState(false);
  const [focusMode, setFocusMode] = useState<'continuous'|'manual'>('continuous');
  const [manualFocus, setManualFocus] = useState(0.5);
  const [isFront, setIsFront] = useState(false);
  const [availableLenses, setAvailableLenses] = useState<string[]>([]);
  const [activeLens, setActiveLens] = useState('wide');
  const [activeTab, setActiveTab] = useState<ControlTab>('main');
  const [showControls, setShowControls] = useState(true);
  const [availableFormats, setAvailableFormats] = useState<any[]>([]);
  const [currentRes, setCurrentRes] = useState('1920x1080');
  const [currentFpsOption, setCurrentFpsOption] = useState(30);
  const [availableFpsForRes, setAvailableFpsForRes] = useState<number[]>([30]);
  const [connectionMode, setConnectionMode] = useState<'wifi'|'usb'>('wifi');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await TiksCam.startPreview();
        const ip = await TiksCam.getLocalIP();
        setLocalIP(ip);
        const ips = await TiksCam.getAllIPs();
        setWifiIP(ips.wifi || null); setUsbIP(ips.usb || null);
        const lenses = await TiksCam.getAvailableLenses();
        setAvailableLenses(lenses);
        const mz = await TiksCam.getMaxZoom();
        setMaxZoom(mz);
        const formats = await TiksCam.getAvailableFormats();
        setAvailableFormats(formats);
        if (formats.length > 0) {
          const def = formats.find((f: any) => f.width === 1920) || formats[0];
          setCurrentRes(`${def.width}x${def.height}`);
          setAvailableFpsForRes(def.fpsOptions || [30]);
        }
      } catch (e) {
        setLocalIP('0.0.0.0');
      }
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const [clients, tally, ip, f, ips] = await Promise.all([
          TiksCam.getConnectedClients(), TiksCam.isTallyActive(),
          TiksCam.getLocalIP(), TiksCam.getFPS(), TiksCam.getAllIPs(),
        ]);
        setConnectedClients(clients); setTallyActive(tally);
        setLocalIP(ip); setFps(Math.round(f));
        setWifiIP(ips.wifi || null); setUsbIP(ips.usb || null);
      } catch {}
    }, 2000);
  }, []);

  const toggleStreaming = useCallback(async () => {
    if (isStreaming) {
      await TiksCam.stopServer();
      if (pollRef.current) clearInterval(pollRef.current);
      setIsStreaming(false); setConnectedClients(0); setTallyActive(false);
    } else {
      const ip = await TiksCam.startServer(PORT);
      setLocalIP(ip); setIsStreaming(true); startPolling();
    }
  }, [isStreaming, startPolling]);

  const handleZoom = useCallback(async (val: number) => { setZoom(val); await TiksCam.setZoom(val); }, []);
  const handleExposure = useCallback(async (val: number) => { setExposure(val); await TiksCam.setExposure(val); }, []);
  const handleWhiteBalance = useCallback(async (val: number) => { setWhiteBalance(val); await TiksCam.setWhiteBalance(val); }, []);
  const handleContrast = useCallback(async (val: number) => { setContrast(val); await TiksCam.setContrast(val); }, []);
  const handleSaturation = useCallback(async (val: number) => { setSaturation(val); await TiksCam.setSaturation(val); }, []);

  const handleFocusMode = useCallback(async (mode: 'continuous' | 'manual') => {
    setFocusMode(mode);
    if (mode === 'continuous') {
      await TiksCam.setAutoFocus(true);
    } else {
      await TiksCam.setAutoFocus(false);
      await TiksCam.setManualFocus(manualFocus);
    }
  }, [manualFocus]);

  const handleManualFocus = useCallback(async (val: number) => {
    setManualFocus(val);
    await TiksCam.setManualFocus(val);
  }, []);

  const handleConnectionMode = useCallback(async (mode: 'wifi'|'usb') => {
    setConnectionMode(mode);
    await TiksCam.setConnectionMode(mode);
  }, []);

  const handleFormatChange = useCallback(async (res: string, fps: number) => {
    const [w, h] = res.split('x').map(Number);
    setCurrentRes(res);
    setCurrentFpsOption(fps);
    await TiksCam.setFormat(w, h, fps);
    setZoom(1.0);
    // Update available FPS for this resolution
    const fmt = availableFormats.find((f: any) => `${f.width}x${f.height}` === res);
    if (fmt) setAvailableFpsForRes(fmt.fpsOptions || [30]);
  }, [availableFormats]);

  const handleSwitchCamera = useCallback(async () => {
    await TiksCam.switchCamera(); setIsFront(!isFront);
    const mz = await TiksCam.getMaxZoom(); setMaxZoom(mz); setZoom(1.0);
  }, [isFront]);

  const handleLens = useCallback(async (lens: string) => {
    await TiksCam.setLens(lens); setActiveLens(lens); setZoom(1.0);
    const mz = await TiksCam.getMaxZoom(); setMaxZoom(mz);
  }, []);

  const handleFlash = useCallback(async () => {
    const s = !flashOn; setFlashOn(s); await TiksCam.setFlash(s ? 'on' : 'off');
  }, [flashOn]);

  const handleTapToFocus = useCallback(async (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const { width, height } = Dimensions.get('window');
    await TiksCam.focusAtPoint(locationX / width, locationY / height);
  }, []);

  // Pinch to zoom
  const pinchBaseZoom = useRef(1.0);
  const pinchBaseDistance = useRef(0);
  const pinchResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length >= 2,
      onMoveShouldSetPanResponder: (e) => e.nativeEvent.touches.length >= 2,
      onPanResponderGrant: (e) => {
        if (e.nativeEvent.touches.length >= 2) {
          const t = e.nativeEvent.touches;
          const dx = t[0].pageX - t[1].pageX;
          const dy = t[0].pageY - t[1].pageY;
          pinchBaseDistance.current = Math.sqrt(dx * dx + dy * dy);
          pinchBaseZoom.current = zoom;
        }
      },
      onPanResponderMove: (e) => {
        if (e.nativeEvent.touches.length >= 2) {
          const t = e.nativeEvent.touches;
          const dx = t[0].pageX - t[1].pageX;
          const dy = t[0].pageY - t[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (pinchBaseDistance.current > 0) {
            const scale = dist / pinchBaseDistance.current;
            const newZoom = Math.max(1, Math.min(maxZoom, pinchBaseZoom.current * scale));
            setZoom(newZoom);
            TiksCam.setZoom(newZoom);
          }
        }
      },
    })
  ).current;

  const lensLabel = (l: string) => l === 'ultrawide' ? '0.5x' : l === 'wide' ? '1x' : l === 'telephoto' ? '2x' : l;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFillObject} {...pinchResponder.panHandlers} onTouchEnd={handleTapToFocus}>
        <CameraPreview style={StyleSheet.absoluteFillObject} />
      </View>
      <SafeAreaView style={s.overlay} pointerEvents="box-none">
        {/* Top bar */}
        <View style={s.topBar}>
          <View style={s.row}>
            {tallyActive && <View style={s.tallyDot} />}
            <View style={[s.badge, isStreaming ? s.badgeLive : s.badgeIdle]}>
              <Text style={[s.mono12, isStreaming ? {color:'#0f0'} : {color:'#888'}]}>
                {isStreaming ? 'LIVE' : 'IDLE'}
              </Text>
            </View>
            {isStreaming && fps > 0 && <View style={s.badge}><Text style={s.mono12}>{fps} FPS</Text></View>}
          </View>
          <View style={s.row}>
            {connectedClients > 0 && <View style={s.badge}><Text style={s.mono12}>{connectedClients} OBS</Text></View>}
            <TouchableOpacity style={s.iconBtn} onPress={() => setShowControls(!showControls)}>
              <Text style={{color:'#fff',fontSize:16,fontWeight:'700'}}>{showControls ? '...' : '='}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{flex:1}} />

        {showControls && (
          <View style={{paddingHorizontal:12,paddingBottom:8}}>
            {/* Lens pills */}
            {availableLenses.length > 1 && (
              <View style={s.lensRow}>
                {availableLenses.map((lens) => (
                  <TouchableOpacity key={lens}
                    style={[s.lensBtn, activeLens === lens && s.lensBtnActive]}
                    onPress={() => handleLens(lens)}>
                    <Text style={[s.mono12, activeLens === lens ? {color:'#FFD700'} : {color:'#aaa'}]}>
                      {lensLabel(lens)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Panel */}
            <View style={s.panel}>
              {/* Tabs */}
              <View style={s.tabBar}>
                {(['main','image','lens'] as ControlTab[]).map(tab => (
                  <TouchableOpacity key={tab} style={[s.tab, activeTab===tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
                    <Text style={[{fontSize:13,fontWeight:'600',color:'#666'}, activeTab===tab && {color:'#FFD700'}]}>
                      {tab==='main' ? 'Stream' : tab==='image' ? 'Imagem' : 'Camera'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{padding:16}}>
                {activeTab === 'main' && (
                  <>
                    <View style={{flexDirection:'row',gap:12,marginBottom:6}}>
                      <View style={{flex:1,alignItems:'center',padding:10,borderRadius:12,backgroundColor:'rgba(6,214,160,0.08)',borderWidth:1,borderColor: wifiIP ? 'rgba(6,214,160,0.3)' : 'rgba(255,255,255,0.05)'}}>
                        <Text style={{fontSize:10,fontWeight:'700',color:'#06d6a0',marginBottom:4}}>WiFi</Text>
                        <Text style={[s.mono12,{fontSize:16,color: wifiIP ? '#fff' : '#444'}]}>{wifiIP || 'Sem WiFi'}</Text>
                      </View>
                      <View style={{flex:1,alignItems:'center',padding:10,borderRadius:12,backgroundColor:'rgba(77,166,255,0.08)',borderWidth:1,borderColor: usbIP ? 'rgba(77,166,255,0.3)' : 'rgba(255,255,255,0.05)'}}>
                        <Text style={{fontSize:10,fontWeight:'700',color:'#4da6ff',marginBottom:4}}>USB</Text>
                        <Text style={[s.mono12,{fontSize:16,color: usbIP ? '#fff' : '#444'}]}>{usbIP || 'Sem cabo'}</Text>
                      </View>
                    </View>
                    <Text style={[s.mono12,{color:'#666',textAlign:'center',marginBottom:8}]}>Porta: {PORT}</Text>
                    {isStreaming && <Text style={{fontSize:12,color:'#06d6a0',textAlign:'center',marginBottom:12}}>No OBS, adicione fonte "DroidCam OBS" e digite o IP</Text>}
                    <View style={s.controlsRow}>
                      <TouchableOpacity style={s.ctrlBtn} onPress={handleSwitchCamera}>
                        <Text style={{fontSize:18,color:'#fff'}}>{'<>'}</Text>
                        <Text style={s.ctrlLabel}>{isFront?'Traseira':'Frontal'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.ctrlBtn,{width:88}]} onPress={toggleStreaming}>
                        <View style={[s.recDot, isStreaming && {backgroundColor:'#f00'}]} />
                        <Text style={[s.ctrlLabel, isStreaming?{color:'#f44'}:{color:'#0f0'}]}>{isStreaming?'Parar':'Iniciar'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.ctrlBtn} onPress={handleFlash}>
                        <Text style={{fontSize:18,color: flashOn?'#FFD700':'#fff'}}>F</Text>
                        <Text style={s.ctrlLabel}>Flash {flashOn?'ON':'OFF'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.mono12,{color:'#444',textAlign:'center'}]}>H.264 {currentRes} {currentFpsOption}fps {connectionMode==='usb'?'USB Max':'WiFi'}</Text>
                  </>
                )}
                {activeTab === 'image' && (
                  <>
                    {/* Focus mode toggle */}
                    <View style={{marginBottom:14}}>
                      <Text style={{fontSize:12,fontWeight:'600',color:'#999',marginBottom:8}}>Foco</Text>
                      <View style={{flexDirection:'row',gap:8}}>
                        <TouchableOpacity
                          style={[s.focusBtn, focusMode==='continuous' && s.focusBtnActive]}
                          onPress={() => handleFocusMode('continuous')}>
                          <Text style={[s.focusBtnText, focusMode==='continuous' && {color:'#FFD700'}]}>AF Continuo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.focusBtn, focusMode==='manual' && s.focusBtnActive]}
                          onPress={() => handleFocusMode('manual')}>
                          <Text style={[s.focusBtnText, focusMode==='manual' && {color:'#FFD700'}]}>Manual</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {focusMode === 'manual' && (
                      <CSlider label="Foco Manual" value={manualFocus} min={0} max={1} step={0.01} onValueChange={handleManualFocus} formatValue={v=>`${Math.round(v*100)}%`} />
                    )}
                    <CSlider label="Zoom" value={zoom} min={1} max={maxZoom} step={0.1} onValueChange={handleZoom} formatValue={v=>`${v.toFixed(1)}x`} />
                    <CSlider label="Exposicao" value={exposure} min={-4} max={4} step={0.1} onValueChange={handleExposure} formatValue={v=>`${v>=0?'+':''}${v.toFixed(1)} EV`} />
                    <CSlider label="Temperatura" value={whiteBalance} min={2500} max={10000} step={100} onValueChange={handleWhiteBalance} formatValue={v=>`${Math.round(v)}K`} />
                    <CSlider label="Contraste" value={contrast} min={0.5} max={2.0} step={0.05} onValueChange={handleContrast} formatValue={v=>`${Math.round(v*100)}%`} />
                    <CSlider label="Saturacao" value={saturation} min={0} max={2.0} step={0.05} onValueChange={handleSaturation} formatValue={v=>`${Math.round(v*100)}%`} />
                  </>
                )}
                {activeTab === 'lens' && (
                  <>
                    {/* Lens selection */}
                    <View style={{flexDirection:'row',gap:10,marginBottom:16}}>
                      {availableLenses.map(lens => (
                        <TouchableOpacity key={lens} style={[s.lensCard, activeLens===lens && s.lensCardActive]} onPress={() => handleLens(lens)}>
                          <Text style={{fontSize:18,fontWeight:'700',color:'#fff',marginBottom:4}}>{lens==='ultrawide'?'UW':lens==='wide'?'W':'T'}</Text>
                          <Text style={[{fontSize:11,color:'#888',marginBottom:2}, activeLens===lens && {color:'#FFD700'}]}>
                            {lens==='ultrawide'?'Ultra Wide':lens==='wide'?'Wide':'Telephoto'}
                          </Text>
                          <Text style={s.mono12}>{lensLabel(lens)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Resolution - fixed 1080p */}
                    <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:14}}>
                      <Text style={{fontSize:12,fontWeight:'600',color:'#999'}}>Resolucao</Text>
                      <Text style={[s.mono12,{color:'#FFD700'}]}>1920x1080</Text>
                    </View>

                    {/* Connection Mode */}
                    <Text style={{fontSize:12,fontWeight:'600',color:'#999',marginBottom:8}}>Conexao</Text>
                    <View style={{flexDirection:'row',gap:6,marginBottom:14}}>
                      <TouchableOpacity style={[s.fpsBtn,{flex:1}, connectionMode==='wifi' && s.fpsBtnActive]} onPress={() => handleConnectionMode('wifi')}>
                        <Text style={[s.fpsBtnText, connectionMode==='wifi' && {color:'#06d6a0'}]}>WiFi</Text>
                        <Text style={{fontSize:8,color:'#666'}}>5 Mbps</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.fpsBtn,{flex:1}, connectionMode==='usb' && s.fpsBtnActive]} onPress={() => handleConnectionMode('usb')}>
                        <Text style={[s.fpsBtnText, connectionMode==='usb' && {color:'#4da6ff'}]}>USB</Text>
                        <Text style={{fontSize:8,color:'#666'}}>Max</Text>
                      </TouchableOpacity>
                    </View>

                    <CSlider label="Zoom Digital" value={zoom} min={1} max={maxZoom} step={0.1} onValueChange={handleZoom} formatValue={v=>`${v.toFixed(1)}x`} />
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tallyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f00' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  badgeLive: { backgroundColor: 'rgba(0,200,80,0.25)' },
  badgeIdle: { backgroundColor: 'rgba(255,255,255,0.1)' },
  mono12: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, fontWeight: '700', color: '#fff' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  lensRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 },
  lensBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  lensBtnActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.15)' },
  panel: { borderRadius: 20, backgroundColor: 'rgba(15,15,25,0.9)', overflow: 'hidden' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#FFD700' },
  ipText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center' },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 12, marginBottom: 10 },
  ctrlBtn: { width: 72, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { fontSize: 10, fontWeight: '600', color: '#aaa' },
  recDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#444', marginBottom: 4 },
  lensCard: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  lensCardActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.08)' },
  focusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  focusBtnActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)' },
  focusBtnText: { fontSize: 13, fontWeight: '700', color: '#888' },
  formatBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderColor: 'transparent' },
  formatBtnActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)' },
  formatBtnText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, fontWeight: '700', color: '#888' },
  fpsBtn: { width: 52, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  fpsBtnActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)' },
  fpsBtnText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, fontWeight: '700', color: '#888' },
});
