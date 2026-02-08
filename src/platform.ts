import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { CO2Accessory } from './co2Accessory';
import { CO2PlatformConfig, CO2SensorConfig } from './types';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class CO2Platform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // This is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  public readonly activeAccessories: CO2Accessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig & CO2PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.platform);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // Run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // Add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    // Check if sensors are configured
    if (!this.config.sensors || !Array.isArray(this.config.sensors)) {
      this.log.warn('No sensors configured in platform config');
      return;
    }

    // Loop over the discovered devices and register each one if it has not already been registered
    for (const sensorConfig of this.config.sensors) {
      if (!this.isValidSensorConfig(sensorConfig)) {
        continue;
      }

      // Generate a unique id for the accessory based on URL and name
      const uuid = this.api.hap.uuid.generate(sensorConfig.url + sensorConfig.name);

      // See if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // The accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // Update the accessory.context with the current config
        existingAccessory.context.config = sensorConfig;

        // Create the accessory handler for the restored accessory
        const accessory = new CO2Accessory(this, existingAccessory);
        this.activeAccessories.push(accessory);

        // Update the accessory via the API
        this.api.updatePlatformAccessories([existingAccessory]);
      } else {
        // The accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', sensorConfig.name);

        // Create a new accessory
        const accessory = new this.api.platformAccessory(sensorConfig.name, uuid);

        // Store a copy of the device object in the `accessory.context`
        accessory.context.config = sensorConfig;

        // Create the accessory handler for the newly create accessory
        const co2Accessory = new CO2Accessory(this, accessory);
        this.activeAccessories.push(co2Accessory);

        // Link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // Remove accessories that are no longer in the config
    const configuredUUIDs = this.config.sensors
      .filter(sensor => this.isValidSensorConfig(sensor))
      .map(sensor => this.api.hap.uuid.generate(sensor.url + sensor.name));

    const accessoriesToRemove = this.accessories.filter(accessory =>
      !configuredUUIDs.includes(accessory.UUID),
    );

    if (accessoriesToRemove.length > 0) {
      this.log.info('Removing', accessoriesToRemove.length, 'accessories that are no longer configured');
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove);
    }
  }

  /**
   * Validate sensor configuration
   */
  private isValidSensorConfig(config: any): config is CO2SensorConfig {
    if (!config || typeof config !== 'object') {
      this.log.error('Invalid sensor config: not an object');
      return false;
    }

    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      this.log.error('Sensor config missing required "name" field. Config:', JSON.stringify(config));
      return false;
    }

    if (!config.url || typeof config.url !== 'string' || config.url.trim() === '') {
      this.log.error('Sensor config missing required "url" field for sensor:', config.name || 'unknown');
      return false;
    }

    try {
      new URL(config.url);
    } catch (error) {
      this.log.error('Invalid URL in sensor config for', config.name, ':', config.url);
      return false;
    }

    return true;
  }
}
