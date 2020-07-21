/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

Raver Lights Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Node.  If not, see <http://www.gnu.org/licenses/>.
*/

import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { IWaveParameters } from './types';
import {
  init,
  start,
  stop,

  setWaveParameters,
  setPowerState,
  setBrightness,
  getAnimationTime,
  listenForWaveParameterUpdates,

  createEmptyWave,
  createEmptyWaveParameters,

  DEFAULT_DISTANCE_PERIOD,
  DEFAULT_TIME_PERIOD,
  MAX_NUM_WAVES,
  listenForBrightnessUpdates,
  listenForPowerStateUpdates,
} from './bridge';

export * from './types';
export * from './animation';

export interface IRVLOptions {
  networkInterface: string;
  channel: number;
  port?: number;
  mode?: 'controller' | 'receiver';
  logLevel?: 'error' | 'info' | 'debug';
  enableClockSync?: boolean;
}

interface IEvents {
  initialized: void;
  waveParametersUpdated: IWaveParameters;
  powerStateUpdated: boolean;
  brightnessUpdated: number;
}
type RVLEmitter = StrictEventEmitter<EventEmitter, IEvents>;

let created = false;

export class RVL extends (EventEmitter as new() => RVLEmitter) {

  private _isInitialized = false;
  private _waveParameters: IWaveParameters;
  private _mode: 'controller' | 'receiver';
  private _brightness = 0;
  private _powerState = false;

  public get waveParameters() {
    return this._waveParameters;
  }

  public get mode() {
    return this._mode;
  }

  public get animationTime() {
    return getAnimationTime();
  }

  public get powerState() {
    return this._powerState;
  }

  public get brightness() {
    return this._brightness;
  }

  constructor({
    networkInterface,
    port = 4978,
    mode = 'receiver',
    logLevel = 'info',
    channel,
    enableClockSync = false
  }: IRVLOptions) {
    super();
    if (created) {
      throw new Error(`Currently the RVL class can only be instantiated once per process.`);
    }
    created = true;

    this._mode = mode;
    this._waveParameters = createEmptyWaveParameters();

    listenForWaveParameterUpdates((newParameters) => {
      this._waveParameters = newParameters;
      this.emit('waveParametersUpdated', this._waveParameters);
    });

    listenForPowerStateUpdates((newPowerState) => {
      this._powerState = newPowerState;
      this.emit('powerStateUpdated', this._powerState);
    });

    listenForBrightnessUpdates((newBrightness) => {
      this._brightness = newBrightness;
      this.emit('brightnessUpdated', this._brightness);
    });

    init(networkInterface, port, mode, channel, logLevel, enableClockSync, () => {
      setWaveParameters(this._waveParameters);
      this._isInitialized = true;
      this.emit('initialized');
    });
  }

  public start() {
    if (!this._isInitialized) {
      throw new Error(
        'Cannot call "start" until the platform has been initialized and the "initialized" event has been emitted');
    }
    start();
  }

  public stop() {
    if (!this._isInitialized) {
      throw new Error(
        'Cannot call "stop" until the platform has been initialized and the "initialized" event has been emitted');
    }
    stop();
  }

  public setWaveParameters({
    waves,
    timePeriod = DEFAULT_TIME_PERIOD,
    distancePeriod = DEFAULT_DISTANCE_PERIOD
  }: IWaveParameters) {
    if (!this._isInitialized) {
      throw new Error('Cannot call "setWaveParameters" until the platform has been initialized ' +
        'and the "initialized" event has been emitted');
    }
    if (this._mode !== 'controller') {
      throw new Error(`Cannot set wave parameters while in ${this._mode} mode`);
    }
    if (waves.length > MAX_NUM_WAVES) {
      throw new Error(`Only ${MAX_NUM_WAVES} waves are supported at a time`);
    }
    waves = [ ...waves ]; // Clone the array so we don't modify the user's array
    for (let i = waves.length; i < MAX_NUM_WAVES; i++) {
      waves.push({ ...createEmptyWave() });
    }
    this._waveParameters = { waves, timePeriod, distancePeriod };
    setWaveParameters(this._waveParameters);
  }

  public setPowerState(newPowerState: boolean): void {
    setPowerState(newPowerState);
  }

  public setBrightness(newBrightness: number): void {
    setBrightness(newBrightness);
  }
}
