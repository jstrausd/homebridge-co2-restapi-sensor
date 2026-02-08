# Homebridge CO2 RestAPI Sensor

[![npm version](https://badge.fury.io/js/homebridge-co2-restapi-sensor.svg)](https://badge.fury.io/js/homebridge-co2-restapi-sensor)
[![npm downloads](https://img.shields.io/npm/dt/homebridge-co2-restapi-sensor.svg)](https://www.npmjs.com/package/homebridge-co2-restapi-sensor)

A [Homebridge](https://homebridge.io) plugin to integrate CO2 sensors with optional temperature and humidity via REST API into Apple HomeKit.

## Features

- 🌡️ **Multi-Sensor Support** - CO2, Temperature, and Humidity in one accessory
- 🔄 **Flexible API Integration** - Works with any REST API that returns sensor values
- 📊 **JSON & Plain Text Support** - Handles both JSON responses (with configurable path) and plain numeric values
- 🔗 **Separate Endpoints** - Configure different URLs for each sensor type
- 🔄 **Automatic Updates** - Configurable polling interval for real-time data
- 🔐 **Authentication Support** - HTTP Basic Auth and custom headers
- 🎨 **Homebridge Config UI** - Easy configuration through the Homebridge UI
- ⚙️ **Highly Configurable** - All parameters customizable per sensor
- 🔢 **Multiple Sensors** - Support for unlimited sensors in one platform

## Installation

### Option 1: Install via Homebridge Config UI X (Recommended)

1. Search for `homebridge-co2-restapi-sensor` in the Homebridge Config UI X plugin screen
2. Click **Install**
3. Configure your sensors in the plugin settings

### Option 2: Install via npm

```bash
npm install -g homebridge-co2-restapi-sensor
```

## Configuration

Configure the plugin via the Homebridge Config UI X or manually edit your `config.json`:

### Minimal Configuration Example

```json
{
  "platforms": [
    {
      "platform": "CO2RestAPISensor",
      "sensors": [
        {
          "name": "Living Room Sensor",
          "url": "http://192.168.1.100/sensor",
          "enableTemperature": true,
          "enableHumidity": true
        }
      ]
    }
  ]
}
```

### Full Configuration Example with All Sensors

```json
{
  "platforms": [
    {
      "platform": "CO2RestAPISensor",
      "sensors": [
        {
          "name": "Living Room Multi-Sensor",
          "url": "http://192.168.1.100/api/sensor",
          "updateInterval": 30,
          "httpMethod": "GET",
          "jsonPath": "co2",
          "headers": {
            "Authorization": "Bearer YOUR_TOKEN_HERE"
          },
          "timeout": 5000,
          "minCO2": 400,
          "maxCO2": 5000,
          "abnormalThreshold": 1200,
          "enableTemperature": true,
          "temperatureJsonPath": "temp",
          "minTemperature": -10,
          "maxTemperature": 50,
          "enableHumidity": true,
          "humidityJsonPath": "humidity",
          "manufacturer": "Acme Corp",
          "model": "Multi-Sensor-Pro",
          "serialNumber": "SN-123456"
        }
      ]
    }
  ]
}
```

### Example with Separate URLs for Each Sensor

```json
{
  "platforms": [
    {
      "platform": "CO2RestAPISensor",
      "sensors": [
        {
          "name": "Office Sensors",
          "url": "http://192.168.1.100/co2",
          "jsonPath": "value",
          "enableTemperature": true,
          "temperatureUrl": "http://192.168.1.100/temperature",
          "temperatureJsonPath": "celsius",
          "enableHumidity": true,
          "humidityUrl": "http://192.168.1.100/humidity",
          "humidityJsonPath": "percent"
        }
      ]
    }
  ]
}
```

## Configuration Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Name of the sensor as it appears in HomeKit |
| `url` | string | REST API endpoint URL to fetch sensor data |

### CO2 Sensor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `updateInterval` | number | `60` | Update interval in seconds (5-3600) |
| `httpMethod` | string | `GET` | HTTP method (`GET` or `POST`) |
| `jsonPath` | string | `co2` | Path to extract CO2 value from JSON (e.g., `co2` or `sensor.co2`) |
| `headers` | object | `{}` | Custom HTTP headers |
| `body` | string | - | Request body for POST requests (JSON string) |
| `timeout` | number | `5000` | Request timeout in milliseconds (1000-30000) |
| `auth.username` | string | - | Username for HTTP Basic Authentication |
| `auth.password` | string | - | Password for HTTP Basic Authentication |
| `minCO2` | number | `0` | Minimum CO2 value in ppm (clamping) |
| `maxCO2` | number | `5000` | Maximum CO2 value in ppm (clamping) |
| `abnormalThreshold` | number | `1000` | CO2 level (ppm) above which sensor reports abnormal state |

### Temperature Sensor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enableTemperature` | boolean | `false` | Enable temperature sensor |
| `temperatureUrl` | string | - | Separate URL for temperature (uses main URL if not set) |
| `temperatureJsonPath` | string | `temp` | Path to extract temperature from JSON |
| `temperatureHttpMethod` | string | - | HTTP method for temperature endpoint (uses main if not set) |
| `temperatureHeaders` | object | - | Custom headers for temperature endpoint |
| `temperatureBody` | string | - | Request body for temperature POST requests |
| `temperatureTimeout` | number | - | Timeout for temperature endpoint |
| `minTemperature` | number | `-100` | Minimum temperature in °C |
| `maxTemperature` | number | `100` | Maximum temperature in °C |

### Humidity Sensor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enableHumidity` | boolean | `false` | Enable humidity sensor |
| `humidityUrl` | string | - | Separate URL for humidity (uses main URL if not set) |
| `humidityJsonPath` | string | `humidity` | Path to extract humidity from JSON |
| `humidityHttpMethod` | string | - | HTTP method for humidity endpoint (uses main if not set) |
| `humidityHeaders` | object | - | Custom headers for humidity endpoint |
| `humidityBody` | string | - | Request body for humidity POST requests |
| `humidityTimeout` | number | - | Timeout for humidity endpoint |

### Accessory Information

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `manufacturer` | string | `Custom` | Manufacturer name in HomeKit |
| `model` | string | `CO2 Sensor` | Model name in HomeKit |
| `serialNumber` | string | `Default-Serial` | Serial number in HomeKit |
| `firmwareRevision` | string | `1.0.0` | Firmware version in HomeKit |

## API Response Formats

### Combined Sensor Response (Recommended)

The plugin works great with APIs that return all sensor values in one response:

```json
{
  "co2": 1420,
  "temp": 31.30,
  "humidity": 26.00,
  "unit_co2": "ppm",
  "unit_temp": "C"
}
```

Configuration:
```json
{
  "name": "Multi-Sensor",
  "url": "http://192.168.1.100/api/sensor",
  "jsonPath": "co2",
  "enableTemperature": true,
  "temperatureJsonPath": "temp",
  "enableHumidity": true,
  "humidityJsonPath": "humidity"
}
```

### Separate Endpoints

You can also use different URLs for each sensor type:

```json
{
  "name": "Separate Sensors",
  "url": "http://192.168.1.100/co2",
  "enableTemperature": true,
  "temperatureUrl": "http://192.168.1.100/temperature",
  "enableHumidity": true,
  "humidityUrl": "http://192.168.1.100/humidity"
}
```

## Sensor Values in HomeKit

The plugin reports the following values to HomeKit:

### CO2 Sensor
1. **CO2 Level** - The actual CO2 concentration in ppm
2. **CO2 Detected** - Normal (0) or Abnormal (1)
   - **Normal**: CO2 ≤ threshold
   - **Abnormal**: CO2 > threshold

> **Note:** The default threshold is 1000 ppm, following general indoor air quality guidelines. Values above 1000 ppm may indicate inadequate ventilation. You can customize this threshold in the sensor configuration using the `abnormalThreshold` parameter.

### Temperature Sensor (Optional)
- **Current Temperature** - Temperature in °C (automatically converted to °F in HomeKit if needed)

### Humidity Sensor (Optional)
- **Current Relative Humidity** - Humidity in % (0-100)

## Examples

### Example 1: ESPHome Multi-Sensor

```json
{
  "name": "Office Sensor",
  "url": "http://esphome-sensor.local/sensor/data",
  "jsonPath": "co2_sensor.state",
  "enableTemperature": true,
  "temperatureJsonPath": "temperature.state",
  "enableHumidity": true,
  "humidityJsonPath": "humidity.state",
  "updateInterval": 30
}
```

### Example 2: Home Assistant REST API

```json
{
  "name": "Garage Sensor",
  "url": "http://homeassistant.local:8123/api/states/sensor.co2_garage",
  "httpMethod": "GET",
  "jsonPath": "state",
  "headers": {
    "Authorization": "Bearer YOUR_LONG_LIVED_TOKEN"
  },
  "enableTemperature": true,
  "temperatureUrl": "http://homeassistant.local:8123/api/states/sensor.temperature_garage",
  "temperatureJsonPath": "state"
}
```

### Example 3: Custom API with All Features

```json
{
  "name": "Lab Multi-Sensor",
  "url": "http://api.example.com/sensors/lab",
  "auth": {
    "username": "user",
    "password": "pass"
  },
  "jsonPath": "data.co2.current",
  "abnormalThreshold": 1500,
  "enableTemperature": true,
  "temperatureJsonPath": "data.temp.current",
  "enableHumidity": true,
  "humidityJsonPath": "data.humidity.current"
}
```

## Troubleshooting

### Sensor shows "No Response" in HomeKit

1. Check that the API URL is accessible from your Homebridge server
2. Verify the `jsonPath` is correct for JSON responses
3. Check Homebridge logs for error messages
4. Ensure your API returns a valid numeric value
5. Test the API with `curl` or browser first

### Values not updating

1. Check the `updateInterval` setting
2. Verify network connectivity to the sensor
3. Check Homebridge logs for API errors
4. Ensure timeout is sufficient for slow APIs

### Wrong values displayed

1. Verify the `jsonPath` extracts the correct value
2. Check `minCO2` and `maxCO2` settings (values are clamped)
3. Ensure API returns value in ppm (parts per million)

### Enable Debug Logging

Add to your Homebridge startup command:
```bash
homebridge -D
```

Or set in `config.json`:
```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "...",
    "port": 51826,
    "pin": "...",
    "logLevel": "debug"
  }
}
```

## Development

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/jstrauss/homebridge-co2-restapi-sensor.git
cd homebridge-co2-restapi-sensor

# Install dependencies
npm install

# Build the plugin
npm run build

# Link to Homebridge
npm link

# Watch for changes
npm run watch
```

### Project Structure

```
├── src/
│   ├── index.ts           # Plugin entry point
│   ├── platform.ts        # Platform implementation
│   ├── co2Accessory.ts    # CO2 sensor accessory
│   ├── types.ts           # TypeScript type definitions
│   └── settings.ts        # Plugin constants
├── config.schema.json     # Homebridge Config UI schema
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Issues:** [GitHub Issues](https://github.com/jstrauss/homebridge-co2-restapi-sensor/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/jstrauss/homebridge-co2-restapi-sensor/discussions)
- 📖 **Homebridge:** [Homebridge Documentation](https://homebridge.io)

## Acknowledgments

- Thanks to the [Homebridge](https://homebridge.io) team for the amazing platform
- Inspired by the need for flexible CO2 sensor integration in HomeKit

## Changelog

### 1.1.0

- ✨ Added temperature sensor support
- ✨ Added humidity sensor support
- ✨ Support for combined or separate sensor endpoints
- ✨ Flexible JSON path configuration for each sensor type
- 🐛 Improved error handling and validation
- 📝 Updated documentation with new examples

### 1.0.1

- 🐛 Fixed validation bugs
- 🐛 Improved config error messages

### 1.0.0

- Initial release
- Support for REST API CO2 sensors
- JSON and plain text response parsing
- Configurable update intervals
- HTTP authentication support
- Multiple sensor support
- Homebridge Config UI X integration
