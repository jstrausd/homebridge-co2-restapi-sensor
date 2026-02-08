import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { CO2Platform } from './platform';
import { CO2SensorConfig } from './types';
import axios, { AxiosRequestConfig } from 'axios';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class CO2Accessory {
  private co2Service: Service;
  private temperatureService?: Service;
  private humidityService?: Service;
  private config: CO2SensorConfig;

  private currentCO2Level = 400; // Default safe value
  private currentCO2Detected = 0; // 0 = Normal, 1 = Abnormal
  private currentTemperature = 20; // Default value
  private currentHumidity = 50; // Default value
  private updateInterval: NodeJS.Timeout | null = null;

  // Thresholds
  private readonly minCO2: number;
  private readonly maxCO2: number;
  private readonly abnormalThreshold: number;
  private readonly minTemperature: number;
  private readonly maxTemperature: number;

  constructor(
    private readonly platform: CO2Platform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.config = accessory.context.config as CO2SensorConfig;

    // Set thresholds from config or use defaults
    this.minCO2 = this.config.minCO2 ?? 0;
    this.maxCO2 = this.config.maxCO2 ?? 5000;
    this.abnormalThreshold = this.config.abnormalThreshold ?? 1000;
    this.minTemperature = this.config.minTemperature ?? -100;
    this.maxTemperature = this.config.maxTemperature ?? 100;

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.config.manufacturer || 'Custom')
      .setCharacteristic(this.platform.Characteristic.Model, this.config.model || 'CO2 Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.config.serialNumber || 'Default-Serial')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.config.firmwareRevision || '1.0.0');

    // Get or create the CarbonDioxideSensor service
    this.co2Service = this.accessory.getService(this.platform.Service.CarbonDioxideSensor) ||
      this.accessory.addService(this.platform.Service.CarbonDioxideSensor);

    // Set the service name
    this.co2Service.setCharacteristic(this.platform.Characteristic.Name, this.config.name);

    // Register handlers for the CarbonDioxideDetected Characteristic
    this.co2Service.getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
      .onGet(this.handleCarbonDioxideDetectedGet.bind(this));

    // Register handlers for the CarbonDioxideLevel Characteristic
    this.co2Service.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
      .onGet(this.handleCarbonDioxideLevelGet.bind(this));

    // Setup Temperature Service if enabled
    if (this.config.enableTemperature) {
      this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
        this.accessory.addService(this.platform.Service.TemperatureSensor, `${this.config.name} Temperature`, 'temperature');

      this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
        .onGet(this.handleTemperatureGet.bind(this));
    } else {
      // Remove temperature service if it exists but is disabled
      const existingTempService = this.accessory.getService(this.platform.Service.TemperatureSensor);
      if (existingTempService) {
        this.accessory.removeService(existingTempService);
      }
    }

    // Setup Humidity Service if enabled
    if (this.config.enableHumidity) {
      this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor) ||
        this.accessory.addService(this.platform.Service.HumiditySensor, `${this.config.name} Humidity`, 'humidity');

      this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .onGet(this.handleHumidityGet.bind(this));
    } else {
      // Remove humidity service if it exists but is disabled
      const existingHumidityService = this.accessory.getService(this.platform.Service.HumiditySensor);
      if (existingHumidityService) {
        this.accessory.removeService(existingHumidityService);
      }
    }

    // Set up periodic updates
    const interval = (this.config.updateInterval ?? 60) * 1000; // Default 60 seconds
    this.startPeriodicUpdates(interval);

    // Fetch initial value
    this.updateAllValues();
  }

  /**
   * Handle requests to get the current value of the "Carbon Dioxide Detected" characteristic
   */
  handleCarbonDioxideDetectedGet(): CharacteristicValue {
    this.platform.log.debug('Triggered GET CarbonDioxideDetected for', this.config.name);
    return this.currentCO2Detected;
  }

  /**
   * Handle requests to get the current value of the "Carbon Dioxide Level" characteristic
   */
  handleCarbonDioxideLevelGet(): CharacteristicValue {
    this.platform.log.debug('Triggered GET CarbonDioxideLevel for', this.config.name);
    return this.currentCO2Level;
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  handleTemperatureGet(): CharacteristicValue {
    this.platform.log.debug('Triggered GET CurrentTemperature for', this.config.name);
    return this.currentTemperature;
  }

  /**
   * Handle requests to get the current value of the "Current Relative Humidity" characteristic
   */
  handleHumidityGet(): CharacteristicValue {
    this.platform.log.debug('Triggered GET CurrentRelativeHumidity for', this.config.name);
    return this.currentHumidity;
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(interval: number) {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Set up new interval
    this.updateInterval = setInterval(() => {
      this.updateAllValues();
    }, interval);

    this.platform.log.debug(`Started periodic updates for ${this.config.name} every ${interval / 1000} seconds`);
  }

  /**
   * Update all sensor values (CO2, Temperature, Humidity)
   */
  private async updateAllValues() {
    await Promise.all([
      this.updateCO2Value(),
      this.config.enableTemperature ? this.updateTemperatureValue() : Promise.resolve(),
      this.config.enableHumidity ? this.updateHumidityValue() : Promise.resolve(),
    ]);
  }

  /**
   * Fetch CO2 value from REST API
   */
  private async updateCO2Value() {
    try {
      const value = await this.fetchValueFromAPI(
        this.config.url,
        this.config.jsonPath || 'co2',
        this.config.httpMethod,
        this.config.headers,
        this.config.body,
        this.config.timeout,
      );

      if (value !== null) {
        // Clamp value to min/max range
        const clampedValue = Math.max(this.minCO2, Math.min(this.maxCO2, value));

        // Update the current value
        this.currentCO2Level = clampedValue;

        // Determine if CO2 is abnormal (above threshold)
        this.currentCO2Detected = clampedValue > this.abnormalThreshold ? 1 : 0;

        // Update the characteristic values
        this.co2Service.updateCharacteristic(this.platform.Characteristic.CarbonDioxideLevel, this.currentCO2Level);
        this.co2Service.updateCharacteristic(this.platform.Characteristic.CarbonDioxideDetected, this.currentCO2Detected);

        this.platform.log.debug(
          `Updated ${this.config.name}: CO2 Level = ${this.currentCO2Level} ppm, ` +
          `Detected = ${this.currentCO2Detected ? 'Abnormal' : 'Normal'}`,
        );
      }
    } catch (error) {
      this.platform.log.error(`Failed to update CO2 value for ${this.config.name}:`, error);
    }
  }

  /**
   * Fetch temperature value from REST API
   */
  private async updateTemperatureValue() {
    if (!this.config.enableTemperature) {
      return;
    }

    try {
      const url = this.config.temperatureUrl || this.config.url;
      const value = await this.fetchValueFromAPI(
        url,
        this.config.temperatureJsonPath || this.config.jsonPath || 'temp',
        this.config.temperatureHttpMethod || this.config.httpMethod,
        this.config.temperatureHeaders || this.config.headers,
        this.config.temperatureBody || this.config.body,
        this.config.temperatureTimeout || this.config.timeout,
      );

      if (value !== null) {
        // Clamp value to min/max range
        const clampedValue = Math.max(this.minTemperature, Math.min(this.maxTemperature, value));
        this.currentTemperature = clampedValue;

        // Update the characteristic value
        this.temperatureService?.updateCharacteristic(
          this.platform.Characteristic.CurrentTemperature,
          this.currentTemperature,
        );

        this.platform.log.debug(`Updated ${this.config.name}: Temperature = ${this.currentTemperature}°C`);
      }
    } catch (error) {
      this.platform.log.error(`Failed to update temperature value for ${this.config.name}:`, error);
    }
  }

  /**
   * Fetch humidity value from REST API
   */
  private async updateHumidityValue() {
    if (!this.config.enableHumidity) {
      return;
    }

    try {
      const url = this.config.humidityUrl || this.config.url;
      const value = await this.fetchValueFromAPI(
        url,
        this.config.humidityJsonPath || this.config.jsonPath || 'humidity',
        this.config.humidityHttpMethod || this.config.httpMethod,
        this.config.humidityHeaders || this.config.headers,
        this.config.humidityBody || this.config.body,
        this.config.humidityTimeout || this.config.timeout,
      );

      if (value !== null) {
        // Clamp value to 0-100 range
        const clampedValue = Math.max(0, Math.min(100, value));
        this.currentHumidity = clampedValue;

        // Update the characteristic value
        this.humidityService?.updateCharacteristic(
          this.platform.Characteristic.CurrentRelativeHumidity,
          this.currentHumidity,
        );

        this.platform.log.debug(`Updated ${this.config.name}: Humidity = ${this.currentHumidity}%`);
      }
    } catch (error) {
      this.platform.log.error(`Failed to update humidity value for ${this.config.name}:`, error);
    }
  }

  /**
   * Fetch value from REST API (generic method)
   */
  private async fetchValueFromAPI(
    url: string,
    jsonPath: string | undefined,
    httpMethod: 'GET' | 'POST' | undefined,
    headers: Record<string, string> | undefined,
    body: string | undefined,
    timeout: number | undefined,
  ): Promise<number | null> {
    try {
      const requestConfig: AxiosRequestConfig = {
        method: httpMethod || 'GET',
        url: url,
        timeout: timeout || 5000,
        headers: headers || {},
      };

      // Add authentication if configured
      if (this.config.auth) {
        requestConfig.auth = {
          username: this.config.auth.username,
          password: this.config.auth.password,
        };
      }

      // Add body for POST requests
      if (httpMethod === 'POST' && body) {
        try {
          requestConfig.data = JSON.parse(body);
        } catch {
          requestConfig.data = body;
        }
      }

      const response = await axios(requestConfig);

      // Extract value from response
      let value: number;

      if (jsonPath) {
        // Extract value from JSON using path
        value = this.extractValueFromJSON(response.data, jsonPath);
      } else {
        // Try to parse response as number directly
        if (typeof response.data === 'number') {
          value = response.data;
        } else if (typeof response.data === 'string') {
          value = parseFloat(response.data);
        } else if (typeof response.data === 'object') {
          // If no jsonPath is specified but response is JSON, log error
          this.platform.log.error(
            `Response is JSON but no jsonPath specified for ${this.config.name}. ` +
            'Please configure jsonPath to extract the value.',
          );
          return null;
        } else {
          this.platform.log.error(`Unable to parse value from response for ${this.config.name}`);
          return null;
        }
      }

      if (isNaN(value)) {
        this.platform.log.error(`Invalid value (NaN) received for ${this.config.name}`);
        return null;
      }

      return value;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.platform.log.error(
          `HTTP request failed for ${this.config.name}:`,
          error.message,
          error.response?.status,
        );
      } else {
        this.platform.log.error(`Error fetching value for ${this.config.name}:`, error);
      }
      return null;
    }
  }

  /**
   * Extract value from JSON using dot notation path
   * Example: "sensor.co2" from { "sensor": { "co2": 450 } }
   */
  private extractValueFromJSON(data: any, path: string): number {
    const keys = path.split('.');
    let value = data;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        this.platform.log.error(
          `Unable to extract value at path "${path}" for ${this.config.name}. ` +
          `Key "${key}" not found.`,
        );
        throw new Error(`Invalid JSON path: ${path}`);
      }
    }

    // Convert to number
    if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'string') {
      return parseFloat(value);
    } else {
      this.platform.log.error(
        `Value at path "${path}" is not a number for ${this.config.name}. ` +
        `Received: ${typeof value}`,
      );
      throw new Error(`Value at path "${path}" is not a number`);
    }
  }

  /**
   * Clean up when accessory is removed
   */
  public destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}
