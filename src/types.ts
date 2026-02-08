import { API } from 'homebridge';

export interface CO2SensorConfig {
  accessory: string;
  name: string;
  url: string;
  updateInterval?: number;
  jsonPath?: string;
  httpMethod?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  auth?: {
    username: string;
    password: string;
  };
  minCO2?: number;
  maxCO2?: number;
  abnormalThreshold?: number;
  // Temperature configuration
  enableTemperature?: boolean;
  temperatureUrl?: string;
  temperatureJsonPath?: string;
  temperatureHttpMethod?: 'GET' | 'POST';
  temperatureHeaders?: Record<string, string>;
  temperatureBody?: string;
  temperatureTimeout?: number;
  minTemperature?: number;
  maxTemperature?: number;
  // Humidity configuration
  enableHumidity?: boolean;
  humidityUrl?: string;
  humidityJsonPath?: string;
  humidityHttpMethod?: 'GET' | 'POST';
  humidityHeaders?: Record<string, string>;
  humidityBody?: string;
  humidityTimeout?: number;
  // Accessory information
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareRevision?: string;
}

export interface CO2PlatformConfig {
  platform: string;
  sensors?: CO2SensorConfig[];
}

export type HomebridgeAPI = API;
