import { NativeModule, requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import React from 'react';
import { ViewProps } from 'react-native';

interface TiksCamModuleType extends NativeModule {
  startServer(port: number): Promise<string>;
  stopServer(): Promise<void>;
  startPreview(): Promise<void>;
  switchCamera(): Promise<void>;
  setLens(lens: string): Promise<void>;
  getAvailableLenses(): Promise<string[]>;
  setZoom(factor: number): Promise<void>;
  getMaxZoom(): Promise<number>;
  setExposure(value: number): Promise<void>;
  setWhiteBalance(temperature: number): Promise<void>;
  setISO(iso: number): Promise<void>;
  getISORange(): Promise<number[]>;
  setContrast(value: number): Promise<void>;
  setSaturation(value: number): Promise<void>;
  setFlash(mode: string): Promise<void>;
  setAutoFocus(enabled: boolean): Promise<void>;
  focusAtPoint(x: number, y: number): Promise<void>;
  setManualFocus(position: number): Promise<void>;
  getFocusMode(): Promise<string>;
  getLensPosition(): Promise<number>;
  setResolution(width: number, height: number): Promise<void>;
  getAvailableFormats(): Promise<any[]>;
  getCurrentFormat(): Promise<{ width: number; height: number; fps: number; bitrate: number }>;
  setFormat(width: number, height: number, fps: number): Promise<void>;
  setConnectionMode(mode: string): Promise<void>;
  getConnectionMode(): Promise<string>;
  setBitrate(bitrate: number): Promise<void>;
  getBitrate(): Promise<number>;
  getLocalIP(): Promise<string>;
  getAllIPs(): Promise<{ wifi?: string; usb?: string }>;
  getConnectedClients(): Promise<number>;
  isTallyActive(): Promise<boolean>;
  getFPS(): Promise<number>;
}

const TiksCamModule = requireNativeModule<TiksCamModuleType>('TiksCamModule');
const NativePreviewView = requireNativeViewManager('TiksCamModule');

export const CameraPreview = React.forwardRef<any, ViewProps>((props, ref) => (
  <NativePreviewView {...props} ref={ref} />
));

export const startServer = (port = 4747) => TiksCamModule.startServer(port);
export const stopServer = () => TiksCamModule.stopServer();
export const startPreview = () => TiksCamModule.startPreview();
export const switchCamera = () => TiksCamModule.switchCamera();
export const setLens = (lens: string) => TiksCamModule.setLens(lens);
export const getAvailableLenses = () => TiksCamModule.getAvailableLenses();
export const setZoom = (factor: number) => TiksCamModule.setZoom(factor);
export const getMaxZoom = () => TiksCamModule.getMaxZoom();
export const setExposure = (value: number) => TiksCamModule.setExposure(value);
export const setWhiteBalance = (temp: number) => TiksCamModule.setWhiteBalance(temp);
export const setISO = (iso: number) => TiksCamModule.setISO(iso);
export const getISORange = () => TiksCamModule.getISORange();
export const setContrast = (value: number) => TiksCamModule.setContrast(value);
export const setSaturation = (value: number) => TiksCamModule.setSaturation(value);
export const setFlash = (mode: string) => TiksCamModule.setFlash(mode);
export const setAutoFocus = (enabled: boolean) => TiksCamModule.setAutoFocus(enabled);
export const focusAtPoint = (x: number, y: number) => TiksCamModule.focusAtPoint(x, y);
export const setManualFocus = (position: number) => TiksCamModule.setManualFocus(position);
export const getFocusMode = () => TiksCamModule.getFocusMode();
export const getLensPosition = () => TiksCamModule.getLensPosition();
export const setResolution = (w: number, h: number) => TiksCamModule.setResolution(w, h);
export const getAvailableFormats = () => TiksCamModule.getAvailableFormats();
export const getCurrentFormat = () => TiksCamModule.getCurrentFormat();
export const setFormat = (w: number, h: number, fps: number) => TiksCamModule.setFormat(w, h, fps);
export const setConnectionMode = (mode: string) => TiksCamModule.setConnectionMode(mode);
export const getConnectionMode = () => TiksCamModule.getConnectionMode();
export const setBitrate = (bitrate: number) => TiksCamModule.setBitrate(bitrate);
export const getBitrate = () => TiksCamModule.getBitrate();
export const getLocalIP = () => TiksCamModule.getLocalIP();
export const getAllIPs = () => TiksCamModule.getAllIPs();
export const getConnectedClients = () => TiksCamModule.getConnectedClients();
export const isTallyActive = () => TiksCamModule.isTallyActive();
export const getFPS = () => TiksCamModule.getFPS();
