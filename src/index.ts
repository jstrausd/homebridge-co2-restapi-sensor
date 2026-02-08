import { API } from 'homebridge';
import { CO2Platform } from './platform';
import { PLATFORM_NAME } from './settings';

/**
 * This is the entry point to your Homebridge plugin.
 * This method is called once when homebridge loads the plugin from disk.
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, CO2Platform);
};
